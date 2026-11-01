import { IpiSuspicion } from '../../types';
import { SemanticChunk } from '../agents/document/types';
import { citationFor } from '../agents/document/reviewPolicy';

// Chỉ dùng trong phép đo: task kiểm tra không phải finding của Detector/rule.
// Caller phải giữ buffer riêng, không đưa task chưa kết luận vào policy sản phẩm.
export function neutralVerifierTasks(chunks: SemanticChunk[], existing: IpiSuspicion[] = []): IpiSuspicion[] {
  const used = new Set(existing.map(row => row.id));
  return chunks.filter(chunk => chunk.text.trim().length >= 3 &&
    !existing.some(row => row.citation?.chunkId === chunk.chunkId)).map((chunk, index) => {
    let id = `coverage-review-${index + 1}`;
    while (used.has(id)) id += '-next';
    used.add(id);
    return { id, source: 'verifier', location: `${chunk.fileName}:${chunk.startLine}`,
      originalQuote: chunk.text, citation: citationFor(chunk.chunkId, chunk.text, chunks),
      detector: null, verifier: null, status: 'unresolved' };
  });
}
