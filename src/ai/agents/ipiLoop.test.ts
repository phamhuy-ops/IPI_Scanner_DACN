import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./fixAgent', () => ({
  runFixAgent: vi.fn(async () => ({
    patches: [{ filePath: '/app/agent.js', search: 'bad', replace: 'good', explanation: 'isolate' }],
    summary: 'patched',
    providerUsed: 'groq',
    modelUsed: 'llama-3.1-8b-instant',
  })),
}));

vi.mock('./checkAgent', () => ({
  runCheckAgent: vi.fn(async () => ({
    verdict: 'pass',
    reasons: ['untrusted data delimited'],
    residualRisks: [],
    providerUsed: 'groq',
    modelUsed: 'gemma2-9b-it',
  })),
}));

import { runIpiMultiAgentLoop } from './ipiLoop';

const dirty = {
  ok: true,
  mode: 'ipi-scan' as const,
  target: '/app',
  findings: [{
    ruleId: 'IPI-001',
    owaspCategory: 'LLM01',
    title: 'IPI',
    severity: 'high' as const,
    confidence: 'medium' as const,
    target: '/app/agent.js',
    location: '/app/agent.js:10',
    evidence: ['fetch into prompt'],
    remediation: 'isolate',
    references: [],
    collector: 'source' as const,
  }],
  metadata: { summary: { total: 1, byCategory: { LLM01: 1 }, bySeverity: { high: 1 } } },
};

const clean = {
  ...dirty,
  findings: [],
  metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } },
};

describe('runIpiMultiAgentLoop', () => {
  beforeEach(() => {
    let scans = 0;
    const mockWorkbench = {
      scanIpi: async () => {
        scans += 1;
        return scans === 1 ? dirty : clean;
      },
      readIpiSnippet: async () => ({ ok: true, snippet: '10|const prompt = page', filePath: '/app/agent.js' }),
      applyIpiPatches: async () => ({ ok: true, results: [{ ok: true, rel: 'agent.js' }] }),
    };
    (globalThis as unknown as { owaspWorkbench: unknown }).owaspWorkbench = mockWorkbench;
    if (typeof window !== 'undefined') {
      (window as unknown as { owaspWorkbench: unknown }).owaspWorkbench = mockWorkbench;
    }
  });

  it('loops fix until detector is clean then check agent can pass', async () => {
    const state = await runIpiMultiAgentLoop({ folderPath: '/app' });
    expect(state.status).toBe('passed');
    expect(state.check?.verdict).toBe('pass');
    expect(state.events.some((e) => e.phase === 'fix')).toBe(true);
    expect(state.events.some((e) => e.phase === 'check')).toBe(true);
  });

  it('passes Check Agent critique to Fix Agent when round 1 fails', async () => {
    const { runCheckAgent } = await import('./checkAgent');
    const { runFixAgent } = await import('./fixAgent');

    let checkCalls = 0;
    vi.mocked(runCheckAgent).mockImplementation(async () => {
      checkCalls += 1;
      if (checkCalls === 1) {
        return {
          verdict: 'fail',
          reasons: ['Chưa có delimiter cách ly untrusted content'],
          residualRisks: ['Vẫn có thể bị injection qua query params'],
          providerUsed: 'groq',
          modelUsed: 'gemma2-9b-it',
        };
      }
      return {
        verdict: 'pass',
        reasons: ['Đã cách ly hoàn chỉnh'],
        residualRisks: [],
        providerUsed: 'groq',
        modelUsed: 'gemma2-9b-it',
      };
    });

    const state = await runIpiMultiAgentLoop({ folderPath: '/app' });
    expect(checkCalls).toBe(2);
    expect(state.status).toBe('passed');
    // Verify that runFixAgent was called with reviewerNotes in the follow-up round
    expect(vi.mocked(runFixAgent)).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerNotes: expect.stringContaining('Chưa có delimiter cách ly untrusted content'),
      }),
    );
  });
});
