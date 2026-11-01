import { candidateChunks, candidateReviewSchema, CANDIDATE_VERIFIER_PROMPT, parseCandidateReview } from './candidateVerification';
import { IpiSuspicion, ReviewContract, VerifierOutputFormat } from '../../../types';
import { generateWithSlm } from '../slmClient';
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
import { classicSpanPrompt } from './classicSpans';
import { acceptedBatchSummary } from './reviewProgress';

export async function runVerifierAgent(options: {
  chunks: SemanticChunk[];
  suspicions: IpiSuspicion[];
  coverage?: SemanticCoverage;
  detectorReview: DetectorReview;
  model?: string;
  deadline: number;
  reviewContract?: ReviewContract;
  outputFormat?: VerifierOutputFormat;
  referenceBatchSize?: number;
  actionAudit?: boolean;
  suppliedOnly?: boolean;
  evidencePresentation?: 'stable-alias-v1';
  sourceContext?: boolean;
  separateSourceViews?: boolean;
  beforeRequest?: () => void;
  onBatchReviewed?: (batch: ReviewedBatch) => void;
  onBatchFailed?: (batch: FailedBatch) => void;
}): Promise<{ modelUsed: string; providerUsed: string; reviewedChunkIds: string[] }> {
  if (options.suppliedOnly && ((options.reviewContract && options.reviewContract !== 'classic-v1') || (options.outputFormat && options.outputFormat !== 'standard'))) throw new Error('Bản thử tách vai trò chỉ hỗ trợ classic-v1/standard.');
  const chunks = options.suppliedOnly ? candidateChunks(options.chunks, options.suspicions) : options.chunks;
  const compact = options.outputFormat === 'compact-v1';
  if (compact && options.reviewContract !== 'referenced-v1') throw new Error('Verifier rút gọn yêu cầu hợp đồng referenced-v1.');
  const spanOnly = options.reviewContract === 'classic-spans-v1';
  const batches = options.reviewContract === 'referenced-v1' || spanOnly
    ? referenceBatches(chunks, options.suspicions, options.coverage?.verifierEvidenceCharacters || 7600, options.referenceBatchSize)
    : verifierEvidenceBatches(chunks, options.coverage?.verifierEvidenceCharacters || 7600, options.separateSourceViews ? options.suspicions : undefined);
  const reviewedChunkIds: string[] = [];
  let modelUsed = options.model || 'qwen2.5-coder:1.5b';
  let providerUsed = 'ollama';
  for (const batch of batches) {
    const started = Date.now();
    let batchModel = options.model || modelUsed;
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
      const response = await generateWithSlm('check', options.actionAudit ? `${prompt}\n${ACTION_AUDIT}` : prompt,
        `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicious excerpts to examine independently:\n${referenced ? referenceEvidence(batch, expected) : JSON.stringify(suppliedEvidence)}\n\nOriginal document evidence:\n${formatChunkEvidence(batch)}\nReturn the JSON review now. ${options.suppliedOnly ? 'Only assess supplied IDs; discoveries MUST be [].' : 'Discoveries must be new attack instructions only.'}`,
        { preferModel: options.model, providerMode: 'ollama', responseSchema: options.suppliedOnly ? candidateReviewSchema(batch, expected) : compact ? referenceReviewSchema(batch, expected, true) : reviewSchema(batch, expected, options.reviewContract), timeoutMs: Math.min(45_000, options.deadline - Date.now()), beforeRequest: options.beforeRequest });
      batchModel = response.model;
      const result = options.suppliedOnly ? parseCandidateReview(response.text, batch, expected) : compact ? parseCompactVerifierJson(response.text, batch, expected) : parseReviewJson(response.text, batch, expected, options.reviewContract);
      applyBatch(result, 'verifier', options.suspicions);
      modelUsed = response.model; providerUsed = response.providerId;
      reviewedChunkIds.push(...batch.map(chunk => chunk.chunkId));
      options.onBatchReviewed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: modelUsed, audit: acceptedBatchSummary(expected.length, result) });
    } catch (error) {
      options.onBatchFailed?.({ chunkIds: batch.map(chunk => chunk.chunkId), model: batchModel, error, durationMs: Date.now() - started });
      if (!options.onBatchFailed || !(error instanceof InvalidAgentResponse || error instanceof SlmOutputTruncatedError)) throw error;
    }
  }
  return { modelUsed, providerUsed, reviewedChunkIds };
}
