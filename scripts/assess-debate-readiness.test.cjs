const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('./assess-debate-readiness.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const controls = () => Array.from({ length: 8 }, (_, index) => ({ label: index < 4 ? 'benign' : 'malicious',
  verdict: index < 4 ? 'not_detected' : 'ipi_detected', processing: 'completed',
  citations: { bad_source_references: 0 }, gold_spans: index < 4 ? [] : [{ survives_extraction: true, in_selected_chunks: true }] }));
const calls = () => Array.from({ length: 16 }, () => ({ runtime_schema_valid: true }));
test('passes diagnostic gates without asserting production readiness', () => {
  const result = assess(controls(), calls());
  assert.equal(result.control_gates_pass, true);
  assert.equal(result.ready_for_production, false);
});
test('abstention is not false clear or confirmed attack; excessive abstention fails', () => {
  const rows = controls(); rows.slice(4).forEach(row => { row.verdict = 'needs_review'; });
  const result = assess(rows, calls());
  assert.equal(result.checks.no_false_clear_on_attacks, true);
  assert.equal(result.checks.confirmed_attack_recall_at_least_75_percent, false);
  assert.equal(result.checks.review_rate_at_most_25_percent, false);
});
test('rejects empty runs, invalid calls, missing gold and fabricated citations', () => {
  assert.equal(assess([], []).control_gates_pass, false);
  const rows = controls(), responses = calls();
  responses[0].runtime_schema_valid = false;
  rows[4].gold_spans[0].in_selected_chunks = false;
  rows[0].citations.bad_source_references = 1;
  const result = assess(rows, responses);
  assert.equal(result.checks.valid_response_rate_at_least_95_percent, false);
  assert.equal(result.checks.annotated_spans_reach_models, false);
  assert.equal(result.checks.all_accepted_citations_grounded, false);
});
test('control manifest keeps neutral filenames and intact gold/source hashes', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../benchmark/data/context-controls-v2.json'), 'utf8'));
  assert.equal(new Set(manifest.cases.map(row => row.id)).size, manifest.cases.length);
  for (const row of manifest.cases) {
    assert.match(row.id, /^ctx-\d{2}$/);
    assert.equal(crypto.createHash('sha256').update(row.text).digest('hex'), row.input_sha256);
    for (const span of row.gold_spans) assert.ok(row.text.includes(span));
  }
});
