import { describe, expect, it } from 'vitest';
import { batchChunks, formatChunkEvidence, stableSuspicionEvidence } from './evidence';
import { IpiSuspicion } from '../../../types';
import { SemanticChunk } from './types';

const chunk = (index: number): SemanticChunk => ({
  chunkId: `doc-chunk-${index}`,
  fileName: 'report.txt',
  startLine: index * 10 + 1,
  endLine: index * 10 + 10,
  text: `Document content ${index}`,
  riskScore: 0,
  findingCount: 0,
  selectionReasons: ['coverage-sample'],
});

describe('document agent evidence', () => {
  it('alias bất biến theo thư mục, giữ nguyên văn nguồn và không lộ lý do vai trò', () => {
    const quote = 'User guide: the literal path /opt/document.txt is part of this sentence.';
    const item = (directory: string): IpiSuspicion => ({ id: 'rule-1', source: 'rule', status: 'unresolved', originalQuote: quote,
      location: `${directory}/report.txt:3`, citation: { chunkId: 'chunk-1', sourceChunkId: `${directory}/report.txt-chunk-1`,
        filePath: `${directory}/report.txt`, fileName: 'report.txt', quote, startLine: 3, endLine: 3, sourceView: 'raw-html', lineBasis: 'source' },
      detector: { stance: 'confirmed', reason: 'Nhận định nội bộ không được chuyển sang vai trò khác.',
        citation: { chunkId: 'chunk-1', fileName: 'report.txt', quote, startLine: 3, endLine: 3 } }, verifier: null });
    const first = item('/one/private-root'), second = item('/two/other-root');
    const before = structuredClone(first);
    expect(stableSuspicionEvidence([first])).toEqual(stableSuspicionEvidence([second]));
    const serialized = JSON.stringify(stableSuspicionEvidence([first]));
    expect(serialized).not.toContain('private-root');
    expect(serialized).not.toContain('Nhận định nội bộ');
    expect(serialized).toContain('/opt/document.txt');
    expect(serialized).toContain('raw-html');
    expect(first).toEqual(before);
  });
  it('splits semantic chunks into bounded batches', () => {
    expect(batchChunks([chunk(0), chunk(1), chunk(2), chunk(3)], 3).map((batch) => batch.length)).toEqual([3, 1]);
  });

  it('marks document content as untrusted evidence', () => {
    const evidence = formatChunkEvidence([chunk(0)]);

    expect(evidence).toContain('<untrusted_document_data>');
    expect(evidence).toContain('Document content 0');
    expect(evidence).toContain('</untrusted_document_data>');
  });
});
