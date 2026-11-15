function checkEvaluationHistory(cases, history) {
  if (!Array.isArray(history.cases)) throw new Error('Lịch sử đánh giá thiếu danh sách ca.');
  const exposed = history.cases.filter(row => Number.isInteger(row.observations) && row.observations > 0);
  if (!exposed.length) throw new Error('Lịch sử đánh giá thiếu bản ghi đã dùng.');
  const groups = new Set(exposed.map(row => row.group_id).filter(Boolean));
  const ids = new Set(exposed.map(row => row.id));
  const hashes = new Set(exposed.map(row => row.input_sha256).filter(Boolean));
  for (const item of cases) {
    if (!item.group_id) throw new Error(`Ca ${item.id} thiếu group_id để đối chiếu lịch sử.`);
    const inputs = item.files ?? [item];
    if (groups.has(item.group_id) || ids.has(item.id) || ids.has(item.original_id) ||
      inputs.some(input => hashes.has(input.input_sha256))) {
      throw new Error(`Ca ${item.id} trùng đầu vào, ID hoặc nhóm đã dùng trong lịch sử đánh giá.`);
    }
  }
}

module.exports = { checkEvaluationHistory };
