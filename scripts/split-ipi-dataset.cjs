// Deterministic grouped split. Never changes the raw or normalized source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'benchmark/data/processed/ipi-clean.jsonl');
const raw = fs.readFileSync(input);
const rows = raw.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
const seed = 'sentinel-ipi-split-v1-20261023';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parent = rows.map((_, i) => i);
function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
function union(a, b) { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); }
const anchors = new Map();
let sharedAnchors = 0;
for (const [i, row] of rows.entries()) {
  const tokens = row.text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const keys = new Set([hash('full:' + tokens.join(' '))]);
  // Shared long passages group document variants conservatively, including
  // variants with injected instructions in different locations.
  for (let j = 0; j + 40 <= tokens.length; j += 20) keys.add(hash('passage:' + tokens.slice(j, j + 40).join(' ')));
  for (const key of keys) {
    if (anchors.has(key)) { union(i, anchors.get(key)); sharedAnchors++; }
    else anchors.set(key, i);
  }
}
const grouped = new Map();
for (let i = 0; i < rows.length; i++) {
  const key = find(i);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(i);
}
const groups = [...grouped.values()].map(indices => {
  const id = 'group-' + hash(indices.map(i => rows[i].id).sort().join('\n')).slice(0, 24);
  return { indices, id, rank: hash(seed + id), benign: indices.filter(i => rows[i].label === 'benign').length,
    malicious: indices.filter(i => rows[i].label === 'malicious').length };
}).sort((a, b) => b.indices.length - a.indices.length || a.rank.localeCompare(b.rank));
const totals = { benign: rows.filter(r => r.label === 'benign').length, malicious: rows.filter(r => r.label === 'malicious').length };
const targets = Object.fromEntries(Object.entries(totals).map(([label, n]) => [label, Math.round(n * 0.2)]));
const testCounts = { benign: 0, malicious: 0 };
const assignment = new Map();
function cost(counts) { return ['benign', 'malicious'].reduce((sum, label) => sum + ((counts[label] - targets[label]) / targets[label]) ** 2, 0); }
for (const group of groups) {
  const added = { benign: testCounts.benign + group.benign, malicious: testCounts.malicious + group.malicious };
  const withinTargets = added.benign <= targets.benign && added.malicious <= targets.malicious;
  const split = withinTargets && cost(added) < cost(testCounts) ? 'test' : 'dev';
  if (split === 'test') Object.assign(testCounts, added);
  for (const i of group.indices) assignment.set(i, { split, group_id: group.id });
}
const output = { dev: [], test: [] };
for (const [i, row] of rows.entries()) {
  const assigned = assignment.get(i);
  output[assigned.split].push({ ...row, document_group_id: assigned.group_id });
}
const devIds = new Set(output.dev.map(r => r.id));
const devGroups = new Set(output.dev.map(r => r.document_group_id));
if (output.dev.length + output.test.length !== rows.length || new Set(rows.map(r => r.id)).size !== rows.length ||
    output.test.some(r => devIds.has(r.id) || devGroups.has(r.document_group_id))) throw new Error('Split validation failed');
const splitDir = path.join(root, 'benchmark/data/splits');
fs.mkdirSync(splitDir, { recursive: true });
const report = {
  seed, input_sha256: hash(raw), input_records: rows.length, requested_dev_fraction: 0.8,
  grouping: 'NFKC lowercase alphanumeric tokens: identical normalized text OR a shared 40-token passage sampled every 20 tokens; transitive grouping.',
  limitations: 'Heuristic groups, not verified source-document IDs. Semantic paraphrases, shifted passage boundaries, and shared attack templates without a shared long passage may remain across splits. Common boilerplate can merge unrelated documents.',
  groups: groups.length, multi_record_groups: groups.filter(g => g.indices.length > 1).length,
  largest_group_records: Math.max(...groups.map(g => g.indices.length)), shared_anchor_matches: sharedAnchors,
  splits: {}, verification: { all_records_assigned_once: true, overlapping_ids: 0, overlapping_groups: 0, overlapping_sampled_anchors: 0 },
};
// Every anchor owner was unioned with all matching records before assignment.
for (const [split, records] of Object.entries(output)) {
  const body = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(path.join(splitDir, `ipi-${split}.jsonl`), body);
  report.splits[split] = { records: records.length, benign: records.filter(r => r.label === 'benign').length,
    malicious: records.filter(r => r.label === 'malicious').length, sha256: hash(body) };
}
fs.writeFileSync(path.join(splitDir, 'ipi-split-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
