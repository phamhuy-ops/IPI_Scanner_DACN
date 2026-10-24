import { SemanticChunk } from './types';

export function batchChunks(chunks: SemanticChunk[], batchSize = 3): SemanticChunk[][] {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('Invalid chunk batch size');
  const batches: SemanticChunk[][] = [];
  for (let index = 0; index < chunks.length; index += batchSize) batches.push(chunks.slice(index, index + batchSize));
  return batches;
}

/** Pack whole chunks only: never truncate source evidence mid-quote. */
export function evidenceBatches(chunks: SemanticChunk[], characterBudget: number): SemanticChunk[][] {
  if (!Number.isFinite(characterBudget) || characterBudget < 1) throw new Error('Invalid evidence budget');
  const batches: SemanticChunk[][] = [];
  let current: SemanticChunk[] = [];
  for (const chunk of chunks) {
    if (formatChunkEvidence([chunk]).length > characterBudget) throw new Error('Evidence budget cannot fit a complete chunk');
    if (current.length && formatChunkEvidence([...current, chunk]).length > characterBudget) {
      batches.push(current); current = [];
    }
    current.push(chunk);
  }
  if (current.length) batches.push(current);
  return batches;
}

export function formatChunkEvidence(chunks: SemanticChunk[]): string {
  return chunks.map((chunk) => [
    `[${chunk.chunkId}] File: ${chunk.fileName}; lines: ${chunk.startLine}-${chunk.endLine}; risk score: ${chunk.riskScore}; rule findings: ${chunk.findingCount}.`,
    ...(chunk.sourceView ? [`Source view: ${chunk.sourceView}; line basis: ${chunk.lineBasis}. Raw HTML includes markup, comments and code; text projection is not a browser rendering.`] : []),
    `Selection: ${chunk.selectionReasons.join(', ') || 'coverage sample'}.`,
    '<untrusted_document_data>',
    chunk.text,
    '</untrusted_document_data>',
  ].join('\n')).join('\n\n---\n\n');
}
