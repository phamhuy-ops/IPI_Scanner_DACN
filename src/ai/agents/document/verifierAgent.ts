import { IpiSuspicion, ReviewContract, VerifierOutputFormat } from '../../../types';
import { generateWithSlm } from '../slmClient';
import { evidenceBatches, formatChunkEvidence } from './evidence';
import { VERIFIER_SYSTEM_PROMPT } from './prompts';
import { STRUCTURED_VERIFIER_PROMPT } from './structuredPrompts';
import { REFERENCE_VERIFIER_PROMPT } from './referencePrompts';
import { referenceBatches, referenceEvidence, referenceReviewSchema } from './sourceReferences';
import { COMPACT_VERIFIER_PROMPT, parseCompactVerifierJson } from './compactVerifier';
import { applyBatch, parseReviewJson, reviewSchema } from './reviewPolicy';
import { DetectorReview, SemanticChunk, SemanticCoverage } from './types';

export async function runVerifierAgent(options: {
  chunks: SemanticChunk[];
  suspicions: IpiSuspicion[];
  coverage?: SemanticCoverage;
  detectorReview: DetectorReview;
  model?: string;
  deadline: number;
  reviewContract?: ReviewContract;
  outputFormat?: VerifierOutputFormat;
}): Promise<{ modelUsed: string; providerUsed: string; reviewedChunkIds: string[] }> {
  const compact = options.outputFormat === 'compact-v1';
  if (compact && options.reviewContract !== 'referenced-v1') throw new Error('Verifier rút gọn yêu cầu hợp đồng referenced-v1.');
  const batches = options.reviewContract === 'referenced-v1'
    ? referenceBatches(options.chunks, options.suspicions, options.coverage?.verifierEvidenceCharacters || 7600)
    : evidenceBatches(options.chunks, options.coverage?.verifierEvidenceCharacters || 7600);
  const reviewedChunkIds: string[] = [];
  let modelUsed = options.model || 'qwen2.5-coder:1.5b';
  let providerUsed = 'ollama';
  for (const batch of batches) {
    const expected = options.suspicions.filter(item => item.citation && batch.some(chunk => chunk.chunkId === item.citation?.chunkId));
    // First round: do not expose Detector conclusions/reasoning. Compare the
    // independent assessments in code, avoiding simple agreement by copying.
    const evidenceOnly = expected.map(item => ({ id: item.id, source: item.source, originalQuote: item.originalQuote, citation: item.citation }));
    const referenced = options.reviewContract === 'referenced-v1';
    const response = await generateWithSlm('check', compact ? COMPACT_VERIFIER_PROMPT : referenced ? REFERENCE_VERIFIER_PROMPT : options.reviewContract === 'structured-v1' ? STRUCTURED_VERIFIER_PROMPT : VERIFIER_SYSTEM_PROMPT,
      `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicious excerpts to examine independently:\n${referenced ? referenceEvidence(batch, expected) : JSON.stringify(evidenceOnly)}\n\nOriginal document evidence:\n${formatChunkEvidence(batch)}\nReturn the JSON review now. Discoveries must be new attack instructions only.`,
      { preferModel: options.model, providerMode: 'ollama', responseSchema: compact ? referenceReviewSchema(batch, expected, true) : reviewSchema(batch, expected, options.reviewContract), timeoutMs: Math.min(45_000, options.deadline - Date.now()) });
    const result = compact ? parseCompactVerifierJson(response.text, batch, expected) : parseReviewJson(response.text, batch, expected, options.reviewContract);
    applyBatch(result, 'verifier', options.suspicions);
    modelUsed = response.model; providerUsed = response.providerId;
    reviewedChunkIds.push(...batch.map(chunk => chunk.chunkId));
  }
  return { modelUsed, providerUsed, reviewedChunkIds };
}
