import { IpiSuspicion } from '../../../types';
import { SemanticChunk } from './types';
import { buildSourceReferences, suspicionReference, SourceReference } from './sourceReferences';

// Chỉ thay biểu diễn trích dẫn, không thêm trường suy luận/ngữ cảnh hoặc sửa stance.
export function classicSpanPrompt(prompt: string): string {
  const replacements = [
    ['quote an EXACT, nonempty substring from its original chunk', 'select an exact spanId from the original-source reference table'],
    ['Each assessment has exactly these fields: id (copy the actual suspicion ID), stance (confirmed, dismissed, or uncertain), reason (context/intent explanation at least 20 characters), chunkId (copy the actual chunk ID), quote (copy original text exactly).',
      'Each assessment has exactly these fields: id (copy the actual suspicion ID), stance (confirmed, dismissed, or uncertain), reason (context/intent explanation at least 20 characters), spanId (copy the bound source reference ID).'],
    ['Each discovery has stance, reason, chunkId and quote with the same meaning, but no id.', 'Each discovery has stance, reason and spanId (copy an actual source reference ID), but no id. Never output chunkId or quote; the application retrieves the original text.'],
  ];
  for (const [before, after] of replacements) {
    if (!prompt.includes(before)) throw new Error('Prompt gốc đã đổi; chưa thể áp dụng hợp đồng span cổ điển.');
    prompt = prompt.replace(before, after);
  }
  return prompt;
}

export function classicSpanSchema(chunks: SemanticChunk[], expected: IpiSuspicion[]): Record<string, unknown> {
  const refs = buildSourceReferences(chunks, expected);
  if (!refs.length) throw new Error('Không có tham chiếu nguồn.');
  const fields = { stance: { type: 'string', enum: ['confirmed', 'dismissed', 'uncertain'] },
    reason: { type: 'string', minLength: 20 }, spanId: { type: 'string', enum: refs.map(ref => ref.id) } };
  const variants = expected.map(item => {
    const ref = suspicionReference(item, refs, chunks);
    if (!ref) throw new Error('Không tìm được tham chiếu ứng viên.');
    return { type: 'object', additionalProperties: false, required: ['id', 'stance', 'reason', 'spanId'],
      properties: { ...fields, id: { type: 'string', enum: [item.id] }, spanId: { type: 'string', enum: [ref.id] } } };
  });
  return { type: 'object', additionalProperties: false, required: ['analysis', 'assessments', 'discoveries'], properties: {
    analysis: { type: 'string', minLength: 3 }, assessments: { type: 'array', minItems: expected.length, maxItems: expected.length,
      items: variants.length ? { anyOf: variants } : { type: 'object', additionalProperties: false, properties: {} } },
    discoveries: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['stance', 'reason', 'spanId'],
      properties: { ...fields, stance: { type: 'string', enum: ['confirmed', 'uncertain'] } } } },
  } };
}

export function expandClassicSpans(value: unknown, chunks: SemanticChunk[], expected: IpiSuspicion[]) {
  const refs = buildSourceReferences(chunks, expected);
  const record = (value: unknown, keys: string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Phản hồi span phải là object.');
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some(key => !keys.includes(key))) throw new Error('Trường ngoài hợp đồng span.');
    return row;
  };
  const data = record(value, ['analysis', 'assessments', 'discoveries']);
  if (!Array.isArray(data.assessments) || !Array.isArray(data.discoveries)) throw new Error('Thiếu mảng nhận định span.');
  const selected: SourceReference[] = [];
  const expand = (value: unknown, supplied: boolean) => {
    const row = record(value, [...(supplied ? ['id'] : []), 'stance', 'reason', 'spanId']);
    const ref = refs.find(item => item.id === row.spanId);
    if (!ref) throw new Error('spanId không thuộc batch nguồn.');
    if (supplied) {
      const original = expected.find(item => item.id === row.id);
      if (!original || suspicionReference(original, refs, chunks)?.id !== ref.id) throw new Error('spanId không khớp ứng viên đã giao.');
    }
    selected.push(ref);
    return { ...(supplied ? { id: row.id } : {}), stance: row.stance, reason: row.reason, chunkId: ref.chunkId, quote: ref.text };
  };
  return { value: { analysis: data.analysis, assessments: data.assessments.map(row => expand(row, true)), discoveries: data.discoveries.map(row => expand(row, false)) }, selected };
}
