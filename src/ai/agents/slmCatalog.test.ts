import { describe, expect, it } from 'vitest';
import { assertSlmModel, endpointsForRole, SLM_ENDPOINTS } from './slmCatalog';

describe('slmCatalog', () => {
  it('only registers models at or below 9B', () => {
    expect(SLM_ENDPOINTS.every((ep) => ep.maxParamsB <= 9)).toBe(true);
    expect(SLM_ENDPOINTS.some((ep) => /70b/i.test(ep.model))).toBe(false);
  });

  it('rejects large models', () => {
    expect(() => assertSlmModel('llama-3.3-70b-versatile')).toThrow(/không phải SLM/);
    expect(() => assertSlmModel('llama3.1:70b')).toThrow(/không phải SLM/);
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
});
