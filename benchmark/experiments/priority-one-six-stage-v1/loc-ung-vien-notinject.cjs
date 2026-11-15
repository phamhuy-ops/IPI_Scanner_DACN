const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../../..');
const data = path.join(root, 'benchmark/data');
const results = path.join(root, 'benchmark/results');
const source = path.join(data, 'processed/notinject/notinject.jsonl');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const tokenize = text => text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const rows = fs.readFileSync(source, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const manifests = [
  ...fs.readdirSync(data).filter(file => file.endsWith('.json')).map(file => path.join(data, file)),
  ...fs.readdirSync(results, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .map(entry => path.join(results, entry.name, 'manifest.json')).filter(file => fs.existsSync(file)),
].sort();

const historicalIds = new Set();
const historicalHashes = new Set();
const historicalTexts = new Set();
const historicalAnchors = new Set();
function anchors(tokens) {
  const values = [];
  for (let index = 0; index + 40 <= tokens.length; index++) {
    values.push(tokens.slice(index, index + 40).join(' '));
  }
  return values;
}

for (const file of manifests) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  for (const row of Array.isArray(manifest.cases) ? manifest.cases : []) {
    for (const id of [row.id, row.original_id]) if (id) historicalIds.add(id);
    for (const input of row.files ?? [row]) {
      if (input.input_sha256) historicalHashes.add(input.input_sha256);
      if (typeof input.text !== 'string') continue;
      const tokens = tokenize(input.text);
      historicalTexts.add(tokens.join(' '));
      for (const anchor of anchors(tokens)) historicalAnchors.add(anchor);
    }
  }
}

const parents = rows.map((_, index) => index);
function find(index) {
  while (parents[index] !== index) {
    parents[index] = parents[parents[index]];
    index = parents[index];
  }
  return index;
}
const owners = new Map();
const exposed = new Set();
for (const [index, row] of rows.entries()) {
  const tokens = tokenize(row.text);
  const normalized = tokens.join(' ');
  const passages = anchors(tokens);
  if (historicalIds.has(row.id) || historicalHashes.has(row.context_sha256) || historicalTexts.has(normalized)
    || passages.some(anchor => historicalAnchors.has(anchor))) exposed.add(index);
  for (const key of [normalized, ...passages]) {
    if (owners.has(key)) parents[find(index)] = find(owners.get(key));
    else owners.set(key, index);
  }
}

const exposedGroups = new Set([...exposed].map(find));
const groups = new Map();
for (const [index, row] of rows.entries()) {
  const group = find(index);
  if (exposedGroups.has(group)) continue;
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push({ id: row.id, subset: row.metadata.source_subset, sha256: row.context_sha256 });
}
const candidates = [...groups.values()].map(members => ({
  representative: members[0].id, members,
}));
console.log(JSON.stringify({
  source: path.relative(root, source), sha256: digest(fs.readFileSync(source)),
  history_sources: Object.fromEntries(manifests.map(file => [path.relative(root, file), digest(fs.readFileSync(file))])),
  scope: 'Danh sách chờ rà nhãn sạch. So trùng ID, hash, văn bản chuẩn hóa và đoạn chung 40 token. Chưa rà trùng ngữ nghĩa.',
  total: rows.length, direct_matches: exposed.size, retained_rows: candidates.reduce((sum, group) => sum + group.members.length, 0),
  retained_groups: candidates.length, candidates,
}, null, 2));
