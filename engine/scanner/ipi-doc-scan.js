/**
 * ipi-doc-scan.js — scan documents for Indirect Prompt Injection (PDF, DOCX, TXT, etc.)
 *
 * Features: English/Vietnamese rule catalog, jailbreak and persona hijacking,
 * delimiter smuggling, Base64 decoding, steganography, exfiltration, task diversion,
 * and semantic chunk extraction for multi-agent SLM review.
 */

const path = require('path');
const { extractDocumentText, SUPPORTED_DOC_EXTENSIONS } = require('../document/extractors/document-text-extractor');
const {
  getSemanticScanProfile,
} = require('../config/document-scan-config');
const {
  createSemanticChunks,
  annotateChunkRisk,
  isHighRiskChunk,
  selectSemanticChunks,
} = require('../document/chunking/semantic-chunker');

function summarizeFindings(findings) {
  const bySeverity = {};
  for (const finding of findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
  }
  return { total: findings.length, byCategory: { LLM01: findings.length }, bySeverity };
}

const { scanTextForIpi, scanBase64Payloads } = require('../prefilter/document-prefilter');
const { IPI_DOC_PATTERNS } = require('../prefilter/rules/ipi-document-rules');

// ── Main scanner function ──────────────────────────────────────────────────

/** Scan document files for IPI; returns heuristics, obfuscation hits, and chunks for SLM agents. */
async function runIpiDocScan(filePaths, options = {}) {
  const onProgress = options.onProgress || (() => {});
  const folderPath = options.folderPath || '';
  const scanProfile = getSemanticScanProfile(options.scanProfile);
  const startTs = Date.now();

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('No files selected for scan.');
  }

  onProgress({ stage: 'analyze', msg: `Starting document analysis: ${filePaths.length} file(s)...`, level: 'info', ts: Date.now() });

  const allFindings = [];
  const fileResults = [];
  const extractedSnippets = [];
  const allSemanticChunks = [];

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath);

    if (!SUPPORTED_DOC_EXTENSIONS.has(ext)) {
      fileResults.push({ filePath, ok: false, error: `Unsupported format ${ext}` });
      continue;
    }

    onProgress({ stage: 'analyze', msg: `Extracting text from ${baseName}...`, level: 'info', ts: Date.now() });

    const extracted = await extractDocumentText(filePath);
    if (!extracted.ok) {
      fileResults.push({ filePath, ok: false, error: extracted.error });
      onProgress({ stage: 'analyze', msg: `Read error ${baseName}: ${extracted.error}`, level: 'warn', ts: Date.now() });
      continue;
    }

    onProgress({ stage: 'analyze', msg: `Running IPI rules and obfuscation checks on ${baseName}...`, level: 'info', ts: Date.now() });

    const findings = scanTextForIpi(extracted.text, filePath, folderPath);
    allFindings.push(...findings);
    fileResults.push({ filePath, ok: true, findingCount: findings.length, ext: extracted.ext });

    // Build complete chunk inventory; semantic selection happens after every file is scanned.
    const chunks = annotateChunkRisk(createSemanticChunks(extracted.text, filePath, baseName), findings);
    allSemanticChunks.push(...chunks);
    extractedSnippets.push({
      filePath,
      fileName: baseName,
      chunks: chunks.map((chunk) => chunk.text),
      findingsCount: findings.length,
      sampleText: extracted.text.slice(0, 1200),
    });

    onProgress({
      stage: 'analyze',
      msg: `${baseName}: ${findings.length} suspicious IPI signal(s)`,
      level: findings.length ? 'warn' : 'success',
      ts: Date.now(),
    });
  }

  const summary = summarizeFindings(allFindings);
  const semanticChunks = selectSemanticChunks(allSemanticChunks, scanProfile.maxAiChunks);
  const highRiskChunks = allSemanticChunks.filter(isHighRiskChunk);
  const coverage = {
    mode: 'hybrid-priority-sampling',
    scanProfile: scanProfile.name,
    totalChunks: allSemanticChunks.length,
    aiReviewedChunks: semanticChunks.length,
    highRiskChunks: highRiskChunks.length,
    highRiskChunksReviewed: semanticChunks.filter(isHighRiskChunk).length,
    coverageLimited: semanticChunks.length < allSemanticChunks.length,
    maxAiChunks: scanProfile.maxAiChunks,
    detectorBatchSize: scanProfile.detectorBatchSize,
    verifierEvidenceCharacters: scanProfile.verifierEvidenceCharacters,
  };
  const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);

  onProgress({
    stage: 'done',
    msg: `Prefilter complete: ${allFindings.length} finding(s) in ${filePaths.length} file(s) (${elapsed}s)`,
    level: allFindings.length ? 'warn' : 'success',
    ts: Date.now(),
  });

  return {
    ok: true,
    mode: 'ipi-doc-scan',
    target: filePaths.join(', '),
    findings: allFindings,
    metadata: {
      scannedFiles: filePaths.length,
      fileResults,
      extractedSnippets,
      semanticChunks,
      coverage,
      summary,
    },
  };
}

module.exports = {
  runIpiDocScan,
  scanTextForIpi,
  scanBase64Payloads,
  createSemanticChunks,
  annotateChunkRisk,
  selectSemanticChunks,
  getSemanticScanProfile,
  IPI_DOC_PATTERNS,
  SUPPORTED_DOC_EXTENSIONS,
};
