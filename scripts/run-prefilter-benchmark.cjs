const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { scanTextForIpi } = require('../engine/prefilter/document-prefilter');
const ROOT = path.resolve(__dirname, '..');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');

function metrics(rows) {
  const counts = { total: rows.length, tp: 0, fp: 0, tn: 0, fn: 0 };
  for (const row of rows) counts[row.outcome.toLowerCase()]++;
  const divide = (a, b) => b ? a / b : null;
  const precision = divide(counts.tp, counts.tp + counts.fp);
  const recall = divide(counts.tp, counts.tp + counts.fn);
  return { ...counts, precision, recall,
    f1: divide(2 * counts.tp, 2 * counts.tp + counts.fp + counts.fn),
    false_positive_rate: divide(counts.fp, counts.fp + counts.tn),
    accuracy: divide(counts.tp + counts.tn, counts.total),
    average_scan_ms: divide(rows.reduce((sum, row) => sum + row.scan_ms, 0), rows.length) };
}

function main(args = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--split', '--dataset', '--output'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Usage: node scripts/run-prefilter-benchmark.cjs [--split dev|test] [--dataset file.jsonl] [--output directory]');
    options[args[i]] = args[i + 1];
  }
  const split = options['--split'] || 'dev';
  if (!['dev', 'test'].includes(split)) throw new Error('Split must be dev or test');
  if (options['--dataset'] && options['--split']) throw new Error('Use either --dataset or --split');
  const dataset = path.resolve(ROOT, options['--dataset'] || `benchmark/data/splits/ipi-${split}.jsonl`);
  const raw = fs.readFileSync(dataset);
  const samples = raw.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim()).map(JSON.parse);
  if (!samples.length) throw new Error('Dataset is empty');
  const ids = new Set();
  for (const sample of samples) {
    if (typeof sample.id !== 'string' || !sample.id.trim() || ids.has(sample.id) ||
        typeof sample.text !== 'string' || !sample.text.trim() || !['benign', 'malicious'].includes(sample.label)) throw new Error(`Invalid or duplicate sample: ${sample.id}`);
    ids.add(sample.id);
  }
  const directory = path.resolve(ROOT, options['--output'] || 'benchmark/results');
  fs.mkdirSync(directory, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(directory, `prefilter-${options['--dataset'] ? 'custom' : split}-`));
  const allFd = fs.openSync(path.join(runDir, 'predictions.jsonl'), 'wx');
  const errorsFd = fs.openSync(path.join(runDir, 'errors.jsonl'), 'wx');
  const results = [];
  const groups = new Map();
  const sources = new Map();
  const rules = new Map();
  const start = performance.now();
  let completed = false;
  try {
    for (const [i, sample] of samples.entries()) {
      const t = performance.now();
      // Only untrusted text reaches the scanner; no label or metadata.
      const findings = scanTextForIpi(sample.text, 'benchmark-document.txt');
      const elapsed = performance.now() - t;
      const predicted = findings.length > 0;
      const malicious = sample.label === 'malicious';
      const outcome = malicious ? (predicted ? 'TP' : 'FN') : (predicted ? 'FP' : 'TN');
      const row = { id: sample.id, label: sample.label, predicted_label: predicted ? 'malicious' : 'benign', outcome,
        document_group_id: sample.document_group_id || null, source: sample.source || null,
        scan_ms: elapsed, finding_count: findings.length,
        matched_rule_ids: [...new Set(findings.map(f => f.ruleId))].sort() };
      results.push(row);
      for (const [map, key] of [[groups, row.document_group_id || '(ungrouped)'], [sources, row.source || '(unknown)']]) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
      }
      for (const rule of row.matched_rule_ids) {
        if (!rules.has(rule)) rules.set(rule, { matched_samples: 0, malicious_samples: 0, benign_samples: 0 });
        const counts = rules.get(rule);
        counts.matched_samples++; counts[malicious ? 'malicious_samples' : 'benign_samples']++;
      }
      fs.writeSync(allFd, JSON.stringify(row) + '\n');
      if (outcome === 'FP' || outcome === 'FN') fs.writeSync(errorsFd, JSON.stringify({ ...sample, ...row, findings }) + '\n');
      if ((i + 1) % 5000 === 0) console.log(`Scanned ${i + 1}/${samples.length}`);
    }
    const groupMetrics = [...groups].map(([id, rows]) => ({ document_group_id: id, ...metrics(rows) }))
      .sort((a, b) => b.total - a.total || a.document_group_id.localeCompare(b.document_group_id));
    const report = {
      timestamp: new Date().toISOString(), status: 'complete', mode: 'rule-prefilter-text-only',
      split: options['--dataset'] ? 'custom' : split,
      dataset: path.relative(ROOT, dataset), dataset_sha256: digest(raw), node_version: process.version,
      decision: 'malicious iff scanTextForIpi returns at least one finding (all severities; no rule changes)',
      null_metric_policy: 'null means denominator is zero; not a measured zero',
      scope: 'Text prefilter including Base64 decoding; no extraction, chunk selection, Detector or Verifier.',
      source_hashes: Object.fromEntries(['engine/prefilter/document-prefilter.js', 'engine/prefilter/rules/ipi-document-rules.js',
        'engine/models/finding.js', 'scripts/run-prefilter-benchmark.cjs'].map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))])),
      metrics: metrics(results), wall_seconds: (performance.now() - start) / 1000,
      by_source: [...sources].map(([source, rows]) => ({ source, ...metrics(rows) })),
      groups: { count: groups.size, largest_group_fraction: groupMetrics[0].total / results.length,
        macro_group_accuracy: groupMetrics.reduce((sum, g) => sum + g.accuracy, 0) / groupMetrics.length,
        note: 'Unweighted mean of group accuracies; groups are heuristic, not independently verified documents.' },
      by_rule: Object.fromEntries([...rules].sort(([a], [b]) => a.localeCompare(b))),
    };
    fs.writeFileSync(path.join(runDir, 'by-group.json'), JSON.stringify(groupMetrics, null, 2) + '\n');
    fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
    completed = true;
    console.log(JSON.stringify({ output: path.relative(ROOT, runDir), metrics: report.metrics }, null, 2));
    return { report, runDir };
  } finally {
    fs.closeSync(allFd); fs.closeSync(errorsFd);
    if (!completed) fs.writeFileSync(path.join(runDir, 'FAILED.txt'), 'Run incomplete. Do not use partial output as benchmark results.\n');
  }
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { metrics, main };
