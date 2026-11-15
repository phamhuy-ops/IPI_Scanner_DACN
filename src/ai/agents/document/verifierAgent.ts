import { candidateChunks, candidateReviewSchema, CANDIDATE_VERIFIER_PROMPT, parseCandidateReview } from './candidateVerification';
import { IpiSuspicion, ReviewContract, VerifierOutputFormat } from '../../../types';
import { generateWithSlm, SlmRequestMetrics } from '../slmClient';
import { quotedSourcePrompt } from './quotedSourcePrompt';
import { SlmOutputTruncatedError } from '../slmResponse';
import { verifierEvidenceBatches, formatChunkEvidence, stableSuspicionEvidence } from './evidence';
import { SOURCE_CONTEXT_VERIFIER_PROMPT, VERIFIER_SYSTEM_PROMPT } from './prompts';
import { STRUCTURED_VERIFIER_PROMPT } from './structuredPrompts';
import { REFERENCE_VERIFIER_PROMPT } from './referencePrompts';
import { referenceBatches, referenceEvidence, referenceReviewSchema } from './sourceReferences';
import { COMPACT_VERIFIER_PROMPT, parseCompactVerifierJson } from './compactVerifier';
import { applyBatch, InvalidAgentResponse, parseReviewJson, reviewSchema } from './reviewPolicy';
import { DetectorReview, FailedBatch, ReviewedBatch, SemanticChunk, SemanticCoverage } from './types';
import { ACTION_AUDIT } from './actionAudit';
import { hasQuotedTransferLesson, hasSummaryExampleContext } from './summaryExampleContext';
import { batchFailureCode } from './runtimeDiagnostics';
import { classicSpanPrompt } from './classicSpans';
import { acceptedBatchSummary } from './reviewProgress';

export async function runVerifierAgent(options: {
  chunks: SemanticChunk[];
  suspicions: IpiSuspicion[];
  coverage?: SemanticCoverage;
  detectorReview: DetectorReview;
  model?: string;
  deadline: number;
  requestTimeoutMs?: number;
  recoverTimeoutOnce?: boolean;
  reviewContract?: ReviewContract;
  outputFormat?: VerifierOutputFormat;
  referenceBatchSize?: number;
  actionAudit?: boolean;
  verifierTransferAudit?: boolean;
  verifierSummaryAudit?: boolean;
  prioritizeTransferChunks?: boolean;
  transferSplitMinCharacters?: number;
  suppliedOnly?: boolean;
  evidencePresentation?: 'stable-alias-v1';
  sourceContext?: boolean;
  evidenceFirst?: boolean;
  evidenceFirstSensitive?: boolean;
  evidenceFirstOutputOverride?: boolean;
  separateSourceViews?: boolean;
  beforeRequest?: () => void;
  onRequestMetrics?: (metrics: SlmRequestMetrics) => void;
  onBatchReviewed?: (batch: ReviewedBatch) => void;
  onBatchFailed?: (batch: FailedBatch) => void;
}): Promise<{ modelUsed: string; providerUsed: string; reviewedChunkIds: string[] }> {
  if (options.suppliedOnly && ((options.reviewContract && options.reviewContract !== 'classic-v1') || (options.outputFormat && options.outputFormat !== 'standard'))) throw new Error('Bản thử tách vai trò chỉ hỗ trợ classic-v1/standard.');
  const chunks = options.suppliedOnly ? candidateChunks(options.chunks, options.suspicions) : options.chunks;
  const compact = options.outputFormat === 'compact-v1';
  if (compact && options.reviewContract !== 'referenced-v1') throw new Error('Verifier rút gọn yêu cầu hợp đồng referenced-v1.');
  const spanOnly = options.reviewContract === 'classic-spans-v1';
  const transferIds = new Set(options.prioritizeTransferChunks ? options.suspicions
    .filter(row => row.ruleId === 'IPI-DOC-CONVERSATION-TRANSFER-CANDIDATE' && row.citation)
    .map(row => row.citation!.chunkId) : []);
  const buildBatches = (items: SemanticChunk[]) => options.reviewContract === 'referenced-v1' || spanOnly
    ? referenceBatches(items, options.suspicions, options.coverage?.verifierEvidenceCharacters || 7600, options.referenceBatchSize)
    : verifierEvidenceBatches(items, options.coverage?.verifierEvidenceCharacters || 7600, options.separateSourceViews ? options.suspicions : undefined);
  const minimum = options.transferSplitMinCharacters;
  const prioritized: SemanticChunk[][] = [];
  const regular: SemanticChunk[][] = [];
  if (transferIds.size && minimum === undefined) {
    prioritized.push(...chunks.filter(chunk => transferIds.has(chunk.chunkId)).map(chunk => [chunk]));
    regular.push(...buildBatches(chunks.filter(chunk => !transferIds.has(chunk.chunkId))));
  } else {
    for (const batch of buildBatches(chunks)) {
      // Đo văn bản của chính batch ban đầu, giữ nguyên ranh giới các batch khác.
      if (minimum !== undefined && transferIds.size && batch.length > 1
        && batch.reduce((sum, chunk) => sum + chunk.text.length, 0) >= minimum) {
        prioritized.push(...batch.filter(chunk => transferIds.has(chunk.chunkId)).map(chunk => [chunk]));
        const remaining = batch.filter(chunk => !transferIds.has(chunk.chunkId));
        if (remaining.length) regular.push(remaining);
      } else {
        regular.push(batch);
      }
    }
  }
  const batches = [...prioritized, ...regular];
  const reviewedChunkIds: string[] = [];
  let modelUsed = options.model || 'qwen2.5-coder:1.5b';
  let providerUsed = 'ollama';
  const retriedBatches = new Set<SemanticChunk[]>();
  let timeoutRetryUsed = false;
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    const started = Date.now();
    let batchModel = options.model || modelUsed;
    let useEvidenceFirst = false;
    let outputEvidenceFirst = false;
    try {
      if (Date.now() >= options.deadline) throw new Error('Analysis timeout: no time remaining');
      const expected = options.suspicions.filter(item => item.citation && batch.some(chunk => chunk.chunkId === item.citation?.chunkId));
      // First round: do not expose Detector conclusions/reasoning. Compare the
      // independent assessments in code, avoiding simple agreement by copying.
      const evidenceOnly = options.evidencePresentation ? stableSuspicionEvidence(expected)
        : expected.map(item => ({ id: item.id, source: item.source, originalQuote: item.originalQuote, citation: item.citation }));
      // Ngữ cảnh lấy trực tiếp từ nguồn, không truyền stance hoặc lý do của Detector.
      const suppliedEvidence = options.sourceContext ? evidenceOnly.map((item, index) => ({ ...item,
        sourceContext: { chunkId: expected[index].citation!.chunkId,
          quote: batch.find(chunk => chunk.chunkId === expected[index].citation!.chunkId)!.text } })) : evidenceOnly;
      const referenced = options.reviewContract === 'referenced-v1' || spanOnly;
      const prompt = spanOnly ? classicSpanPrompt(VERIFIER_SYSTEM_PROMPT) : options.suppliedOnly ? CANDIDATE_VERIFIER_PROMPT : compact ? COMPACT_VERIFIER_PROMPT : referenced ? REFERENCE_VERIFIER_PROMPT : options.reviewContract === 'structured-v1' ? STRUCTURED_VERIFIER_PROMPT : options.sourceContext ? quotedSourcePrompt(SOURCE_CONTEXT_VERIFIER_PROMPT, batch, expected.length) : VERIFIER_SYSTEM_PROMPT;
      const audit = options.actionAudit || expected.some(row => row.citation && (
        (options.verifierTransferAudit && row.ruleId === 'IPI-DOC-CONVERSATION-TRANSFER-CANDIDATE') ||
        (options.verifierSummaryAudit && row.ruleId === 'IPI-DOC-SUMMARY-OUTPUT-OVERRIDE-CANDIDATE')));
      const targets = `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicious excerpts to examine independently:\n${referenced ? referenceEvidence(batch, expected) : JSON.stringify(suppliedEvidence)}`;
      const source = `Original document evidence:\n${formatChunkEvidence(batch)}`;
      // Chỉ đổi thứ tự cho batch có nghi vấn chuyển dữ liệu đã định vị.
      useEvidenceFirst = !!options.evidenceFirst && expected.length > 0
        && expected.every(row => row.ruleId === 'IPI-DOC-CONVERSATION-TRANSFER-CANDIDATE');
      const sensitiveEvidenceFirst = options.evidenceFirstSensitive && expected.length > 0
        && expected.every(row => row.ruleId === 'IPI-DOC-TOOL-AUDIT-RECORDING-DISABLE'
          || row.ruleId === 'IPI-DOC-RUNTIME-VARIABLE-AND-KEY-DISCLOSURE'
          || row.ruleId === 'IPI-DOC-VN-HTML-COMMENT-RESPONSE-LINK');
      outputEvidenceFirst = !!options.evidenceFirstOutputOverride && expected.length > 0
        && expected.every(row => row.ruleId === 'IPI-DOC-SUMMARY-OUTPUT-OVERRIDE-CANDIDATE'
          || row.ruleId === 'IPI-DOC-AUTOMATED-NOTICE-PAYMENT-DIRECTIVE');
      const evidence = useEvidenceFirst || sensitiveEvidenceFirst || outputEvidenceFirst
        ? `${source}\n\n${targets}` : `${targets}\n\n${source}`;
      const retryInstruction = retriedBatches.has(batch)
        ? '\nCopy every quote exactly from the original chunk, including all Unicode characters. Do not repeat an assessed excerpt as a discovery.'
        : '';
      const response = await generateWithSlm('check', audit ? `${prompt}\n${ACTION_AUDIT}` : prompt,
        `${evidence}\nReturn the JSON review now. ${options.suppliedOnly ? 'Only assess supplied IDs; discoveries MUST be [].' : 'Discoveries must be new attack instructions only.'}${retryInstruction}`,
        { preferModel: options.model, providerMode: 'ollama', responseSchema: options.suppliedOnly ? candidateReviewSchema(batch, expected) : compact ? referenceReviewSchema(batch, expected, true) : reviewSchema(batch, expected, options.reviewContract), timeoutMs: Math.min(options.requestTimeoutMs ?? 45_000, options.deadline - Date.now()), beforeRequest: options.beforeRequest, onRequestMetrics: options.onRequestMetrics });
      batchModel = response.model;
      const result = options.suppliedOnly ? parseCandidateReview(response.text, batch, expected) : compact ? parseCompactVerifierJson(response.text, batch, expected) : parseReviewJson(response.text, batch, expected, options.reviewContract);
      if (options.verifierSummaryAudit) {
        for (const { id, assessment } of result.assessments) {
          const item = expected.find(row => row.id === id && row.ruleId === 'IPI-DOC-SUMMARY-OUTPUT-OVERRIDE-CANDIDATE');
          const chunk = batch.find(row => row.chunkId === item?.citation?.chunkId);
          // Giữ xác nhận nếu Verifier viện dẫn phạm vi khác với câu ví dụ đã định vị.
          if (assessment.stance === 'confirmed' && item?.citation && chunk
            && assessment.citation.quote === item.citation.quote
            && assessment.citation.startLine === item.citation.startLine
            && hasSummaryExampleContext(chunk.text, item.citation.quote)) {
            assessment.stance = 'uncertain';
            assessment.reason = 'Dòng ngay trước đoạn trích ghi đây là ví dụ để phân tích và không áp dụng. Cần xem xét ngữ cảnh trước khi xác nhận.';
          }
        }
      }
      applyBatch(result, 'verifier', options.suspicions, options.chunks);
      if (useEvidenceFirst) {
        // Đối chiếu mâu thuẫn của model trước khi áp dụng chính sách cho ví dụ.
        for (const item of expected) {
          const citation = item.citation;
          const assessment = item.verifier;
          const chunk = batch.find(row => row.chunkId === citation?.chunkId);
          if (assessment?.stance === 'confirmed' && citation && chunk
            && assessment.citation.quote === citation.quote
            && assessment.citation.startLine === citation.startLine
            && hasQuotedTransferLesson(chunk.text, citation.quote)) {
            item.verifier = { ...assessment, stance: 'uncertain',
              reason: 'Đoạn nguồn trích dẫn một ví dụ phân tích và ghi rõ không thực hiện. Cần xem xét trước khi xác nhận.' };
            item.status = 'unresolved';
            if (!item.conflicts?.length) item.needsReviewKind = 'uncertain_evidence';
          }
        }
      }
      modelUsed = response.model; providerUsed = response.providerId;
      reviewedChunkIds.push(...batch.map(chunk => chunk.chunkId));
      options.onBatchReviewed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: modelUsed, audit: acceptedBatchSummary(expected.length, result) });
    } catch (error) {
      const retryCitation = (useEvidenceFirst || outputEvidenceFirst) && !retriedBatches.has(batch)
        && error instanceof InvalidAgentResponse && error.message.includes('citation must quote an exact excerpt');
      const retryTimeout = options.recoverTimeoutOnce && !timeoutRetryUsed && batchFailureCode(error) === 'timeout';
      // Thử lại timeout với request nguyên vẹn và giữ thời hạn quét hiện có.
      if (options.onBatchFailed && (retryCitation || retryTimeout)
        && options.deadline - Date.now() >= (options.requestTimeoutMs ?? 45_000)) {
        if (retryCitation) retriedBatches.add(batch);
        if (retryTimeout) timeoutRetryUsed = true;
        batches.splice(index + 1, 0, batch);
        options.onBatchFailed({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error,
          durationMs: Date.now() - started, recoveryScheduled: true });
        continue;
      }
      options.onBatchFailed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error, durationMs: Date.now() - started });
      if (!options.onBatchFailed || !(error instanceof InvalidAgentResponse || error instanceof SlmOutputTruncatedError)) throw error;
    }
  }
  return { modelUsed, providerUsed, reviewedChunkIds };
}
