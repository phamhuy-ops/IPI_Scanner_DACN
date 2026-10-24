const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('vite');
const { buildCases } = require('./verifier-batch-cases.cjs');
const { hash, validateAnnotation } = require('./context-annotations.cjs');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'benchmark/data/annotations/verifier-batch-v1');
const json = value => JSON.stringify(value, null, 2) + '\n';

async function run(check = false) {
  const server = await createServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { renderDraft } = await server.ssrLoadModule('/scripts/verifier-batch-renderer.ts');
    const rows = buildCases();
    const assets = new Map();
    const add = (name, content) => assets.set(name, content);
    const counts = { total: rows.length, labels: {}, languages: {}, candidate_modes: {}, groups: new Set(), parser_valid: 0 };
    const cards = ['# Batch Verifier 01 — phiếu duyệt', '',
      '30 mẫu tự soạn, nhãn AI nháp. Chưa huấn luyện, chưa đo model, chưa phải holdout độc lập.',
      'Đọc toàn bộ nguồn trước khi xem nhãn. Chấp nhận, sửa hoặc loại; ghi lý do và trường cần sửa. Không coi đồng ý với một mẫu là duyệt cả nhóm.',
      'Candidate mô phỏng luôn là dòng không rỗng thứ hai hoặc không có; không phải đầu ra Detector. Risk và rule count được tính bằng scanner hiện tại.',
      'HTML được kiểm tra ở dạng nguồn thô; chưa đo extractor hoặc pipeline đọc file. Mẫu ngắn, chưa có tài liệu dài/PDF/DOCX.', ''];
    for (const row of rows) {
      const errors = validateAnnotation(row.text, row.draft_annotation);
      if (errors.length) throw new Error(`${row.id}: ${errors.join('; ')}`);
      const rendered = renderDraft(row, row.draft_annotation);
      row.draft_response = rendered.response;
      row.validation = rendered.validation;
      counts.parser_valid++;
      for (const [field, value] of [['labels', row.draft_annotation.label], ['languages', row.language], ['candidate_modes', row.candidate_mode]]) counts[field][value] = (counts[field][value] || 0) + 1;
      counts.groups.add(row.group_id);
      add(`van-ban/${row.id}${row.format}`, row.text);
      add(`dau-vao/${row.id}.json`, json(rendered.payload));
      add(`dap-an-nhap/${row.id}.json`, json(rendered.response));
      cards.push(`## ${row.id}`, '', `Nguồn đầy đủ: [mở văn bản](van-ban/${row.id}${row.format})`, '',
        '````text', row.text, '````', '',
        `Nghi vấn cung cấp: ${rendered.expected.length ? rendered.expected[0].originalQuote : '(không có; Verifier phải tự tìm)'}`, '',
        `Nhãn nháp: **${row.draft_annotation.stance}**; addressee=${row.draft_annotation.addressee}; framing=${row.draft_annotation.framing}; deviation=${row.draft_annotation.deviation}.`, '',
        row.draft_annotation.reason, '', `[Đầu vào](dau-vao/${row.id}.json) · [JSON đáp án nháp](dap-an-nhap/${row.id}.json)`, '',
        'Quyết định: chưa duyệt. Người duyệt / thời điểm / sửa đổi / lý do: để trống.', '');
    }
    counts.groups = counts.groups.size;
    const legacy = fs.readFileSync(path.join(ROOT, 'benchmark/data/annotations/ngu-canh-v1/mau-cho-duyet.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    const seen = new Set(legacy.map(row => normalize(row.text)));
    for (const row of rows) {
      if (seen.has(normalize(row.text))) throw new Error(`Trùng toàn văn chuẩn hóa: ${row.id}`);
      seen.add(normalize(row.text));
    }
    add('mau-cho-duyet.jsonl', rows.map(row => JSON.stringify(row)).join('\n') + '\n');
    add('ket-qua-ra-soat.json', json({ version: 1, reviews: rows.map(row => ({ id: row.id,
      input_sha256: row.input_sha256, draft_sha256: hash(Buffer.from(json({ annotation: row.draft_annotation, response: row.draft_response }))),
      status: 'pending', reviewer: null, reviewed_at: null, decision: null, final_annotation: null, final_response: null, notes: '' })) }));
    add('phieu-ra-soat.md', cards.join('\n'));
    const files = ['scripts/verifier-batch-cases.cjs', 'scripts/verifier-batch-renderer.ts', 'scripts/prepare-verifier-batch.cjs',
      'scripts/context-annotations.cjs', 'src/ai/agents/document/compactVerifier.ts', 'src/ai/agents/document/sourceReferences.ts',
      'src/ai/agents/document/evidence.ts', 'src/ai/agents/document/reviewPolicy.ts', 'engine/prefilter/document-prefilter.js',
      'engine/prefilter/rules/ipi-document-rules.js', 'engine/document/chunking/semantic-chunker.js'];
    add('manifest.json', json({ version: 1, seed: 42, counts, status: 'draft_pending_human_review',
      human_review_complete: false, fine_tuning_ready: false, training_export_created: false, split: null,
      legacy_normalized_exact_overlap: 0, near_duplicate_review_complete: false,
      limitations: ['Một nguồn tự soạn theo lỗi đã biết, không độc lập.', 'Chưa rà gần trùng/ngữ nghĩa với toàn bộ dữ liệu cũ.',
        'Candidate mô phỏng theo vị trí, chưa đo Detector.', 'Parser hợp lệ không chứng minh nhãn đúng.',
        'Chưa tokenizer/mask audit, chưa train hoặc đo chất lượng model/pipeline.', 'HTML chỉ nguồn thô; toàn bộ mẫu ngắn.'],
      code_sha256: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])),
      asset_sha256: Object.fromEntries([...assets].map(([file, text]) => [file, hash(Buffer.from(text))])) }));
    if (check) {
      for (const [file, expected] of assets) {
        const actual = fs.readFileSync(path.join(DIR, file), 'utf8');
        if (actual !== expected) throw new Error(`Nội dung thay đổi: ${file}. Không ghi đè phiếu đã duyệt; điều tra khác biệt trước.`);
      }
    } else {
      if (fs.existsSync(DIR)) throw new Error('Thư mục đã tồn tại; không ghi đè nguồn hoặc phiếu duyệt. Dùng --check.');
      for (const [file, content] of assets) { fs.mkdirSync(path.dirname(path.join(DIR, file)), { recursive: true }); fs.writeFileSync(path.join(DIR, file), content, 'utf8'); }
    }
    console.log(json({ operation: check ? 'kiem_tra_tai_lap' : 'tao_batch', ...counts, pending: 30, human_review_complete: false, fine_tuning_ready: false }));
  } finally { await server.close(); }
}
if (require.main === module) run(process.argv.includes('--check')).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
