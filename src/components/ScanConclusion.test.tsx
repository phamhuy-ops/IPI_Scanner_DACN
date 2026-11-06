import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IpiRunState } from '../types';
import { ScanConclusion } from './ScanConclusion';
import { conclude } from '../ai/agents/document/reviewPolicy';

const state = (): IpiRunState => ({ status: 'completed', processingStatus: 'completed', suspicions: [],
  events: [], error: null, scanResult: null,
  check: conclude([], []) });
const render = (run: IpiRunState) => renderToStaticMarkup(<ScanConclusion run={run} locale="vi" />);

describe('kết luận trong giao diện tham khảo Figma', () => {
  it('không trình bày chưa phát hiện thành bảo đảm an toàn', () => {
    const html = render(state());
    expect(html).toContain('trong phạm vi đã kiểm tra');
    expect(html).toContain('conclusion-not_detected');
    expect(html).not.toContain('An toàn tuyệt đối');
  });
  it('ưu tiên lỗi xử lý, không hiển thị kết luận cũ thành lượt quét thành công', () => {
    const run = state(); run.status = 'error'; run.processingStatus = 'timeout';
    const html = render(run);
    expect(html).toContain('Xử lý chưa hoàn tất');
    expect(html).toContain('conclusion-error');
    expect(html).not.toContain('conclusion-not_detected');
  });
  it('ẩn kết luận khi chưa chạy hoặc đang chạy, kể cả khi có kết luận cũ', () => {
    const run = state(); run.status = 'idle'; expect(render(run)).toBe('');
    run.status = 'running'; expect(render(run)).toBe('');
  });
  it('giữ cảnh báo cần xem xét và escape lý do từ model', () => {
    const run = state(); run.check = { ...conclude([], []), verdict: 'needs_review', reasons: ['<script>unsafe</script>'] };
    const html = render(run);
    expect(html).toContain('conclusion-needs_review');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(renderToStaticMarkup(<ScanConclusion run={run} locale="en" />)).toContain('Scan conclusion');
  });
});
