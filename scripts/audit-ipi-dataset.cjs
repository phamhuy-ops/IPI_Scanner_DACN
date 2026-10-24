// Read-only dataset inspection; writes only an aggregate report.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const input = path.resolve(root, process.argv[2] || 'benchmark/data/raw/malmasabi-bipia-gpt/dataset_for_huggingface.jsonl');
const raw = fs.readFileSync(input);
const required = ['context', 'user_intent', 'label', 'source'];
const report = {
  input: path.relative(root, input),
  input_sha256: crypto.createHash('sha256').update(raw).digest('hex'),
  total_records: 0, invalid_json_lines: [], invalid_record_lines: [],
  labels: { benign: 0, malicious: 0, invalid: 0 },
  missing_fields: Object.fromEntries(required.map(key => [key, 0])),
  null_fields: Object.fromEntries(required.map(key => [key, 0])),
  invalid_types: Object.fromEntries(required.map(key => [key, 0])),
  empty_text_fields: { context: 0, user_intent: 0, source: 0 },
  sources: {},
};
const groups = new Map();
for (const [i, line] of raw.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  let record;
  try { record = JSON.parse(line); } catch { report.invalid_json_lines.push(i + 1); continue; }
  report.total_records++;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    report.invalid_record_lines.push(i + 1); continue;
  }
  for (const key of required) {
    if (!Object.hasOwn(record, key)) { report.missing_fields[key]++; continue; }
    if (record[key] === null) { report.null_fields[key]++; continue; }
    if (typeof record[key] !== (key === 'label' ? 'number' : 'string')) report.invalid_types[key]++;
    if (key !== 'label' && typeof record[key] === 'string' && !record[key].trim()) report.empty_text_fields[key]++;
  }
  report.labels[record.label === 0 ? 'benign' : record.label === 1 ? 'malicious' : 'invalid']++;
  if (typeof record.source === 'string') report.sources[record.source] = (report.sources[record.source] || 0) + 1;
  if (typeof record.context !== 'string' || !record.context.trim()) continue;
  const hash = crypto.createHash('sha256').update(record.context.trim()).digest('hex');
  if (!groups.has(hash)) groups.set(hash, { count: 0, labels: new Set() });
  const group = groups.get(hash);
  group.count++; group.labels.add(record.label);
}
report.duplicates = {
  matching_policy: 'Exact context after trimming leading/trailing whitespace; ignores user_intent. Near duplicates not checked.',
  unique_nonempty_contexts: groups.size,
  duplicate_groups: [...groups.values()].filter(group => group.count > 1).length,
  extra_duplicate_records: [...groups.values()].reduce((sum, group) => sum + group.count - 1, 0),
  conflicting_label_groups: [...groups.values()].filter(group => group.labels.size > 1).length,
};
const output = path.join(root, 'benchmark/data/processed/ipi-data-audit.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
