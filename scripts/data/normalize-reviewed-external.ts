import { buildVerifierInput, validateDraftResponse } from './verifier-batch-renderer';

type Reviewed = { label: string; stance: string; addressee: string; framing: string; deviation: string;
  hasDirective: boolean; reason: string; language: string; target_quote?: string };

export function normalizeExternal(text: string, reviewed: Reviewed, mode: 'whole_source' | 'none') {
  const excerpt = (quote: string) => {
    const start = text.indexOf(quote);
    if (!quote || start < 0 || text.indexOf(quote, start + 1) !== -1) throw new Error('Bằng chứng phải có duy nhất một lần trong nguồn.');
    return { start, end: start + quote.length, quote,
      start_line: text.slice(0, start).split(/\r\n?|\n/).length,
      end_line: text.slice(0, start + quote.length).split(/\r\n?|\n/).length };
  };
  // Nếu lần duyệt chưa chỉ ra quote riêng, giữ toàn nguồn đã xem, không đoán span theo keyword.
  const focus = reviewed.target_quote || text;
  const fields = { stance: reviewed.stance, addressee: reviewed.addressee, framing: reviewed.framing,
    deviation: reviewed.deviation, hasDirective: reviewed.hasDirective, reason: reviewed.reason };
  const annotation = { label: reviewed.label, ...fields,
    directive_spans: reviewed.hasDirective ? [excerpt(focus)] : [],
    context_spans: [excerpt(text)], uncertainty_notes: [] };
  const input = { text, format: '.txt', candidate_mode: mode };
  const output = buildVerifierInput(input);
  if (output.chunks.length !== 1) throw new Error('Không tự cắt nguồn dài hoặc mất ngữ cảnh; cách ly để xử lý riêng.');
  const assessments = output.expected.map(item => {
    const ref = output.refs.find(ref => ref.text === item.originalQuote && ref.chunkId === item.citation?.chunkId);
    if (!ref) throw new Error('Không ràng buộc được nghi vấn toàn nguồn.');
    return { id: item.id, spanId: ref.id, ...fields };
  });
  const discoveries: Array<Record<string, unknown>> = [];
  if (mode === 'none' && reviewed.label !== 'benign') {
    const ref = output.refs.filter(ref => ref.text.includes(focus)).sort((a, b) => a.text.length - b.text.length)[0];
    if (!ref) throw new Error('Không có mã đoạn cho bằng chứng đã duyệt.');
    discoveries.push({ spanId: ref.id, ...fields });
  }
  const response = { assessments, discoveries };
  return { annotation, response, payload: output.payload,
    validation: validateDraftResponse(input, response, annotation) };
}
