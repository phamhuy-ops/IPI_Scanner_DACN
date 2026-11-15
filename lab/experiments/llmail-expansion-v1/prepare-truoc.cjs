// Chuẩn hóa quyết định AI đã rà; không suy stance từ attack_attempt của nguồn.
const fs = require('node:fs');
const path = require('node:path');
const { hash, span, validateAnnotation } = require('./context-annotations.cjs');
const root = path.resolve(__dirname, '..');
const batch = 'verifier-llmail-v1';
const draftFile = 'benchmark/experiments/llmail-intake-v1/nhap-nhan-ngu-canh-ai.json';

function buildRows() {
  const drafts = JSON.parse(fs.readFileSync(path.join(root, draftFile)));
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'benchmark/data/raw/llmail-intake-v1/snapshot.json')));
  const queue = fs.readFileSync(path.join(root, 'benchmark/experiments/llmail-intake-v1/hang-cho-ra-soat.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  return drafts.rows.map(review => {
    const bytes = fs.readFileSync(path.join(root, review.source_file));
    if (hash(bytes) !== review.source_file_sha256) throw new Error('Nguồn email đã đổi.');
    const source = review.source_file.endsWith('.jsonl') ? bytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse) : JSON.parse(bytes);
    const value = source[review.source_row_1_based - 1];
    const text = typeof value === 'string' ? value : value.text;
    if (hash(text) !== review.text_sha256 || validateAnnotation(text, review.draft_annotation).length) throw new Error('Phiếu/nhãn toàn văn không khớp.');
    let start = 0;
    if (review.id === 'llmail-phase2-001') start = text.indexOf('Regarding the automated processing');
    if (review.id === 'llmail-phase2-002') start = text.indexOf('Currently, we are trying');
    if (review.id === 'llmail-phase2-003') start = text.indexOf('4- Testing New Sending Ability');
    if (start < 0) throw new Error('Không xác định được đầu cửa sổ.');
    const selected = text.slice(start);
    if (selected.length > 900) throw new Error(`Cửa sổ vượt một chunk: ${review.id}`);
    const annotation = structuredClone(review.draft_annotation);
    const windowAnnotation = { ...annotation,
      directive_spans: annotation.directive_spans.map(s => span(selected, s.quote)),
      context_spans: [span(selected, selected)] };
    if (validateAnnotation(selected, windowAnnotation).length) throw new Error('Span cửa sổ không hợp lệ.');
    const item = queue.find(r => r.id === review.id);
    if (!item || item.input_sha256 !== hash(text) || item.existing_test_overlap || item.existing_dev_overlap) throw new Error('Hàng chờ/overlap cần rà riêng.');
    return { id: review.id, text, format: '.txt', language: 'en', input_sha256: hash(text),
      annotation, window_annotation: windowAnnotation,
      selected_window: { start, end: text.length, text: selected }, selected_window_id: start ? 'reviewed-tail-window-1' : 'whole-visible-email',
      annotation_scope: start ? 'selected_window_only' : 'whole_visible_email', full_document_security_label: null,
      source: 'microsoft/llmail-inject-challenge',
      source_parent_id: `llmail:${snapshot.revision}:${item.source_collection}:${review.source_row_1_based}`,
      group_id: `llmail-intake:${item.provisional_group}`,
      reviewer: 'Codex (AI)', human_approved: false, review_status: 'ai_reviewed',
      privacy_scope: review.privacy_scope, usage: 'candidate_annotation_not_model_evaluated_not_holdout',
      split: null, training_eligible: false, independent: false,
      provenance: { repository: snapshot.repository, revision: snapshot.revision,
        source_file: review.source_file, source_file_sha256: review.source_file_sha256,
        source_row_1_based: review.source_row_1_based, source_metadata_not_model_input: ['source_annotation', 'judge_answer', 'source IDs/groups'],
        source_label_used_as_verifier_label: false, source_unchanged: true,
        license_declared: 'MIT', license_evidence: 'benchmark/data/raw/llmail-intake-v1/README.md',
        partial_upstream_snapshot: item.source_collection === 'phase2_prefix',
        original_window_range_utf16: [start, text.length], omitted_prefix_unlabeled_in_training_setup: start > 0 } };
  });
}

async function main() {
  const dir = path.join(root, 'benchmark/data/annotations', batch);
  if (fs.existsSync(dir)) throw new Error('Không ghi đè batch LLMail đã có.');
  const rows = buildRows();
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const examples = [];
  try {
    const { renderDraft } = await server.ssrLoadModule('/scripts/verifier-batch-renderer.ts');
    for (const row of rows) for (const mode of ['whole_source', 'none']) {
      const rendered = renderDraft({ text: row.selected_window.text, format: row.format, candidate_mode: mode }, row.window_annotation);
      if (JSON.stringify(rendered.payload).includes(row.id) || JSON.stringify(rendered.payload).includes(row.group_id)) throw new Error('Metadata lọt vào input.');
      examples.push({ id: `${row.id}-${mode}`, source_record_id: row.id, source_parent_id: row.source_parent_id,
        group_id: row.group_id, mode, payload: rendered.payload, target: rendered.response,
        validation: rendered.validation, training_eligible: false });
    }
  } finally { await server.close(); }
  const assets = {
    'mau-cho-duyet.jsonl': rows.map(r => JSON.stringify(r)).join('\n') + '\n',
    'ban-xem-truoc.json': JSON.stringify({ training_export: false, examples }, null, 2) + '\n',
    'danh-gia-ai.json': JSON.stringify({ reviewer: 'Codex (AI)', human_approved: false, reviews: rows.map(row => ({
      id: row.id, input_sha256: row.input_sha256, annotation_sha256: hash(JSON.stringify(row.annotation)),
      window_sha256: hash(row.selected_window.text), window_annotation_sha256: hash(JSON.stringify(row.window_annotation)),
      status: 'ai_reviewed', decision: 'accept_visible_window_after_source_review', reviewed_at: new Date().toISOString() })) }, null, 2) + '\n',
  };
  const manifest = { version: batch, records: rows.length, source_parent_ids: new Set(rows.map(r => r.source_parent_id)).size,
    provisional_groups: new Set(rows.map(r => r.group_id)).size, no_directive_records: rows.filter(r => !r.annotation.hasDirective).length,
    selected_window_only_records: rows.filter(r => r.selected_window.start > 0).length,
    parser_valid: examples.filter(r => r.validation.parser_valid).length, training_ready: false, model_called: false,
    source_draft: { file: draftFile, sha256: hash(fs.readFileSync(path.join(root, draftFile))) },
    code_sha256: Object.fromEntries(['scripts/prepare-verifier-llmail.cjs', 'scripts/verifier-batch-renderer.ts'].map(f => [f, hash(fs.readFileSync(path.join(root, f)))])),
    assets_sha256: Object.fromEntries(Object.entries(assets).map(([f, bytes]) => [f, hash(bytes)])),
    limitations: ['Nhãn và cửa sổ do AI rà, không chuyển thành người duyệt.',
      'Ba cửa sổ bỏ tiền tố; không gán nhãn toàn bộ phần không đưa vào training setup.',
      'License khai báo MIT và không trùng từ vựng chưa tự chứng minh quyền dùng hoặc độc lập ngữ nghĩa.',
      'Chưa train/chia tập hoặc gọi model; cần audit nhóm toàn kho mới.'] };
  fs.mkdirSync(dir);
  for (const [file, bytes] of Object.entries({ ...assets, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' })) fs.writeFileSync(path.join(dir, file), bytes, { flag: 'wx' });
  console.log(JSON.stringify({ records: rows.length, parser_valid: manifest.parser_valid, no_directive: manifest.no_directive_records, window_only: manifest.selected_window_only_records }));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildRows };
