import { beforeEach, expect, it, vi } from 'vitest';
import { generateWithSlm } from '../slmClient';
import { collectContextDependencies, contextDependencyBatch, contextDependencyRequest, parseContextDependencyFacts } from './contextDependencies';
import { applyBatch, conclude, InvalidAgentResponse } from './reviewPolicy';
import { buildSourceReferences } from './sourceReferences';
import { SemanticChunk, SemanticCoverage } from './types';
import { IpiSuspicion } from '../../../types';

vi.mock('../slmClient', () => ({ generateWithSlm: vi.fn() }));
const action = 'Replace that entry using the earlier agreement.';
const gap = 'The owner, entry and agreement are not supplied.';
const source: SemanticChunk = { chunkId: 'chunk-1', sourceChunkId: 'original-1', filePath: '/document.txt', fileName: 'document.txt',
  text: `${action}\n${gap}`, startLine: 4, endLine: 5, riskScore: 0, findingCount: 0, selectionReasons: [] };
const coverage: SemanticCoverage = { mode: 'hybrid-priority-sampling', scanProfile: 'balanced', totalChunks: 1, aiReviewedChunks: 1,
  highRiskChunks: 0, highRiskChunksReviewed: 0, coverageLimited: false, maxAiChunks: 12, detectorBatchSize: 3, verifierEvidenceCharacters: 7600 };
const reason = 'The source leaves both the executor and the prior agreement unspecified.';
function packet(chunk = source) {
  const refs = buildSourceReferences([chunk], []);
  return { hasDirective: true, directiveRef: refs.find(ref => ref.text === action)!.id,
    explicitExecutorRef: null, unresolvedDependencyRef: refs.find(ref => ref.text === gap)!.id,
    humanOrExampleRef: null, clearAIRedirectionRef: null, reason };
}
const parse = (items: unknown[], chunks = [source]) => parseContextDependencyFacts(JSON.stringify({ directives: items }), chunks);
beforeEach(() => vi.mocked(generateWithSlm).mockReset());

it('giữ giới hạn schema 20–180 ký tự Unicode với emoji, không đếm đơn vị UTF-16', () => {
  for (const length of [20, 180]) {
    const value = `${'a'.repeat(length - 1)}🌱`;
    expect(parse([{ ...packet(), reason: value }])[0].modelReason).toBe(value);
  }
  for (const value of [`${'a'.repeat(18)}🌱`, `${'a'.repeat(180)}🌱`]) {
    expect(() => parse([{ ...packet(), reason: value }])).toThrow(InvalidAgentResponse);
  }
});

it('chỉ tạo bất định có chỉ dẫn và ngữ cảnh bổ sung, giữ nguồn/dòng/vị trí', () => {
  const facts = parse([{ ...packet(), reason: 'The financial account interpretation is an unsupported extra inference.' }]);
  expect(facts[0].modelReason).toContain('financial');
  const result = contextDependencyBatch(facts, [source]);
  expect(result.discoveries).toHaveLength(1);
  expect(result.discoveries[0]).toMatchObject({ stance: 'uncertain', citation: { quote: action, startLine: 4,
    startOffset: 0, endOffset: action.length, sourceChunkId: 'original-1' } });
  expect(result.discoveries[0].reason).toContain(gap);
  expect(result.discoveries[0].reason).not.toContain('financial');
  expect(result.discoveries[0].directiveContext?.context.quote).toBe(source.text);
});

it('công việc người, ví dụ, lệnh AI rõ và câu mô tả không tự thành bất định', () => {
  const item = packet();
  for (const modified of [{ ...item, hasDirective: false }, { ...item, unresolvedDependencyRef: null },
    { ...item, explicitExecutorRef: item.directiveRef }, { ...item, humanOrExampleRef: item.directiveRef },
    { ...item, clearAIRedirectionRef: item.directiveRef }]) {
    expect(contextDependencyBatch(parse([modified]), [source]).discoveries).toEqual([]);
  }
});

it('không lấy chính câu đang xét làm chứng cứ rằng nó thiếu ngữ cảnh', () => {
  const statement = { ...source, text: 'The checklist assigns work to field technicians.' };
  const ref = buildSourceReferences([statement], [])[0];
  expect(contextDependencyBatch(parse([{ ...packet(), directiveRef: ref.id, unresolvedDependencyRef: ref.id }], [statement]), [statement]).discoveries).toEqual([]);
});

it('một dữ kiện khác có bằng chứng người nhận cho cùng vị trí chặn đề xuất chưa đủ căn cứ', () => {
  const item = packet();
  const facts = parse([item, { ...item, explicitExecutorRef: item.directiveRef }]);
  expect(contextDependencyBatch(facts, [source]).discoveries).toEqual([]);
});

it('câu trùng cùng dòng vẫn neo đúng lần xuất hiện được chọn, không phủ nhận bằng chứng vùng khác', () => {
  const repeated = { ...source, text: `${action} ${action}\n${gap}` };
  const refs = buildSourceReferences([repeated], []), matches = refs.filter(ref => ref.text === action);
  const item = { ...packet(repeated), directiveRef: matches[1].id };
  const result = contextDependencyBatch(parse([item], [repeated]), [repeated]);
  expect(result.discoveries[0].citation.startOffset).toBe(action.length + 1);
  const first = { ...result.discoveries[0], stance: 'confirmed' as const,
    citation: { ...result.discoveries[0].citation, startOffset: 0, endOffset: action.length } };
  const existing: IpiSuspicion[] = [{ id: 'known', source: 'detector', location: 'document.txt:4', originalQuote: action,
    citation: first.citation, detector: first, verifier: first, status: 'confirmed' }];
  applyBatch(result, 'verifier', existing);
  expect(existing[0].conflicts).toBeUndefined();
  expect(conclude(existing, []).verdict).toBe('ipi_detected');
});

it('bất đồng trên chính bằng chứng được giữ, không ghi đè nhận định cũ', () => {
  const result = contextDependencyBatch(parse([packet()]), [source]);
  const confirmed = { ...result.discoveries[0], stance: 'confirmed' as const };
  const rows: IpiSuspicion[] = [{ id: 'known', source: 'detector', location: 'document.txt:4', originalQuote: action,
    citation: confirmed.citation, detector: confirmed, verifier: confirmed, status: 'confirmed' }];
  applyBatch(result, 'verifier', rows);
  expect(rows[0].verifier?.stance).toBe('confirmed');
  expect(rows[0].conflicts?.[0].assessments.map(row => row.stance)).toEqual(expect.arrayContaining(['confirmed', 'uncertain']));
  expect(conclude(rows, []).verdict).toBe('needs_review');
});

it('chặn sai schema, source ref giả, lời giải thiếu và trường ngoài hợp đồng', () => {
  const item = packet();
  for (const modified of [{ ...item, directiveRef: 'ref-other' }, { ...item, hasDirective: 'true' },
    { ...item, reason: 'ngắn' }, { ...item, reason: 'x'.repeat(181) }, { ...item, label: 'uncertain' },
    { ...item, explicitExecutorRef: undefined }]) expect(() => parse([modified])).toThrow();
  expect(() => parse(Array(5).fill(item))).toThrow();
  expect(() => parseContextDependencyFacts('{"directives":[],"directives":[]}', [source])).toThrow('trùng khóa');
  expect(() => parseContextDependencyFacts('```json\n{"directives":[]}\n```', [source])).toThrow();
});

it('không dùng ngữ cảnh từ file khác để chứng minh một chỉ dẫn', () => {
  const other = { ...source, chunkId: 'chunk-2', filePath: '/other.txt' };
  const refs = buildSourceReferences([source, other], []);
  const foreign = refs.find(ref => ref.chunkId === 'chunk-2')!;
  expect(() => parse([{ ...packet(), unresolvedDependencyRef: foreign.id }], [source, other])).toThrow('tài liệu khác');
});

it('payload chỉ có văn bản/mã trung tính, không có đường dẫn hoặc số điểm/risk', () => {
  const input = contextDependencyRequest([source]).input;
  expect(input).toContain(action);
  expect(input).not.toContain(source.filePath);
  expect(input).not.toContain('riskScore');
  expect(input).not.toContain('original-1');
});

it('nguồn bị chọn thiếu hoặc vượt ngân sách không được biến thành chứng cứ bất định', async () => {
  for (const limits of [{ ...coverage, coverageLimited: true }, { ...coverage, verifierEvidenceCharacters: 10 }]) {
    const result = await collectContextDependencies({ chunks: [source], coverage: limits, model: 'local', deadline: Date.now() + 1000 });
    expect(result.review.status).toBe('limited');
    expect(result.review.coverageLimited).toBe(true);
    expect(result.results).toEqual([]);
  }
  expect(generateWithSlm).not.toHaveBeenCalled();
});

it('lỗi phản hồi giữ file/model và không công nhận lượt rà hoàn tất', async () => {
  vi.mocked(generateWithSlm).mockRejectedValueOnce(new InvalidAgentResponse('response is not valid JSON'));
  const onBatchFailed = vi.fn();
  const result = await collectContextDependencies({ chunks: [source], coverage, model: 'local', deadline: Date.now() + 1000, onBatchFailed });
  expect(result.review.status).toBe('error');
  expect(result.review.reviewedSourceChunkIds).toEqual([]);
  expect(onBatchFailed).toHaveBeenCalledWith(expect.objectContaining({ model: 'local', chunkIds: ['chunk-1'] }));
});

it('timeout được ghi lỗi rồi trả lên pipeline, không tiếp tục coi là phản hồi hợp lệ', async () => {
  vi.mocked(generateWithSlm).mockRejectedValueOnce(new Error('Analysis timeout: local request deadline exceeded'));
  const onBatchFailed = vi.fn();
  await expect(collectContextDependencies({ chunks: [source], coverage, model: 'local', deadline: Date.now() + 1000, onBatchFailed })).rejects.toThrow('timeout');
  expect(onBatchFailed).toHaveBeenCalledOnce();
});

it('chỉ phản hồi đã qua parser mới ghi nguồn được rà, chưa tự sửa pool nhận định', async () => {
  vi.mocked(generateWithSlm).mockResolvedValueOnce({ text: JSON.stringify({ directives: [packet()] }), model: 'local', providerId: 'ollama' });
  const result = await collectContextDependencies({ chunks: [source], coverage, model: 'local', deadline: Date.now() + 1000 });
  expect(result.review.reviewedSourceChunkIds).toEqual(['original-1']);
  expect(result.results[0].discoveries[0].stance).toBe('uncertain');
  expect(result.review.modelUsed).toBe('local');
});
