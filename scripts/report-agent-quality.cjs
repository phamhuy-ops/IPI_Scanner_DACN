// Báo cáo bổ sung, không ghi đè raw/baseline hoặc quyết định của lượt đo gốc.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { qualityMetrics, candidateGate, verifierIsolation, requestStability, failureTaxonomy } = require('./agent-quality-metrics.cjs');
const { annotatedCitationAudit } = require('./round-one-metrics.cjs');
const root = path.resolve(__dirname, '..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function report(directory, auditFile) {
  const dir = path.resolve(directory), read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
  const plan = read('giao-thuc.json'), observations = read('cases.json'), progress = read('tien-do.json'), calls = read('model-calls.json');
  if (progress.status !== 'complete') throw Error('Chỉ báo cáo lượt A/B hoàn tất; ca chưa chạy không được coi là đạt.');
  const audit = auditFile ? JSON.parse(fs.readFileSync(auditFile)) : { baseline: {}, candidate: {} };
  const arms = {};
  for (const arm of ['baseline', 'candidate']) {
    const rows = observations.filter(row => row.arm === arm);
    arms[arm] = { overall: qualityMetrics(plan.cases, rows, audit[arm]), breakdown: {} };
    for (const key of ['source', 'evaluation_group', 'language']) {
      arms[arm].breakdown[key] = Object.fromEntries([...new Set(plan.cases.map(row => row[key]))].map(value => {
        const selected = plan.cases.filter(row => row[key] === value), ids = new Set(selected.map(row => row.id));
        return [value, qualityMetrics(selected, rows.filter(row => ids.has(row.id)), audit[arm])];
      }));
    }
  }
  const b = arms.baseline.overall, c = arms.candidate.overall;
  const pending = [...b.uncertain.pending_audit, ...c.uncertain.pending_audit];
  const snapshots = calls.flatMap(call => call.resources?.models || []);
  const maxKnown = values => values.some(Number.isFinite) ? Math.max(...values.filter(Number.isFinite)) : null;
  const modelResources = Object.fromEntries([...new Set(snapshots.map(row => row.name || row.model))].map(model => {
    const rows = snapshots.filter(row => (row.name || row.model) === model);
    return [model, { snapshots: rows.length, max_observed_size_bytes: maxKnown(rows.map(row => row.size)),
      max_observed_vram_bytes: maxKnown(rows.map(row => row.size_vram)), context_lengths: [...new Set(rows.map(row => row.context_length).filter(Number.isFinite))] }];
  }));
  const summary = { status: 'complete', independent_evaluation: false, priority_one_complete: false, default_changed: false,
    request_stability: requestStability(calls),
    failure_taxonomy: Object.fromEntries(['baseline', 'candidate'].map(arm => [arm,
      failureTaxonomy(plan.cases, observations.filter(row => row.arm === arm))])),
    selection_gate: candidateGate(plan.cases, observations.filter(row => row.arm === 'baseline'), observations.filter(row => row.arm === 'candidate'), audit, plan.latency_policy),
    ...(plan.candidate_pipeline_options?.checkModel && plan.candidate_pipeline_options.checkModel !== plan.configuration.models[1] &&
      (!plan.candidate_pipeline_options.fixModel || plan.candidate_pipeline_options.fixModel === plan.configuration.models[0])
      ? { verifier_isolation: verifierIsolation(plan.cases, calls, { detector: plan.configuration.models[0], baselineVerifier: plan.configuration.models[1], candidateVerifier: plan.candidate_pipeline_options.checkModel }) } : {}),
    uncertainty_audit_complete: !pending.length, arms,
    citation_annotation_audit: Object.fromEntries(['baseline', 'candidate'].map(arm => [arm,
      annotatedCitationAudit(plan.cases, observations.filter(row => row.arm === arm))])),
    target: { required: .9, baseline_reached: b.accuracy_all_selected >= .9 && !b.not_run && !b.uncertain.pending_audit.length,
      candidate_reached: c.accuracy_all_selected >= .9 && !c.not_run && !c.uncertain.pending_audit.length },
    resources: { harness_peak_rss_bytes: progress.harness_peak_rss ?? null, chat_calls: calls.length, model_snapshots: modelResources,
      limitation: 'RSS của harness và snapshot Ollama, không phải peak RAM/VRAM hoặc mức dùng toàn hệ thống.' },
    comparison: { accuracy_change: c.accuracy_all_selected - b.accuracy_all_selected,
      FP_change: c.binary_counts.FP - b.binary_counts.FP, false_clear_change: c.binary_counts.false_clear - b.binary_counts.false_clear },
    provenance: { command: `node scripts/report-agent-quality.cjs "${dir}"${auditFile ? ` "${path.resolve(auditFile)}"` : ''}`,
      inputs_sha256: Object.fromEntries(['giao-thuc.json', 'cases.json', 'model-calls.json', 'tien-do.json'].map(file => [file, hash(fs.readFileSync(path.join(dir, file)))])),
      audit_sha256: auditFile ? hash(fs.readFileSync(auditFile)) : null,
      code_sha256: Object.fromEntries(['scripts/report-agent-quality.cjs', 'scripts/agent-quality-metrics.cjs', 'scripts/round-one-metrics.cjs'].map(file => [file, hash(fs.readFileSync(path.join(root, file)))])) },
    limitations: ['Độ đúng uncertain không tự suy từ stance; audit có giải thích được lưu riêng.', 'Dữ liệu dev đã dùng, không phải holdout độc lập.',
      'Thống kê từng tầng là coverage và lỗi kỹ thuật; chưa phải recall riêng từng tầng nếu chưa đối chiếu gold span.',
      'Hàm tính chỉ số không xác nhận nhãn nguồn đúng; không thay thế rà nhãn hoặc kiểm chứng độc lập.'] };
  fs.writeFileSync(path.join(dir, 'quality-audit.json'), JSON.stringify(summary, null, 2));
  return summary;
}
if (require.main === module) {
  try { const r = report(process.argv[2], process.argv[3]); console.log(JSON.stringify({ output: path.join(path.resolve(process.argv[2]), 'quality-audit.json'),
    baseline: r.arms.baseline.overall.accuracy_all_selected, candidate: r.arms.candidate.overall.accuracy_all_selected,
    upper_bounds: [r.arms.baseline.overall.accuracy_upper_bound_before_uncertainty_audit, r.arms.candidate.overall.accuracy_upper_bound_before_uncertainty_audit], uncertainty_audit_complete: r.uncertainty_audit_complete, comparison: r.comparison })); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
module.exports = { report };
