const { test } = require('node:test'); const assert = require('node:assert/strict');
const { qualityMetrics, candidateGate, verifierIsolation, latencyAssessment, provenLatencyFailure, requestStability, canonicalModelShow, failureTaxonomy } = require('./agent-quality-metrics.cjs');

test('taxonomy tách lỗi kỹ thuật, trạng thái thiếu trace và abstention thay vì suy là model bỏ qua nguồn', () => {
  const selected = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, label: 'malicious' }));
  const valid = (id, extra) => ({ id, label: 'malicious', processing: 'completed', coverage_limited: false, verdict: 'needs_review', ...extra });
  const report = failureTaxonomy(selected, [valid('a', { processing: 'invalid_response', state: { suspicions: [] } }), valid('b'),
    valid('c', { state: { suspicions: [] } }), valid('d', { state: { suspicions: [{ detector: null, verifier: { stance: 'confirmed' } }] } })]);
  assert.deepEqual(report.rows.map(row => row.category), ['technical_or_coverage', 'role_trace_unavailable', 'neither_role_positive', 'verifier_only_positive', 'not_run']);
  assert.equal(report.rows[2].accepted_batches_without_supplied_suspicions, null);
  assert.equal(Object.values(report.counts).reduce((a, b) => a + b, 0), 5);
  assert.throws(() => failureTaxonomy(selected, [valid('outside')]));
});

test('taxonomy không gộp mọi benign sai thành quoted hoặc uncertain thành đúng', () => {
  const selected = [{ id: 'q', label: 'benign', annotation: { framing: 'quoted_example' } }, { id: 'b', label: 'benign' }, { id: 'u', label: 'uncertain' }];
  const rows = selected.map(item => ({ id: item.id, label: item.label, processing: 'completed', coverage_limited: false, verdict: 'needs_review',
    state: { suspicions: [], reviewProgress: { batchReviews: [{ suppliedSuspicionCount: 0 }, { suppliedSuspicionCount: 1 }] } } }));
  const result = failureTaxonomy(selected, rows);
  assert.deepEqual(result.rows.map(row => row.category), ['benign_flagged_quoted', 'benign_flagged_other', 'uncertain_requires_grounding_audit']);
  assert.equal(result.rows[0].accepted_batches_without_supplied_suspicions, 1);
  assert.equal(qualityMetrics(selected, rows).accuracy_all_selected, 0);
});

test('pin model không báo đổi vì API chỉ đảo thứ tự khóa tham số/Modelfile sinh lại', () => {
  const before = { parameters: 'top_k 20\ntop_p 0.8\nstop "a"\nstop "b"\n', template: 'template', system: 'system',
    model_info: { layers: 36, width: 2560 }, modelfile: 'PARAMETER top_k 20\nPARAMETER top_p 0.8' };
  const after = { ...before, model_info: { width: 2560, layers: 36 }, parameters: 'stop    "a"\nstop    "b"\ntop_p  0.8\ntop_k 20\n', modelfile: 'PARAMETER top_p 0.8\nPARAMETER top_k 20' };
  assert.equal(canonicalModelShow(before), canonicalModelShow(after));
  for (const changed of [{ ...after, parameters: after.parameters.replace('0.8', '0.7') },
    { ...after, parameters: 'top_k 20\ntop_p 0.8\nstop "b"\nstop "a"\n' },
    { ...after, template: 'new template' }, { ...after, system: 'new system' },
    { ...after, model_info: { layers: 40, width: 2560 } }]) assert.notEqual(canonicalModelShow(before), canonicalModelShow(changed));
  assert.throws(() => canonicalModelShow({ ...before, parameters: 'unknown invalid\nmalformed' }));
  assert.equal(canonicalModelShow({ template: 'default parameters' }), canonicalModelShow({ template: 'default parameters', parameters: '' }));
  assert.throws(() => canonicalModelShow({ template: 'invalid parameters', parameters: null }));
  assert.equal(before.parameters.startsWith('top_k'), true);
});

const stabilityCall = (stance, overrides = {}) => ({ id: 'x', arm: 'baseline', request: { model: 'local', seed: 42, temperature: 0 },
  status: 200, raw: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ analysis: 'Ngữ cảnh', assessments: [
    { id: 'r1', stance, reason: 'Lý do kiểm chứng', chunkId: 'chunk-1', quote: 'source instruction' }], discoveries: [] }) } }] }), ...overrides });

test('audit nhận định khác nhau khi request giống hệt; không gộp seed/model khác', () => {
  const before = stabilityCall('confirmed'), after = stabilityCall('dismissed', { arm: 'candidate', request: { temperature: 0, seed: 42, model: 'local' } });
  const audit = requestStability([before, after, stabilityCall('confirmed', { request: { model: 'local', seed: 43, temperature: 0 } })]);
  assert.equal(audit.unique_requests, 2); assert.equal(audit.repeated_request_groups, 1);
  assert.equal(audit.varying_repeat_groups, 1); assert.equal(audit.groups[0].comparable_responses, 2);
  assert.deepEqual(before.request, { model: 'local', seed: 42, temperature: 0 });
  assert.equal(requestStability([before, stabilityCall('dismissed', { request: { model: 'other', seed: 42, temperature: 0 } })]).repeated_request_groups, 0);
});

test('audit bỏ thay đổi lời giải/thứ tự nhưng vẫn phát hiện đổi discovery và không lộ raw', () => {
  const first = stabilityCall('confirmed'); const next = structuredClone(first); const envelope = JSON.parse(next.raw), review = JSON.parse(envelope.choices[0].message.content);
  review.analysis = 'Lời giải khác'; review.assessments[0].reason = 'Đã đổi cách diễn đạt';
  review.assessments.push({ id: 'r2', stance: 'dismissed', chunkId: 'chunk-2', quote: 'another excerpt' });
  const write = () => { envelope.choices[0].message.content = JSON.stringify(review); next.raw = JSON.stringify(envelope); };
  write(); const same = structuredClone(next); review.analysis = 'Một giải thích nữa'; review.assessments[0].reason = 'Đổi lời giải lần nữa'; review.assessments.reverse(); write();
  assert.equal(requestStability([same, next]).varying_repeat_groups, 0);
  review.discoveries.push({ stance: 'uncertain', chunkId: 'chunk-2', quote: 'another excerpt' }); write();
  const audit = requestStability([same, next]); assert.equal(audit.varying_repeat_groups, 1);
  assert.doesNotMatch(JSON.stringify(audit), /another excerpt|source instruction|Lời giải/);
});

test('audit không coi lỗi/cắt/trùng ID là nhận định ổn định hợp lệ hoặc là bỏ sót', () => {
  const valid = stabilityCall('dismissed'); const truncated = JSON.parse(valid.raw); truncated.choices[0].finish_reason = 'length';
  const duplicate = JSON.parse(valid.raw), review = JSON.parse(duplicate.choices[0].message.content); review.assessments.push(review.assessments[0]);
  duplicate.choices[0].message.content = JSON.stringify(review);
  const audit = requestStability([valid, stabilityCall('confirmed', { raw: JSON.stringify(truncated) }),
    stabilityCall('confirmed', { raw: JSON.stringify(duplicate) }), stabilityCall('confirmed', { error: 'timeout' }), { raw: '{}' }]);
  assert.equal(audit.skipped_requests, 1); assert.equal(audit.comparable_repeat_groups, 0);
  assert.equal(audit.varying_repeat_groups, 0); assert.equal(audit.groups[0].non_comparable_responses, 3);
  assert.equal(requestStability([]).repeated_request_groups, 0);
});

test('chỉ dừng sớm khi p95 toàn cohort không thể hồi phục, giữ đúng thứ hạng95%', () => {
  const policy = { version: 'length-aware-v1', long_min_characters: 10000, short_p95_ratio: 1.25, long_p95_seconds: 45, long_target_seconds: 30 };
  const selected = Array.from({ length: 30 }, (_, i) => ({ id: String(i), text: 'short' }));
  const before = selected.map(row => ({ id: row.id, seconds: 10 }));
  assert.equal(provenLatencyFailure(selected, before, [{ id: '0', seconds: 80 }], policy).proven_failure, false);
  const proof = provenLatencyFailure(selected, before, [{ id: '0', seconds: 80 }, { id: '1', seconds: 20 }], policy);
  assert.equal(proof.proven_failure, true); assert.equal(proof.cohorts.short.minimum_possible_full_set_p95, 20);
  assert.equal(provenLatencyFailure(selected, before, [{ id: '0', seconds: 12.5 }, { id: '1', seconds: 12.5 }], policy).proven_failure, false);
  assert.equal(provenLatencyFailure(selected, [], [{ id: '0', seconds: 80 }, { id: '1', seconds: 20 }], policy).proven_failure, false);
  const long = [{ id: 'long', text: 'x'.repeat(10000) }], baseline = [{ id: 'long', seconds: 30 }];
  assert.equal(provenLatencyFailure(long, baseline, [{ id: 'long', seconds: 45 }], policy).proven_failure, false);
  assert.equal(provenLatencyFailure(long, baseline, [{ id: 'long', seconds: 45.01 }], policy).proven_failure, true);
  assert.throws(() => provenLatencyFailure(selected, before, [{ id: '0', seconds: 80 }, { id: '0', seconds: 80 }], policy));
  assert.throws(() => provenLatencyFailure(selected, before, [{ id: 'outside', seconds: 80 }], policy));
});

test('preflight từ chối cấu hình đã gỡ/sai kiểu và tổ hợp chưa hỗ trợ, không sửa cấu hình', () => {
  const { validatePipelineConfig } = require('./benchmark-agent-upgrade-30.cjs');
  for (const value of [null, [], { fixModel: 'qwen3:4b-instruct-2507-q4_K_M' }, { evidencePresentation: 'stable-alias-v2' },
    { verifierEvidenceMode: 'split-views-multiple-targets-v1' }, { detectorFlow: 'source-review-compact-v1', verifierEvidenceMode: 'unknown' },
    { actionAudit: 'yes' }, { referenceBatchSize: 1.5 }, { referenceBatchSize: 1 },
    { verifierOutput: 'compact-v1' }, { reviewContract: 'structured-v1', evidencePresentation: 'stable-alias-v1' },
    { reviewArchitecture: 'candidate-only-v1', actionAudit: true }, { detectorPasses: 'source-context-v1' },
    { detectorPasses: 'source-context-v1', evidencePresentation: 'stable-alias-v1' },
    { detectorPasses: 'source-context-v1', evidencePresentation: 'stable-alias-v1', reviewContract: 'structured-v1' }]) assert.throws(() => validatePipelineConfig(value));
  for (const value of [{}, { evidencePresentation: 'stable-alias-v1' }, { reviewContract: 'structured-v1' },
    { detectorFlow: 'source-review-compact-v1', verifierEvidenceMode: 'split-views-multiple-targets-v1' },
    { reviewContract: 'referenced-v1', verifierOutput: 'compact-v1', referenceBatchSize: 2 }]) {
    const before = structuredClone(value); assert.doesNotThrow(() => validatePipelineConfig(value)); assert.deepEqual(value, before);
  }
});

test('CLI chặn model ngoài đối chứng hoặc thiếu paired trước khi gọi backend', () => {
  const { spawnSync } = require('node:child_process');
  for (const args of [
    ['--detector-model', 'qwen3:4b-instruct-2507-q4_K_M'],
    ['--detector-model', 'unknown:4b', '--paired', 'yes'],
    ['--baseline-config', 'benchmark/experiments/evidence-stable-alias-v1/config.json'],
    ['--baseline-detector-model', 'qwen3:4b-instruct-2507-q4_K_M'],
  ]) {
    const result = spawnSync(process.execPath, [require.resolve('./benchmark-agent-upgrade-30.cjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /paired/);
    assert.doesNotMatch(result.stdout, /"out"/);
  }
  const retired = spawnSync(process.execPath, [require.resolve('./benchmark-agent-upgrade-30.cjs'),
    '--candidate-config', 'benchmark/experiments/evidence-stable-alias-v2/config.json', '--paired', 'yes'], { encoding: 'utf8' });
  assert.equal(retired.status, 1);
  assert.match(retired.stderr, /đã gỡ/);
  assert.doesNotMatch(retired.stdout, /"out"/);
  const noModel = spawnSync(process.execPath, [require.resolve('./benchmark-agent-upgrade-30.cjs'),
    '--candidate-config', 'benchmark/experiments/detector-source-context-v1/config.json', '--paired', 'yes'], { encoding: 'utf8' });
  assert.equal(noModel.status, 1); assert.match(noModel.stderr, /đã gỡ/); assert.doesNotMatch(noModel.stdout, /"out"/);
  for (const args of [['--stop-on-proven-latency', 'yes'], ['--stop-on-proven-latency', 'yes', '--paired', 'yes']]) {
    const result = spawnSync(process.execPath, [require.resolve('./benchmark-agent-upgrade-30.cjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /policy đã khóa/); assert.doesNotMatch(result.stdout, /"out"/);
  }
});
test('ngân sách dài45 giây không che hồi quy tài liệu ngắn hoặc thời gian chưa đo', () => {
  const policy = { version: 'length-aware-v1', long_min_characters: 10000, short_p95_ratio: 1.25, long_p95_seconds: 45, long_target_seconds: 30 };
  const selected = [{ id: 'short', text: 'abc' }, { id: 'long', text: 'x'.repeat(10000) }];
  const before = [{ id: 'short', seconds: 2 }, { id: 'long', seconds: 10 }];
  const after = [{ id: 'short', seconds: 2 }, { id: 'long', seconds: 40 }];
  assert.equal(latencyAssessment(selected, before, after, policy).passed, true);
  assert.equal(latencyAssessment(selected, before, [{ ...after[0], seconds: 3 }, after[1]], policy).passed, false);
  assert.equal(latencyAssessment(selected, before, [after[0], { ...after[1], seconds: 46 }], policy).passed, false);
  assert.equal(latencyAssessment(selected, before, [after[0]], policy).passed, false);
  const shortOnly = latencyAssessment([selected[0]], [before[0]], [after[0]], policy);
  assert.equal(shortOnly.cohorts.long.applicable, false);
  assert.equal(shortOnly.cohorts.long.candidate_p95, null);
  assert.throws(() => latencyAssessment(selected, before, after, { ...policy, long_p95_seconds: 999 }));
});
test('giữ mọi ca trong mẫu số, lỗi dù verdict đúng vẫn không được tính', () => {
  const selected = [{ id: 'a', label: 'malicious' }, { id: 'b', label: 'benign' }, { id: 'c', label: 'malicious' }, { id: 'd', label: 'benign' }];
  const result = qualityMetrics(selected, [
    { ...selected[0], processing: 'invalid_response', coverage_limited: false, verdict: 'ipi_detected' },
    { ...selected[1], processing: 'completed', coverage_limited: false, verdict: 'not_detected' },
    { ...selected[2], processing: 'completed', coverage_limited: false, verdict: 'needs_review' },
  ]);
  assert.equal(result.accuracy_all_selected, .25); assert.equal(result.not_run, 1);
  assert.equal(result.binary_counts.TP, 0); assert.equal(result.binary_counts.TN, 1);
  assert.equal(result.recall, 0); assert.equal(result.precision, null); assert.equal(result.f1, null);
  assert.equal(result.binary_counts.FN_including_abstentions_and_errors, 2);
});
test('uncertain không thành đúng chỉ do model chọn enum; audit phải có giải thích', () => {
  const selected = [{ id: 'u', label: 'uncertain' }];
  const rows = [{ ...selected[0], processing: 'completed', coverage_limited: false, verdict: 'needs_review', agent_uncertain: true }];
  assert.equal(qualityMetrics(selected, rows).accuracy_all_selected, 0);
  assert.equal(qualityMetrics(selected, rows).accuracy_upper_bound_before_uncertainty_audit, 1);
  assert.equal(qualityMetrics(selected, rows, { u: { grounded: true, explanation: 'Nguồn thiếu người gửi và vai trò; trích dẫn nhận định chỉ đúng chỗ thiếu này.' } }).accuracy_all_selected, 1);
});
test('từ chối ID thừa, trùng hoặc khác nhãn; metric không xác định là null', () => {
  const selected = [{ id: 'b', label: 'benign' }];
  assert.throws(() => qualityMetrics(selected, [{ id: 'x', label: 'benign' }]));
  assert.throws(() => qualityMetrics(selected, [{ id: 'b', label: 'malicious' }]));
  assert.throws(() => qualityMetrics(selected, [selected[0], selected[0]]));
  const result = qualityMetrics([], []); assert.equal(result.accuracy_all_selected, null); assert.equal(result.false_positive_rate, null);
});
test('điểm tăng nhưng phát sinh báo nhầm thì loại; không tự bật mặc định', () => {
  const selected = [{ id: 'a', label: 'malicious' }, { id: 'b', label: 'malicious' }, { id: 'c', label: 'benign' }];
  const row = (index, verdict) => ({ ...selected[index], verdict, processing: 'completed', coverage_limited: false, seconds: 1 });
  const before = [row(0, 'needs_review'), row(1, 'needs_review'), row(2, 'not_detected')];
  const after = [row(0, 'ipi_detected'), row(1, 'ipi_detected'), row(2, 'ipi_detected')];
  const gate = candidateGate(selected, before, after);
  assert.equal(gate.gates.strict_accuracy_improves, true); assert.equal(gate.gates.no_more_false_alerts, false);
  assert.equal(gate.eligible_for_next_development_measurement, false); assert.equal(gate.default_eligible, false);
  assert.deepEqual(gate.regressions, ['c']);
});
test('chỉ đủ điều kiện đo dev tiếp khi có tiến bộ, đủ mẫu và giữ các cổng', () => {
  const selected = [{ id: 'a', label: 'malicious' }, { id: 'b', label: 'benign' }];
  const row = (index, verdict) => ({ ...selected[index], verdict, processing: 'completed', coverage_limited: false, seconds: 1 });
  const before = [row(0, 'needs_review'), row(1, 'not_detected')], after = [row(0, 'ipi_detected'), row(1, 'not_detected')];
  assert.equal(candidateGate(selected, before, after).eligible_for_next_development_measurement, true);
  assert.equal(candidateGate(selected, before, after.slice(0, 1)).gates.complete_selected_set, false);
});
test('báo nhầm kèm lỗi không được lẩn khỏi cổng raw dù không tính thành FP hợp lệ', () => {
  const selected = [{ id: 'a', label: 'malicious' }, { id: 'b', label: 'benign' }];
  const before = [{ ...selected[0], verdict: 'needs_review', processing: 'completed', coverage_limited: false, seconds: 1 },
    { ...selected[1], verdict: 'needs_review', processing: 'invalid_response', coverage_limited: false, seconds: 1 }];
  const after = [{ ...before[0], verdict: 'ipi_detected' }, { ...before[1], verdict: 'ipi_detected' }];
  const gate = candidateGate(selected, before, after);
  assert.equal(gate.gates.strict_accuracy_improves, true); assert.equal(gate.gates.no_more_false_alerts, false);
});
test('đối chứng Verifier phải so cả input và output Detector, không so UUID envelope', () => {
  const selected = [{ id: 'a' }], response = (id, text) => JSON.stringify({ id, choices: [{ message: { content: text } }] });
  const call = (arm, model, id, text = 'unchanged') => ({ id: 'a', arm, request: { model, source: 'original' }, raw: response(id, text) });
  const rows = [call('baseline', 'detector', '1'), call('candidate', 'detector', '2'), call('baseline', 'before', '3'), call('candidate', 'after', '4')];
  const models = { detector: 'detector', baselineVerifier: 'before', candidateVerifier: 'after' };
  const first = verifierIsolation(selected, rows, models);
  assert.equal(first.all_detector_requests_equal, true); assert.equal(first.all_detector_contents_equal, true);
  assert.equal(first.all_verifier_requests_equal_except_model, true);
  rows[1].raw = response('5', 'changed');
  assert.equal(verifierIsolation(selected, rows, models).all_detector_contents_equal, false);
  rows[3].request.source = 'changed';
  assert.equal(verifierIsolation(selected, rows, models).all_verifier_requests_equal_except_model, false);
});

test('lịch sử batch lỗi vẫn giữ, chỉ công nhận phục hồi có đủ ledger', () => {
  const selected = [{ id: 'a', label: 'benign' }];
  const row = { ...selected[0], processing: 'completed', coverage_limited: false, verdict: 'not_detected',
    state: { batchFailures: [{ role: 'detector', code: 'output_truncated', recovery: 'recovered', chunks: [{ chunkId: 'source-1' }] }],
      reviewProgress: { detectorReviewedChunkIds: ['source-1'], verifierReviewedChunkIds: ['source-1'] } } };
  const first = qualityMetrics(selected, [row]);
  assert.equal(first.stages.failures.length, 1);
  assert.equal(first.stages.recovered_batch_attempts, 1);
  assert.equal(first.stages.unresolved_batch_attempts, 0);
  row.state.reviewProgress.detectorReviewedChunkIds = [];
  assert.equal(qualityMetrics(selected, [row]).stages.unresolved_batch_attempts, 1);
});

test('timeout chỉ được tính phục hồi khi ledger đúng vai trò bao phủ toàn batch', () => {
  const selected = [{ id: 'a', label: 'malicious' }];
  const row = { ...selected[0], processing: 'timeout', coverage_limited: true, verdict: 'needs_review',
    state: { batchFailures: [{ role: 'detector', code: 'timeout', recovery: 'recovered',
      chunks: [{ chunkId: 'source-1' }, { chunkId: 'source-2' }] }],
    reviewProgress: { detectorReviewedChunkIds: ['source-1'], verifierReviewedChunkIds: ['source-1', 'source-2'] } } };
  const measure = () => qualityMetrics(selected, [row]);
  assert.equal(measure().stages.recovered_batch_attempts, 0);
  row.state.reviewProgress.detectorReviewedChunkIds.push('source-2');
  assert.equal(measure().stages.recovered_batch_attempts, 1);
  assert.equal(measure().stages.failures.length, 1);
  assert.equal(measure().accuracy_all_selected, 0);
  assert.equal(measure().binary_counts.FN_including_abstentions_and_errors, 1);
  row.state.batchFailures[0].recovery = 'pending';
  assert.equal(measure().stages.recovered_batch_attempts, 0);
  row.state.batchFailures[0].recovery = 'recovered';
  row.state.batchFailures[0].chunks = [];
  assert.equal(measure().stages.recovered_batch_attempts, 0);
});

test('không công nhận uncertain khi lượt rà phụ thuộc thiếu coverage dù caller quên cờ', () => {
  const selected = [{ id: 'a', label: 'uncertain' }];
  const row = { ...selected[0], processing: 'completed', coverage_limited: false, verdict: 'needs_review', agent_uncertain: true,
    state: { contextDependencyReview: { coverageLimited: true } } };
  const audit = { a: { grounded: true, explanation: 'Có nguồn nhưng lượt rà đầy đủ chưa hoàn tất.' } };
  assert.equal(qualityMetrics(selected, [row], audit).accuracy_all_selected, 0);
  row.state.contextDependencyReview.coverageLimited = false;
  assert.equal(qualityMetrics(selected, [row], audit).accuracy_all_selected, 1);
});

test('cấu hình chỉ bật model rà phụ thuộc đã khóa trong nhánh compact tương thích', () => {
  const { validatePipelineConfig } = require('./benchmark-agent-upgrade-30.cjs');
  const config = { detectorFlow: 'source-review-compact-v1', contextDependencyModel: 'qwen3:4b-instruct-2507-q4_K_M' };
  const before = structuredClone(config);
  assert.doesNotThrow(() => validatePipelineConfig(config));
  assert.deepEqual(config, before);
  for (const invalid of [{ contextDependencyModel: config.contextDependencyModel },
    { ...config, contextDependencyModel: 'qwen2.5:1.5b-instruct' },
    { ...config, reviewContract: 'structured-v1' }, { ...config, actionAudit: true }]) {
    assert.throws(() => validatePipelineConfig(invalid));
  }
});

test('so lịch sử chỉ nhận cùng bộ khóa và model; chỉ bỏ qua đường dẫn vật lý ở cấp ca', () => {
  const { validateHistoricalManifest } = require('./benchmark-agent-upgrade-30.cjs');
  const models = ['qwen3:4b-instruct-2507-q4_K_M', 'qwen2.5-coder:1.5b'];
  const item = { id: 'a', text: 'Public maintenance note.', label: 'benign', group_id: 'group-a', annotation: { file: 'original-source' } };
  const plan = { configuration: { fixModel: models[0], checkModel: models[1] }, cases: [{ ...item, file: '/old/document.txt' }] };
  const rows = [{ id: 'a', label: 'benign' }];
  assert.doesNotThrow(() => validateHistoricalManifest([{ ...item, file: '/new/document.txt' }], plan, rows, models));
  assert.doesNotThrow(() => validateHistoricalManifest([item], { ...plan, cases: [{ ...plan.cases[0], evaluation_group: item.group_id }] }, rows, models));
  for (const changed of [{ ...item, label: 'malicious' }, { ...item, text: 'Changed text.' },
    { ...item, group_id: 'other-group' }, { ...item, evaluation_group: 'other-group' }, { ...item, annotation: { file: 'different-source' } }]) {
    assert.throws(() => validateHistoricalManifest([changed], plan, rows, models));
  }
  assert.throws(() => validateHistoricalManifest([item, item], plan, rows, models));
  assert.throws(() => validateHistoricalManifest([item], plan, [], models));
  assert.throws(() => validateHistoricalManifest([item], plan, rows, ['gemma3:1b', models[1]]));
});
