import { describe, expect, it } from 'vitest';
import { applySearchReplace, resolveInsideRoot } from './ipi-patch.js';

describe('ipi-patch', () => {
  it('applies exact and newline-normalized replace', () => {
    expect(applySearchReplace('a b', 'a', 'x')).toEqual({ ok: true, next: 'x b', mode: 'exact' });
    expect(applySearchReplace('a\r\nb', 'a\nb', 'x\ny')).toEqual({ ok: true, next: 'x\ny', mode: 'lf' });
    expect(applySearchReplace('hello', 'missing', 'x').ok).toBe(false);
  });

  it('handles SLM artifacts like line numbers and code fences', () => {
    const src = 'const prompt = "user: " + input;\nconst res = await llm.call(prompt);';
    // SLM included snippet line numbers
    const searchWithLines = '10| const prompt = "user: " + input;\n11| const res = await llm.call(prompt);';
    const replaceWithLines = '10| const prompt = sanitize(input);\n11| const res = await llm.call(prompt);';
    const res = applySearchReplace(src, searchWithLines, replaceWithLines);
    expect(res.ok).toBe(true);
    expect(res.next).toContain('sanitize(input)');
  });

  it('matches multi-line code with indentation differences (fuzzy-lines)', () => {
    const src = '    const a = 1;\n    const b = 2;\n    return a + b;';
    const searchDiffIndent = 'const a = 1;\nconst b = 2;';
    const replace = '    const a = 10;\n    const b = 20;';
    const res = applySearchReplace(src, searchDiffIndent, replace);
    expect(res.ok).toBe(true);
    expect(res.mode).toBe('fuzzy-lines');
    expect(res.next).toBe('    const a = 10;\n    const b = 20;\n    return a + b;');
  });

  it('rejects paths outside the project root', () => {
    expect(() => resolveInsideRoot('/proj', '../secret.js')).toThrow(/ngoài/);
  });
});
