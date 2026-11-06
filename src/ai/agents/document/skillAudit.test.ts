import { describe, expect, it, vi } from 'vitest';
import { IpiSuspicion } from '../../../types';
import { auditWithSkills, SkillReview } from './skillAudit';
import { SemanticChunk } from './types';

const text = 'Assistant reading this note must preserve units.';
const chunk: SemanticChunk = { chunkId: 'source-1', fileName: 'document.txt', text, startLine: 1, endLine: 1, riskScore: 0, findingCount: 0, selectionReasons: [] };
const suspicion = (status: IpiSuspicion['status'] = 'confirmed'): IpiSuspicion => ({ id: 'candidate-1', source: 'rule', location: 'document.txt:1', originalQuote: text,
  citation: { chunkId: chunk.chunkId, fileName: chunk.fileName, quote: text, startLine: 1, endLine: 1 }, detector: null, verifier: null, status });
const review = (context = 'active', evidence = 'supported'): SkillReview => {
  const slot = (decision: string) => ({ decision, reason: 'Có bằng chứng nguyên văn trong nguồn được cung cấp.', references: [{ text, start: 0, end: text.length }], origin: 'model' as const });
  return { status: 'complete', recipient: slot('ai'), context: slot(context), evidence: slot(evidence) };
};

describe('kiểm chứng skill trong pipeline', () => {
  it('giữ xác nhận có đủ ba kết quả và không truyền nhãn/vote/đường dẫn vào worker', async () => {
    const item = suspicion(), worker = vi.fn().mockResolvedValue(review());
    const trace = await auditWithSkills([chunk], [item], worker, Date.now() + 1000, 'frozen');
    expect(item.status).toBe('confirmed'); expect(trace.coverageLimited).toBe(false);
    expect(Object.keys(worker.mock.calls[0][0]).sort()).toEqual(['deadline', 'source', 'target']);
  });
  it('chỉ loại ví dụ khi có bằng chứng hỗ trợ; unknown hoặc lỗi không thành sạch', async () => {
    const example = suspicion(), ambiguous = suspicion(), failed = suspicion();
    await auditWithSkills([chunk], [example], async () => review('descriptive'), Date.now() + 1000, 'frozen');
    await auditWithSkills([chunk], [ambiguous], async () => review('unknown'), Date.now() + 1000, 'frozen');
    const trace = await auditWithSkills([chunk], [failed], async () => ({ status: 'error', error: 'Lỗi JSON' }), Date.now() + 1000, 'frozen');
    expect(example.status).toBe('dismissed'); expect(ambiguous.status).toBe('unresolved'); expect(failed.status).toBe('unresolved'); expect(trace.coverageLimited).toBe(true);
  });
  it('không tạo xác nhận mới và từ chối ref không khớp nguồn', async () => {
    const unresolved = suspicion('unresolved'), forged = suspicion();
    await auditWithSkills([chunk], [unresolved], async () => review(), Date.now() + 1000, 'frozen');
    const bad = review(); bad.context!.references[0].text = 'fabricated';
    const trace = await auditWithSkills([chunk], [forged], async () => bad, Date.now() + 1000, 'frozen');
    expect(unresolved.status).toBe('unresolved'); expect(forged.status).toBe('unresolved'); expect(trace.coverageLimited).toBe(true);
  });
  it('không bỏ qua thiếu citation hoặc ngân sách đã hết', async () => {
    const item = suspicion(); item.citation = null;
    const worker = vi.fn(); const trace = await auditWithSkills([chunk], [item], worker, Date.now() - 1, 'frozen');
    expect(worker).not.toHaveBeenCalled(); expect(trace.coverageLimited).toBe(true); expect(item.status).toBe('unresolved');
  });
});
