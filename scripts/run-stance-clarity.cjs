const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { audit, metrics } = require('./model-context-diagnostics.cjs');
const { PROFILES, requestFor, assessGate } = require('./stance-clarity.cjs');
const ROOT = path.resolve(__dirname, '..');
const PLAN = 'benchmark/experiments/stance-clarity-v1/ke-hoach.json';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const planBytes = fs.readFileSync(path.join(ROOT, PLAN)), plan = JSON.parse(planBytes);
  const read = file => fs.readFileSync(path.join(ROOT, file));
  for (const [file, digest] of Object.entries(plan.frozen_inputs)) if (hash(read(file)) !== digest) throw new Error(`Nguồn đã đổi: ${file}`);
  const previous = JSON.parse(read(plan.baseline_calls)).filter(row => row.mode === 'context');
  const oldSummary = JSON.parse(read(plan.baseline_summary));
  const files = [PLAN, ...Object.keys(plan.frozen_inputs), 'scripts/run-stance-clarity.cjs', 'scripts/stance-clarity.cjs', 'scripts/model-context-diagnostics.cjs'];
  const fingerprints = () => Object.fromEntries(files.map(file => [file, hash(read(file))]));
  const frozen = fingerprints();
  const get = async endpoint => {
    const response = await fetch(`http://127.0.0.1:11434${endpoint}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    return response.json();
  };
  const tags = await get('/api/tags');
  for (const model of plan.models) {
    if (tags.models.find(row => row.name === model)?.digest !== oldSummary.models.models.find(row => row.name === model)?.digest) throw new Error(`Model khác baseline: ${model}`);
    const selected = previous.filter(row => row.model === model);
    if (selected.length !== plan.thresholds.calls_per_model || new Set(selected.map(row => row.id)).size !== selected.length) throw new Error('Thiếu hoặc trùng ca baseline.');
  }
  const output = fs.mkdtempSync(path.join(ROOT, 'benchmark/results/stance-clarity-'));
  fs.writeFileSync(path.join(output, 'ke-hoach.json'), planBytes);
  const calls = []; let maxRss = process.memoryUsage().rss;
  const timer = setInterval(() => { maxRss = Math.max(maxRss, process.memoryUsage().rss); }, 100);
  const summary = status => {
    const byModel = Object.fromEntries(plan.models.map(model => [model, Object.fromEntries(PROFILES.map(profile => {
      const rows = calls.filter(row => row.model === model && row.profile === profile);
      return [profile, { accepted: metrics(rows), raw_stance_only: metrics(rows, true),
        by_source: Object.fromEntries([...new Set(rows.map(row => row.source))].map(source => [source, metrics(rows.filter(row => row.source === source))])),
        by_group: Object.fromEntries([...new Set(rows.map(row => row.group))].map(group => [group, metrics(rows.filter(row => row.group === group))])),
        stance_counts: Object.fromEntries(['confirmed', 'dismissed', 'uncertain'].map(stance => [stance, rows.filter(row => row.audit?.fields?.stance === stance).length])),
        seconds: rows.reduce((sum, row) => sum + row.seconds, 0),
        completion_tokens: rows.reduce((sum, row) => sum + (row.usage?.completion_tokens || 0), 0) }];
    }))]));
    const gates = Object.fromEntries(plan.models.map(model => [model, assessGate(
      calls.filter(row => row.model === model && row.profile === 'baseline'),
      calls.filter(row => row.model === model && row.profile === 'clarified'), plan.thresholds)]));
    return { status, code_sha256: frozen, models: tags, node: process.version, by_model: byModel, gates,
      pipeline_candidate_eligible: status === 'complete' && Object.values(gates).every(gate => gate.passed) &&
        Object.values(gates).some(gate => gate.after.consistent > gate.before.consistent),
      max_harness_rss_bytes: maxRss, limitations: plan.limitations };
  };
  const save = status => {
    fs.writeFileSync(path.join(output, 'model-calls.json'), JSON.stringify(calls, null, 2));
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary(status), null, 2));
  };
  save('running'); console.log(`Kết quả: ${path.relative(ROOT, output)}`);
  let complete = false;
  try {
    for (const prior of previous) for (const profile of PROFILES) {
      if (JSON.stringify(fingerprints()) !== JSON.stringify(frozen)) throw new Error('Code hoặc kế hoạch đổi khi đang đo.');
      const current = (await get('/api/tags')).models.find(row => row.name === prior.model);
      if (current?.digest !== tags.models.find(row => row.name === prior.model).digest) throw new Error('Model đổi khi đang đo.');
      const request = requestFor(prior.request, profile);
      const row = { id: prior.id, model: prior.model, profile, gold: prior.gold, source: prior.source,
        group: prior.group, input_sha256: prior.input_sha256, request };
      const start = performance.now();
      try {
        const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(45000) });
        row.http_status = response.status; row.response = await response.text(); row.seconds = (performance.now() - start) / 1000;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const envelope = JSON.parse(row.response);
        row.response_model = envelope.model; row.usage = envelope.usage; row.finish_reason = envelope.choices?.[0]?.finish_reason;
        if (envelope.model !== prior.model) throw new Error('Model phản hồi không khớp.');
        row.audit = audit(envelope.choices?.[0]?.message?.content, 'context');
      } catch (error) { row.error = error.message; row.audit = { json_valid: false, shape_valid: false, consistent: false }; }
      row.seconds ??= (performance.now() - start) / 1000;
      try { row.resource_snapshot = await get('/api/ps'); } catch { row.resource_snapshot = null; }
      calls.push(row); save('running');
      console.log(`${calls.length}/${previous.length * PROFILES.length} ${row.model} ${row.id} ${profile}: ${row.audit.fields?.stance || 'lỗi'}, nhất quán=${row.audit.consistent}`);
    }
    if (JSON.stringify(fingerprints()) !== JSON.stringify(frozen)) throw new Error('Code hoặc kế hoạch đã đổi.');
    complete = true;
  } finally { clearInterval(timer); save(complete ? 'complete' : 'incomplete'); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
