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
    expect(html).toContain('Needs review');
    expect(html).toContain('Timeout');
    expect(html).not.toContain('WARNING — IPI RISK DETECTED');
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
