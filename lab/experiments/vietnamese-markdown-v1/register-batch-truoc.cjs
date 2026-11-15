// Ghi registry phiên bản mới từ batch đã audit; không tự chia train/dev/holdout.
const fs = require('node:fs');
const path = require('node:path');
const { hash, validateAnnotation } = require('./context-annotations.cjs');
const { groupConstraints } = require('./assess-verifier-split-readiness.cjs');
const { consistencyIssues, roleDecision, poolGaps } = require('./assess-verifier-eligibility.cjs');
const root = path.resolve(__dirname, '..');

function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--batch', '--base', '--audit', '--tokens', '--output'].includes(args[i]) || !/^verifier-[a-z0-9-]+$/.test(args[i+1] || '')) throw new Error('Cần batch/base/audit/tokens/output dạng verifier-*.');
    options[args[i].slice(2)] = args[i+1];
  }
  if (Object.keys(options).length !== 5) throw new Error('Thiếu tham số registry.');
  const baseDir = `benchmark/experiments/${options.base}`, batchDir = `benchmark/data/annotations/${options.batch}`;
  const out = path.join(root, 'benchmark/experiments', options.output);
  if (fs.existsSync(out)) throw new Error('Không ghi đè registry cũ.');
  const inputs = {};
  const bytes = file => {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) throw new Error('Đường dẫn ngoài workspace.');
    const value = fs.readFileSync(target); inputs[file] = hash(value); return value;
  };
  const json = file => JSON.parse(bytes(file));
  const jsonl = file => bytes(file).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const previous = json(baseDir + '/ket-qua.json');
  for (const [file, expected] of Object.entries(previous.inputs_sha256)) {
    const snapshot = previous.input_snapshots?.[file];
    const actual = snapshot ? `${baseDir}/${snapshot}` : file;
    if (hash(bytes(actual)) !== expected) throw new Error(`Registry nền đã cũ: ${file}`);
  }
  const old = jsonl(baseDir + '/registry.jsonl');
  const manifest = json(batchDir + '/manifest.json');
  for (const [file, expected] of Object.entries(manifest.assets_sha256)) {
    if (path.posix.normalize(file).startsWith('../') || path.isAbsolute(file) || hash(bytes(batchDir + '/' + file)) !== expected) throw new Error('Tài sản batch đã đổi hoặc vượt phạm vi.');
  }
  const rows = jsonl(batchDir + '/mau-cho-duyet.jsonl');
  const reviews = json(batchDir + '/danh-gia-ai.json').reviews;
  const token = json(`benchmark/experiments/${options.tokens}/ket-qua.json`);
  if (token.source !== options.batch || token.source_records !== rows.length || token.mask_valid !== rows.length*2 || token.collator_valid !== rows.length*2 || !token.no_model_forward_or_updates) throw new Error('Chưa đạt token/mask/collator.');
  for (const [file, expected] of Object.entries(token.input_sha256)) if (hash(bytes(batchDir + '/' + file)) !== expected) throw new Error('Audit token đã cũ.');
  const additions = rows.map(row => {
    const text = row.selected_window?.text ?? row.text, a = row.window_annotation || row.annotation;
    const review = reviews.find(r => r.id === row.id);
    if (hash(row.text) !== row.input_sha256 || validateAnnotation(row.text, row.annotation).length || validateAnnotation(text, a).length ||
      (row.selected_window && row.text.slice(row.selected_window.start, row.selected_window.end) !== text) ||
      row.training_eligible || row.human_approved || row.split !== null || review?.input_sha256 !== row.input_sha256 ||
      review.annotation_sha256 !== hash(JSON.stringify(row.annotation)) || review.window_sha256 !== hash(text) ||
      review.window_annotation_sha256 !== hash(JSON.stringify(a))) throw new Error(`Phiếu/nguồn không khớp: ${row.id}`);
    const evidence = row.provenance.license_evidence;
    return { id: `${options.batch}:${row.id}`, parent_id: row.source_parent_id, source: row.source,
      format: row.format, language: row.language, stance: a.stance, addressee: a.addressee,
      framing: a.framing, deviation: a.deviation, hasDirective: a.hasDirective,
      full_record_units: row.text.length, labeled_input_units: text.length,
      selected_window_only: row.selected_window.start !== 0 || row.selected_window.end !== row.text.length,
      labeled_scope: row.annotation_scope, effective_input_sha256: hash(text), effective_annotation_sha256: hash(JSON.stringify(a)),
      effective_version: 'original', reviewer_scope: 'ai_visible_email_window', record_file: batchDir + '/mau-cho-duyet.jsonl',
      annotation_field_consistency: 'passed_technical_check_only', consistency_issues: consistencyIssues(a),
      source_evidence: { kind: 'pinned_dataset_card_declaration', license_declared: row.provenance.license_declared,
        files: [evidence], sha256: { [evidence]: hash(bytes(evidence)) }, training_reuse_approved: false },
      privacy_scope: row.privacy_scope, training_eligible: false, split: null, independently_untouched_verified: false };
  });
  const all = [...old, ...additions];
  if (new Set(all.map(r => r.id)).size !== all.length) throw new Error('Trùng ID registry.');
  const auditPath = `benchmark/experiments/${options.audit}/ket-qua.json`, audit = json(auditPath);
  if (audit.candidate_records !== all.length || audit.missing_coverage.length || !audit.inputs_unchanged) throw new Error('Audit corpus không khớp registry.');
  for (const item of audit.inventory) if (hash(bytes(item.file)) !== item.sha256) throw new Error('Đầu vào audit đã đổi.');
  const baseline = json('benchmark/data/priority-one-dev-v2.json');
  const groups = groupConstraints(all, audit.groups, new Set(baseline.cases.map(r => r.original_id)));
  if (new Set(groups.flatMap(g => g.members)).size !== all.length) throw new Error('Nhóm không phủ đúng registry.');
  for (const row of all) {
    const group = groups.find(g => g.members.includes(row.id));
    row.group_id = group.id; row.group_constraint = group.proposed_constraint;
    row.role = roleDecision(group, row.consistency_issues);
    if (additions.includes(row)) row.review_tasks = ['source_reuse_and_privacy_approval_pending', 'role_assignment_and_group_split_not_final'];
    row.training_eligible = false; row.split = null; row.independently_untouched_verified = false;
  }
  const previousGroups = json(baseDir + '/rang-buoc-nhom.json').groups;
  const priorGroupsPreserved = previousGroups.every(g => {
    const current = groups.find(c => c.members.includes(g.members[0]));
    return current && g.members.every(id => current.members.includes(id));
  });
  if (!priorGroupsPreserved) throw new Error('Nhóm cũ bị tách.');
  const planPath = 'benchmark/experiments/verifier-finetune-pilot-v1/ke-hoach.json';
  const planBytes = bytes(planPath), plan = JSON.parse(planBytes);
  const count = key => all.reduce((out, r) => { out[r[key]] = (out[r[key]] || 0) + 1; return out; }, {});
  const result = { version: options.output, records: all.length, parent_ids: new Set(all.map(r => r.parent_id)).size,
    groups: groups.length, stances: count('stance'), languages: count('language'), roles: count('role'),
    new_records: additions.length, new_no_directive_records: additions.filter(r => !r.hasDirective).length,
    new_window_only_records: additions.filter(r => r.selected_window_only).length,
    old_group_memberships_preserved: priorGroupsPreserved, pool_gaps: poolGaps(all, plan),
    training_eligible_records: 0, training_ready: false, final_split_created: false,
    model_called: false, training_started: false, runtime_changed: false, priority_one_complete: false,
    inputs_sha256: inputs, input_snapshots: { [planPath]: 'ke-hoach-tai-thoi-diem-ra.json' },
    code_sha256: hash(fs.readFileSync(__filename)),
    limitations: ['Registry ứng viên không phải tập train đã phê duyệt hoặc holdout độc lập.',
      'Chú thích cửa sổ không áp dụng phần văn bản bị bỏ khỏi input.', 'Độc lập ngữ nghĩa và quyền dùng chưa tự được xác nhận từ audit từ vựng/card.'] };
  fs.mkdirSync(out);
  for (const [name, data] of Object.entries({ 'ket-qua.json': result, 'rang-buoc-nhom.json': { groups, final_split_created: false } })) fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'registry.jsonl'), all.map(r => JSON.stringify(r)).join('\n') + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'ke-hoach-tai-thoi-diem-ra.json'), planBytes, { flag: 'wx' });
  console.log(JSON.stringify({ records: result.records, parents: result.parent_ids, groups: result.groups, roles: result.roles, gaps: result.pool_gaps }, null, 2));
}
if (require.main === module) main();
