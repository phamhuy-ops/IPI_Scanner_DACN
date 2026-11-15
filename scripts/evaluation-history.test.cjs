const test = require('node:test');
const assert = require('node:assert/strict');
const { checkEvaluationHistory } = require('./evaluation-history.cjs');

const history = { cases: [
  { id: 'used', group_id: 'family-a', input_sha256: 'sha-used', observations: 2 },
  { id: 'unknown', group_id: 'family-b', observations: 0 },
] };

test('chặn biến thể cùng nhóm và file trùng hash dù đã đổi ID', () => {
  assert.throws(() => checkEvaluationHistory([{ id: 'new', group_id: 'family-a' }], history), /nhóm đã dùng/);
  assert.throws(() => checkEvaluationHistory([{ id: 'new', group_id: 'family-c',
    files: [{ input_sha256: 'sha-used' }] }], history), /nhóm đã dùng/);
  assert.throws(() => checkEvaluationHistory([{ id: 'new', original_id: 'used', group_id: 'family-c' }], history), /nhóm đã dùng/);
  assert.throws(() => checkEvaluationHistory([{ id: 'used', original_id: 'new', group_id: 'family-c' }], history), /nhóm đã dùng/);
});

test('chấp nhận nhóm khác qua phép đối chiếu lịch sử và yêu cầu group_id', () => {
  assert.doesNotThrow(() => checkEvaluationHistory([{ id: 'new', group_id: 'family-c' }], history));
  assert.throws(() => checkEvaluationHistory([{ id: 'new' }], history), /thiếu group_id/);
});
