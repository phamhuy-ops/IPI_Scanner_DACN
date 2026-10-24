// Prepare the downloaded dataset without modifying the source file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const input = path.resolve(root, process.argv[2] || 'benchmark/data/raw/malmasabi-bipia-gpt/dataset_for_huggingface.jsonl');
const output = path.join(root, 'benchmark/data/processed');
const raw = fs.readFileSync(input);
const groups = new Map();
let rows = 0;
for (const [index, line] of raw.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  const record = JSON.parse(line);
  if (typeof record.context !== 'string' || !record.context.trim() ||
      typeof record.user_intent !== 'string' || ![0, 1].includes(record.label)) {
    throw new Error(`Invalid record at line ${index + 1}; no output written.`);
  }
  rows++;
  const hash = crypto.createHash('sha256').update(record.context.trim()).digest('hex');
  const item = {
    id: `malmasabi-line-${index + 1}`,
    text: record.context,
    label: record.label === 1 ? 'malicious' : 'benign',
    user_intent: record.user_intent,
    source: record.source,
    original_label: record.label,
    original_line: index + 1,
    context_sha256: hash,
  };
  if (!groups.has(hash)) groups.set(hash, []);
  groups.get(hash).push(item);
}

const clean = [];
const conflicts = [];
let duplicateRowsRemoved = 0;
let conflictGroups = 0;
for (const records of groups.values()) {
  if (new Set(records.map(record => record.label)).size > 1) {
    conflictGroups++;
    conflicts.push(...records);
  } else {
    clean.push(records[0]);
    duplicateRowsRemoved += records.length - 1;
  }
}
const report = {
  input: path.relative(root, input),
  input_sha256: crypto.createHash('sha256').update(raw).digest('hex'),
  input_rows: rows,
  clean_rows: clean.length,
  clean_labels: {
    benign: clean.filter(record => record.label === 'benign').length,
    malicious: clean.filter(record => record.label === 'malicious').length,
  },
  duplicate_rows_removed_from_nonconflicting_groups: duplicateRowsRemoved,
  conflict_groups: conflictGroups,
  quarantined_conflict_rows: conflicts.length,
  policy: [
    'Group by SHA-256 of context after trimming leading/trailing whitespace only.',
    'Quarantine ALL records in groups containing both labels; do not resolve labels automatically.',
    'For other groups retain the first record, including its user_intent and original text.',
    'Different user intents in a duplicate group are not retained in this context-only scanner dataset.',
    'This removes exact trimmed-context duplicates only, not near duplicates or shared attack templates.',
    'No train/test split has been performed.',
  ],
};
if (rows !== clean.length + conflicts.length + duplicateRowsRemoved) throw new Error('Row accounting failed');
fs.mkdirSync(output, { recursive: true });
for (const [name, records] of [['ipi-clean.jsonl', clean], ['ipi-conflicts.jsonl', conflicts]]) {
  fs.writeFileSync(path.join(output, name), records.map(record => JSON.stringify(record)).join('\n') + '\n');
}
fs.writeFileSync(path.join(output, 'ipi-cleaning-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
