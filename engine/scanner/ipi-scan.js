const { walkFiles } = require('../collectors/source/project-loader');
const { collectCodeFiles } = require('../collectors/source/logging-scanner');
const { summarizeFindings } = require('../report/report-engine');
const { runIndirectPromptInjection } = require('../rules/ipi/indirect-prompt-injection');

async function runIpiScan(folderPath, options = {}) {
  const onProgress = options.onProgress || (() => {});
  const abortSignal = options.abortSignal || null;
  const startTs = Date.now();

  if (!folderPath || typeof folderPath !== 'string') {
    throw new Error('Hãy chọn thư mục project.');
  }

  onProgress({ stage: 'analyze', msg: `IPI scan: ${folderPath}`, level: 'info', ts: Date.now() });

  if (abortSignal?.aborted) {
    return emptyAbort();
  }

  const maxFiles = options.maxFiles || process.env.SENTINEL_PROJECT_MAX_FILES || 2500;
  const files = walkFiles(folderPath, { maxFiles });
  const codeFiles = collectCodeFiles(files);

  onProgress({
    stage: 'analyze',
    msg: `Phân tích ${codeFiles.length} file mã nguồn cho Indirect Prompt Injection`,
    level: 'info',
    ts: Date.now(),
  });

  if (abortSignal?.aborted) return emptyAbort();

  const findings = runIndirectPromptInjection({ folderPath, repoRoot: folderPath, codeFiles });
  const summary = summarizeFindings(findings);
  const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);

  onProgress({
    stage: 'done',
    msg: `IPI detector: ${findings.length} findings (${elapsed}s)`,
    level: findings.length ? 'warn' : 'success',
    ts: Date.now(),
  });

  return {
    ok: true,
    mode: 'ipi-scan',
    target: folderPath,
    findings,
    metadata: {
      scannedFiles: files.length,
      codeFiles: codeFiles.length,
      summary,
    },
  };
}

function emptyAbort() {
  return {
    ok: false,
    error: 'Scan đã bị hủy.',
    findings: [],
    metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } },
  };
}

module.exports = { runIpiScan };
