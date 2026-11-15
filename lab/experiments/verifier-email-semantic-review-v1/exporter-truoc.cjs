// Bản dùng nội bộ tách vai trò; giữ nguồn gốc và không tự bật huấn luyện.
const fs = require('node:fs');
const path = require('node:path');
const { hash, validateAnnotation } = require('./context-annotations.cjs');
const source = 'benchmark/data/annotations/verifier-split-preview-v2';
const out = 'benchmark/data/annotations/verifier-local-release-preview-v1';
const rolesOut = 'benchmark/experiments/verifier-local-release-v1';
const mailPattern = /[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}/g;
function replaceEmails(text) {
  return text.replace(mailPattern, email => email.toLowerCase().endsWith('.invalid') ? email : `mail-${hash(email.toLowerCase()).slice(0, 12)}@example.invalid`);
}
function transform(row) {
  const text = replaceEmails(row.text), annotation = structuredClone(row.annotation);
  for (const field of ['directive_spans', 'context_spans']) annotation[field] = annotation[field].map(s => {
    const start = replaceEmails(row.text.slice(0, s.start)).length;
    const end = replaceEmails(row.text.slice(0, s.end)).length;
    const quote = replaceEmails(s.quote);
    if (text.slice(start, end) !== quote) throw new Error('Không ánh xạ được span qua thay email.');
    return { start, end, quote, start_line: text.slice(0, start).split(/\r\n?|\n/).length,
      end_line: text.slice(0, end).split(/\r\n?|\n/).length };
  });
  annotation.reason = replaceEmails(annotation.reason);
  annotation.uncertainty_notes = annotation.uncertainty_notes.map(replaceEmails);
  if (validateAnnotation(text, annotation).length) throw new Error('Nhãn sau thay email không hợp lệ.');
  return { ...row, text, annotation, input_sha256: hash(text), annotation_sha256: hash(JSON.stringify(annotation)),
    pre_transform_input_sha256: row.input_sha256, pre_transform_annotation_sha256: row.annotation_sha256,
    transformation: text === row.text ? 'unchanged' : 'visible_email_to_reserved_placeholder',
    training_eligible: false, split: null };
}
function partition(examples) {
  const result = { train: [], dev: [], probe: [] };
  for (const e of examples) {
    if (!Object.hasOwn(result, e.planned_role) || e.training_eligible !== false) throw new Error('Sai vai trò hoặc tự bật train.');
    result[e.planned_role].push(e);
  }
  const groupRoles = new Map();
  for (const e of examples) {
    const prior = groupRoles.get(e.group_id);
    if (!e.group_id || (prior && prior !== e.planned_role)) throw new Error('Nhóm lẫn vai trò.');
    groupRoles.set(e.group_id, e.planned_role);
  }
  return result;
}
async function main() {
  if (fs.existsSync(out) || fs.existsSync(rolesOut)) throw new Error('Không ghi đè bản nội bộ.');
  const inputs = {}, read = file => { const bytes = fs.readFileSync(file); inputs[file] = hash(bytes); return bytes; };
  const beforeManifest = JSON.parse(read(`${source}/manifest.json`));
  for (const [file, expected] of Object.entries(beforeManifest.assets_sha256)) if (hash(read(`${source}/${file}`)) !== expected) throw new Error('Bản nguồn đã đổi.');
  const original = read(`${source}/mau-cho-duyet.jsonl`).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const rows = original.map(transform), conditions = JSON.parse(read(`${source}/dieu-kien-tung-mau.json`)).records;
  const examples = [], failures = [];
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: process.cwd(), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { renderDraft } = await server.ssrLoadModule('/scripts/verifier-batch-renderer.ts');
    for (const row of rows) for (const mode of ['whole_source', 'none']) {
      try {
        const rendered = renderDraft({ text: row.text, format: row.format, candidate_mode: mode }, row.annotation);
        examples.push({ id: `${row.id}-${mode}`, source_record_id: row.id, source_parent_id: row.source_parent_id,
          group_id: row.group_id, planned_role: row.planned_role, mode, payload: rendered.payload, target: rendered.response,
          validation: rendered.validation, training_eligible: false });
      } catch (e) { failures.push({ id: row.id, mode, error: e.message }); }
    }
  } finally { await server.close(); }
  if (failures.length) throw new Error(JSON.stringify(failures));
  const partitioned = partition(examples), notices = new Map();
  for (const c of conditions) for (const file of [...c.source_evidence.files, ...c.notice_files]) {
    const bytes = read(file), expected = c.source_evidence.sha256[file];
    if (expected && hash(bytes) !== expected) throw new Error('Bằng chứng nguồn đã đổi.');
    const relative = `notices/${hash(bytes).slice(0, 16)}-${path.basename(file)}`;
    notices.set(relative, { original_file: file, sha256: hash(bytes), bytes });
  }
  const decisions = conditions.map(c => ({ id: c.id, planned_role: c.planned_role, source: c.source,
    local_use_scope: ['source_provenance_review_required'].includes(c.source_evidence.kind)
      ? 'existing_dev_regression_only_no_training' : 'local_preparation_under_project_authorization_with_source_conditions',
    evidence_kind: c.source_evidence.kind, license_declared: c.source_evidence.license_declared,
    original_notice_files: [...new Set([...c.source_evidence.files, ...c.notice_files])],
    privacy_action: 'Visible email thay bằng placeholder; tên, ID, URL khác và chuỗi mã hóa vẫn cần giữ phạm vi nội bộ, không tuyên bố ẩn danh.',
    public_release_approved: false, training_eligible: false }));
  const assets = { 'mau-cho-duyet.jsonl': rows.map(r => JSON.stringify(r)).join('\n') + '\n',
    'ban-xem-truoc.json': JSON.stringify({ training_export: false, examples }, null, 2) + '\n',
    'quyet-dinh-dung-noi-bo.json': JSON.stringify({ records: decisions, public_release_approved: false }, null, 2) + '\n' };
  const manifest = { version: 'verifier-local-release-preview-v1', records: rows.length, examples: examples.length,
    changed_records: rows.filter(r => r.transformation !== 'unchanged').length,
    roles: Object.fromEntries(Object.entries(partitioned).map(([role, items]) => [role, { records: new Set(items.map(e => e.source_record_id)).size, examples: items.length }])),
    assets_sha256: Object.fromEntries(Object.entries(assets).map(([f, b]) => [f, hash(b)])), inputs_sha256: inputs,
    code_sha256: { 'scripts/prepare-verifier-local-release.cjs': hash(fs.readFileSync(__filename)),
      'scripts/verifier-batch-renderer.ts': hash(fs.readFileSync('scripts/verifier-batch-renderer.ts')) },
    parser_valid: examples.length, labels_and_groups_preserved: true, local_preparation_only: true,
    final_split_created: false, training_export_created: false, training_ready: false,
    probe_sealed: false, public_release_approved: false, model_called: false,
    limitations: ['Chỉ thay email nhìn thấy được, không bảo đảm xóa mọi thông tin nhận diện hoặc nội dung mã hóa.',
      'Thay đổi input cần được rà tác động ngữ nghĩa và so lại với bản nguyên gốc khi đánh giá.',
      'Hai mode mỗi mẫu là hai biểu diễn cùng nguồn, không phải hai quan sát độc lập.',
      'File tách vai trò vẫn là preview, không đưa dev/probe vào huấn luyện; chưa fine-tuning.'] };
  fs.mkdirSync(out); fs.mkdirSync(rolesOut);
  for (const [file, bytes] of Object.entries({ ...assets, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' })) fs.writeFileSync(`${out}/${file}`, bytes, { flag: 'wx' });
  for (const [role, items] of Object.entries(partitioned)) fs.writeFileSync(`${rolesOut}/${role}.preview.jsonl`, items.map(e => JSON.stringify(e)).join('\n') + '\n', { flag: 'wx' });
  const noticeManifest = {};
  for (const [file, data] of notices) {
    fs.mkdirSync(path.dirname(`${rolesOut}/${file}`), { recursive: true });
    fs.writeFileSync(`${rolesOut}/${file}`, data.bytes, { flag: 'wx' });
    noticeManifest[file] = { original_file: data.original_file, sha256: data.sha256 };
  }
  fs.writeFileSync(`${rolesOut}/ghi-cong-va-pham-vi.json`, JSON.stringify({ decisions,
    notices: noticeManifest, training_ready: false, public_release_approved: false,
    note: 'Giữ nguyên bằng chứng nguồn; nội dung chèn/thay email do dự án thực hiện, không gán cho tác giả nguồn. Không tái cấp một license chung cho mọi nguồn.' }, null, 2) + '\n');
  fs.writeFileSync(`${rolesOut}/manifest.json`, JSON.stringify({ ...manifest,
    role_files_sha256: Object.fromEntries(Object.keys(partitioned).map(role => [`${role}.preview.jsonl`, hash(fs.readFileSync(`${rolesOut}/${role}.preview.jsonl`))])),
    attribution_sha256: hash(fs.readFileSync(`${rolesOut}/ghi-cong-va-pham-vi.json`)) }, null, 2) + '\n');
  console.log(JSON.stringify({ records: rows.length, examples: examples.length, changed_records: manifest.changed_records, roles: manifest.roles, training_ready: false }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { replaceEmails, transform, partition };
