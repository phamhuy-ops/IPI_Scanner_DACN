// Separate, reproducible development controls. Never reads MAlmasabi holdout.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { main: benchmark, metrics } = require('./run-prefilter-benchmark.cjs');
const ROOT = path.resolve(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJsonl = raw => raw.toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

function selectSamples(samples, view) {
  const selected = samples.filter(sample => view.scopes.includes(sample.attack_scope));
  const counts = { benign: 0, malicious: 0 };
  for (const sample of selected) {
    if (!Object.hasOwn(counts, sample.label)) throw new Error(`Invalid label: ${sample.id}`);
    counts[sample.label]++;
  }
  if (!selected.length || counts.benign !== view.expected_labels.benign || counts.malicious !== view.expected_labels.malicious) {
    throw new Error(`View ${view.id} label counts differ from manifest`);
  }
  return selected;
}

function runSuite(outputRoot = path.join(ROOT, 'benchmark/results')) {
  const manifestPath = path.join(ROOT, 'benchmark/data/control-suite.json');
  const manifestRaw = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestRaw);
  const sources = new Map();
  for (const [name, definition] of Object.entries(manifest.sources)) {
    const raw = fs.readFileSync(path.join(ROOT, definition.dataset));
    const report = JSON.parse(fs.readFileSync(path.join(ROOT, definition.normalization_report)));
    if (hash(raw) !== report.output_sha256) throw new Error(`Normalized source changed: ${name}`);
    const samples = readJsonl(raw);
    if (samples.length !== report.rows || new Set(samples.map(r => r.id)).size !== samples.length) throw new Error(`Invalid source rows: ${name}`);
    sources.set(name, { definition, samples, hash: hash(raw) });
  }
  const selected = manifest.views.map(view => ({ view, samples: selectSamples(sources.get(view.source).samples, view) }));
  // Views are a disjoint partition: no accidental doubling of controls.
  const ids = new Set();
  for (const item of selected) for (const sample of item.samples) {
    if (ids.has(sample.id)) throw new Error(`Overlapping views: ${sample.id}`);
    ids.add(sample.id);
  }
  if (ids.size !== [...sources.values()].reduce((n, source) => n + source.samples.length, 0)) throw new Error('Some source records are not assigned to a view');
  fs.mkdirSync(outputRoot, { recursive: true });
  const output = fs.mkdtempSync(path.join(outputRoot, 'prefilter-controls-'));
  const sourceFiles = ['engine/prefilter/document-prefilter.js', 'engine/prefilter/rules/ipi-document-rules.js',
    'engine/models/finding.js', 'scripts/run-prefilter-benchmark.cjs', 'scripts/run-prefilter-controls.cjs'];
  const codeHashes = Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
  const results = [];
  let complete = false;
  try {
    for (const { view, samples } of selected) {
      const viewFile = path.join(output, `${view.id}.jsonl`);
      fs.writeFileSync(viewFile, samples.map(row => JSON.stringify(row)).join('\n') + '\n');
      const { report, runDir } = benchmark(['--dataset', viewFile, '--output', output]);
      const predictions = readJsonl(fs.readFileSync(path.join(runDir, 'predictions.jsonl')));
      const sampleById = new Map(samples.map(sample => [sample.id, sample]));
      const subsets = new Map();
      for (const prediction of predictions) {
        const sample = sampleById.get(prediction.id);
        const key = sample.metadata?.source_subset || sample.attack_scope;
        if (!subsets.has(key)) subsets.set(key, []);
        subsets.get(key).push(prediction);
      }
      results.push({ id: view.id, purpose: view.purpose, scopes: view.scopes,
        source_file: sources.get(view.source).definition.dataset, source_sha256: sources.get(view.source).hash,
        view_file: path.relative(ROOT, viewFile), view_sha256: report.dataset_sha256,
        run_directory: path.relative(ROOT, runDir), metrics: report.metrics,
        by_subset_or_scope: [...subsets].map(([name, rows]) => ({ name, ...metrics(rows) })) });
    }
    for (const [name, source] of sources) {
      if (hash(fs.readFileSync(path.join(ROOT, source.definition.dataset))) !== source.hash) throw new Error(`Source changed during run: ${name}`);
    }
    for (const [file, expected] of Object.entries(codeHashes)) {
      if (hash(fs.readFileSync(path.join(ROOT, file))) !== expected) throw new Error(`Code changed during run: ${file}`);
    }
    const report = { timestamp: new Date().toISOString(), status: 'complete', evaluation_role: manifest.evaluation_role,
      manifest_sha256: hash(manifestRaw), source_hashes: codeHashes, unique_records: ids.size,
      notes: ['Development controls, not an untouched independent holdout.',
        'No aggregate score across sources/scopes: preserve each view separately.',
        'Metrics use fractions; null means undefined, not zero. For all-benign data use FPR; for all-malicious data FPR is undefined.',
        'Only text reaches the production prefilter; source-provided scores/results remain metadata.',
        'No extraction, local models, full pipeline, real-document fixtures or MAlmasabi test evaluated.'],
      results };
    fs.writeFileSync(path.join(output, 'suite-summary.json'), JSON.stringify(report, null, 2) + '\n');
    complete = true;
    console.log(`Controls complete: ${path.relative(ROOT, output)}`);
    return { output, report };
  } finally {
    if (!complete) fs.writeFileSync(path.join(output, 'FAILED.txt'), 'Incomplete control suite. Do not use as complete baseline.\n');
  }
}

if (require.main === module) {
  try {
    if (process.argv.length > 2) throw new Error('This command accepts no flags; use benchmark:prefilter for a custom dataset.');
    runSuite();
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { selectSamples, runSuite };
