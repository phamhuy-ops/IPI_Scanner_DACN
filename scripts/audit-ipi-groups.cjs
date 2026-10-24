// Structural audit only: no scanner, model, or scoring is invoked.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'benchmark/data');
const groups = new Map();
const hashes = {};
for (const split of ['dev', 'test']) {
  const raw = fs.readFileSync(path.join(base, `splits/ipi-${split}.jsonl`));
  hashes[split] = crypto.createHash('sha256').update(raw).digest('hex');
  for (const row of raw.toString('utf8').trim().split(/\r?\n/).map(JSON.parse)) {
    if (!groups.has(row.document_group_id)) groups.set(row.document_group_id, { split, rows: [] });
    const group = groups.get(row.document_group_id);
    if (group.split !== split) throw new Error('Group crosses splits');
    group.rows.push(row);
  }
}
const ranked = [...groups.entries()].sort((a, b) => b[1].rows.length - a[1].rows.length);
const audited = ranked.slice(0, 5).map(([id, group]) => {
  const anchors = new Map();
  const intents = new Set();
  const labels = { benign: 0, malicious: 0 };
  for (const row of group.rows) {
    intents.add(row.user_intent); labels[row.label]++;
    const tokens = row.text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const seen = new Set();
    for (let j = 0; j + 40 <= tokens.length; j += 20) {
      const key = tokens.slice(j, j + 40).join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      if (!anchors.has(key)) anchors.set(key, { records: 0, intents: new Set(), ids: [], labels: new Set() });
      const anchor = anchors.get(key);
      anchor.records++; anchor.intents.add(row.user_intent); anchor.labels.add(row.label);
      if (anchor.ids.length < 3) anchor.ids.push(row.id);
    }
  }
  const bridges = [...anchors.entries()].filter(([, a]) => a.intents.size > 1)
    .sort((a, b) => b[1].intents.size - a[1].intents.size || b[1].records - a[1].records);
  return {
    id, split: group.split, records: group.rows.length, labels, distinct_user_intents: intents.size,
    cross_intent_shared_passages: bridges.length,
    bridge_examples: bridges.slice(0, 5).map(([text, a]) => ({
      normalized_passage: text, records: a.records, distinct_intents: a.intents.size,
      labels: [...a.labels].sort(), example_ids: a.ids,
    })),
    sample_ids: [0, Math.floor(group.rows.length / 2), group.rows.length - 1].map(i => group.rows[i].id),
  };
});
const report = {
  scope: 'Structural grouping audit of the five largest existing groups; no prediction-based tuning.',
  input_split_hashes: hashes,
  audited_groups: audited,
  interpretation: [
    'Distinct user intents are a diagnostic, not proof of distinct original documents.',
    'Cross-intent passages can connect separate tasks through shared attack payloads or boilerplate.',
    'Groups are similarity-connected components, not verified original-document families.',
    'The existing split conservatively keeps shared sampled passages together; splitting components can reintroduce those overlaps.',
  ],
  decision: 'Keep existing files unchanged for reproducibility; document the large connected component and its test concentration. Do not claim source-document independence or broad domain representativeness from this split.',
};
fs.writeFileSync(path.join(base, 'splits/ipi-group-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
