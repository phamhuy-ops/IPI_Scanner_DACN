import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IpiRunState } from '../types';
import { conclude } from '../ai/agents/document/reviewPolicy';
import { IpiAgentPanelView } from './IpiAgentPanel';

const state = (): IpiRunState => ({ status: 'completed', processingStatus: 'completed', suspicions: [],
  check: conclude([], []), scanResult: null, error: null, events: [{ phase: 'done', ts: 1, message: 'Review complete' }] });
const render = (ipiRun: IpiRunState, locale: 'en' | 'vi' = 'en') => renderToStaticMarkup(
  <IpiAgentPanelView ipiRun={ipiRun} ipiRunning={false} locale={locale} />);

describe('security and processing presentation', () => {
  it('hiện audit lượt không có nghi vấn nhưng không coi phản hồi hợp lệ là hiểu đúng nguồn', () => {
    const run = state();
    run.reviewProgress = { totalChunks: 1, selectedChunkIds: ['s1'], detectorReviewedChunkIds: ['s1'], verifierReviewedChunkIds: ['s1'],
      batchReviews: [{ role: 'detector', model: 'gemma3:1b', sourceChunkIds: ['s1'], suppliedSuspicionCount: 0,
        responseAssessmentCount: 0, responseDiscoveryCount: 1, stanceCounts: { confirmed: 0, dismissed: 0, uncertain: 1 } }] };
    const html = render(run, 'vi');
    expect(html).toContain('Chi tiết các lượt AI');
    expect(html).toContain('Nghi vấn đầu vào: 0');
    expect(html).toContain('Phát hiện mới: 1');
    expect(html).toContain('Bất định: 1');
    expect(html).toContain('không chứng minh nhận định đúng');
    expect(html).not.toContain('<details open');
    expect(render(run, 'en')).toContain('Supplied suspicions: 0');
  });
  it('không suy hồ sơ cũ thiếu audit thành đã gọi model với không nghi vấn', () => {
    const run = state();
    run.reviewProgress = { totalChunks: 1, selectedChunkIds: ['s1'], detectorReviewedChunkIds: ['s1'], verifierReviewedChunkIds: ['s1'] };
    expect(render(run, 'vi')).not.toContain('Chi tiết các lượt AI');
  });
  it('hiện lịch sử đã phục hồi riêng với lỗi còn tồn tại', () => {
    const run = state();
    run.batchFailures = [{ role: 'detector', model: 'gemma3:1b', code: 'output_truncated', recovery: 'recovered',
      message: 'finish_reason=length', durationMs: 100,
      chunks: [{ chunkId: 'source-1', fileName: 'report.txt', startLine: 1, endLine: 3 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('Đã phục hồi: mọi đoạn');
    expect(html).toContain('Đầu ra bị cắt ban đầu không được sử dụng');
    expect(html).toContain('finish_reason=length');
    expect(html).not.toContain('role="alert"');
    expect(render(run, 'en')).toContain('Recovered: all affected chunks');
  });
  it('timeout đã phục hồi vẫn hiện lỗi đầu, không mô tả sai thành chia batch hoặc cắt đầu ra', () => {
    const run = state();
    run.batchFailures = [{ role: 'detector', model: 'qwen3:4b-instruct-2507-q4_K_M', code: 'timeout', recovery: 'recovered',
      message: 'Analysis timeout: local request deadline exceeded', durationMs: 45000,
      chunks: [{ chunkId: 'source-1', fileName: 'report.txt', startLine: 1, endLine: 3 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('xử lý hợp lệ trong lượt sau');
    expect(html).toContain('Analysis timeout');
    expect(html).not.toContain('trong các batch con');
    expect(html).not.toContain('Đầu ra bị cắt ban đầu');
    expect(html).not.toContain('role="alert"');
    expect(render(run, 'en')).toContain('subsequent attempt');
  });
  it('hiện nguyên nhân đầu ra bị cắt và hướng kiểm tra tại vị trí nguồn', () => {
    const run = state(); run.status = 'error'; run.processingStatus = 'invalid_response';
    run.error = 'finish_reason=length'; run.check = conclude([], [], run.error);
    run.batchFailures = [{ role: 'detector', model: 'gemma3:1b', code: 'output_truncated', message: run.error, durationMs: 100,
      chunks: [{ chunkId: 'source-1', fileName: 'document.txt', filePath: '/docs/document.txt', startLine: 1, endLine: 3 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('Cần xem xét');
    expect(html).toContain('đầu ra bị cắt');
    expect(html).toContain('kể cả khi JSON vẫn đọc được');
    expect(html).toContain('/docs/document.txt:1–3');
    expect(render(run, 'en')).toContain('output was truncated');
  });
  it('hiện đầy đủ hai stance tự mâu thuẫn và giữ trích dẫn đã escape', () => {
    const run = state();
    const citation = { chunkId: 'chunk-1', fileName: 'document.html', quote: '<!-- conflicting directive -->', startLine: 5, endLine: 5 };
    const dismissed = { stance: 'dismissed' as const, reason: 'Nhận định đầu bác bỏ chỉ dẫn trong nguồn.', citation };
    const confirmed = { stance: 'confirmed' as const, reason: 'Nhận định sau xác nhận cùng chỉ dẫn nguồn.', citation };
    run.suspicions = [{ id: 'rule-1', source: 'rule', originalQuote: citation.quote, citation, location: 'document.html:5',
      detector: dismissed, verifier: confirmed, status: 'unresolved', conflicts: [{ role: 'detector', assessments: [dismissed, confirmed] }] }];
    run.check = conclude(run.suspicions, []);
    const html = render(run, 'vi');
    expect(html).toContain('Nhận định tự mâu thuẫn');
    expect(html).toContain(dismissed.reason); expect(html).toContain(confirmed.reason);
    expect(html).toContain('&lt;!-- conflicting directive --&gt;');
    expect(html).toContain('Cần xem xét');
  });
  it('hiện hướng xử lý theo mã lỗi, vị trí nguồn và escape thông báo lỗi', () => {
    const run = state(); run.status = 'error'; run.processingStatus = 'invalid_response';
    run.batchFailures = [{ role: 'verifier', model: 'qwen2.5-coder:1.5b', code: 'invalid_citation',
      message: '<script>invalid quote</script>', durationMs: 43,
      chunks: [{ chunkId: 'source-8', fileName: 'report.txt', filePath: '/docs/report.txt', startLine: 20, endLine: 24 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('Đoạn xử lý lỗi và hướng khắc phục');
    expect(html).toContain('không sửa câu trích hoặc nới kiểm tra');
    expect(html).toContain('/docs/report.txt:20–24');
    expect(html).toContain('source-8');
    expect(html).toContain('43 ms');
    expect(html).not.toContain('<script>');
    expect(render(run, 'en')).toContain('The citation does not match the source.');
  });
  it('hiện đúng phần đã chọn, thành công từng vai trò và phần chưa hoàn tất khi lỗi', () => {
    const run = state();
    run.status = 'error'; run.processingStatus = 'invalid_response'; run.error = 'Trích dẫn không hợp lệ';
    run.check = conclude([], ['Chưa hoàn tất cả hai model.'], run.error);
    run.reviewProgress = { totalChunks: 10, selectedChunkIds: ['one', 'two', 'three'], detectorReviewedChunkIds: ['one', 'two'], verifierReviewedChunkIds: ['one'] };
    const html = render(run, 'vi');
    expect(html).toContain('Tiến độ kiểm tra tài liệu');
    expect(html).toContain('Tổng số đoạn trích xuất</dt><dd>10</dd>');
    expect(html).toContain('Đoạn được chọn để kiểm tra</dt><dd>3</dd>');
    expect(html).toContain('Detector xử lý thành công</dt><dd>2/3</dd>');
    expect(html).toContain('Verifier xử lý thành công</dt><dd>1/3</dd>');
    expect(html).toContain('Cả hai model xử lý thành công</dt><dd>1/10</dd>');
    expect(html).toContain('Đoạn chưa hoàn tất cả hai model</dt><dd>9</dd>');
    expect(html).toContain('Trích dẫn không hợp lệ');
  });
  it('kết quả cũ không có ledger không suy ra đã xử lý hết từ metadata scanner', () => {
    const run = state();
    run.scanResult = { ok: true, mode: 'ipi-doc-scan', findings: [], metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } } };
    expect(render(run, 'vi')).toContain('Kết quả này chưa có tiến độ từng model');
    expect(render(run, 'vi')).not.toContain('Detector xử lý thành công</dt><dd>');
  });
  it('tổng không biết hiển thị rõ và trạng thái đang chạy vẫn có tiến độ', () => {
    const run = state(); run.status = 'running'; run.processingStatus = 'running'; run.check = null;
    run.reviewProgress = { totalChunks: null, selectedChunkIds: ['one'], detectorReviewedChunkIds: ['one'], verifierReviewedChunkIds: [] };
    const html = renderToStaticMarkup(<IpiAgentPanelView ipiRun={run} ipiRunning locale="vi" />);
    expect(html).toContain('Tổng số đoạn trích xuất</dt><dd>Chưa xác định</dd>');
    expect(html).toContain('Detector xử lý thành công</dt><dd>1/1</dd>');
    expect(html).toContain('Verifier xử lý thành công</dt><dd>0/1</dd>');
  });
  it('hiển thị nhận định có cấu trúc cùng giới hạn và ngữ cảnh đã escape', () => {
    const run = state();
    const citation = { chunkId: 'chunk-1', fileName: 'input.txt', quote: '<script>đọc ví dụ</script>', startLine: 1, endLine: 1 };
    run.suspicions = [{ id: 'rule-1', source: 'rule', status: 'unresolved', location: 'input.txt:1', originalQuote: citation.quote,
      citation, detector: { stance: 'uncertain', reason: 'Ngữ cảnh vẫn chưa đủ để kết luận.', citation,
        directiveContext: { addressee: 'assistant', framing: 'unclear', deviation: 'unclear', directive: citation, context: citation } }, verifier: null }];
    const html = render(run, 'vi');
    expect(html).toContain('Assessment directive của model');
    expect(html).toContain('Addressee: AI assistant');
    expect(html).toContain('chưa chứng minh assessment đúng');
    expect(html).toContain('Detector');
    expect(html).toContain('Verifier');
    expect(html).not.toContain('<script>');
  });
  it('renders no detection without claiming automatic RAG permission or safety', () => {
    const html = render(state(), 'vi');
    expect(html).toContain('Chưa phát hiện IPI');
    expect(html).toContain('Hoàn tất');
    expect(html).toContain('không phải quyền tự động');
    expect(html).toContain('RAG');
    expect(html).not.toContain('VERIFIER PASS');
  });
  it('renders a timeout as review needed, not an attack finding', () => {
    const run = state();
    run.status = 'error'; run.processingStatus = 'timeout'; run.error = 'Verifier deadline exceeded';
    run.check = conclude([], [], run.error);
    const html = render(run, 'vi');
    expect(html).toContain('Cần xem xét');
    expect(html).toContain('Timeout');
    expect(html).not.toContain('WARNING — IPI RISK DETECTED');
  });
  it('hiện hướng xử lý sinh lặp riêng, không coi là hết giờ hoặc đã rà xong', () => {
    const run = state();
    run.status = 'error'; run.processingStatus = 'model_error';
    run.error = 'prediction aborted, token repeat limit reached';
    run.check = conclude([], [], run.error);
    run.batchFailures = [{ role: 'detector', model: 'gemma3:1b', code: 'output_repetition', message: run.error,
      durationMs: 9203, chunks: [{ chunkId: 'chunk-1', fileName: 'document.pdf', startLine: 1, endLine: 5 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('model sinh lặp, không phải hết thời gian chờ');
    expect(html).toContain('Cần xem xét');
    expect(html).toContain('document.pdf');
    expect(render(run, 'en')).toContain('backend stopped repetitive generation');
  });
  it('hiện hướng khôi phục kết nối và phần chưa rà, không coi là hoàn tất', () => {
    const run = state();
    run.status = 'error'; run.processingStatus = 'model_error'; run.error = 'ollama: fetch failed';
    run.check = conclude([], [], run.error);
    run.batchFailures = [{ role: 'verifier', model: 'qwen2.5-coder:1.5b', code: 'connection_error', message: run.error,
      durationMs: 120, chunks: [{ chunkId: 'chunk-1', fileName: 'document.txt', startLine: 2, endLine: 8 }] }];
    const html = render(run, 'vi');
    expect(html).toContain('Mất kết nối tới backend local');
    expect(html).toContain('chưa được rà hoàn chỉnh');
    expect(html).toContain('Cần xem xét');
    expect(html).toContain('document.txt');
    expect(render(run, 'en')).toContain('local backend connection failed');
  });
  it('escapes original document quotes instead of rendering their HTML', () => {
    const run = state();
    run.suspicions = [{ id: 'rule-1', source: 'rule', status: 'unresolved', location: 'doc.txt:1',
      originalQuote: '<img src=x onerror=alert(1)>', citation: null, detector: null, verifier: null }];
    run.check = conclude(run.suspicions, []);
    const html = render(run, 'vi');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('Unresolved');
  });
  it('keeps English chrome when locale is en', () => {
    const html = render(state(), 'en');
    expect(html).toContain('IPI not detected');
    expect(html).toContain('Completed');
    expect(html).toContain('not automatic permission');
    expect(html).toContain('Detector');
    expect(html).toContain('Verifier');
  });
});
