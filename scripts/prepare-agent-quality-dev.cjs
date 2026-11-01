// Khóa bộ dev đa nguồn trước khi chọn cải tiến; không tạo/chỉnh nhãn theo dự đoán.
const fs = require('node:fs');
const crypto = require('node:crypto');
const target = 'benchmark/data/agent-quality-dev-v3.json';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sources = {};
const read = file => { const bytes = fs.readFileSync(file); sources[file] = sha(bytes); return bytes.toString('utf8'); };
const lines = file => read(file).trim().split(/\r?\n/).map(JSON.parse);
if (fs.existsSync(target)) throw Error('Không ghi đè manifest đã khóa.');
const all = JSON.parse(read('benchmark/data/priority-one-dev-v2.json')).cases.map(row => ({
  original_id: row.original_id, source: row.source, group_id: row.group_id, language: row.language,
  text: row.text, format: row.format, label: row.expected_label, annotation: row.annotation, origin: 'priority-one-dev-v2',
}));
for (const row of lines('benchmark/data/processed/realistic-prompt-injections/realistic-prompt-injections.jsonl').filter(row => ['ipi', 'benign_control'].includes(row.attack_scope))) {
  all.push({ original_id: row.id, source: row.source, group_id: row.id, language: 'en', text: row.text, format: '.txt', label: row.label, origin: 'realistic-development' });
}
for (const row of lines('benchmark/data/processed/notinject/notinject.jsonl').slice(0, 16)) {
  all.push({ original_id: row.id, source: row.source, group_id: `notinject-${row.metadata.source_subset}`,
    language: /[\u3400-\u9FFF]/u.test(row.text) ? 'zh' : 'en_or_multilingual', text: row.text, format: '.txt', label: row.label,
    origin: 'notinject-development', label_basis: 'Benign theo dataset card, không phải duyệt độc lập từng hàng.' });
}
const quick = JSON.parse(read('benchmark/kiem-thu/01-mau-nhanh/doi-chieu.json')).records;
for (const row of quick) all.push({ original_id: row.source, source: 'local-fixtures', group_id: 'local-diagnostic-fixtures',
  language: row.source.includes('/vi-') ? 'vi' : 'en', text: read('benchmark/kiem-thu/' + row.file), format: require('node:path').extname(row.file),
  label: row.expected_label, origin: 'local-fixture' });
const cases = [], exact = new Map();
for (const row of all) {
  const key = row.text.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  const prior = exact.get(key);
  if (prior) {
    if (prior.label !== row.label) throw Error(`Mâu thuẫn nhãn nguồn: ${prior.original_id} / ${row.original_id}`);
    prior.aliases.push({ original_id: row.original_id, source: row.source, group_id: row.group_id });
  } else { row.aliases = []; cases.push(row); exact.set(key, row); }
}
const parent = cases.map((_, index) => index);
const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
const anchors = new Map();
cases.forEach((row, index) => {
  const tokens = row.text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const keys = [row.group_id, ...row.aliases.map(alias => alias.group_id)].filter(Boolean).map(key => 'group:' + key);
  for (let at = 0; at + 20 <= tokens.length; at += 10) keys.push('passage:' + tokens.slice(at, at + 20).join(' '));
  for (const key of keys) {
    if (anchors.has(key)) parent[find(index)] = find(anchors.get(key));
    else anchors.set(key, index);
  }
});
cases.forEach((row, index) => { row.id = `aq-${String(index + 1).padStart(3, '0')}`; row.input_sha256 = sha(Buffer.from(row.text)); row.evaluation_group = `component-${find(index) + 1}`; });
const counts = cases.reduce((out, row) => { out[row.label] = (out[row.label] || 0) + 1; return out; }, {});
const manifest = { version: 'agent-quality-dev-v3', role: 'frozen_development_not_holdout', seed: 42, source_sha256: sources,
  accuracy_target: 0.9, accuracy_policy: 'Tất cả ca; lỗi/needs_review binary không tính đúng; uncertain cần bất định có bằng chứng và không lỗi.',
  input_records: all.length, cases: cases, counts, groups: new Set(cases.map(row => row.evaluation_group)).size,
  grouping: 'NFKC + whitespace exact gộp alias, cùng group gốc hoặc shared20 token sampled stride10 nối bắc cầu; không phải audit ngữ nghĩa toàn kho.',
  limits: ['Chỉ dev, dữ liệu đã dùng/chọn để chẩn đoán, không phải holdout độc lập.', 'Không trộn nhãn, ID, nhóm, nguồn hoặc đáp án vào model input.',
    'Không biến đa số benign hoặc bỏ abstention khỏi mẫu số để đạt90%.', 'Không dùng bộ này để tuyên bố độc lập sau khi đã chọn sửa theo nó.'] };
fs.writeFileSync(target, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ target, input_records: all.length, cases: cases.length, labels: counts, groups: manifest.groups }));
