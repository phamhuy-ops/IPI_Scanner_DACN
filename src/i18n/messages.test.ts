import { describe, expect, it } from 'vitest';
import { messages, t } from './messages';

const TERMS = ['IPI', 'Detector', 'Verifier', 'TinyLLM', 'Ollama', 'Rule Prefilter', 'Balanced', 'Deep Scan', 'chunk', 'RAG'];

describe('giao diện đa ngôn ngữ', () => {
  it('có đủ khóa tiếng Việt khớp tiếng Anh', () => {
    expect(Object.keys(messages.vi).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it('giữ thuật ngữ kỹ thuật khi chuyển sang tiếng Việt', () => {
    const sample = [
      t('vi', 'form.intro'),
      t('vi', 'form.deepHint'),
      t('vi', 'form.balancedHint'),
      t('vi', 'form.detector'),
      t('vi', 'form.verifier'),
      t('vi', 'panel.heroTitle'),
      t('vi', 'panel.heroDesc'),
      t('vi', 'panel.step1Title'),
      t('vi', 'verdict.ipi_detected'),
    ].join(' ');
    for (const term of TERMS) expect(sample).toContain(term);
  });
});
