import { auditWithSkills, SkillReviewer } from './skillAudit';
import { IpiBatchFailure, IpiLoopEvent, IpiRunState, ReviewContract, ScanResult, SemanticScanProfile, VerifierOutputFormat } from '../../../types';
import { releaseSlmModel, withTimeout, SlmRequestMetrics } from '../slmClient';
import { SlmOutputTruncatedError } from '../slmResponse';
import { runDetectorAgent } from './detectorAgent';
import { runVerifierAgent } from './verifierAgent';
import { applyBatch, conclude, coverageIssues, InvalidAgentResponse, ruleSuspicions } from './reviewPolicy';
import { collectContextDependencies } from './contextDependencies';
import { endpointsForRole } from '../slmCatalog';
import { candidateChunks } from './candidateVerification';
import { FailedBatch, ReviewedBatch, SemanticChunk } from './types';
import { incompleteReviewReasons } from './reviewProgress';
import { batchFailureCode } from './runtimeDiagnostics';

function getWorkbenchBridge() {
  if (typeof window !== 'undefined' && window.owaspWorkbench) return window.owaspWorkbench;
  return (globalThis as unknown as { owaspWorkbench?: Window['owaspWorkbench'] }).owaspWorkbench;
}

export interface IpiDocumentPipelineOptions {
  filePaths: string[];
  folderPath?: string;
  scanProfile?: SemanticScanProfile;
  providerMode?: 'ollama';
  fixModel?: string;
  checkModel?: string;
  analysisTimeoutMs?: number;
  requestTimeoutMs?: number;
  detectorBatchSize?: 1 | 2 | 3;
  recoverDetectorCitations?: boolean;
  verifyModelHandoff?: boolean;
  reviewContract?: ReviewContract;
  // Luồng đọc toàn nguồn được bật rõ để đối chứng, Verifier giữ hợp đồng cũ.
  detectorFlow?: 'source-review-v1' | 'source-review-compact-v1';
  sourceReferencePolicy?: 'content-only-v1';
  // Đối chứng được bật rõ; không thay Detector/Verifier chính hoặc model UI mặc định.
  contextDependencyModel?: 'qwen3:4b-instruct-2507-q4_K_M';
  // Đối chứng cách đóng gói chứng cứ, không thay prompt/model hoặc chính sách kết luận.
  verifierEvidenceMode?: 'split-views-multiple-targets-v1';
  verifierOutput?: VerifierOutputFormat;
  // Tùy chọn thí nghiệm, không thay giới hạn chunk được chọn của scan profile.
  referenceBatchSize?: number;
  // Chỉ dùng đối chứng từ runner trước khi có quyết định tích hợp.
  actionAudit?: boolean;
  // Thử chuẩn hóa payload citation, không thay nguồn hoặc validator.
  evidencePresentation?: 'stable-alias-v1';
  // Bản thử được gọi rõ từ runner, không có lựa chọn trong UI hoặc mặc định.
  reviewArchitecture?: 'candidate-only-v1';
  // Chỉ runner thử nghiệm cấp callback; không bật từ UI hoặc mặc định.
  skillAudit?: { version: 'frozen-skills-v1'; configurationHash: string; reviewer: SkillReviewer };
  onEvent?: (ev: IpiLoopEvent, state: IpiRunState) => void;
}

/** One review round. Debate/retries are deliberately not implicit here. */
export async function runIpiDocumentPipeline(options: IpiDocumentPipelineOptions): Promise<IpiRunState> {
  const suppliedOnly = options.reviewArchitecture === 'candidate-only-v1';
  const state: IpiRunState = {
    ...(options.detectorFlow ? { detectorFlow: options.detectorFlow } : {}),
    ...(options.contextDependencyModel ? { contextDependencyModel: options.contextDependencyModel } : {}),
    ...(options.verifierEvidenceMode ? { verifierEvidenceMode: options.verifierEvidenceMode } : {}),
    ...(options.evidencePresentation ? { evidencePresentation: options.evidencePresentation } : {}),
    ...(suppliedOnly ? { reviewArchitecture: options.reviewArchitecture } : {}),
    reviewContract: options.reviewContract || 'classic-v1',
    verifierOutput: options.verifierOutput || 'standard',
    status: 'running', processingStatus: 'running', suspicions: [],
    batchFailures: [],
    events: [], scanResult: null, check: null, error: null,
    reviewProgress: { totalChunks: null, selectedChunkIds: [], detectorReviewedChunkIds: [], verifierReviewedChunkIds: [], batchReviews: [] },
    fixModel: options.fixModel || 'gemma3:1b', checkModel: options.checkModel || 'qwen2.5-coder:1.5b',
  };
  const emit = (partial: Omit<IpiLoopEvent, 'ts'>) => {
    const event = { ...partial, ts: Date.now(), iteration: 1 };
    state.events = [...state.events, event];
    options.onEvent?.(event, { ...state, batchFailures: structuredClone(state.batchFailures), reviewProgress: structuredClone(state.reviewProgress), suspicions: state.suspicions.map(row => ({ ...row })) });
  };
  const recordMetrics = (role: 'detector' | 'verifier') => (metrics: SlmRequestMetrics) => {
    const previous = state.agentMetrics?.[role];
    state.agentMetrics = { ...state.agentMetrics, [role]: {
      model: metrics.model, durationMs: (previous?.durationMs ?? 0) + metrics.durationMs,
      totalTokens: (previous?.totalTokens ?? 0) + (metrics.totalTokens ?? 0),
      requests: (previous?.requests ?? 0) + 1,
      missingTokenRequests: (previous?.missingTokenRequests ?? 0) + (metrics.totalTokens === undefined ? 1 : 0),
    } };
  };
  const deadline = Date.now() + (options.analysisTimeoutMs ?? 180_000);
  let stage: 'scan' | 'detector' | 'verifier' = 'scan';
  let issues: string[] = ['Document review has not completed.'];
  const reconcileRecovery = (finished = false) => {
    for (const failure of state.batchFailures || []) {
      if (failure.recovery !== 'pending') continue;
      const reviewed = failure.role === 'detector' ? state.reviewProgress?.detectorReviewedChunkIds : state.reviewProgress?.verifierReviewedChunkIds;
      // Chỉ ledger từ phản hồi đã qua parser/citation được dùng để đóng lỗi cha.
      if (failure.chunks.length && failure.chunks.every(chunk => reviewed?.includes(chunk.chunkId))) failure.recovery = 'recovered';
      else if (finished) failure.recovery = 'incomplete';
    }
  };
  try {
    if (options.sourceReferencePolicy && (options.sourceReferencePolicy !== 'content-only-v1' || options.detectorFlow !== 'source-review-compact-v1')) throw Error('Lọc mã bằng chứng chỉ hỗ trợ luồng source compact.');
    if (options.verifierEvidenceMode !== undefined && (options.verifierEvidenceMode !== 'split-views-multiple-targets-v1'
      || options.detectorFlow !== 'source-review-compact-v1')) throw new Error('Tách source view chỉ hỗ trợ luồng compact đã chọn rõ.');
    if (options.contextDependencyModel !== undefined && (options.contextDependencyModel !== 'qwen3:4b-instruct-2507-q4_K_M'
      || options.detectorFlow !== 'source-review-compact-v1')) throw new Error('Rà phụ thuộc ngữ cảnh chỉ hỗ trợ đối chứng Qwen3 4B trong luồng compact.');
    if (options.contextDependencyModel) endpointsForRole('check', 'ollama', options.contextDependencyModel);
    if (options.detectorFlow && (!['source-review-v1', 'source-review-compact-v1'].includes(options.detectorFlow) || options.actionAudit || options.reviewArchitecture
      || (options.reviewContract && options.reviewContract !== 'classic-v1') || (options.verifierOutput && options.verifierOutput !== 'standard'))) throw new Error('source-review-v1 yêu cầu classic-v1/standard và không ghép thí nghiệm khác.');
    if (options.evidencePresentation && (options.evidencePresentation !== 'stable-alias-v1' || options.actionAudit || suppliedOnly
      || (options.reviewContract && options.reviewContract !== 'classic-v1') || (options.verifierOutput && options.verifierOutput !== 'standard'))) throw new Error('Evidence alias thử chỉ hỗ trợ classic-v1/standard mặc định.');
    if (options.actionAudit && (suppliedOnly || (options.reviewContract && options.reviewContract !== 'classic-v1') || (options.verifierOutput && options.verifierOutput !== 'standard'))) throw new Error('Bản thử kiểm tra hành động chỉ hỗ trợ luồng classic-v1/standard mặc định.');
    if (options.reviewArchitecture && (!suppliedOnly || (options.reviewContract && options.reviewContract !== 'classic-v1') || (options.verifierOutput && options.verifierOutput !== 'standard'))) throw new Error('Kiến trúc thử chỉ hỗ trợ candidate-only-v1/classic-v1/standard.');
    if (options.referenceBatchSize !== undefined && (!['referenced-v1', 'classic-spans-v1'].includes(options.reviewContract || '') ||
      !Number.isSafeInteger(options.referenceBatchSize) || options.referenceBatchSize < 1)) {
      throw new Error('Giới hạn chunk mỗi request phải là số nguyên dương và dùng referenced-v1.');
    }
    if (options.verifierOutput && !['standard', 'compact-v1'].includes(options.verifierOutput)) throw new Error('Định dạng Verifier không được hỗ trợ.');
    if (options.verifierOutput === 'compact-v1' && options.reviewContract !== 'referenced-v1') throw new Error('Verifier rút gọn yêu cầu referenced-v1.');
    if (options.reviewContract && !['classic-v1', 'classic-spans-v1', 'structured-v1', 'referenced-v1'].includes(options.reviewContract)) throw new Error('Hợp đồng nhận định không được hỗ trợ.');
    if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new Error('Analysis timeout: invalid or exhausted time budget');
    const bridge = getWorkbenchBridge();
    if (!bridge?.scanIpiDoc || (options.folderPath && !bridge.scanIpiDocFolder)) throw new Error('Document scanning bridge is unavailable.');
    emit({ phase: 'detect', message: 'Extracting documents and collecting rule suspicions.' });
    const extracted: ScanResult = await withTimeout(options.folderPath
      ? bridge.scanIpiDocFolder(options.folderPath, options.scanProfile)
      : bridge.scanIpiDoc(options.filePaths, options.scanProfile), Math.min(60_000, deadline - Date.now()));
    const scanResult: ScanResult = options.detectorBatchSize && extracted.metadata?.coverage
      ? { ...extracted, metadata: { ...extracted.metadata, coverage: {
        ...extracted.metadata.coverage, detectorBatchSize: options.detectorBatchSize,
      } } }
      : extracted;
    state.scanResult = scanResult;
    if (!scanResult.ok) throw new Error(scanResult.error || 'Document scan failed.');
    // Compact aliases improve small-model citation fidelity; original chunk IDs
    // stay in scanResult, and citations retain source filename/line information.
    const chunks: SemanticChunk[] = (scanResult.metadata.semanticChunks || []).map((chunk, index) => ({ ...chunk, sourceChunkId: chunk.chunkId, chunkId: `chunk-${index + 1}` }));
    state.reviewProgress = { totalChunks: scanResult.metadata.coverage?.totalChunks ?? null,
      selectedChunkIds: chunks.map(chunk => chunk.sourceChunkId!), detectorReviewedChunkIds: [], verifierReviewedChunkIds: [], batchReviews: [] };
    const recordBatch = (role: 'detector' | 'verifier') => (batch: ReviewedBatch) => {
      const field = role === 'detector' ? 'detectorReviewedChunkIds' : 'verifierReviewedChunkIds';
      const sourceIds = batch.chunkIds.map(id => {
        const sourceId = chunks.find(chunk => chunk.chunkId === id)?.sourceChunkId;
        if (!sourceId) throw new InvalidAgentResponse('Batch có ID ngoài tập đoạn đã giao.');
        return sourceId;
      });
      state.reviewProgress = { ...state.reviewProgress!, [field]: [...new Set([...state.reviewProgress![field], ...sourceIds])],
        batchReviews: [...(state.reviewProgress!.batchReviews || []), ...(batch.audit ? [{ ...batch.audit, stanceCounts: { ...batch.audit.stanceCounts },
          role, model: batch.model, sourceChunkIds: sourceIds }] : [])] };
      reconcileRecovery();
      if (role === 'detector') state.fixModel = batch.model;
      else state.checkModel = batch.model;
      emit({ phase: role === 'detector' ? 'fix' : 'check', message: `${role === 'detector' ? 'Detector' : 'Verifier'} đã xử lý hợp lệ ${state.reviewProgress[field].length}/${chunks.length} đoạn đã chọn.` });
    };
    const recordFailure = (role: 'detector' | 'verifier') => (batch: FailedBatch) => {
      const message = batch.error instanceof Error ? batch.error.message : String(batch.error);
      const failure: IpiBatchFailure = { role, model: batch.model, code: batchFailureCode(batch.error), message, durationMs: batch.durationMs,
        ...(batch.recoveryScheduled ? { recovery: 'pending' } : {}),
        chunks: batch.chunkIds.map(id => {
          const chunk = chunks.find(item => item.chunkId === id)!;
          return { chunkId: chunk.sourceChunkId!, fileName: chunk.fileName, filePath: chunk.filePath, startLine: chunk.startLine, endLine: chunk.endLine };
        }) };
      state.batchFailures = [...state.batchFailures!, failure];
      emit({ phase: 'error', message: `${role === 'detector' ? 'Detector' : 'Verifier'}: ${failure.code}; ${failure.chunks.map(chunk => `${chunk.fileName}:${chunk.startLine}–${chunk.endLine}`).join(', ')}. ${message}` });
    };
    issues = coverageIssues(scanResult, chunks);
    // Đối chiếu yêu cầu gốc: coverage của kết quả không chứng minh đã trả đủ file.
    if (!options.folderPath) {
      const returnedFiles = new Set((scanResult.metadata.fileResults || []).map(file => file.filePath));
      for (const filePath of new Set(options.filePaths)) {
        if (!returnedFiles.has(filePath)) issues.push(`Chưa có kết quả trích xuất cho file đã yêu cầu: ${filePath}`);
      }
    }
    state.suspicions = ruleSuspicions(scanResult.findings, chunks);
    if (!chunks.length) throw new Error('No text chunks available for review.');

    stage = 'detector';
    if (options.verifyModelHandoff && state.checkModel !== state.fixModel) await releaseSlmModel(state.checkModel!, true);
    emit({ phase: 'fix', message: `Detector reviewing ${chunks.length} selected chunks and ${state.suspicions.length} rule suspicions.`, findingCount: state.suspicions.length });
    const detector = await runDetectorAgent({ chunks, suspicions: state.suspicions, coverage: scanResult.metadata.coverage,
      model: state.fixModel, deadline, requestTimeoutMs: options.requestTimeoutMs, reviewContract: state.reviewContract, detectorFlow: options.detectorFlow, sourceReferencePolicy: options.sourceReferencePolicy,
      recoverTimeoutOnce: options.detectorFlow === 'source-review-compact-v1',
      recoverCitations: options.recoverDetectorCitations,
      actionAudit: options.actionAudit, evidencePresentation: options.evidencePresentation,
      referenceBatchSize: options.referenceBatchSize, onRequestMetrics: recordMetrics('detector'), onBatchReviewed: recordBatch('detector'), onBatchFailed: recordFailure('detector') });
    state.fixModel = detector.model;
    let dependencies: Awaited<ReturnType<typeof collectContextDependencies>> | undefined;
    if (options.contextDependencyModel) {
      stage = 'verifier';
      // Tận dụng model đang nạp; chưa đưa giả thuyết/lời giải của lượt này vào Verifier chính.
      if (options.contextDependencyModel !== detector.model) await releaseSlmModel(detector.model);
      emit({ phase: 'check', message: 'Đối chiếu chỉ dẫn và thông tin nguồn chưa xác định; chưa chốt kết luận từ đề xuất.' });
      dependencies = await collectContextDependencies({ chunks, coverage: scanResult.metadata.coverage,
        model: options.contextDependencyModel, deadline, onBatchFailed: recordFailure('verifier') });
      state.contextDependencyReview = dependencies.review;
      if (options.contextDependencyModel !== detector.model) await releaseSlmModel(options.contextDependencyModel);
    }
    await releaseSlmModel(detector.model, options.verifyModelHandoff);
    stage = 'verifier';
    const verifierChunks = suppliedOnly ? candidateChunks(chunks, state.suspicions) : chunks;
    if (suppliedOnly) {
      state.reviewProgress.verifierRequiredChunkIds = verifierChunks.map(chunk => chunk.sourceChunkId!);
      emit({ phase: 'check', message: `Bản thử: Verifier chỉ xác minh ứng viên trên ${verifierChunks.length}/${chunks.length} đoạn, không tìm discovery.` });
    }
    emit({ phase: 'check', message: 'Verifier checking every grounded suspicion against complete source chunks.', findingCount: state.suspicions.length });
    const verifier = await runVerifierAgent({ chunks, suspicions: state.suspicions, coverage: scanResult.metadata.coverage,
      suppliedOnly, detectorReview: detector, model: state.checkModel, deadline, requestTimeoutMs: options.requestTimeoutMs, reviewContract: state.reviewContract, outputFormat: state.verifierOutput,
      sourceContext: options.detectorFlow === 'source-review-compact-v1',
      separateSourceViews: options.verifierEvidenceMode === 'split-views-multiple-targets-v1',
      actionAudit: options.actionAudit, evidencePresentation: options.evidencePresentation, referenceBatchSize: options.referenceBatchSize, onRequestMetrics: recordMetrics('verifier'), onBatchReviewed: recordBatch('verifier'), onBatchFailed: recordFailure('verifier') });
    state.checkModel = verifier.modelUsed;
    if (dependencies) {
      // Chỉ hợp nhất sau lượt chính để giữ đầu vào xác minh độc lập, không truyền suy luận model trước.
      for (const result of dependencies.results) applyBatch(result, 'verifier', state.suspicions, chunks);
      if (dependencies.review.coverageLimited) issues.push(...dependencies.review.limitations,
        'Lượt rà phụ thuộc ngữ cảnh chưa hoàn tất trên toàn bộ nguồn.');
    }
    if (detector.model === verifier.modelUsed) issues.push('Both agent roles used the same model; independent model verification is limited.');
    const expectedIds = new Set(chunks.map(chunk => chunk.chunkId));
    if (detector.reviewedChunkIds.length !== expectedIds.size || verifier.reviewedChunkIds.length !== verifierChunks.length ||
      [...expectedIds].some(id => !detector.reviewedChunkIds.includes(id) || (verifierChunks.some(chunk => chunk.chunkId === id) && !verifier.reviewedChunkIds.includes(id)))) {
      issues.push(suppliedOnly ? 'Phạm vi tìm kiếm Detector hoặc xác minh ứng viên chưa hoàn tất.' : 'Some selected chunks were not reviewed by both agents.');
    }
    if (options.skillAudit) {
      if (options.skillAudit.version !== 'frozen-skills-v1' || !options.skillAudit.configurationHash) throw Error('Cấu hình skill chưa được khóa.');
      emit({ phase: 'check', message: 'Kiểm chứng người nhận, khung chỉ dẫn và bằng chứng bằng ba skill đã khóa.' });
      state.skillAudit = await auditWithSkills(chunks, state.suspicions, options.skillAudit.reviewer, deadline, options.skillAudit.configurationHash);
      if (state.skillAudit.coverageLimited) issues.push('Kiểm chứng skill chưa hoàn tất cho mọi target; không xem phần thiếu là an toàn.');
    }
    issues.push(...incompleteReviewReasons(state.reviewProgress));
    reconcileRecovery(true);
    const failures = state.batchFailures!.filter(failure => failure.recovery !== 'recovered');
    if (failures.length) state.error = failures.map(failure => `${failure.role}: ${failure.message}`).join('\n');
    // Gán citation_failure cho nghi vấn bị ảnh hưởng bởi batch lỗi trích dẫn/JSON.
    // Chỉ gán khi status vẫn là unresolved và chưa có kind ưu tiên cao hơn.
    const failedChunkIds = new Set(failures
      .filter(f => f.code === 'invalid_citation' || f.code === 'invalid_json' || f.code === 'output_truncated')
      .flatMap(f => f.chunks.map(c => c.chunkId)));
    if (failedChunkIds.size > 0) {
      for (const suspicion of state.suspicions) {
        if (suspicion.status === 'unresolved' && suspicion.citation && failedChunkIds.has(suspicion.citation.sourceChunkId || suspicion.citation.chunkId)
          && (!suspicion.needsReviewKind || suspicion.needsReviewKind === 'uncertain_evidence')) {
          suspicion.needsReviewKind = 'citation_failure';
        }
      }
    }
    state.check = { ...conclude(state.suspicions, issues, state.error || undefined), modelUsed: verifier.modelUsed, providerUsed: verifier.providerUsed };
    state.status = failures.length ? 'error' : 'completed'; state.processingStatus = failures.length ? 'invalid_response' : 'completed';
    emit({ phase: 'done', message: `Review complete: ${state.check.verdict}. ${state.check.reasons.join(' ')}`, findingCount: state.suspicions.length });
  } catch (error) {
    reconcileRecovery(true);
    const message = error instanceof Error ? error.message : String(error);
    state.error = `${stage}: ${message}`;
    state.processingStatus = error instanceof InvalidAgentResponse || error instanceof SlmOutputTruncatedError ? 'invalid_response'
      : batchFailureCode(error) === 'timeout' ? 'timeout'
        : stage === 'scan' ? 'scan_error' : 'model_error';
    state.status = 'error';
    state.check = conclude(state.suspicions, [...issues, ...incompleteReviewReasons(state.reviewProgress!)], state.error);
    emit({ phase: 'error', message: state.error, findingCount: state.suspicions.length });
  } finally {
    // Cleanup is bounded separately and never changes a security conclusion.
    await Promise.all([releaseSlmModel(state.fixModel || 'gemma3:1b'), releaseSlmModel(state.checkModel || 'qwen2.5-coder:1.5b'),
      ...(options.contextDependencyModel && ![state.fixModel, state.checkModel].includes(options.contextDependencyModel)
        ? [releaseSlmModel(options.contextDependencyModel)] : [])]);
  }
  return state;
}
