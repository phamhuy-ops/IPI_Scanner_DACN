// Ứng viên thí nghiệm: giữ phần ưu tiên cũ, chỉ rải đều phần coverage-fill.
const path = require('node:path');
const baseline = require(path.resolve(__dirname, '../benchmark/experiments/vietnamese-article-selection-baseline-v1/code/engine/document/chunking/semantic-chunker.js'));
function uniformSample(items, count) {
  const size = Math.min(items.length, Math.max(0, Math.floor(count)));
  if (!size) return [];
  if (size === 1) return [items[Math.floor((items.length - 1) / 2)]];
  return Array.from({ length: size }, (_, i) => items[Math.round(i * (items.length - 1) / (size - 1))]);
}
function selectCandidate(chunks, maxChunks) {
  const copies = chunks.map(c => ({ ...c, selectionReasons: c.selectionReasons.filter(r => r.startsWith('rule:')) }));
  const all = baseline.selectSemanticChunks(copies, copies.length);
  const priority = all.filter(c => !c.selectionReasons.includes('coverage-fill'));
  if (priority.length >= maxChunks) return priority.slice(0, maxChunks);
  const rest = all.filter(c => c.selectionReasons.includes('coverage-fill'));
  return [...priority, ...uniformSample(rest, maxChunks - priority.length)];
}
module.exports = { uniformSample, selectCandidate };
