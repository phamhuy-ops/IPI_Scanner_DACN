const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { PROMPTS, schema, audit, metrics } = require('./model-context-diagnostics.cjs');
const ROOT = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main({ planPath = 'benchmark/experiments/model-context-v1/ke-hoach.json', outputPrefix = 'model-context-' } = {}) {
  const PLAN = planPath;
  const planBytes = fs.readFileSync(path.join(ROOT, PLAN)), plan = JSON.parse(planBytes);
  for (const [file, digest] of Object.entries(plan.frozen_inputs || {})) {
    if (hash(fs.readFileSync(path.join(ROOT, file))) !== digest) throw new Error(`Nguồn khóa trước đã đổi: ${file}`);
  }
  const cases = plan.cases.map(item => {
    const manifestBytes = fs.readFileSync(path.join(ROOT, item.manifest));
    if (hash(manifestBytes) !== plan.manifest_sha256[item.manifest]) throw new Error('Manifest đã đổi.');
    const manifest = JSON.parse(manifestBytes), source = manifest.cases.find(row => row.id === item.id);
    for (const input of Object.values(manifest.source_inputs)) {
      if (hash(fs.readFileSync(path.join(ROOT, input.file))) !== input.sha256) throw new Error('Nguồn manifest đã đổi.');
    }
    if (!source || hash(Buffer.from(source.text)) !== source.input_sha256) throw new Error('Văn bản nguồn đã đổi.');
    return { ...item, source: source.source, text: source.text, input_sha256: source.input_sha256 };
  });
  const frozenFiles = [PLAN, ...Object.keys(plan.manifest_sha256), ...Object.keys(plan.frozen_inputs || {}),
    'scripts/run-model-context-diagnostics.cjs', 'scripts/model-context-diagnostics.cjs'];
  const fingerprints = () => Object.fromEntries(frozenFiles.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
  const codeHashes = fingerprints();
  const get = async endpoint => {
    const response = await fetch(`http://127.0.0.1:11434${endpoint}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama: ${response.status}`);
    return response.json();
  };
  const tags = await get('/api/tags');
  for (const model of plan.models) if (!tags.models.some(row => row.name === model)) throw new Error(`Thiếu model ${model}`);
  for (const [model, digest] of Object.entries(plan.model_digests || {})) {
    if (tags.models.find(row => row.name === model)?.digest !== digest) throw new Error(`Digest model đã đổi: ${model}`);
  }
  fs.mkdirSync(path.join(ROOT, 'benchmark/results'), { recursive: true });
  if (!/^[a-z0-9-]+-$/.test(outputPrefix)) throw new Error('Tiền tố output không hợp lệ.');
  const output = fs.mkdtempSync(path.join(ROOT, 'benchmark/results', outputPrefix));
  fs.writeFileSync(path.join(output, 'ke-hoach.json'), planBytes);
  const calls = []; let maxRss = process.memoryUsage().rss;
  const timer = setInterval(() => { maxRss = Math.max(maxRss, process.memoryUsage().rss); }, 100);
  const summary = status => ({ status, plan_sha256: hash(planBytes), code_sha256: codeHashes, models: tags,
    node: process.version, configuration: plan.configuration, max_harness_rss_bytes: maxRss,
    by_model: Object.fromEntries(plan.models.map(model => [model, Object.fromEntries(Object.keys(PROMPTS).map(mode => {
      const rows = calls.filter(row => row.model === model && row.mode === mode);
      return [mode, { accepted: metrics(rows), raw_stance_only: metrics(rows, true),
        by_source: Object.fromEntries([...new Set(rows.map(row => row.source))].map(source => [source, metrics(rows.filter(row => row.source === source))])),
        by_group: Object.fromEntries([...new Set(rows.map(row => row.group))].map(group => [group, metrics(rows.filter(row => row.group === group))])),
        field_matches: Object.fromEntries(['addressee', 'framing', 'deviation', 'hasDirective'].map(key => {
          const eligible = rows.filter(row => mode === 'context' && row.expected_context?.[key]);
          return [key, { correct: eligible.filter(row => row.audit?.shape_valid && row.expected_context[key].includes(row.audit.fields[key])).length, total: eligible.length }];
        })),
        seconds: rows.reduce((sum, row) => sum + row.seconds, 0),
        completion_tokens: rows.reduce((sum, row) => sum + (row.usage?.completion_tokens || 0), 0) }];
    }))])), limitations: plan.limitations });
  const save = status => {
    fs.writeFileSync(path.join(output, 'model-calls.json'), JSON.stringify(calls, null, 2));
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary(status), null, 2));
  };
  save('running');
  console.log(`Kết quả: ${path.relative(ROOT, output)}`);
  let complete = false;
  try {
    for (const model of plan.models) for (const item of cases) for (const mode of Object.keys(PROMPTS)) {
      if (JSON.stringify(fingerprints()) !== JSON.stringify(codeHashes)) throw new Error('Code/kế hoạch thay đổi trong khi đo.');
      const current = (await get('/api/tags')).models.find(row => row.name === model);
      if (current?.digest !== tags.models.find(row => row.name === model).digest) throw new Error('Model đã đổi.');
      const request = { model, messages: [{ role: 'system', content: PROMPTS[mode] },
        { role: 'user', content: JSON.stringify({ document: item.text }) }], temperature: 0, seed: 42, max_tokens: 1400,
        response_format: { type: 'json_schema', json_schema: { name: 'diagnostic', strict: true, schema: schema(mode) } } };
      const row = { id: item.id, source: item.source, group: item.group, gold: item.gold,
        expected_context: item.expected_context, input_sha256: item.input_sha256, model, mode, request };
      const start = performance.now();
      try {
        const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(45000) });
        row.http_status = response.status; row.response = await response.text();
        row.seconds = (performance.now() - start) / 1000;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const envelope = JSON.parse(row.response);
        row.response_model = envelope.model; row.usage = envelope.usage;
        row.finish_reason = envelope.choices?.[0]?.finish_reason;
        if (envelope.model !== model) throw new Error('Model trả lời khác model yêu cầu.');
        row.audit = audit(envelope.choices?.[0]?.message?.content, mode);
      } catch (error) { row.error = error.message; row.audit = { json_valid: false, shape_valid: false, consistent: false }; }
      row.seconds ??= (performance.now() - start) / 1000;
      try { row.resource_snapshot = await get('/api/ps'); } catch { row.resource_snapshot = null; }
      calls.push(row); save('running');
      console.log(`${calls.length}/${cases.length * plan.models.length * 2}: ${model} ${item.id} ${mode}: ${row.audit.classification || 'lỗi'}; nhất quán=${row.audit.consistent}`);
    }
    if (JSON.stringify(fingerprints()) !== JSON.stringify(codeHashes)) throw new Error('Code/kế hoạch đã đổi.');
    complete = true;
  } finally { clearInterval(timer); save(complete ? 'complete' : 'incomplete'); }
  return output;
}
module.exports = { main };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
