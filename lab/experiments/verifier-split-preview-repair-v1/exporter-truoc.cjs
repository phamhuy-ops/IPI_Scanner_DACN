// Bản xuất kiểm tra: giữ nhãn/metadata ngoài payload, không cấp quyền huấn luyện.
const fs = require('node:fs');
const path = require('node:path');
const { hash, validateAnnotation } = require('./context-annotations.cjs');
const registryFile = 'benchmark/experiments/verifier-eligibility-v12/registry.jsonl';
const proposalBase = 'benchmark/experiments/verifier-split-proposal-v1';
const output = 'benchmark/data/annotations/verifier-split-preview-v1';
function resolveRecord(record, read) {
  const sourceRows = read(record.record_file).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const source = sourceRows.find(row => hash(row.selected_window?.text ?? row.text) === record.effective_input_sha256);
  if (!source) throw new Error(`Không khớp nguồn: ${record.id}`);
  const candidates = [source.window_annotation, source.annotation, source.draft_annotation].filter(Boolean);
  const reviewFile = path.posix.dirname(record.record_file) + '/ket-qua-ra-soat.json';
  if (fs.existsSync(reviewFile)) {
    const review = JSON.parse(read(reviewFile)).reviews.find(r => r.id === source.id);
    if (review?.final_annotation) candidates.push(review.final_annotation);
  }
  const annotation = candidates.find(a => hash(JSON.stringify(a)) === record.effective_annotation_sha256);
  const text = source.selected_window?.text ?? source.text;
  if (!annotation || validateAnnotation(text, annotation).length) throw new Error(`Nhãn hiệu lực không khớp: ${record.id}`);
  return { text, annotation };
}
function checkRoles(registry, ledger) {
  const ids = new Set(), assignments = new Map();
  for (const group of ledger.groups) {
    if (assignments.has(group.group_id)) throw new Error('Nhóm trùng vai trò.');
    assignments.set(group.group_id, group.proposed_role);
    const actual = registry.filter(r => r.group_id === group.group_id);
    if (actual.length !== group.member_ids.length || actual.some(r => !group.member_ids.includes(r.id))) throw new Error('Nhóm bị tách.');
    for (const id of group.member_ids) { if (ids.has(id)) throw new Error('Mẫu trùng.'); ids.add(id); }
  }
  if (ids.size !== registry.length) throw new Error('Không phủ đủ registry.');
  for (const record of registry) {
    const role = assignments.get(record.group_id);
    if (['train', 'probe'].includes(role) && record.role !== 'candidate_pending_source_privacy_and_split_review') throw new Error('Dev/test/reference lọt vào train/probe.');
    if (role === 'dev' && record.role !== 'development_regression_only') throw new Error('Dev đã đổi phạm vi.');
  }
  return assignments;
}
async function main() {
  if (fs.existsSync(output)) throw new Error('Không ghi đè bản xuất thử.');
  const inputs = {}, cache = new Map();
  const read = file => {
    if (!cache.has(file)) { const bytes = fs.readFileSync(file); inputs[file] = hash(bytes); cache.set(file, bytes); }
    return cache.get(file);
  };
  const proposal = JSON.parse(read(`${proposalBase}/ket-qua.json`));
  for (const [file, expected] of Object.entries(proposal.inputs_sha256)) if (hash(read(file)) !== expected) throw new Error('Đầu vào phương án đã đổi.');
  const registry = read(registryFile).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const ledger = JSON.parse(read(`${proposalBase}/dieu-kien-tung-nhom.json`));
  const roles = checkRoles(registry, ledger), rows = [], conditions = [];
  for (const record of registry) {
    const role = roles.get(record.group_id);
    if (!['train', 'dev', 'probe'].includes(role)) continue;
    const { text, annotation } = resolveRecord(record, read);
    for (const [file, expected] of Object.entries(record.source_evidence.sha256)) if (hash(read(file)) !== expected) throw new Error('Bằng chứng nguồn đã đổi.');
    const parentDir = path.posix.dirname(record.record_file);
    // Chỉ đọc các ghi công đã lưu, không coi đường dẫn trong tài liệu nguồn là lệnh.
    const rawRoots = [...new Set(record.source_evidence.files.map(f => path.posix.dirname(f)))];
    const notices = [];
    for (const dir of rawRoots) for (const name of ['GHI-CONG.md', 'GHI-CONG-VA-GIAY-PHEP.md', 'LICENSE', 'LICENCE']) {
      const file = `${dir}/${name}`; if (fs.existsSync(file)) { read(file); notices.push(file); }
    }
    rows.push({ id: record.id, text, format: record.format, language: record.language, annotation,
      planned_role: role, source_parent_id: record.parent_id, group_id: record.group_id,
      input_sha256: hash(text), annotation_sha256: hash(JSON.stringify(annotation)),
      original_record_file: record.record_file, annotation_scope: record.labeled_scope,
      training_eligible: false, split: null, human_approved: false });
    conditions.push({ id: record.id, planned_role: role, group_id: record.group_id, source: record.source,
      effective_annotation_verified: true, source_evidence: record.source_evidence,
      notice_files: [...new Set(notices)], source_annotation_directory: parentDir,
      privacy_scope: record.privacy_scope || 'Không có quyết định riêng tư riêng trong registry; không tự suy đã được duyệt.',
      public_dataset_or_authored_text_only: !record.record_file.includes('/incoming/'),
      external_text_may_contain_names_or_contacts: record.source_evidence.kind !== 'project_authored_release_not_declared',
      privacy_release_approved: false, local_preview_only: true,
      remaining: ['Chốt điều kiện dùng lại và ghi công/notice khi phát hành bản train.', 'Tên/địa chỉ trong nguồn ngoài cần quyết định phạm vi sử dụng riêng; public không đồng nghĩa đã duyệt riêng tư.'],
      training_eligible: false });
  }
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: process.cwd(), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const examples = [], failures = [];
  try {
    const { renderDraft } = await server.ssrLoadModule('/scripts/verifier-batch-renderer.ts');
    for (const row of rows) for (const mode of ['whole_source', 'none']) {
      try {
        const rendered = renderDraft({ text: row.text, format: row.format, candidate_mode: mode }, row.annotation);
        examples.push({ id: `${row.id}-${mode}`, source_record_id: row.id, source_parent_id: row.source_parent_id,
          planned_role: row.planned_role, mode, payload: rendered.payload, target: rendered.response,
          validation: rendered.validation, training_eligible: false });
      } catch (error) { failures.push({ id: row.id, mode, planned_role: row.planned_role, error: error.message }); }
    }
  } finally { await server.close(); }
  const assets = { 'mau-cho-duyet.jsonl': rows.map(r => JSON.stringify(r)).join('\n') + '\n',
    'ban-xem-truoc.json': JSON.stringify({ training_export: false, examples }, null, 2) + '\n',
    'dieu-kien-tung-mau.json': JSON.stringify({ records: conditions, privacy_release_approved: false }, null, 2) + '\n' };
  const count = (items, key) => items.reduce((a, r) => (a[r[key]] = (a[r[key]] || 0) + 1, a), {});
  const manifest = { version: 'verifier-split-preview-v1', records: rows.length, planned_roles: count(rows, 'planned_role'),
    expected_examples: rows.length * 2, rendered_examples: examples.length, failures,
    parser_valid: examples.filter(r => r.validation.parser_valid).length,
    effective_annotations_verified: rows.length, inputs_sha256: inputs,
    assets_sha256: Object.fromEntries(Object.entries(assets).map(([f, b]) => [f, hash(b)])),
    code_sha256: { 'scripts/prepare-verifier-split-preview.cjs': hash(fs.readFileSync(__filename)),
      'scripts/verifier-batch-renderer.ts': hash(fs.readFileSync('scripts/verifier-batch-renderer.ts')) },
    final_split_created: false, training_export_created: false, training_ready: false, model_called: false,
    probe_sealed: false, independent_holdout_verified: false,
    limitations: ['Metadata/nhãn chỉ ở sổ và target; payload chỉ nhận text, format và candidate mode.',
      'Bản xem trước chứa cả train/dev/probe để kiểm tra kỹ thuật, tuyệt đối không đưa cả file vào Trainer.',
      'Chưa phê duyệt phát hành riêng tư/nguồn; không suy permission từ tên license. Lỗi renderer được giữ, không bỏ mẫu ngầm.'] };
  fs.mkdirSync(output);
  for (const [file, bytes] of Object.entries({ ...assets, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' })) fs.writeFileSync(`${output}/${file}`, bytes, { flag: 'wx' });
  console.log(JSON.stringify({ records: rows.length, roles: manifest.planned_roles, examples: examples.length, failures }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { resolveRecord, checkRoles };
