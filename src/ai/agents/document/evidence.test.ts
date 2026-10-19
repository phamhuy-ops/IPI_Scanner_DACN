import { describe, expect, it } from 'vitest';
import { batchChunks, formatChunkEvidence } from './evidence';
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
