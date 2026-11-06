import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IpiRunState } from '../types';
import { LatestScan } from './LatestScan';
import { conclude } from '../ai/agents/document/reviewPolicy';

const state = (): IpiRunState => ({ status: 'completed', processingStatus: 'completed', suspicions: [],
  events: [{ ts: Date.UTC(2026, 10, 6, 10, 0), phase: 'done', message: 'Done' }], error: null,
  scanResult: { ok: true, mode: 'ipi-doc-scan', findings: [], metadata: { scannedFiles: 3, summary: { total: 0, byCategory: {}, bySeverity: {} } } },
  check: conclude([], []) });
const render = (run: IpiRunState) => renderToStaticMarkup(<LatestScan run={run} locale="vi" />);

describe('tóm tắt lần quét gần nhất', () => {
  it('hiển thị số tệp, thời điểm và liên kết đến kết luận trong phạm vi kiểm tra', () => {
    const html = render(state());
    expect(html).toContain('3 tệp đã xử lý');
    expect(html).toContain('2026-11-06T10:00:00.000Z');
    expect(html).toContain('href="#scan-conclusion"');
    expect(html).toContain('phạm vi đã kiểm tra');
  });
  it('không dùng kết luận cũ khi đang chạy hoặc bị lỗi', () => {
    const run = state(); run.status = 'running';
    expect(render(run)).toContain('Đang phân tích tài liệu');
    expect(render(run)).not.toContain('latest-scan-not_detected');
    expect(render(run)).not.toContain('href=');
    run.status = 'error';
    expect(render(run)).toContain('Xử lý chưa hoàn tất');
    expect(render(run)).not.toContain('latest-scan-not_detected');
  });
  it('ẩn thông tin cũ khi đã xóa kết quả và không tự suy ra số tệp', () => {
    const run = state(); run.status = 'idle';
    expect(render(run)).toContain('Project chưa có kết quả');
    expect(render(run)).not.toContain('3 tệp');
    run.status = 'error'; run.scanResult = null; run.events = [];
    expect(render(run)).toContain('Chưa có số liệu tệp');
    expect(render(run)).not.toContain('<time');
  });
  it('không lỗi khi thời điểm lưu không hợp lệ', () => {
    const run = state(); run.events[0].ts = 1e100;
    expect(render(run)).not.toContain('<time');
  });
});
