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
    `Detector Agent báo cáo rủi ro: ${options.detectorReview.semanticRiskLevel}.`,
    `Nhận định của Detector: "${options.detectorReview.semanticAnalysis}".`,
    `Detector đã đánh giá ${options.chunks.length} chunk trong ${options.detectorReview.batchCount} batch; ${options.detectorReview.suspiciousBatchCount} batch báo có IPI.`,
    `Số lượng Heuristic findings: ${options.initialFindingCount}.`,
    `Evidence package đã chọn theo risk-aware coverage:\n${formatChunkEvidence(options.chunks).slice(0, options.coverage?.verifierEvidenceCharacters || 7600)}`,
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
        ? 'Tài liệu không chứa chỉ thị phá vỡ ngữ cảnh hoặc override system prompt.'
        : `Xác nhận tồn tại ${options.initialFindingCount} chỉ thị độc hại tiềm ẩn trong tài liệu.`,
    ],
    residualRisks: parsed.residualRisks || [],
    modelUsed: response.model,
    providerUsed: response.providerId,
  };
}
