// Dùng parser ứng dụng; lỗi JSON/schema tách khỏi sai stance, không bỏ ca lỗi.
const fs = require('node:fs');
const { hash } = require('./context-annotations.cjs');
async function main() {
  const option = process.argv[2];
  const paired = /^--paired-(screen|dev)-(off|on)$/.exec(option || '');
  const version = process.argv.includes('--retry') ? 'v2' : 'v1';
  const full = option === '--full' || paired?.[1] === 'dev';
  const base = paired ? `benchmark/experiments/verifier-pilot-eval-${paired[1]}-${version}/${paired[2]}`
    : full ? 'benchmark/experiments/verifier-hf-base-dev-v1' : 'benchmark/experiments/verifier-hf-base-screen-v1';
  if (fs.existsSync(`${base}/danh-gia.json`)) throw new Error('Không ghi đè đánh giá.');
  const responses = JSON.parse(fs.readFileSync(`${base}/phan-hoi.json`));
  const records = fs.readFileSync('benchmark/data/annotations/verifier-local-release-preview-v2/mau-cho-duyet.jsonl', 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const provenance = JSON.parse(fs.readFileSync('benchmark/experiments/verifier-local-release-v2/ghi-cong-va-pham-vi.json')).decisions;
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: process.cwd(), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const evaluated = [];
  try {
    const { buildVerifierInput } = await server.ssrLoadModule('/scripts/verifier-batch-renderer.ts');
    const { parseCompactVerifierJson } = await server.ssrLoadModule('/src/ai/agents/document/compactVerifier.ts');
    for (const response of responses) {
      const row = records.find(r => r.id === response.source_record_id);
      const item = { id: response.id, group_id: row.group_id, language: row.language,
        source: provenance.find(p => p.id === row.id)?.source,
        mode: response.mode, expected: row.annotation.stance, model_status: response.status, seconds: response.seconds,
        parsed: false, predicted: null, field_matches: null };
      try {
        if (response.status !== 'completed') throw new Error(response.error);
        const input = buildVerifierInput({ text: row.text, format: row.format, candidate_mode: response.mode });
        const parsed = parseCompactVerifierJson(response.response, input.chunks, input.expected);
        const findings = [...parsed.assessments.map(a => a.assessment), ...parsed.discoveries];
        item.parsed = true;
        item.predicted = findings.some(f => f.stance === 'confirmed') ? 'confirmed' : findings.some(f => f.stance === 'uncertain') ? 'uncertain' : 'dismissed';
        const main = findings.find(f => f.stance === item.predicted);
        item.field_matches = main ? Object.fromEntries(['addressee', 'framing', 'deviation', 'hasDirective'].map(k => [k, main[k] === row.annotation[k]])) : null;
        item.correct_stance = item.predicted === item.expected;
      } catch (e) { item.error = e.message; }
      evaluated.push(item);
    }
  } finally { await server.close(); }
  const summarize = rows => {
    const tp = rows.filter(r => r.expected === 'confirmed' && r.predicted === 'confirmed').length;
    const fp = rows.filter(r => r.expected === 'dismissed' && r.predicted === 'confirmed').length;
    const tn = rows.filter(r => r.expected === 'dismissed' && r.predicted === 'dismissed').length;
    const fn = rows.filter(r => r.expected === 'confirmed' && r.predicted === 'dismissed').length;
    const malicious = rows.filter(r => r.expected === 'confirmed').length, benign = rows.filter(r => r.expected === 'dismissed').length;
    const ratio = (a, b) => b ? a / b : null;
    const precision = ratio(tp, tp + fp), recall = ratio(tp, malicious);
    return { examples: rows.length, parsed: rows.filter(r => r.parsed).length, correct_stance: rows.filter(r => r.correct_stance).length,
      tp, fp, tn, false_clear_fn: fn, confirmed_not_detected_or_unresolved: malicious - tp,
      parse_or_model_errors: rows.filter(r => !r.parsed).length,
      abstention: rows.filter(r => r.predicted === 'uncertain').length,
      precision, recall, f1: precision === null || recall === null ? null : precision + recall ? 2 * precision * recall / (precision + recall) : 0,
      false_positive_rate: ratio(fp, benign),
      binary_decision_coverage: ratio(rows.filter(r => ['confirmed', 'dismissed'].includes(r.expected) && ['confirmed', 'dismissed'].includes(r.predicted)).length, malicious + benign) };
  };
  const result = { scope: full ? 'full_dev_not_independent_test' : 'small_dev_screen_not_full_baseline',
    adapter_mode: paired?.[2] ?? 'raw_base',
    expected_examples: full ? 168 : 12, completed_examples: responses.length,
    complete: responses.length === (full ? 168 : 12),
    hit_token_limit: responses.filter(r => r.hit_token_limit).length,
    source_records: new Set(responses.map(r => r.source_record_id)).size,
    aggregate: summarize(evaluated), by_mode: Object.fromEntries(['whole_source', 'none'].map(m => [m, summarize(evaluated.filter(r => r.mode === m))])),
    by_language: Object.fromEntries([...new Set(evaluated.map(r => r.language))].map(l => [l, summarize(evaluated.filter(r => r.language === l))])),
    by_source: Object.fromEntries([...new Set(evaluated.map(r => r.source))].map(s => [s, summarize(evaluated.filter(r => r.source === s))])),
    by_group: Object.fromEntries([...new Set(evaluated.map(r => r.group_id))].map(g => [g, summarize(evaluated.filter(r => r.group_id === g))])),
    latency_seconds: (() => {
      const sorted = evaluated.map(r => r.seconds).sort((a, b) => a - b);
      return { p50: sorted[Math.max(0, Math.ceil(sorted.length * .5) - 1)] ?? null,
        p95: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? null };
    })(),
    rows: evaluated, raw_responses_sha256: hash(fs.readFileSync(`${base}/phan-hoi.json`)),
    parser_code_sha256: hash(fs.readFileSync('src/ai/agents/document/compactVerifier.ts')),
    training_started: false, runtime_changed: false,
    limitations: ['Hai mode cùng source không phải hai quan sát độc lập; xem per-mode và group khi so trước/sau.',
      'Field match chỉ là đối chiếu gold khi có finding, không thay kiểm tra đúng nội dung bằng chứng.',
      'HF generate không có bộ cưỡng chế JSON schema runtime; so adapter phải cùng backend này.'] };
  fs.writeFileSync(`${base}/danh-gia.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ scope: result.scope, aggregate: result.aggregate, by_mode: result.by_mode }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
