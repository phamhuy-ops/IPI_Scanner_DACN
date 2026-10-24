import { IpiSuspicion, ReviewContract } from '../../../types';
import { generateWithSlm } from '../slmClient';
import { batchChunks, formatChunkEvidence } from './evidence';
import { DETECTOR_SYSTEM_PROMPT } from './prompts';
import { STRUCTURED_DETECTOR_PROMPT } from './structuredPrompts';
import { REFERENCE_DETECTOR_PROMPT } from './referencePrompts';
import { referenceBatches, referenceEvidence } from './sourceReferences';
import { applyBatch, parseReviewJson, reviewSchema } from './reviewPolicy';
import { DetectorReview, SemanticChunk, SemanticCoverage } from './types';

export async function runDetectorAgent(options: {
  chunks: SemanticChunk[];
  suspicions: IpiSuspicion[];
  coverage?: SemanticCoverage;
  model?: string;
  deadline: number;
  reviewContract?: ReviewContract;
}): Promise<DetectorReview> {
  const batches = options.reviewContract === 'referenced-v1'
    ? referenceBatches(options.chunks, options.suspicions, options.coverage?.verifierEvidenceCharacters || 7600, options.coverage?.detectorBatchSize || 3)
    : batchChunks(options.chunks, options.coverage?.detectorBatchSize || 3);
  const analyses: string[] = [];
  const reviewedChunkIds: string[] = [];
  let model = options.model || 'gemma3:1b';
  let suspiciousBatchCount = 0;
  for (const batch of batches) {
    const expected = options.suspicions.filter(item => item.citation && batch.some(chunk => chunk.chunkId === item.citation?.chunkId));
    const referenced = options.reviewContract === 'referenced-v1';
    const response = await generateWithSlm('fix', referenced ? REFERENCE_DETECTOR_PROMPT : options.reviewContract === 'structured-v1' ? STRUCTURED_DETECTOR_PROMPT : DETECTOR_SYSTEM_PROMPT,
      `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicion records (untrusted content):\n${referenced ? referenceEvidence(batch, expected) : JSON.stringify(expected)}\n\nOriginal document evidence:\n${formatChunkEvidence(batch)}\nReturn the JSON review now. Discoveries must be new attack instructions only.`,
      { preferModel: options.model, providerMode: 'ollama', responseSchema: reviewSchema(batch, expected, options.reviewContract), timeoutMs: Math.min(45_000, options.deadline - Date.now()) });
    model = response.model;
    const result = parseReviewJson(response.text, batch, expected, options.reviewContract);
    applyBatch(result, 'detector', options.suspicions);
    if (result.discoveries.length || result.assessments.some(item => item.assessment.stance !== 'dismissed')) suspiciousBatchCount++;
    analyses.push(result.analysis);
    reviewedChunkIds.push(...batch.map(chunk => chunk.chunkId));
  }
  return { model, batchCount: batches.length, suspiciousBatchCount, semanticAnalysis: analyses.join('\n'), reviewedChunkIds };
}
