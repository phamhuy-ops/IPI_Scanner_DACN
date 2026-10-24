const fs = require('node:fs');
const path = require('node:path');
const { hash, auditCollection } = require('./context-annotations.cjs');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'benchmark/data/annotations/ngu-canh-v1');
function main() {
  const data = fs.readFileSync(path.join(DATA, 'mau-cho-duyet.jsonl'));
  const rows = data.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  const worksheetBytes = fs.readFileSync(path.join(DATA, 'ket-qua-ra-soat.json'));
  const worksheet = JSON.parse(worksheetBytes);
  const manifestBytes = fs.readFileSync(path.join(DATA, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  const result = auditCollection(rows, worksheet);
  if (hash(data) !== manifest.dataset_sha256) result.errors.push('Dataset đã đổi so với manifest. Cần phiên bản mới, không sửa âm thầm bản đã khóa.');
  for (const [file, digest] of Object.entries(manifest.source_sha256)) {
    if (hash(fs.readFileSync(path.join(ROOT, file))) !== digest) result.errors.push(`Nguồn đã đổi: ${file}`);
  }
  for (const row of rows) {
    if (!/^ann-\d{3}$/.test(row.id) || !['.txt', '.md', '.html'].includes(row.format)) { result.errors.push('Tên file nguồn không an toàn.'); continue; }
    if (hash(fs.readFileSync(path.join(DATA, 'van-ban', row.id + row.format))) !== row.input_sha256) result.errors.push(`${row.id}: file đọc riêng không khớp văn bản JSONL.`);
  }
  result.structurally_valid = result.errors.length === 0;
  result.human_review_complete = result.structurally_valid && result.human_review_complete;
  fs.mkdirSync(path.join(ROOT, 'benchmark/results'), { recursive: true });
  const output = fs.mkdtempSync(path.join(ROOT, 'benchmark/results/annotation-audit-'));
  const report = { ...result, input_sha256: { dataset: hash(data), worksheet: hash(worksheetBytes), manifest: hash(manifestBytes) },
    code_sha256: { script: hash(fs.readFileSync(__filename)), helper: hash(fs.readFileSync(path.join(__dirname, 'context-annotations.cjs'))) },
    offset_basis: manifest.offset_basis, note: 'Kiểm tra cấu trúc và tham chiếu nguồn, không xác nhận ngữ nghĩa hoặc danh tính người duyệt.' };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output: path.relative(ROOT, output), ...report }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
