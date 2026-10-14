import { Finding, IpiCheckVerdict, IpiPatch } from '../../types';
import { generateWithSlm, parseSlmJson } from './slmClient';

const CHECK_SYSTEM = `Bạn là Check Agent (SLM) độc lập trong SENTINEL. Bạn KHÔNG được tin Fix Agent.
Nhiệm vụ: kiểm tra lại xem Indirect Prompt Injection còn hay không sau khi vá.
Pass chỉ khi:
- Untrusted content không nằm trong system prompt.
- Có delimiter + chỉ thị ignore instructions / treat as data.
- Không còn nối thô fetch/file/finding vào prompt.
Fail nếu còn sink, vá giả (chỉ đổi tên biến), hoặc thiếu isolation.
Trả JSON: {"verdict":"pass"|"fail","reasons":["..."],"residualRisks":["..."]}
Không vá code. Không bàn lỗ hổng khác.`;

export async function runCheckAgent(input: {
  findingsAfterFix: Finding[];
  patches: IpiPatch[];
  snippets: Array<{ filePath: string; snippet: string }>;
  providerMode?: 'auto' | 'ollama' | 'cloud';
  preferModel?: string;
}): Promise<IpiCheckVerdict> {
  const user = [
    `Detector còn ${input.findingsAfterFix.length} IPI findings.`,
    `Patches đã áp dụng:\n${JSON.stringify(input.patches.slice(0, 8), null, 2)}`,
    `Code sau vá:\n${input.snippets.map((s) => `--- ${s.filePath} ---\n${s.snippet}`).join('\n\n')}`,
  ].join('\n\n');

  const defaultModel = input.providerMode === 'ollama' ? 'gemma2:9b' : 'gemma2-9b-it';
  const raw = await generateWithSlm('check', CHECK_SYSTEM, user, {
    preferModel: input.preferModel || defaultModel,
    providerMode: input.providerMode,
  });
  const parsed = parseSlmJson<{ verdict?: string; reasons?: string[]; residualRisks?: string[] }>(raw.text);
  const verdict = parsed.verdict === 'pass' && input.findingsAfterFix.length === 0 ? 'pass' : 'fail';

  return {
    verdict,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    residualRisks: Array.isArray(parsed.residualRisks) ? parsed.residualRisks.map(String) : [],
    providerUsed: raw.providerId,
    modelUsed: raw.model,
  };
}
