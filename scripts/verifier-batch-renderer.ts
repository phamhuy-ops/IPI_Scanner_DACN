import { IpiSuspicion } from '../src/types';
import { SemanticChunk } from '../src/ai/agents/document/types';
import { citationFor } from '../src/ai/agents/document/reviewPolicy';
import { COMPACT_VERIFIER_PROMPT, parseCompactVerifierJson } from '../src/ai/agents/document/compactVerifier';
import { buildSourceReferences, referenceBatches, referenceEvidence, referenceReviewSchema } from '../src/ai/agents/document/sourceReferences';
import { formatChunkEvidence } from '../src/ai/agents/document/evidence';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { scanTextForIpi } = require('../engine/prefilter/document-prefilter.js');
const { createSemanticChunks, annotateChunkRisk, selectSemanticChunks } = require('../engine/document/chunking/semantic-chunker.js');

type Annotation = {
  label: string; stance: string; addressee: string; framing: string; deviation: string;
  hasDirective: boolean; reason: string; directive_spans: Array<{ quote: string }>;
};
type CaseInput = { text: string; format: string; candidate_mode: string };

// Hàm này không nhận nhãn, gold hoặc ID ca, nhằm giữ input độc lập đáp án.
export function buildVerifierInput(input: CaseInput) {
  if (!['.txt', '.md', '.html'].includes(input.format) || !['supplied', 'none'].includes(input.candidate_mode)) throw new Error('Sai định dạng hoặc chế độ candidate.');
  const fileName = `document${input.format}`;
  const findings = scanTextForIpi(input.text, fileName);
  const original = createSemanticChunks(input.text, fileName, fileName, undefined, undefined, true);
  annotateChunkRisk(original, findings);
  const chunks: SemanticChunk[] = selectSemanticChunks(original, original.length)
    .map((chunk: SemanticChunk, index: number) => ({ ...chunk, sourceChunkId: chunk.chunkId, chunkId: `chunk-${index + 1}`,
      ...(input.format === '.html' ? { sourceView: 'raw-html', lineBasis: 'source' } : {}) }));
  const expected: IpiSuspicion[] = [];
  if (input.candidate_mode === 'supplied') {
    const quote = input.text.split(/\r\n?|\n/).filter(line => line.trim())[1];
    const chunk = chunks.find(item => quote && item.text.includes(quote));
    if (!quote || !chunk) throw new Error('Không ánh xạ được candidate dòng 2 vào nguồn.');
    expected.push({ id: 'suspicion-1', source: 'detector', location: `${fileName}:${chunk.startLine}`,
      originalQuote: quote, citation: citationFor(chunk.chunkId, quote, chunks), detector: null, verifier: null, status: 'unresolved' });
  }
  // source=detector ở object tương thích type chỉ là stub; không có model Detector được gọi.
  const batches = referenceBatches(chunks, expected, 7600);
  if (batches.length !== 1) throw new Error('Batch đầu yêu cầu trọn nguồn trong một request; không cắt để vừa ngân sách.');
  const user = `Required assessment IDs: ${JSON.stringify(expected.map(item => item.id))}. ${expected.length ? 'Copy these exact IDs into assessments.' : 'No supplied suspicions: assessments MUST be [].'}\nSuspicious excerpts to examine independently:\n${referenceEvidence(chunks, expected)}\n\nOriginal document evidence:\n${formatChunkEvidence(chunks)}\nReturn the JSON review now. Discoveries must be new attack instructions only.`;
  const payload = { messages: [{ role: 'system', content: COMPACT_VERIFIER_PROMPT }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: { name: 'ipi_review', strict: true, schema: referenceReviewSchema(chunks, expected, true) } } };
  return { chunks, expected, refs: buildSourceReferences(chunks, expected), payload, ruleFindingCount: findings.length };
}

export function validateDraftResponse(input: CaseInput, response: unknown, annotation: Annotation) {
  const rendered = buildVerifierInput(input);
  const parsed = parseCompactVerifierJson(JSON.stringify(response), rendered.chunks, rendered.expected);
  const assessments = parsed.assessments.map(row => row.assessment);
  const all = [...assessments, ...parsed.discoveries];
  const confirmed = all.filter(row => row.stance === 'confirmed');
  const uncertain = all.filter(row => row.stance === 'uncertain');
  if (annotation.label === 'benign' && (confirmed.length || uncertain.length || parsed.discoveries.length)) throw new Error('Đáp án mẫu sạch không được chứa xác nhận/phát hiện mới.');
  if (annotation.label === 'malicious' && !confirmed.length) throw new Error('Mẫu malicious thiếu xác nhận.');
  if (annotation.label === 'uncertain' && (!uncertain.length || confirmed.length)) throw new Error('Mẫu thiếu ngữ cảnh cần uncertain và không được xác nhận.');
  const focus = annotation.directive_spans[0]?.quote;
  const relevant = [...confirmed, ...uncertain];
  if (annotation.label !== 'benign' && !relevant.some(row => focus && row.citation.quote.includes(focus))) throw new Error('Bằng chứng đáp án không chứa chỉ dẫn được chú thích.');
  return { parser_valid: true, assessment_count: parsed.assessments.length, discovery_count: parsed.discoveries.length,
    source_grounded: true, semantic_human_verified: false };
}

export function renderDraft(input: CaseInput, annotation: Annotation) {
  const rendered = buildVerifierInput(input);
  const focus = annotation.directive_spans[0]?.quote;
  if (!focus || !input.text.includes(focus)) throw new Error('Thiếu chỉ dẫn được chú thích.');
  const focusRef = rendered.refs.filter(ref => ref.text.includes(focus)).sort((a, b) => a.text.length - b.text.length)[0];
  if (!focusRef) throw new Error('Không có mã nguồn chứa đủ chỉ dẫn, không sửa hoặc rút ngắn gold.');
  const fields = { addressee: annotation.addressee, framing: annotation.framing, deviation: annotation.deviation,
    hasDirective: annotation.hasDirective, stance: annotation.stance, reason: annotation.reason };
  let candidateCoversFocus = false;
  const assessments = rendered.expected.map(item => {
    const quote = item.citation!.quote;
    const ref = rendered.refs.find(row => row.chunkId === item.citation!.chunkId && row.text === quote)!;
    candidateCoversFocus = quote.includes(focus);
    return { id: item.id, spanId: ref.id, ...(candidateCoversFocus ? fields : {
      addressee: 'none', framing: 'descriptive', deviation: 'none', hasDirective: false, stance: 'dismissed',
      reason: 'Đoạn nghi vấn được cung cấp chỉ nêu thông tin nền, không chứa lệnh điều khiển assistant; cần xem phần nguồn còn lại riêng.' }) };
  });
  const discoveries = !candidateCoversFocus && annotation.label !== 'benign' ? [{ spanId: focusRef.id, ...fields }] : [];
  const response = { assessments, discoveries };
  return { ...rendered, response, validation: validateDraftResponse(input, response, annotation) };
}
