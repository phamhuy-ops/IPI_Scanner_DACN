import { IpiSuspicion, ScanResult } from '../../types';
import { releaseSlmModel } from '../agents/slmClient';
import { runDetectorAgent } from '../agents/document/detectorAgent';
import { runVerifierAgent } from '../agents/document/verifierAgent';
import { conclude, coverageIssues, InvalidAgentResponse, ruleSuspicions } from '../agents/document/reviewPolicy';
import { SemanticChunk } from '../agents/document/types';

type RoleStatus = 'not_attempted' | 'succeeded' | 'failed';
export interface ChunkProgress {
  sourceChunkId: string;
  alias: string;
  initiallySelected: boolean;
  scheduled: boolean;
  detector: RoleStatus;
  verifier: RoleStatus;
  detectorModel?: string;
  verifierModel?: string;
  error?: string;
}
export interface BoundedReviewOptions {
  scan: ScanResult;
  maxChatRequests: number;
  maxSupplementalChunks: number;
  analysisTimeoutMs: number;
}
type StopReason = 'complete' | 'supplement_limit' | 'request_budget' | 'deadline' | 'invalid_response' | 'model_error' | 'scan_error';

/** Chỉ dùng thí nghiệm; không được gọi từ pipeline/UI mặc định. */
export async function runBoundedDocumentReview(options: BoundedReviewOptions) {
  const started = Date.now();
  const deadline = started + options.analysisTimeoutMs;
  const progress: ChunkProgress[] = [];
  let suspicions: IpiSuspicion[] = [];
  let chunks: SemanticChunk[] = [];
  let requests = 0;
  let stopReason: StopReason = 'scan_error';
  const budgetStop: { reason?: 'deadline' | 'request_budget' } = {};
  let processingError: string | undefined;
  let stage: 'scan' | 'detector' | 'verifier' = 'scan';
  let active: ChunkProgress | undefined;
  const beforeRequest = () => {
    if (Date.now() >= deadline) { budgetStop.reason = 'deadline'; throw new Error('Đã hết thời hạn phân tích.'); }
    if (requests >= options.maxChatRequests) { budgetStop.reason = 'request_budget'; throw new Error('Đã hết ngân sách chat request.'); }
    requests++;
  };
  const ensureTime = () => {
    if (Date.now() >= deadline) { budgetStop.reason = 'deadline'; throw new Error('Đã hết thời hạn phân tích.'); }
  };
  try {
    for (const [value, min, max] of [[options.maxChatRequests, 1, 64], [options.maxSupplementalChunks, 0, 24], [options.analysisTimeoutMs, 1, 180_000]]) {
      if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('Ngân sách thí nghiệm không hợp lệ.');
    }
    const { scan } = options;
    const catalog = scan.metadata.semanticChunkCatalog;
    const selected = scan.metadata.semanticChunks;
    if (!scan.ok || !catalog?.length || !selected?.length || scan.metadata.coverage?.totalChunks !== catalog.length) {
      throw new Error('Cần kết quả scan thành công với catalogue và coverage đầy đủ.');
    }
    const originals = new Map(catalog.map(chunk => [chunk.chunkId, chunk]));
    const selectedIds = new Set(selected.map(chunk => chunk.chunkId));
    if (originals.size !== catalog.length || selectedIds.size !== selected.length || selected.some(chunk => {
      const original = originals.get(chunk.chunkId);
      return !original || original.text !== chunk.text || original.filePath !== chunk.filePath || original.sourceView !== chunk.sourceView;
    })) throw new Error('Catalogue/đoạn đã chọn bị trùng ID hoặc không đồng nhất nguồn.');
    chunks = catalog.map((chunk, index) => ({ ...chunk, sourceChunkId: chunk.chunkId, chunkId: `chunk-${index + 1}` }));
    progress.push(...chunks.map(chunk => ({ sourceChunkId: chunk.sourceChunkId!, alias: chunk.chunkId,
      initiallySelected: selectedIds.has(chunk.sourceChunkId!), scheduled: false, detector: 'not_attempted' as const, verifier: 'not_attempted' as const })));
    suspicions = ruleSuspicions(scan.findings, chunks);
    const bySourceId = new Map(chunks.map(chunk => [chunk.sourceChunkId, chunk]));
    const schedule = [...selected.map(chunk => bySourceId.get(chunk.chunkId)!),
      ...chunks.filter(chunk => !selectedIds.has(chunk.sourceChunkId!)).slice(0, options.maxSupplementalChunks)];
    for (const chunk of schedule) {
      active = progress.find(row => row.alias === chunk.chunkId)!;
      stage = 'detector';
      ensureTime();
      active.scheduled = true;
      // Chỉ nhận thay đổi sau khi phản hồi qua parser và còn trong thời hạn.
      let pending = structuredClone(suspicions);
      const detector = await runDetectorAgent({ chunks: [chunk], suspicions: pending, model: 'gemma3:1b', deadline, beforeRequest });
      ensureTime();
      if (detector.reviewedChunkIds.length !== 1 || detector.reviewedChunkIds[0] !== chunk.chunkId) throw new InvalidAgentResponse('Detector thiếu đoạn đã giao.');
      suspicions = pending;
      active.detector = 'succeeded'; active.detectorModel = detector.model;
      stage = 'verifier';
      pending = structuredClone(suspicions);
      const verifier = await runVerifierAgent({ chunks: [chunk], suspicions: pending, detectorReview: detector,
        model: 'qwen2.5-coder:1.5b', deadline, beforeRequest });
      ensureTime();
      if (verifier.reviewedChunkIds.length !== 1 || verifier.reviewedChunkIds[0] !== chunk.chunkId) throw new InvalidAgentResponse('Verifier thiếu đoạn đã giao.');
      suspicions = pending;
      active.verifier = 'succeeded'; active.verifierModel = verifier.modelUsed;
    }
    stopReason = schedule.length === chunks.length ? 'complete' : 'supplement_limit';
  } catch (error) {
    processingError = error instanceof Error ? error.message : String(error);
    if (budgetStop.reason) stopReason = budgetStop.reason;
    else {
      stopReason = stage === 'scan' ? 'scan_error' : error instanceof InvalidAgentResponse ? 'invalid_response'
        : /timeout|deadline|abort/i.test(processingError) ? 'deadline' : 'model_error';
    }
    if (active && stage !== 'scan') { active[stage] = 'failed'; active.error = processingError; }
  } finally {
    if (requests) await Promise.all([releaseSlmModel('gemma3:1b'), releaseSlmModel('qwen2.5-coder:1.5b')]);
  }
  const completed = new Set(progress.filter(row => row.detector === 'succeeded' && row.verifier === 'succeeded').map(row => row.alias));
  const completedChunks = chunks.filter(chunk => completed.has(chunk.chunkId));
  // Bản riêng cho policy; không đổi nghĩa aiReviewedChunks trong kết quả scanner gốc.
  const effectiveScan: ScanResult = { ...options.scan, metadata: { ...options.scan.metadata,
    coverage: options.scan.metadata.coverage ? { ...options.scan.metadata.coverage,
      aiReviewedChunks: completed.size, coverageLimited: completed.size !== chunks.length } : undefined,
    fileResults: options.scan.metadata.fileResults?.map(file => {
      if (!file.extraction) return file;
      const raw = chunks.filter(chunk => chunk.filePath === file.filePath && chunk.sourceView === 'raw-html');
      const reviewedRaw = raw.filter(chunk => completed.has(chunk.chunkId)).length;
      return { ...file, extraction: { ...file.extraction, rawChunks: raw.length, selectedRawChunks: reviewedRaw,
        rawCoverageComplete: raw.length > 0 && reviewedRaw === raw.length } };
    }),
  } };
  const issues = coverageIssues(effectiveScan, completedChunks);
  if (progress.some(row => row.detectorModel && row.detectorModel === row.verifierModel)) issues.push('Hai vai trò đã dùng cùng model ở một số đoạn; kiểm chứng độc lập còn hạn chế.');
  if (completed.size < chunks.length) issues.push(`Hai vai trò mới hoàn tất ${completed.size}/${chunks.length} đoạn; còn ${chunks.length - completed.size} đoạn chưa hoàn tất.`);
  return { experiment: 'bounded-document-review-v1', stopReason, processingError, chatRequests: requests,
    elapsedMs: Date.now() - started, limits: { maxChatRequests: options.maxChatRequests, maxSupplementalChunks: options.maxSupplementalChunks, analysisTimeoutMs: options.analysisTimeoutMs },
    counts: { total: chunks.length, selected: progress.filter(row => row.initiallySelected).length,
      detectorSucceeded: progress.filter(row => row.detector === 'succeeded').length,
      verifierSucceeded: progress.filter(row => row.verifier === 'succeeded').length, completed: completed.size },
    progress, check: conclude(suspicions, issues, processingError) };
}
