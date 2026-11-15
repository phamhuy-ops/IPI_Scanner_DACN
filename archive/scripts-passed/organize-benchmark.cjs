// Tạo đầu mối kiểm thử; giữ nguyên nguồn gốc và các đường dẫn runner hiện có.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'benchmark/kiem-thu');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sources = new Map();
const read = file => {
  const bytes = fs.readFileSync(path.join(root, file));
  sources.set(file, hash(bytes));
  return bytes;
};
const json = file => JSON.parse(read(file).toString('utf8'));
const save = (file, data) => {
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
};
const inputs = [];
function sample(group, index, extension, bytes, metadata) {
  const relative = `${group}/files/document-${String(index).padStart(3, '0')}${extension}`;
  const target = path.join(out, relative);
  if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw Error(`Không ghi đè file mẫu đã khác nội dung: ${relative}`);
  save(relative, bytes);
  inputs.push({ file: relative, sha256: hash(bytes), bytes: bytes.length, ...metadata });
}
const quick = [
  ['demo-output-v1/clean.txt', 'benign', 'Nội dung công việc cho người, có tên Dan Evans.'],
  ['demo-output-v1/attack.txt', 'malicious', 'Chỉ dẫn đổi câu trả lời của AI.'],
  ['demo-output-v1/quoted.txt', 'benign', 'Tấn công được trích làm ví dụ.'],
  ['round-one/vi-clean.md', 'benign', 'Biên bản tiếng Việt sạch theo nhãn tác giả.'],
  ['round-one/vi-injected.md', 'malicious', 'Chỉ dẫn chèn trong văn bản tiếng Việt.'],
  ['round-one/hidden-injected.html', 'malicious', 'Chỉ dẫn trong HTML comment.'],
];
quick.forEach(([file, label, purpose], index) => {
  const source = `benchmark/fixtures/${file}`;
  sample('01-mau-nhanh', index + 1, path.extname(file), read(source), { source, expected_label: label, purpose,
    role: 'diagnostic_fixture', independent: false, label_basis: 'Nhãn fixture tự soạn; không phải duyệt độc lập.' });
});
const devFile = 'benchmark/data/priority-one-dev-v2.json';
const dev = json(devFile);
dev.cases.forEach((row, index) => {
  if (!['.txt', '.md', '.html'].includes(row.format) || typeof row.text !== 'string') throw Error('Định dạng dev không hỗ trợ xuất nguyên văn.');
  sample('02-dev-72', index + 1, row.format, Buffer.from(row.text, 'utf8'), { source: devFile, source_index: index,
    original_id: row.original_id, source_family: row.source, group: row.group_id || row.document_group_id || null,
    language: row.language, expected_label: row.expected_label, annotation: row.annotation,
    role: 'reused_development_not_holdout', independent: false });
});
let docIndex = 0;
for (const folder of ['nguon-vi-v1', 'nguon-vi-bo-sung-v1']) {
  const parent = `benchmark/data/incoming/public-vi-documents/${folder}`;
  const manifest = `${parent}/manifest.json`;
  const metadata = json(manifest);
  for (const filename of fs.readdirSync(path.join(root, parent)).sort()) {
    if (!/\.(pdf|docx)$/i.test(filename)) continue;
    const source = `${parent}/${filename}`;
    sample('03-pdf-docx', ++docIndex, path.extname(filename), read(source), { source, provenance: manifest,
      original_name: filename, role: 'extraction_coverage_pending_review', expected_label: null,
      rights_review: 'pending', privacy_review: 'pending', training_eligible: false, independent: false,
      parent_id: (metadata.files || [metadata]).find(row => row.filename === filename)?.parent_id || null });
  }
}
function jsonlStats(file) {
  const lines = read(file).toString('utf8').split(/\r?\n/).filter(line => line.trim());
  const labels = {}, scopes = {};
  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.label !== undefined) labels[row.label] = (labels[row.label] || 0) + 1;
    if (row.attack_scope) scopes[row.attack_scope] = (scopes[row.attack_scope] || 0) + 1;
  }
  return { rows: lines.length, labels, attack_scopes: scopes };
}
const datasets = [];
function dataset(id, file, role, note) {
  datasets.push({ id, canonical_file: file, ...jsonlStats(file), sha256: sources.get(file), role, note });
}
dataset('malmasabi-raw', 'benchmark/data/raw/malmasabi-bipia-gpt/dataset_for_huggingface.jsonl', 'raw_source', 'Nguồn BIPIA derivative; không tự độc lập với BIPIA hoặc các split bên dưới.');
dataset('malmasabi-dev', 'benchmark/data/splits/ipi-dev.jsonl', 'development', 'Đã chia theo nhóm heuristic; không trộn nhãn/ID vào input.');
dataset('malmasabi-test', 'benchmark/data/splits/ipi-test.jsonl', 'reserved_test_history_requires_audit', 'Không chạy lại để chọn sửa; chưa chứng nhận toàn bộ lịch sử chưa chạm hoặc độc lập ngoài nguồn.');
dataset('notinject', 'benchmark/data/processed/notinject/notinject.jsonl', 'benign_controls', '339 mẫu canonical; alias Parquet train/validation/test không là nguồn mới. Nhãn benign theo dataset card.');
dataset('realistic', 'benchmark/data/processed/realistic-prompt-injections/realistic-prompt-injections.jsonl', 'development_probes', 'Strict IPI chỉ lấy scope ipi và benign_control; direct/mixed báo riêng. CSV/JSONL raw cùng nội dung.');
dataset('llmail-subset', 'benchmark/data/raw/llmail-intake-v1/data/phase2-subset.jsonl', 'intake_not_paired_ready', 'Subset đã tải, không phải toàn bộ LLMail. Mapping scenario/task còn cần xác minh.');
for (const suffix of ['dh_base', 'dh_enhanced', 'ds_base', 'ds_enhanced']) {
  const file = `benchmark/data/raw/injecagent/data/test_cases_${suffix}.json`;
  datasets.push({ id: `injecagent-${suffix}`, canonical_file: file, rows: json(file).length, sha256: sources.get(file),
    role: 'raw_source_shared_families', note: 'Base/enhanced và các attack dùng chung nhiệm vụ/template; không cộng số hàng thành nguồn độc lập.' });
}
for (const group of ['01-mau-nhanh', '02-dev-72', '03-pdf-docx']) {
  const records = inputs.filter(row => row.file.startsWith(group + '/'));
  save(`${group}/doi-chieu.json`, { records, note: 'Chỉ thư mục files là input. Nhãn, annotation và metadata nằm ngoài files, không đưa vào scanner/model.' });
}
save('04-dataset/danh-muc.json', { datasets, note: 'Liên kết dữ liệu canonical, không nhân bản tập lớn hoặc tự thay vai trò split.' });
const duplicates = [];
const byHash = new Map();
for (const row of inputs) {
  const other = byHash.get(row.sha256);
  if (other) duplicates.push({ first: other, duplicate: row.file, method: 'exact_bytes_sha256' });
  else byHash.set(row.sha256, row.file);
}
const summary = { version: 1, generated_by: 'scripts/organize-benchmark.cjs', inputs: inputs.length,
  groups: Object.fromEntries(['01-mau-nhanh', '02-dev-72', '03-pdf-docx'].map(group => [group, inputs.filter(row => row.file.startsWith(group + '/')).length])),
  dataset_entries: datasets.length, exact_copy_duplicates: duplicates, additive_independent_total: null,
  limits: ['Các bản tập hợp là bản sao phục vụ kiểm thử, không phải nguồn mới.', 'Chỉ kiểm trùng byte giữa các file tập hợp, chưa audit near duplicates với toàn dataset.',
    'PDF/DOCX chưa có nhãn hoàn chỉnh; không tính chúng là benign.', 'Không chạy suy luận model hoặc benchmark hiệu quả nhận diện trong lượt tổ chức.'],
  source_hashes: Object.fromEntries(sources) };
save('tong-hop.json', summary);
const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
save('danh-muc-file.csv', '\uFEFF' + ['file,nguon,nhan_ky_vong,vai_tro,sha256', ...inputs.map(row => [row.file, row.source, row.expected_label, row.role, row.sha256].map(csv).join(','))].join('\r\n') + '\r\n');
save('README.md', '# Kho kiểm thử tập trung\n\n' +
  'Đầu mối để xem mẫu, đối chiếu nhãn và lấy số liệu báo cáo. Nguồn gốc và baseline giữ nguyên. Không cộng các bộ thành số nguồn độc lập.\n\n' +
  `- [Mẫu nhanh](01-mau-nhanh/files): ${quick.length} file TXT/MD/HTML; [nhãn và nguồn](01-mau-nhanh/doi-chieu.json).\n` +
  `- [Dev hồi quy](02-dev-72/files): ${dev.cases.length} file nguyên văn từ manifest 72 nguồn; [nhãn/span/nguồn](02-dev-72/doi-chieu.json). Đã dùng phát triển, không phải holdout.\n` +
  `- [PDF/DOCX thật](03-pdf-docx/files): ${docIndex} bản sao nguyên byte; [trạng thái nguồn](03-pdf-docx/doi-chieu.json). Chưa duyệt nhãn/quyền/riêng tư, không dùng train.\n` +
  '- [Danh mục dataset](04-dataset/README.md): dữ liệu Hugging Face và nguồn ngoài, giữ đường dẫn canonical.\n' +
  '- [Danh mục file CSV](danh-muc-file.csv): đường dẫn, nguồn, nhãn kỳ vọng, vai trò và hash phục vụ báo cáo.\n' +
  '- [Tổng hợp và hash nguồn](tong-hop.json).\n\n' +
  'Tên file input trung tính; nhãn/đáp án nằm ngoài thư mục files. Không quét cả kho vì sẽ đưa metadata vào input. Bản tập hợp không thay đổi vai trò train/dev/test.\n');
save('04-dataset/README.md', '# Dataset hiện có\n\n' + datasets.map(row => `- **${row.id}**: ${row.rows} hàng; [dữ liệu canonical](../../${row.canonical_file.replace(/^benchmark\//, '')}); vai trò: ${row.role}. ${row.note}`).join('\n') + '\n\nSố hàng đọc từ file thực tế, không phải số nguồn độc lập. Hash trong [danh mục](danh-muc.json).\n');
for (const [file, digest] of sources) if (hash(fs.readFileSync(path.join(root, file))) !== digest) throw Error(`Nguồn thay đổi: ${file}`);
for (const row of inputs) if (hash(fs.readFileSync(path.join(out, row.file))) !== row.sha256) throw Error(`Bản sao khác nguồn: ${row.file}`);
console.log(JSON.stringify({ inputs: inputs.length, groups: summary.groups, datasets: datasets.length, exact_duplicates: duplicates.length, sources_unchanged: true, copies_verified: true }));
