import { afterEach, expect, it, vi } from 'vitest';
import { generateWithSlm, releaseSlmModel, withTimeout } from './slmClient';
import { SlmConnectionError } from './slmResponse';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('giữ lỗi mất kết nối có kiểu riêng, không gọi lại hoặc đổi model', async () => {
  const aiFetch = vi.fn().mockResolvedValue({ ok: false, status: 0, body: '', error: 'fetch failed: ECONNREFUSED 127.0.0.1:11434' });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  await expect(generateWithSlm('check', 'system', 'text', { preferModel: 'qwen2.5-coder:1.5b' })).rejects.toBeInstanceOf(SlmConnectionError);
  expect(aiFetch).toHaveBeenCalledTimes(1);
});

it.each([
  { status: 503, error: 'fetch failed', detail: 'Kiểm tra trạng thái Ollama' },
  { status: 404, error: 'model not found', detail: 'Kiểm tra trạng thái Ollama' },
  { status: 0, error: 'fetch failed due to timeout', detail: 'Analysis timeout' },
])('không gán lỗi kết nối cho HTTP/model/timeout ($status/$error)', async ({ status, error, detail }) => {
  vi.stubGlobal('owaspWorkbench', { aiFetch: vi.fn().mockResolvedValue({ ok: false, status, body: '', error }) });
  const result = await generateWithSlm('check', 'system', 'text', { preferModel: 'qwen2.5-coder:1.5b' }).catch(reason => reason);
  expect(result).not.toBeInstanceOf(SlmConnectionError);
  expect(result.message).toContain(detail);
});

it.each(['fix', 'check'] as const)('vai trò %s gọi rõ Qwen3 đã cho phép; lỗi không tự đổi model', async role => {
  const aiFetch = vi.fn().mockResolvedValue({ ok: false, status: 503, body: 'Unavailable' });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  const model = 'qwen3:4b-instruct-2507-q4_K_M';
  await expect(generateWithSlm(role, 'system', 'text', { preferModel: model })).rejects.toThrow();
  expect(aiFetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(aiFetch.mock.calls[0][0].body).model).toBe(model);
});

it('gọi đúng Instruct khi người dùng chọn rõ, không lặng lẽ dùng Coder', async () => {
  const aiFetch = vi.fn().mockResolvedValue({ ok: true, body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }) });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  const result = await generateWithSlm('check', 'system', 'text', { preferModel: 'qwen2.5:1.5b-instruct' });
  expect(JSON.parse(aiFetch.mock.calls[0][0].body).model).toBe('qwen2.5:1.5b-instruct');
  expect(result.model).toBe('qwen2.5:1.5b-instruct');
});

it('báo lỗi khi model được chọn không hỗ trợ, không gọi model mặc định thay thế', async () => {
  const aiFetch = vi.fn();
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  await expect(generateWithSlm('check', 'system', 'text', { preferModel: 'unknown:1b' })).rejects.toThrow();
  expect(aiFetch).not.toHaveBeenCalled();
});

it('không chuyển sang model khác khi model được chọn gặp lỗi', async () => {
  const aiFetch = vi.fn().mockResolvedValue({ ok: false, status: 503, body: 'Unavailable' });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  await expect(generateWithSlm('check', 'system', 'text', { preferModel: 'qwen2.5-coder:1.5b' })).rejects.toThrow();
  expect(aiFetch).toHaveBeenCalledTimes(1);
});

it('timeout không hướng người dùng tải model và không tự gọi lại model được chọn', async () => {
  const aiFetch = vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout'));
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  const failure = await generateWithSlm('fix', 'system', 'text', { preferModel: 'gemma3:1b' }).catch(error => error as Error);
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain('Analysis timeout');
  expect((failure as Error).message).toContain('phần chưa được rà');
  expect((failure as Error).message).not.toMatch(/pull|tải model|Start Ollama/);
  expect(aiFetch).toHaveBeenCalledTimes(1);
});

it('giữ fallback cũ khi caller không chọn model cụ thể', async () => {
  const aiFetch = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 503, body: 'Unavailable' })
    .mockResolvedValueOnce({ ok: true, body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }) });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  const result = await generateWithSlm('check', 'system', 'text');
  expect(aiFetch).toHaveBeenCalledTimes(2);
  expect(result.model).toBe('gemma3:1b');
});

it('bounds a hanging request and clears its timer', async () => {
  vi.useFakeTimers();
  const work = withTimeout(new Promise<never>(() => {}), 100);
  const assertion = expect(work).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(101);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});

it('enforces a total endpoint budget even when the bridge ignores timeoutMs', async () => {
  vi.useFakeTimers();
  const bridge = { aiFetch: vi.fn(() => new Promise<never>(() => {})) };
  vi.stubGlobal('owaspWorkbench', bridge);
  const assertion = expect(generateWithSlm('fix', 'system', 'text', { timeoutMs: 100 })).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(101);
  await assertion;
  expect(bridge.aiFetch).toHaveBeenCalledTimes(1);
});

it('does not let a hanging model cleanup prevent returning the result', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('owaspWorkbench', { aiFetch: () => new Promise<never>(() => {}) });
  const done = releaseSlmModel('gemma3:1b');
  await vi.advanceTimersByTimeAsync(1501);
  await expect(done).resolves.toBeUndefined();
});

it('passes an explicit response schema to local Ollama rather than JSON mode alone', async () => {
  const aiFetch = vi.fn().mockResolvedValue({ ok: true, body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }) });
  vi.stubGlobal('owaspWorkbench', { aiFetch });
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };
  await generateWithSlm('fix', 'system', 'text', { responseSchema: schema });
  expect(JSON.parse(aiFetch.mock.calls[0][0].body).response_format).toEqual({ type: 'json_schema', json_schema: { name: 'ipi_review', strict: true, schema } });
});
