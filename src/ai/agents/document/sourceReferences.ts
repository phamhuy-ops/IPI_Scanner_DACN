import { IpiSuspicion } from '../../../types';
import { SemanticChunk } from './types';
import { ADDRESSEES, DEVIATIONS, FRAMINGS } from './directiveContext';
import { formatChunkEvidence } from './evidence';

export interface SourceReference {
  id: string;
  chunkId: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

// Mã chỉ có ý nghĩa trong batch hiện tại; không chứa nhãn hoặc nguồn dataset.
export function buildSourceReferences(chunks: SemanticChunk[], expected: IpiSuspicion[]): SourceReference[] {
  const refs: SourceReference[] = [];
  const add = (chunk: SemanticChunk, start: number, end: number, trim = true) => {
    const raw = chunk.text.slice(start, end);
    const leading = trim ? raw.length - raw.trimStart().length : 0;
    const trailing = trim ? raw.length - raw.trimEnd().length : 0;
    start += leading; end -= trailing;
    if (end - start < 3) return;
    if (!refs.some(ref => ref.chunkId === chunk.chunkId && ref.startOffset === start && ref.endOffset === end)) {
      refs.push({ id: `ref-${refs.length + 1}`, chunkId: chunk.chunkId, text: chunk.text.slice(start, end), startOffset: start, endOffset: end });
    }
  };
  for (const chunk of chunks) {
    const addBounded = (from: number, to: number) => {
      while (to - from > 400) {
        let end = from + 400;
        const space = chunk.text.lastIndexOf(' ', end);
        if (space > from + 200) end = space;
        if (/[\uD800-\uDBFF]/.test(chunk.text[end - 1]) && /[\uDC00-\uDFFF]/.test(chunk.text[end])) end++;
        add(chunk, from, end); from = end;
      }
      add(chunk, from, to);
    };
    // Tách theo dấu kết câu/xuống dòng, giới hạn độ dài; luôn có cả chunk dự phòng.
    let start = 0;
    for (const match of chunk.text.matchAll(/[.!?;](?=\s|$)|\r\n|\r|\n/g)) {
      const end = match.index! + match[0].length;
      addBounded(start, end); start = end;
    }
    addBounded(start, chunk.text.length);
    add(chunk, 0, chunk.text.length);
  }
  for (const item of expected) {
    const citation = item.citation;
    if (!citation) continue;
    const chunk = chunks.find(row => row.chunkId === citation.chunkId);
    if (!chunk) continue;
    let offset = chunk.text.indexOf(citation.quote);
    while (offset >= 0) {
      const line = chunk.startLine + chunk.text.slice(0, offset).split(/\r\n?|\n/).length - 1;
      if (line === citation.startLine) { add(chunk, offset, offset + citation.quote.length, false); break; }
      offset = chunk.text.indexOf(citation.quote, offset + 1);
    }
  }
  return refs;
}

export function suspicionReference(item: IpiSuspicion, refs: SourceReference[], chunks: SemanticChunk[]) {
  return refs.find(ref => {
    if (ref.chunkId !== item.citation?.chunkId || ref.text !== item.citation.quote) return false;
    const chunk = chunks.find(row => row.chunkId === ref.chunkId)!;
    return chunk.startLine + chunk.text.slice(0, ref.startOffset).split(/\r\n?|\n/).length - 1 === item.citation.startLine;
  });
}

export const COMPACT_REASON_LIMIT = 240;

export function referenceReviewSchema(chunks: SemanticChunk[], expected: IpiSuspicion[], compact = false): Record<string, unknown> {
  const refs = buildSourceReferences(chunks, expected);
  if (!refs.length) throw new Error('Không có đoạn nguồn đủ dài để tham chiếu.');
  const required = ['spanId', 'addressee', 'framing', 'deviation', 'hasDirective', 'stance', 'reason'];
  const properties = { spanId: { type: 'string', enum: refs.map(ref => ref.id) },
    addressee: { type: 'string', enum: ADDRESSEES }, framing: { type: 'string', enum: FRAMINGS },
    deviation: { type: 'string', enum: DEVIATIONS }, hasDirective: { type: 'boolean' },
    stance: { type: 'string', enum: ['confirmed', 'dismissed', 'uncertain'] },
    reason: { type: 'string', minLength: 20, ...(compact ? { maxLength: COMPACT_REASON_LIMIT } : {}) } };
  const variants = expected.map(item => {
    const ref = suspicionReference(item, refs, chunks);
    if (!ref) throw new Error('Không ánh xạ được nghi vấn về mã nguồn trong batch.');
    return { type: 'object', additionalProperties: false, required: ['id', ...required],
      properties: { ...properties, id: { type: 'string', enum: [item.id] }, spanId: { type: 'string', enum: [ref.id] } } };
  });
  return { type: 'object', additionalProperties: false, required: [...(!compact ? ['analysis'] : []), 'assessments', 'discoveries'], properties: {
    ...(!compact ? { analysis: { type: 'string', minLength: 3 } } : {}),
    assessments: { type: 'array', minItems: expected.length, maxItems: expected.length,
      items: variants.length ? { anyOf: variants } : { type: 'object', properties: {}, additionalProperties: false } },
    discoveries: { type: 'array', items: { type: 'object', additionalProperties: false, required,
      properties: { ...properties, addressee: { type: 'string', enum: ['assistant', 'unclear'] },
        framing: { type: 'string', enum: ['active', 'unclear'] }, deviation: { type: 'string', enum: DEVIATIONS.filter(value => value !== 'none') },
        hasDirective: { type: 'boolean', enum: [true] }, stance: { type: 'string', enum: ['confirmed', 'uncertain'] } } } },
  } };
}

export function referenceEvidence(chunks: SemanticChunk[], expected: IpiSuspicion[]): string {
  const refs = buildSourceReferences(chunks, expected);
  return JSON.stringify({ suspicions: expected.map(item => ({ id: item.id, spanId: suspicionReference(item, refs, chunks)?.id })),
    spans: refs.map(ref => ({ spanId: ref.id, chunkId: ref.chunkId, text: ref.text })) });
}

// Tính cả bảng mã và văn bản gốc; không âm thầm cắt nguồn khi payload lớn hơn.
export function referenceBatches(chunks: SemanticChunk[], expected: IpiSuspicion[], characterBudget: number,
  maxBatchSize = Number.MAX_SAFE_INTEGER): SemanticChunk[][] {
  if (!Number.isFinite(characterBudget) || characterBudget < 1 || !Number.isSafeInteger(maxBatchSize) || maxBatchSize < 1) throw new Error('Ngân sách tham chiếu không hợp lệ.');
  const size = (batch: SemanticChunk[]) => {
    const records = expected.filter(item => batch.some(chunk => chunk.chunkId === item.citation?.chunkId));
    return referenceEvidence(batch, records).length + formatChunkEvidence(batch).length;
  };
  const batches: SemanticChunk[][] = [];
  let current: SemanticChunk[] = [];
  for (const chunk of chunks) {
    if (size([chunk]) > characterBudget) throw new Error('Ngân sách không đủ chứa toàn bộ chunk và bảng tham chiếu.');
    if (current.length && (current.length >= maxBatchSize || size([...current, chunk]) > characterBudget)) {
      batches.push(current); current = [];
    }
    current.push(chunk);
  }
  if (current.length) batches.push(current);
  return batches;
}

export function expandReferenceResponse(value: unknown, chunks: SemanticChunk[], expected: IpiSuspicion[]) {
  const refs = buildSourceReferences(chunks, expected);
  function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Phản hồi tham chiếu phải là object.');
    return value as Record<string, unknown>;
  }
  const data = object(value);
  if (Object.keys(data).some(key => !['analysis', 'assessments', 'discoveries'].includes(key)) || !Array.isArray(data.assessments) || !Array.isArray(data.discoveries)) throw new Error('Sai cấu trúc phản hồi tham chiếu.');
  const assessmentRefs: SourceReference[] = [], discoveryRefs: SourceReference[] = [];
  function expand(value: unknown, discovery: boolean) {
    const row = object(value);
    const keys = ['spanId', 'addressee', 'framing', 'deviation', 'hasDirective', 'stance', 'reason', ...(!discovery ? ['id'] : [])];
    if (Object.keys(row).some(key => !keys.includes(key)) || keys.some(key => !(key in row))) throw new Error('Sai trường nhận định bằng mã nguồn.');
    if (typeof row.hasDirective !== 'boolean' || typeof row.spanId !== 'string') throw new Error('Sai kiểu mã nguồn hoặc cờ directive.');
    const ref = refs.find(item => item.id === row.spanId);
    if (!ref) throw new Error('Mã đoạn nguồn không tồn tại trong batch.');
    if (!discovery) {
      const original = expected.find(item => item.id === row.id);
      if (!original || suspicionReference(original, refs, chunks)?.id !== ref.id) throw new Error('Mã nguồn không thuộc nghi vấn đang được đánh giá.');
    }
    const chunk = chunks.find(item => item.chunkId === ref.chunkId)!;
    (discovery ? discoveryRefs : assessmentRefs).push(ref);
    return { ...(!discovery ? { id: row.id } : {}), stance: row.stance, reason: row.reason, chunkId: ref.chunkId, quote: ref.text,
      directiveContext: { addressee: row.addressee, framing: row.framing, deviation: row.deviation,
        directive: row.hasDirective ? ref.text : null, contextQuote: chunk.text } };
  }
  return { data: { analysis: data.analysis, assessments: data.assessments.map(row => expand(row, false)), discoveries: data.discoveries.map(row => expand(row, true)) },
    assessmentRefs, discoveryRefs };
}
