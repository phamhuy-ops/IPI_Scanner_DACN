const test = require('node:test');
const assert = require('node:assert/strict');
const { assessCandidate } = require('./verifier-candidate.cjs');
const plan = { baseline_model: 'baseline', candidate_model: 'candidate', thresholds: {
  calls_per_model_mode: 2, min_consistency: 0.9, min_recall: 0.75, min_coverage: 0.9 } };
const rows = () => ['baseline', 'candidate'].flatMap(model => ['recognition', 'context'].flatMap(mode => ['benign', 'malicious'].map(gold => ({
  id: gold, gold, model, mode, request: { model, messages: [{ role: 'user', content: gold === 'benign' ? 'ordinary text' : 'source instruction' }] },
  audit: { json_valid: true, shape_valid: true, consistent: true, classification: gold },
}))));
test('Cổng yêu cầu đủ cả hai bài hỏi và request chỉ khác model', () => {
  assert.equal(assessCandidate(rows(), plan).pipeline_candidate_eligible, true);
  const modified = rows(); modified[4].request.messages[0].content = 'text changed';
  assert.equal(assessCandidate(modified, plan).pipeline_candidate_eligible, false);
  assert.equal(assessCandidate(rows().slice(0, -1), plan).pipeline_candidate_eligible, false);
});
test('Không dùng abstention toàn bộ hoặc stance thô để coi model đạt', () => {
  const modified = rows();
  for (const row of modified.filter(row => row.model === 'candidate')) row.audit.consistent = false;
  const result = assessCandidate(modified, plan);
  assert.equal(result.pipeline_candidate_eligible, false);
  assert.equal(result.by_mode.context.after.tp, 0);
  assert.equal(result.by_mode.context.after.tn, 0);
});
test('Báo nhầm, bỏ sót hoặc schema lỗi đều làm trượt cổng', () => {
  for (const change of [row => { row.audit.classification = 'malicious'; }, row => { row.audit.shape_valid = false; }]) {
    const modified = rows(); change(modified.find(row => row.model === 'candidate' && row.gold === 'benign'));
    assert.equal(assessCandidate(modified, plan).pipeline_candidate_eligible, false);
  }
  const modified = rows(); modified.find(row => row.model === 'candidate' && row.gold === 'malicious').audit.classification = 'benign';
  assert.equal(assessCandidate(modified, plan).pipeline_candidate_eligible, false);
});
