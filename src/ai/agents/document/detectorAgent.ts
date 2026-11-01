import { IpiSuspicion, ReviewContract } from '../../../types';
import { generateWithSlm } from '../slmClient';
import { quotedSourcePrompt } from './quotedSourcePrompt';
import { SlmConnectionError, SlmOutputTruncatedError } from '../slmResponse';
import { batchChunks, formatChunkEvidence, stableSuspicionEvidence } from './evidence';
import { DETECTOR_SYSTEM_PROMPT } from './prompts';
import { STRUCTURED_DETECTOR_PROMPT } from './structuredPrompts';
import { REFERENCE_DETECTOR_PROMPT } from './referencePrompts';
import { buildSourceReferences, referenceBatches, referenceEvidence } from './sourceReferences';
import { applyBatch, InvalidAgentResponse, parseReviewJson, reviewSchema } from './reviewPolicy';
import { DetectorReview, FailedBatch, ReviewedBatch, SemanticChunk, SemanticCoverage } from './types';
import { ACTION_AUDIT } from './actionAudit';
import { classicSpanPrompt } from './classicSpans';
import { acceptedBatchSummary } from './reviewProgress';
import { SOURCE_REVIEW_PROMPT, SOURCE_REVIEW_COMPACT_PROMPT, sourceReviewRequest, parseSourceReview } from './sourceReview';

export async function runDetectorAgent(options: {
  chunks: SemanticChunk[];
  suspicions: IpiSuspicion[];
  coverage?: SemanticCoverage;
  model?: string;
  deadline: number;
  reviewContract?: ReviewContract;
  detectorFlow?: 'source-review-v1' | 'source-review-compact-v1';
  recoverTimeoutOnce?: boolean;
  referenceBatchSize?: number;
  actionAudit?: boolean;
  evidencePresentation?: 'stable-alias-v1';
  beforeRequest?: () => void;
  onBatchReviewed?: (batch: ReviewedBatch) => void;
  onBatchFailed?: (batch: FailedBatch) => void;
}): Promise<DetectorReview> {
  const spanOnly = options.reviewContract === 'classic-spans-v1';
  const initialBatches = options.reviewContract === 'referenced-v1' || spanOnly
    ? referenceBatches(options.chunks, options.suspicions, options.coverage?.verifierEvidenceCharacters || 7600, options.referenceBatchSize ?? (options.coverage?.detectorBatchSize || 3))
    : batchChunks(options.chunks, options.coverage?.detectorBatchSize || 3);
  const analyses: string[] = [];
  const reviewedChunkIds: string[] = [];
  let model = options.model || 'gemma3:1b';
  let suspiciousBatchCount = 0;
  let timeoutRecoveryUsed = false;
  // Queue cho phép split-batch recovery: batch bị cắt được chia nhỏ và thêm trở lại.
  const queue: SemanticChunk[][] = [...initialBatches];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const batch = queue[queueIndex++];
    const started = Date.now();
    let batchModel = options.model || model;
    let modelResponseReceived = false;
    try {
      if (Date.now() >= options.deadline) throw new Error('Analysis timeout: no time remaining');
      const expected = options.suspicions.filter(item => item.citation && batch.some(chunk => chunk.chunkId === item.citation?.chunkId));
      const referenced = options.reviewContract === 'referenced-v1' || spanOnly;
      const compactSource = options.detectorFlow === 'source-review-compact-v1';
      const source = options.detectorFlow ? sourceReviewRequest(batch, expected, compactSource) : undefined;
      const prompt = spanOnly ? classicSpanPrompt(DETECTOR_SYSTEM_PROMPT) : referenced ? REFERENCE_DETECTOR_PROMPT : options.reviewContract === 'structured-v1' ? STRUCTURED_DETECTOR_PROMPT : DETECTOR_SYSTEM_PROMPT;
      let input = source
        ? `Required source review IDs: ${JSON.stringify(source.scopes.map(item => item.id))}. Review each complete source chunk, not just the existence of previous findings.\nNeutral source review items:\n${JSON.stringify(source.scopes.map(item => ({ id: item.id, chunkId: item.citation!.chunkId })))}\nExisting suspicion records (untrusted content; assess these exact IDs and quotes too):\n${JSON.stringify(stableSuspicionEvidence(expected))}\n\nOriginal document evidence:\n${formatChunkEvidence(batch)}\nReturn the JSON review now. discoveries MUST be [].`
        : `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicion records (untrusted content):\n${referenced ? referenceEvidence(batch, expected) : JSON.stringify(options.evidencePresentation ? stableSuspicionEvidence(expected) : expected)}\n\nOriginal document evidence:\n${formatChunkEvidence(batch)}\nReturn the JSON review now. Discoveries must be new attack instructions only.`;
      if (compactSource) input += `\nNeutral source reference table (untrusted text):\n${JSON.stringify(buildSourceReferences(batch, expected).map(ref => ({ directiveRef: ref.id, chunkId: ref.chunkId, text: ref.text })))}`;
      const response = await generateWithSlm('fix', source ? compactSource ? quotedSourcePrompt(SOURCE_REVIEW_COMPACT_PROMPT, batch, expected.length) : SOURCE_REVIEW_PROMPT : options.actionAudit ? `${prompt}\n${ACTION_AUDIT}` : prompt, input,
        { preferModel: options.model, providerMode: 'ollama', responseSchema: source?.schema || reviewSchema(batch, expected, options.reviewContract), timeoutMs: Math.min(45_000, options.deadline - Date.now()), beforeRequest: options.beforeRequest });
      modelResponseReceived = true;
      model = response.model;
      batchModel = response.model;
      const result = source ? parseSourceReview(response.text, batch, expected, compactSource) : parseReviewJson(response.text, batch, expected, options.reviewContract);
      applyBatch(result, 'detector', options.suspicions);
      if (result.discoveries.length || result.assessments.some(item => item.assessment.stance !== 'dismissed')) suspiciousBatchCount++;
      analyses.push(result.analysis);
      reviewedChunkIds.push(...batch.map(chunk => chunk.chunkId));
      options.onBatchReviewed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model, audit: acceptedBatchSummary(expected.length, result) });
    } catch (error) {
      // Chỉ thử lại khi chưa có phản hồi hợp lệ; giữ nguyên request và chừa 45 giây cho Verifier.
      // Không dùng nhãn hoặc lý do model để quyết định gọi lại, không tăng deadline tổng.
      if (options.recoverTimeoutOnce && !modelResponseReceived && !timeoutRecoveryUsed && options.onBatchFailed
        && !(error instanceof SlmConnectionError) && error instanceof Error && /^Analysis timeout:/i.test(error.message)
        && options.deadline - Date.now() >= 90_000) {
        timeoutRecoveryUsed = true;
        queue.splice(queueIndex, 0, batch);
        options.onBatchFailed({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error,
          durationMs: Date.now() - started, recoveryScheduled: true });
        continue;
      }
      // Split-batch recovery: khi output bị cắt và batch có ≥2 chunk, chia nhỏ và thêm vào queue.
      // Batch con còn nhiều đoạn có thể chia tiếp; deadline và số đoạn chặn số lượt.
      if (error instanceof SlmOutputTruncatedError && batch.length >= 2) {
        const mid = Math.ceil(batch.length / 2);
        const splitBatches = [batch.slice(0, mid), batch.slice(mid)];
        // Chèn vào đầu phần còn lại của queue (sau vị trí hiện tại).
        queue.splice(queueIndex, 0, ...splitBatches);
        options.onBatchFailed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error, durationMs: Date.now() - started, recoveryScheduled: true });
        continue;
      }
      options.onBatchFailed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error, durationMs: Date.now() - started });
      // Chỉ cô lập lỗi phản hồi; lỗi kết nối/thời gian vẫn dừng, không gọi lại.
      if (!options.onBatchFailed || !(error instanceof InvalidAgentResponse || error instanceof SlmOutputTruncatedError)) throw error;
    }
  }
  return { model, batchCount: initialBatches.length, suspiciousBatchCount, semanticAnalysis: analyses.join('\n'), reviewedChunkIds };
}
