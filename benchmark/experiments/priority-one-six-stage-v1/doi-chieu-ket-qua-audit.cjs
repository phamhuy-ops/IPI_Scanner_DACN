const assert = require('node:assert/strict');
const path = require('node:path');
const { summarize } = require('../../../scripts/round-one-metrics.cjs');

function readRun(id) {
  const directory = path.resolve(__dirname, '../../results/round-one-eval-' + id);
  const summary = require(path.join(directory, 'summary.json'));
  const cases = require(path.join(directory, 'cases.json'));
  assert.equal(summary.status, 'complete', id);
  assert.equal(summary.cases_completed, cases.length, id);
  return { id, summary, cases };
}

const baseline = readRun('xujCof');
const auditRuns = ['iHCwOF', 'zW3dI6', 'Yzeofz'].map(readRun);
const summaryRule = 'IPI-DOC-SUMMARY-OUTPUT-OVERRIDE-CANDIDATE';
const eligible = baseline.cases.filter(row => row.state.suspicions.some(item =>
  item.ruleId === summaryRule && item.citation));
assert.deepEqual(eligible.map(row => row.id), auditRuns.map(run => run.cases[0].id));
const replacements = new Map();
for (const run of auditRuns) {
  assert.equal(run.summary.manifest_sha256, baseline.summary.manifest_sha256);
  assert.deepEqual(run.summary.configuration, { ...baseline.summary.configuration, verifier_summary_audit: true });
  const [row] = run.cases;
  assert.equal(run.cases.length, 1);
  assert.equal(row.processing, 'completed');
  assert.equal(run.summary.model_calls.invalid_or_failed, 0);
  replacements.set(row.id, row);
}
const hardControls = readRun('FESxeb');
const exampleRetry = readRun('VchSVM');
assert.equal(hardControls.summary.manifest_sha256, exampleRetry.summary.manifest_sha256);
const controls = hardControls.cases.filter(row => row.label === 'benign' &&
  row.state.suspicions.some(item => item.ruleId === summaryRule && item.citation));
const withExampleGuard = controls.map(row => row.id === exampleRetry.cases[0].id ? exampleRetry.cases[0] : row);
const verdictOnly = rows => {
  const result = summarize(rows.map(({ label, verdict, processing }) => ({ label, verdict, processing })));
  delete result.latency_seconds;
  delete result.average_seconds;
  return result;
};
console.log(JSON.stringify({
  scope: 'Đối chiếu ghép các lượt dev đã lưu. Mã ở các lượt có thể khác. Không phải lượt chạy đủ 50 ca với cấu hình đã khóa.',
  baseline: { run: baseline.id, metrics: verdictOnly(baseline.cases) },
  combined: { runs: auditRuns.map(run => run.id), metrics: verdictOnly(baseline.cases.map(row => replacements.get(row.id) ?? row)) },
  hard_controls: { runs: [hardControls.id, exampleRetry.id],
    before: verdictOnly(controls), after: verdictOnly(withExampleGuard) },
}, null, 2));
