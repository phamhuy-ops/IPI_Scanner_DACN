import { describe, expect, it } from 'vitest';
import { assertSlmModel, endpointsForRole, SLM_ENDPOINTS } from './slmCatalog';

describe('slmCatalog', () => {
  it('Qwen3 chỉ dùng trong hai vai trò đã cho phép khi chọn rõ, không vào fallback', () => {
    const model = 'qwen3:4b-instruct-2507-q4_K_M';
    expect(endpointsForRole('fix', 'ollama', model).map(ep => ep.model)).toEqual([model]);
    expect(endpointsForRole('check', 'ollama', model).map(ep => ep.model)).toEqual([model]);
    expect(endpointsForRole('fix').map(ep => ep.model)).toEqual(['gemma3:1b', 'qwen2.5-coder:1.5b']);
    expect(endpointsForRole('check').map(ep => ep.model)).toEqual(['qwen2.5-coder:1.5b', 'gemma3:1b']);
  });
  it('only registers models at or below 9B', () => {
    expect(SLM_ENDPOINTS.every((ep) => ep.maxParamsB <= 9)).toBe(true);
    expect(SLM_ENDPOINTS.some((ep) => /70b/i.test(ep.model))).toBe(false);
  });

  it('rejects large models', () => {
    expect(() => assertSlmModel('llama-3.3-70b-versatile')).toThrow(/not an SLM/);
    expect(() => assertSlmModel('llama3.1:70b')).toThrow(/not an SLM/);
  });

  it('gives fix and check distinct preferred models', () => {
    const fix = endpointsForRole('fix')[0];
    const check = endpointsForRole('check')[0];
    expect(fix.model).toBe('gemma3:1b');
    expect(check.model).toBe('qwen2.5-coder:1.5b');
  });

  it('uses Ollama endpoints only', () => {
    expect(endpointsForRole('fix').every((ep) => ep.providerId === 'ollama')).toBe(true);
  });

  it('cho phép Instruct khi chọn rõ, giữ nguyên hai model tự chọn cũ', () => {
    expect(endpointsForRole('check', 'ollama', 'qwen2.5:1.5b-instruct').map(ep => ep.model)).toEqual(['qwen2.5:1.5b-instruct']);
    expect(endpointsForRole('check').map(ep => ep.model)).toEqual(['qwen2.5-coder:1.5b', 'gemma3:1b']);
    expect(() => endpointsForRole('check', 'ollama', 'unknown:1b')).toThrow(/không tự đổi/);
  });
});
