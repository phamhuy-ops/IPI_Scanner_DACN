// Tạo biểu diễn kiểm tra hợp đồng từ nhãn đã duyệt, không xuất tập SFT hoặc gọi model.
const fs = require('node:fs');
const path = require('node:path');
const { hash, validateAnnotation } = require('./context-annotations.cjs');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'benchmark/data/annotations/verifier-expansion-v1');
const out = path.join(root, 'benchmark/data/annotations/verifier-external-normalized-v1');
const json = value => JSON.stringify(value, null, 2) + '\n';
async function main() {
  if (fs.existsSync(out)) throw new Error('Đã có biểu diễn chuẩn hóa, không ghi đè.');
  const queueBytes = fs.readFileSync(path.join(source, 'hang-cho-gan-nhan.jsonl'));
  const reviewBytes = fs.readFileSync(path.join(source, 'luot-duyet-02.json'));
  const proposalBytes = fs.readFileSync(path.join(source, 'de-xuat-luot-duyet-02.json'));
  const rows = queueBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const reviews = JSON.parse(reviewBytes).items;
  const proposals = JSON.parse(proposalBytes).items;
  const selected = reviews.filter(review => review.decision === 'accept_annotation');
  if (selected.length !== 27) throw new Error('Cần đúng 27 mẫu trong phạm vi đã duyệt.');
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const assets = new Map(), records = [], examples = [];
  try {
    const { normalizeExternal } = await server.ssrLoadModule('/scripts/normalize-reviewed-external.ts');
    for (const review of selected) {
      const original = rows.find(row => row.id === review.id), proposal = proposals.find(row => row.id === review.id);
      if (review.review_status !== 'human_reviewed' || !review.reviewer || !review.reviewed_at ||
        hash(Buffer.from(original.text)) !== review.input_sha256 || hash(JSON.stringify(proposal)) !== review.proposal_sha256) throw new Error('Quyết định không khớp nguồn/đề xuất.');
      for (const key of ['stance', 'addressee', 'framing', 'deviation', 'hasDirective', 'reason', 'language', 'target_quote']) {
        if (review.annotation[key] !== proposal[key]) throw new Error(`Nhãn khác đề xuất đã duyệt: ${key}`);
      }
      let annotation;
      for (const mode of ['whole_source', 'none']) {
        const rendered = normalizeExternal(original.text, review.annotation, mode);
        const errors = validateAnnotation(original.text, rendered.annotation);
        if (errors.length) throw new Error(errors.join('; '));
        annotation = rendered.annotation;
        const name = `${review.review_code}-${mode}`;
        assets.set(`dau-vao/${name}.json`, json(rendered.payload));
        assets.set(`dap-an/${name}.json`, json(rendered.response));
        examples.push({ id: name, source_record_id: original.id, group_id: original.group_id, mode,
          validation: rendered.validation, input_file: `dau-vao/${name}.json`, target_file: `dap-an/${name}.json` });
      }
      records.push({ id: original.id, review_code: review.review_code, text: original.text,
        input_sha256: review.input_sha256, group_id: original.group_id, proposed_role: original.proposed_role,
        provenance: original.provenance, language: review.annotation.language, annotation,
        review_sha256: hash(JSON.stringify(review)), span_review_status: 'mechanical_mapping_of_reviewed_text_not_new_human_span_review',
        split: null, training_eligible: false });
    }
  } finally { await server.close(); }
  assets.set('nhan-va-bang-chung.jsonl', records.map(row => JSON.stringify(row)).join('\n') + '\n');
  assets.set('bien-the-kiem-tra.json', json(examples));
  assets.set('manifest.json', json({ version: 1, source_records: records.length, contract_examples: examples.length,
    parser_valid: examples.length, training_ready: false, final_split_created: false, independent: false,
    source_sha256: { queue: hash(queueBytes), reviews: hash(reviewBytes), proposals: hash(proposalBytes) },
    limitations: ['27 văn bản gốc, 54 biểu diễn hợp đồng; không phải 54 mẫu độc lập.',
      'Hai chế độ cùng source/group, không được chia khác tập.', 'Candidate whole_source chọn toàn nguồn độc lập gold; none không cung cấp nghi vấn.',
      'Nếu chưa duyệt target_quote riêng thì span có directive dùng toàn nguồn để không tự đoán; hasDirective=false có directive_spans=[].',
      'Các nguồn đã dùng làm dev, không phải holdout độc lập.', 'Mapping span cơ học, chưa duyệt span mới từng mẫu; chưa tokenizer/mask audit hoặc SFT export.'],
    assets_sha256: Object.fromEntries([...assets].map(([file, value]) => [file, hash(Buffer.from(value))])) }));
  for (const [file, value] of assets) { fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true }); fs.writeFileSync(path.join(out, file), value); }
  console.log(json({ output: out, source_records: records.length, contract_examples: examples.length, parser_valid: examples.length, training_ready: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
