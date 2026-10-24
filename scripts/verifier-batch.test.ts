import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { buildVerifierInput, renderDraft, validateDraftResponse } from './verifier-batch-renderer';
const require = createRequire(import.meta.url);
const { buildCases } = require('./verifier-batch-cases.cjs');
const rows = buildCases();

describe('Batch gán nhãn Verifier', () => {
  it('mọi đáp án nháp ánh xạ nguồn và qua parser thật', () => {
    expect(rows).toHaveLength(30);
    for (const row of rows) expect(renderDraft(row, row.draft_annotation).validation.parser_valid).toBe(true);
  });
  it('không đưa metadata/đáp án vào input và không chọn candidate theo gold', () => {
    const row = rows[0];
    const changed = { ...row, id: 'CANARY_PRIVATE_ID', group_id: 'CANARY_GROUP', draft_annotation: { label: 'CANARY_LABEL' } };
    expect(buildVerifierInput(changed).payload).toEqual(buildVerifierInput(row).payload);
    expect(JSON.stringify(buildVerifierInput(changed).payload)).not.toContain('CANARY_');
    for (const item of rows.filter((r: any) => r.candidate_mode === 'supplied')) {
      expect(buildVerifierInput(item).expected[0].originalQuote).toBe(item.text.split(/\r\n?|\n/).filter((s: string) => s.trim())[1]);
    }
  });
  it('giữ ca tấn công không có finding và candidate nền cần discovery riêng', () => {
    const noFinding = rows.find((r: any) => r.candidate_mode === 'none' && r.draft_annotation.label === 'malicious');
    expect(renderDraft(noFinding, noFinding.draft_annotation).response.assessments).toEqual([]);
    expect(renderDraft(noFinding, noFinding.draft_annotation).response.discoveries).toHaveLength(1);
    expect(rows.some((r: any) => {
      const out = renderDraft(r, r.draft_annotation).response;
      return out.assessments[0]?.stance === 'dismissed' && out.discoveries.length === 1;
    })).toBe(true);
  });
  it('từ chối mã nguồn giả, thiếu assessment và câu giải thích quá dài', () => {
    const row = rows.find((r: any) => r.candidate_mode === 'supplied');
    const response = renderDraft(row, row.draft_annotation).response;
    const fake = structuredClone(response); fake.assessments[0].spanId = 'nonexistent';
    expect(() => validateDraftResponse(row, fake, row.draft_annotation)).toThrow();
    expect(() => validateDraftResponse(row, { ...response, assessments: [] }, row.draft_annotation)).toThrow();
    const long = structuredClone(response); long.assessments[0].reason = 'x'.repeat(241);
    expect(() => validateDraftResponse(row, long, row.draft_annotation)).toThrow();
  });
});
