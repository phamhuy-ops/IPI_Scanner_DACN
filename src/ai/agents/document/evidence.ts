import { SemanticChunk } from './types';
import { IpiSuspicion } from '../../../types';

// Chỉ bản mô tả gửi model: đường dẫn/ID nguồn thật vẫn giữ trong state để map citation.
export function stableSuspicionEvidence(items: IpiSuspicion[]) {
  return items.map(item => ({ id: item.id, source: item.source, originalQuote: item.originalQuote,
    citation: item.citation ? { chunkId: item.citation.chunkId, quote: item.citation.quote,
      startLine: item.citation.startLine, endLine: item.citation.endLine,
      ...(item.citation.sourceView ? { sourceView: item.citation.sourceView } : {}),
      ...(item.citation.lineBasis ? { lineBasis: item.citation.lineBasis } : {}) } : null }));
}

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

// Mỗi lượt giữ nguyên các chunk đầy đủ; không trộn HTML gốc với bản chiếu văn bản.
export function verifierEvidenceBatches(chunks: SemanticChunk[], characterBudget: number, targets?: IpiSuspicion[]): SemanticChunk[][] {
  const batches = evidenceBatches(chunks, characterBudget);
  if (!targets) return batches;
  return batches.flatMap(batch => {
    // Một mục tiêu chưa cần đổi payload; tách khi có nhiều trích dẫn cùng cạnh tranh ngữ cảnh.
    if (targets.filter(target => batch.some(chunk => chunk.chunkId === target.citation?.chunkId)).length <= 1) return [batch];
    const views = new Map<SemanticChunk['sourceView'], SemanticChunk[]>();
    for (const chunk of batch) {
      const group = views.get(chunk.sourceView) || [];
      group.push(chunk);
      views.set(chunk.sourceView, group);
    }
    return [...views.values()];
  });
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
