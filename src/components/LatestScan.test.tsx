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
  it('hiển thị hai agent và liên kết đến kết luận trong phạm vi kiểm tra', () => {
    const html = render(state());
    expect(html).toContain('Tệp đã xử lý: <strong>3</strong>');
    expect(html).toContain('Detector');
    expect(html).toContain('Verifier');
    expect(html).not.toContain('Agent Detector');
    expect(html).not.toContain('Agent Verifier');
    expect(html).not.toContain('<dt>Model</dt>');
    expect(html).not.toContain('Thời điểm');
    expect(html).toContain('href="#scan-conclusion"');
    expect(html).toContain('Số IPI xác nhận:');
  });
  it('không dùng kết luận cũ khi đang chạy hoặc bị lỗi', () => {
    const run = state(); run.status = 'running';
    expect(render(run)).toContain('Đang phân tích tài liệu');
    expect(render(run)).not.toContain('latest-scan-not_detected');
    expect(render(run)).not.toContain('href=');
    run.status = 'error';
    expect(render(run)).toContain('Lỗi xử lý model');
    expect(render(run)).not.toContain('latest-scan-not_detected');
  });
  it('ẩn thông tin cũ khi đã xóa kết quả', () => {
    const run = state(); run.status = 'idle';
    expect(render(run)).toContain('Project chưa có kết quả');
    run.status = 'error'; run.scanResult = null; run.events = [];
    expect(render(run)).not.toContain('<time');
  });
  it('hiển thị số liệu từng agent và không suy đoán token còn thiếu', () => {
    const run = state();
    run.agentMetrics = { detector: { model: 'gemma3:1b', durationMs: 1250, totalTokens: 1234, requests: 1, missingTokenRequests: 0 },
      verifier: { model: 'qwen2.5-coder:1.5b', durationMs: 2000, totalTokens: 20, requests: 2, missingTokenRequests: 1 } };
    expect(render(run)).toContain('1.234');
    expect(render(run)).toContain('1,3s');
    expect(render(run)).toContain('qwen2.5-coder:1.5b');
    expect(render(run)).not.toContain('>20<');
    run.status = 'idle';
    expect(render(run)).not.toContain('gemma3:1b');
  });
  it('không lỗi khi thời điểm lưu không hợp lệ', () => {
    const run = state(); run.events[0].ts = 1e100;
    expect(render(run)).not.toContain('<time');
  });
});


it('hiển thị tên nguồn và lý do lỗi ngắn gọn trong ô kết luận', () => {
  const run = state();
  run.status = 'error'; run.processingStatus = 'timeout'; run.error = 'Analysis timeout: local request deadline exceeded';
  const html = renderToStaticMarkup(<LatestScan run={run} locale="vi" target={{ folderPath: 'C:\\documents\\Báo cáo' }} />);
  expect(html).toContain('>Báo cáo</strong>');
  expect(html).toContain('Quá thời gian xử lý');
  expect(html).toContain('Trạng thái:');
  expect(html).toContain('Tệp lỗi:');
  expect(html).toContain('Số IPI xác nhận:');
});
