import { IpiSuspicion } from '../../../types';
import { SemanticChunk } from './types';
import { REFERENCE_VERIFIER_PROMPT } from './referencePrompts';
import { COMPACT_REASON_LIMIT } from './sourceReferences';
import { InvalidAgentResponse, parseAgentBatch } from './reviewPolicy';

// Chỉ đổi hợp đồng đầu ra; giữ nguyên các chỉ dẫn đánh giá và nguồn của Verifier.
export const COMPACT_VERIFIER_PROMPT = REFERENCE_VERIFIER_PROMPT.replace(
  'Return JSON with analysis, assessments, discoveries.',
  'Return JSON with ONLY assessments and discoveries. Do not output analysis or any other top-level field.',
) + `\nKeep each reason to ONE concise sentence, 20-${COMPACT_REASON_LIMIT} characters. No preamble, chain of thought, repeated explanation or text outside JSON. Return complete arrays and close the JSON object.`;

export function parseCompactVerifierJson(raw: string, chunks: SemanticChunk[], expected: IpiSuspicion[]) {
  try {
    const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some(key => !['assessments', 'discoveries'].includes(key)) ||
      !Array.isArray(data.assessments) || !Array.isArray(data.discoveries)) throw new InvalidAgentResponse('Sai cấu trúc JSON Verifier rút gọn.');
    for (const row of [...data.assessments, ...data.discoveries]) {
      if (typeof row?.reason !== 'string' || Array.from(row.reason).length > COMPACT_REASON_LIMIT) throw new InvalidAgentResponse('Lý do Verifier vượt giới hạn hoặc sai kiểu.');
    }
    // Chuỗi nội bộ để tái dùng validator; không phải lời giải thích do model sinh.
    return parseAgentBatch({ ...data, analysis: 'Phản hồi Verifier rút gọn.' }, chunks, expected, 'referenced-v1');
  } catch (error) {
    if (error instanceof InvalidAgentResponse) throw error;
    throw new InvalidAgentResponse('JSON Verifier rút gọn không hợp lệ.');
  }
}
