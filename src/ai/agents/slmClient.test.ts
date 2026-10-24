import { afterEach, expect, it, vi } from 'vitest';
import { generateWithSlm, releaseSlmModel, withTimeout } from './slmClient';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

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
