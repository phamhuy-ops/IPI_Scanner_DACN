import { IpiCheckVerdict } from '../../../types';
import { generateWithSlm, parseSlmJson } from '../slmClient';
import { formatChunkEvidence } from './evidence';
import { VERIFIER_SYSTEM_PROMPT } from './prompts';
import { DetectorReview, SemanticChunk, SemanticCoverage } from './types';

export async function runVerifierAgent(options: {
  chunks: SemanticChunk[];
  coverage?: SemanticCoverage;
  detectorReview: DetectorReview;
  initialFindingCount: number;
  model?: string;
}): Promise<IpiCheckVerdict> {
  const prompt = [
    `Detector Agent risk level: ${options.detectorReview.semanticRiskLevel}.`,
    `Detector summary: "${options.detectorReview.semanticAnalysis}".`,
    `Detector reviewed ${options.chunks.length} chunk(s) in ${options.detectorReview.batchCount} batch(es); ${options.detectorReview.suspiciousBatchCount} batch(es) flagged IPI.`,
    `Heuristic finding count: ${options.initialFindingCount}.`,
    `Evidence package (risk-aware coverage):\n${formatChunkEvidence(options.chunks).slice(0, options.coverage?.verifierEvidenceCharacters || 7600)}`,
  ].join('\n\n');
  const response = await generateWithSlm('check', VERIFIER_SYSTEM_PROMPT, prompt, {
    preferModel: options.model,
    providerMode: 'ollama',
  });
  const parsed = parseSlmJson<{ verdict?: 'pass' | 'fail'; reasons?: string[]; residualRisks?: string[] }>(response.text);
  const verdict = parsed.verdict === 'pass' && options.initialFindingCount === 0 ? 'pass' : 'fail';

  return {
    verdict,
    reasons: parsed.reasons || [
      verdict === 'pass'
        ? 'Document has no context-breaking or system-prompt override instructions.'
        : `Confirmed ${options.initialFindingCount} potentially harmful instruction(s) in the document.`,
    ],
    residualRisks: parsed.residualRisks || [],
    modelUsed: response.model,
    providerUsed: response.providerId,
  };
}
