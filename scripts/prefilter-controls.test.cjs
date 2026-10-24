const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSamples } = require('./run-prefilter-controls.cjs');

test('strict IPI view includes benign controls but excludes direct and mixed attacks', () => {
  const rows = [
    { id: 'ipi', label: 'malicious', attack_scope: 'ipi' },
    { id: 'direct', label: 'malicious', attack_scope: 'direct' },
    { id: 'mixed', label: 'malicious', attack_scope: 'mixed' },
    { id: 'clean', label: 'benign', attack_scope: 'benign_control' },
  ];
  const selected = selectSamples(rows, { id: 'strict', scopes: ['ipi', 'benign_control'], expected_labels: { benign: 1, malicious: 1 } });
  assert.deepEqual(selected.map(r => r.id), ['ipi', 'clean']);
  assert.equal(selected[0], rows[0]);
  const supplemental = selectSamples(rows, { id: 'extra', scopes: ['direct', 'mixed'], expected_labels: { benign: 0, malicious: 2 } });
  assert.deepEqual(supplemental.map(r => r.id), ['direct', 'mixed']);
});

test('empty views, unexpected labels and changed label counts fail visibly', () => {
  const view = { id: 'clean', scopes: ['benign_control'], expected_labels: { benign: 1, malicious: 0 } };
  assert.throws(() => selectSamples([], view), /counts differ/);
  assert.throws(() => selectSamples([{ id: 'a', label: 'injection', attack_scope: 'benign_control' }], view), /Invalid label/);
  assert.throws(() => selectSamples([{ id: 'a', label: 'malicious', attack_scope: 'benign_control' }], view), /counts differ/);
});
