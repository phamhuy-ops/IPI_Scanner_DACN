const { metrics } = require('./model-context-diagnostics.cjs');
function assessCandidate(rows, plan) {
  const modes = ['recognition', 'context'];
  const byMode = Object.fromEntries(modes.map(mode => {
    const baseline = rows.filter(row => row.model === plan.baseline_model && row.mode === mode);
    const candidate = rows.filter(row => row.model === plan.candidate_model && row.mode === mode);
    const before = metrics(baseline), after = metrics(candidate);
    const complete = baseline.length === plan.thresholds.calls_per_model_mode && candidate.length === baseline.length &&
      new Set(candidate.map(row => row.id)).size === candidate.length &&
      new Set(baseline.map(row => row.id)).size === baseline.length &&
      baseline.every(row => candidate.some(other => other.id === row.id && other.gold === row.gold &&
        JSON.stringify({ ...row.request, model: '' }) === JSON.stringify({ ...other.request, model: '' })));
    const checks = {
      complete_comparable_requests: complete,
      json_and_shape: after.json_valid === after.total && after.shape_valid === after.total,
      consistency: after.consistent / after.total >= plan.thresholds.min_consistency,
      recall: after.recall !== null && after.recall >= plan.thresholds.min_recall && after.tp >= before.tp,
      no_false_clear: after.fn === 0,
      no_false_alert: after.fp === 0,
      coverage: after.coverage !== null && after.coverage >= plan.thresholds.min_coverage,
    };
    return [mode, { before, after, checks, passed: Object.values(checks).every(Boolean) }];
  }));
  return { by_mode: byMode, pipeline_candidate_eligible: Object.values(byMode).every(row => row.passed),
    scope: 'Chỉ cổng dev cho ứng viên, không phải phê duyệt thay mặc định hoặc chứng minh an toàn.' };
}
module.exports = { assessCandidate };
