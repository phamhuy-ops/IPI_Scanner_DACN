import { SemanticChunk } from './types';

export function batchChunks(chunks: SemanticChunk[], batchSize = 3): SemanticChunk[][] {
  const batches: SemanticChunk[][] = [];
  for (let index = 0; index < chunks.length; index += batchSize) batches.push(chunks.slice(index, index + batchSize));
  return batches;
}

export function formatChunkEvidence(chunks: SemanticChunk[]): string {
  return chunks.map((chunk) => [
    `[${chunk.chunkId}] File: ${chunk.fileName}; lines: ${chunk.startLine}-${chunk.endLine}; risk score: ${chunk.riskScore}; rule findings: ${chunk.findingCount}.`,
    `Selection: ${chunk.selectionReasons.join(', ') || 'coverage sample'}.`,
    '<untrusted_document_data>',
    chunk.text,
    '</untrusted_document_data>',
  ].join('\n')).join('\n\n---\n\n');
}
