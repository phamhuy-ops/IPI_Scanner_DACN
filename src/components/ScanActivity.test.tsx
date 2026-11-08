import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScanActivity } from './ScanActivity';
import { IpiRunState } from '../types';

const state = (): IpiRunState => ({ status: 'running', processingStatus: 'running', suspicions: [], check: null, scanResult: null, error: null,
  events: [{ phase: 'check', ts: 1, message: 'Verifier checking' }],
  reviewProgress: { totalChunks: 10, selectedChunkIds: ['a', 'b'], detectorReviewedChunkIds: ['a', 'b'], verifierReviewedChunkIds: ['a'] } });
const render = (run: IpiRunState) => renderToStaticMarkup(<ScanActivity run={run} locale="en" />);

describe('tiến trình và trạng thái giao diện', () => {
  it('hiển thị tiến độ theo lượt đã chọn, tách khỏi độ bao phủ toàn tài liệu', () => {
    const html = render(state());
    expect(html).toContain('aria-valuenow="75"');
    expect(html).toContain('3/4');
    expect(html).toContain('is-running" aria-current="step"');
    expect(html).not.toContain('20%');
    expect(html).toContain('Extracted chunks: 10/10');
    expect(html).toContain('aria-label="Chunks reviewed by Detector" aria-valuemin="0" aria-valuemax="2" aria-valuenow="2"');
    expect(html).toContain('aria-label="Chunks reviewed by Verifier" aria-valuemin="0" aria-valuemax="2" aria-valuenow="1"');
  });
  it('không coi lượt kết thúc còn thiếu review là model đã hoàn tất', () => {
    const run = state(); run.status = 'completed'; run.events.push({ phase: 'done', ts: 2, message: 'Limited review' });
    const html = render(run);
    expect(html).toMatch(/is-failed[^]*?<strong>Verifier<\/strong>/);
    expect(html).toContain('aria-valuenow="75"');
  });
  it('đánh dấu bước lỗi nhưng không biến lỗi model thành phát hiện IPI', () => {
    const run = state(); run.status = 'error'; run.events.push({ phase: 'error', ts: 2, message: 'Timeout' });
    const html = render(run);
    expect(html).toContain('is-failed');
    expect(html).not.toContain('IPI confirmed');
    expect(html).not.toContain('is-running');
  });
  it('giữ mốc Prefilter khi Detector lỗi trước khi rà được đoạn đầu tiên', () => {
    const run = state();
    run.status = 'error';
    run.events = [{ phase: 'fix', ts: 1, message: 'Detector reviewing' }, { phase: 'error', ts: 2, message: 'Detector failed' }];
    run.scanResult = { ok: true, mode: 'ipi-doc-scan', findings: [],
      metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } } };
    run.reviewProgress!.detectorReviewedChunkIds = [];
    run.reviewProgress!.verifierReviewedChunkIds = [];
    const html = render(run);
    expect(html).toContain('aria-valuenow="10"');
    expect(html).toContain('0/4 chunk reviews');
    expect(html).toMatch(/scan-step is-incomplete[^]*?<strong>Verifier<\/strong>/);
  });
  it('không đánh dấu Detector hoàn tất chỉ vì Verifier đã bắt đầu', () => {
    const run = state(); run.reviewProgress!.detectorReviewedChunkIds = ['a'];
    expect(render(run)).toMatch(/is-failed[^]*?<strong>Detector<\/strong>/);
  });
  it('đếm đúng phạm vi Verifier chỉ xác minh ứng viên', () => {
    const run = state(); run.reviewProgress!.verifierRequiredChunkIds = ['a'];
    expect(render(run)).toContain('aria-valuenow="100"');
    expect(render(run)).toContain('3/3');
  });
  it('tiến độ chưa biết không tự bịa tỷ lệ phần trăm', () => {
    const run = state(); delete run.reviewProgress;
    expect(render(run)).not.toContain('aria-valuenow');
    expect(render(run)).toContain('Waiting for extraction and chunk selection data.');
    expect(render(run)).not.toContain('Reviewed by both models: 0');
    run.status = 'idle'; run.events = [];
    expect(render(run)).not.toContain('is-running');
    expect(render(run)).toContain('Pending');
  });
});
