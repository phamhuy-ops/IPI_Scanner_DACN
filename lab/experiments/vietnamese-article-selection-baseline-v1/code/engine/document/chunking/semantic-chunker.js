const { SEMANTIC_CHUNK_CONFIG, SEMANTIC_SCAN_PROFILES } = require('../../config/document-scan-config');

const SEVERITY_SCORE = { critical: 100, high: 60, medium: 25, low: 10 };

function lineNumberFromLocation(location) {
  const match = String(location || '').match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function lineAt(text, index) {
  return text.slice(0, index).split(/\r\n?|\n/).length;
}

function createSemanticChunks(text, filePath, fileName, chunkSize = SEMANTIC_CHUNK_CONFIG.size, overlap = SEMANTIC_CHUNK_CONFIG.overlap, preserveSource = false) {
  const clean = preserveSource ? text : text.replace(/\r\n?/g, '\n').trim();
  if (!clean.trim()) return [];

  const chunks = [];
  let start = 0;
  let index = 0;
  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      const boundary = clean.lastIndexOf('\n', end);
      if (boundary > start + Math.floor(chunkSize * 0.55)) end = boundary + 1;
    }
    const chunkText = preserveSource ? clean.slice(start, end) : clean.slice(start, end).trim();
    if (chunkText.trim()) {
      chunks.push({
        chunkId: `${filePath}-chunk-${index + 1}`,
        filePath,
        fileName,
        index,
        startLine: lineAt(clean, start),
        endLine: lineAt(clean, Math.max(start, end - 1)),
        text: chunkText,
        riskScore: 0,
        findingCount: 0,
        selectionReasons: [],
      });
      index += 1;
    }
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function annotateChunkRisk(chunks, findings) {
  for (const finding of findings) {
    const line = lineNumberFromLocation(finding.location);
    // Minified HTML can put every chunk on line 1. Prefer the exact excerpt
    // instead of attributing every hit to the first chunk on that line.
    const grounded = finding.matchedText ? chunks.filter(item => item.text.includes(finding.matchedText)) : [];
    const targets = grounded.length ? grounded : line ? chunks.filter(item => line >= item.startLine && line <= item.endLine).slice(0, 1) : [];
    for (const chunk of targets) {
      const score = SEVERITY_SCORE[finding.severity] || 10;
      chunk.riskScore += score;
      chunk.findingCount += 1;
      if (!chunk.selectionReasons.includes(`rule:${finding.severity}`)) chunk.selectionReasons.push(`rule:${finding.severity}`);
    }
  }
  return chunks;
}

function addChunk(selected, chunk, reason) {
  if (!chunk || selected.has(chunk.chunkId)) return;
  chunk.selectionReasons.push(reason);
  selected.set(chunk.chunkId, chunk);
}

function isHighRiskChunk(chunk) {
  return chunk.riskScore >= SEVERITY_SCORE.high;
}

function selectSemanticChunks(chunks, maxChunks = SEMANTIC_SCAN_PROFILES.balanced.maxAiChunks) {
  const selected = new Map();
  const byFile = new Map();
  const groupKey = chunk => `${chunk.filePath}\u0000${chunk.sourceView || 'document-text'}`;
  for (const chunk of chunks) {
    const items = byFile.get(groupKey(chunk)) || [];
    items.push(chunk);
    byFile.set(groupKey(chunk), items);
  }

  const ranked = [...chunks].sort((a, b) => b.riskScore - a.riskScore || a.index - b.index);
  const highRiskChunks = ranked.filter(isHighRiskChunk);
  for (const chunk of highRiskChunks) addChunk(selected, chunk, 'high-risk');

  for (const chunk of highRiskChunks) {
    const items = byFile.get(groupKey(chunk)) || [];
    addChunk(selected, items[chunk.index - 1], 'neighbor-of-high-risk');
    addChunk(selected, items[chunk.index + 1], 'neighbor-of-high-risk');
  }

  for (const items of byFile.values()) {
    addChunk(selected, items[0], 'sentinel-start');
    addChunk(selected, items[Math.floor(items.length / 2)], 'sentinel-middle');
    addChunk(selected, items[items.length - 1], 'sentinel-end');
    addChunk(selected, items[Math.floor(items.length * 0.25)], 'coverage-sample');
    addChunk(selected, items[Math.floor(items.length * 0.75)], 'coverage-sample');
  }

  for (const chunk of ranked.filter((item) => item.riskScore > 0)) addChunk(selected, chunk, 'ranked-risk');
  for (const chunk of ranked) addChunk(selected, chunk, 'coverage-fill');
  return [...selected.values()].slice(0, maxChunks);
}

module.exports = { createSemanticChunks, annotateChunkRisk, isHighRiskChunk, selectSemanticChunks };
