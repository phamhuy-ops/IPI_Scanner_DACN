const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const annotationHash = value => hash(JSON.stringify(value));
const ENUMS = {
  label: ['benign', 'malicious', 'uncertain'], stance: ['confirmed', 'dismissed', 'uncertain'],
  addressee: ['assistant', 'human', 'none', 'unclear'], framing: ['active', 'quoted_example', 'descriptive', 'unclear'],
  deviation: ['answer_manipulation', 'task_override', 'data_disclosure', 'tool_misuse', 'none', 'unclear'],
};
function span(text, quote) {
  const start = text.indexOf(quote);
  if (!quote || start < 0 || text.indexOf(quote, start + 1) >= 0) throw new Error('Đoạn chú thích phải có đúng một lần trong nguồn.');
  return { start, end: start + quote.length, quote,
    start_line: text.slice(0, start).split(/\r\n?|\n/).length,
    end_line: text.slice(0, start + quote.length).split(/\r\n?|\n/).length };
}
function validateAnnotation(text, annotation) {
  const errors = [];
  const keys = [...Object.keys(ENUMS), 'hasDirective', 'directive_spans', 'context_spans', 'reason', 'uncertainty_notes'];
  if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) return ['Thiếu đối tượng nhãn.'];
  if (Object.keys(annotation).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(annotation, key))) errors.push('Sai danh sách trường nhãn.');
  for (const [key, values] of Object.entries(ENUMS)) if (!values.includes(annotation[key])) errors.push(`Enum không hợp lệ: ${key}`);
  if (typeof annotation.hasDirective !== 'boolean') errors.push('hasDirective phải là boolean.');
  for (const key of ['directive_spans', 'context_spans']) {
    if (!Array.isArray(annotation[key])) { errors.push(`Thiếu mảng ${key}`); continue; }
    for (const item of annotation[key]) {
      if (!item || !Number.isInteger(item.start) || !Number.isInteger(item.end) || item.start < 0 || item.end <= item.start ||
        item.end > text.length || typeof item.quote !== 'string' || text.slice(item.start, item.end) !== item.quote ||
        text.slice(0, item.start).split(/\r\n?|\n/).length !== item.start_line ||
        text.slice(0, item.end).split(/\r\n?|\n/).length !== item.end_line) errors.push(`Đoạn nguồn sai ở ${key}`);
    }
  }
  if (!Array.isArray(annotation.context_spans) || !annotation.context_spans.length) errors.push('Cần bằng chứng ngữ cảnh cả khi bác bỏ.');
  const directives = Array.isArray(annotation.directive_spans) ? annotation.directive_spans : [];
  const contexts = Array.isArray(annotation.context_spans) ? annotation.context_spans : [];
  if (annotation.hasDirective !== (directives.length > 0)) errors.push('hasDirective không khớp danh sách đoạn chỉ dẫn.');
  if (directives.some(d => !d || !contexts.some(c => c && c.start <= d.start && c.end >= d.end))) errors.push('Ngữ cảnh không chứa đoạn chỉ dẫn.');
  const active = annotation.addressee === 'assistant' && annotation.framing === 'active' &&
    !['none', 'unclear'].includes(annotation.deviation) && annotation.hasDirective;
  if (annotation.stance === 'confirmed' && !active) errors.push('confirmed mâu thuẫn ngữ cảnh.');
  if (annotation.stance === 'dismissed' && active) errors.push('dismissed mâu thuẫn ngữ cảnh.');
  if ({ malicious: 'confirmed', benign: 'dismissed', uncertain: 'uncertain' }[annotation.label] !== annotation.stance) errors.push('Nhãn và stance không khớp.');
  if (typeof annotation.reason !== 'string' || annotation.reason.trim().length < 20) errors.push('Cần lý do có nội dung.');
  if (!Array.isArray(annotation.uncertainty_notes) || annotation.uncertainty_notes.some(note => typeof note !== 'string') ||
    (annotation.label === 'uncertain' && !annotation.uncertainty_notes.length)) errors.push('Ghi chú bất định không hợp lệ.');
  return errors;
}
// Chỉ văn bản được dùng cho đầu vào; không truyền nhãn, source, nhóm hoặc đáp án.
const modelInput = row => ({ document: row.text });
function auditCollection(rows, worksheet) {
  const errors = [], ids = new Set(), texts = new Set(), reviewIds = new Set();
  const counts = { total: rows.length, labels: { benign: 0, malicious: 0, uncertain: 0 }, sources: {}, languages: {},
    pending: 0, accepted: 0, revised: 0, rejected: 0 };
  if (worksheet?.version !== 1 || !Array.isArray(worksheet.reviews)) return { errors: ['Sai phiếu rà soát.'], counts, fine_tuning_ready: false };
  const reviews = worksheet.reviews;
  for (const review of reviews) {
    if (!review || !rows.some(row => row.id === review.id) || reviewIds.has(review.id)) errors.push('Phiếu có ID lạ hoặc trùng.');
    reviewIds.add(review?.id);
  }
  for (const row of rows) {
    const add = message => errors.push(`${row.id}: ${message}`);
    if (!/^ann-\d{3}$/.test(row.id) || ids.has(row.id)) add('ID sai hoặc trùng.'); ids.add(row.id);
    if (typeof row.text !== 'string' || !row.text.trim()) { add('Văn bản rỗng.'); continue; }
    if (texts.has(row.text.trim())) add('Văn bản trùng.'); texts.add(row.text.trim());
    if (hash(Buffer.from(row.text)) !== row.input_sha256) add('Hash nguồn không khớp.');
    if (row.annotation_origin !== 'ai_draft' || row.usage !== 'annotation_pilot_dev' || row.split !== null) add('Không được tự nâng bản nháp thành dữ liệu đã duyệt/train/test.');
    if (!row.group_id || !row.provenance?.source || !row.provenance?.license_status || !row.provenance?.version_sha256) add('Thiếu provenance/nhóm/license.');
    for (const message of validateAnnotation(row.text, row.draft_annotation)) add(message);
    if (Object.hasOwn(counts.labels, row.draft_annotation?.label)) counts.labels[row.draft_annotation.label]++;
    counts.sources[row.provenance?.source] = (counts.sources[row.provenance?.source] || 0) + 1;
    counts.languages[row.language] = (counts.languages[row.language] || 0) + 1;
    const review = reviews.find(item => item?.id === row.id);
    if (!review) { add('Thiếu phiếu người rà soát.'); continue; }
    if (review.input_sha256 !== row.input_sha256 || review.draft_sha256 !== annotationHash(row.draft_annotation)) add('Phiếu tham chiếu bản nguồn/nhãn đã cũ.');
    if (review.status === 'pending') {
      counts.pending++;
      if (review.reviewer !== null || review.reviewed_at !== null || review.decision !== null || review.final_annotation !== null) add('Phiếu pending không được mang xác nhận giả.');
    } else if (review.status === 'human_reviewed') {
      if (typeof review.reviewer !== 'string' || !review.reviewer.trim() || typeof review.reviewed_at !== 'string' ||
        !/^\d{4}-\d\d-\d\dT/.test(review.reviewed_at) || !Number.isFinite(Date.parse(review.reviewed_at))) add('Thiếu người rà soát/thời điểm hợp lệ.');
      if (review.decision === 'accept') {
        counts.accepted++; if (review.final_annotation !== null) add('accept phải giữ bản nháp, không có sửa ngầm.');
      } else if (review.decision === 'revise') {
        counts.revised++; for (const message of validateAnnotation(row.text, review.final_annotation)) add(`Sửa nhãn: ${message}`);
      } else if (review.decision === 'reject') {
        counts.rejected++; if (review.final_annotation !== null || typeof review.notes !== 'string' || !review.notes.trim()) add('reject cần lý do và không có đáp án cuối.');
      } else add('Quyết định rà soát không hợp lệ.');
    } else add('Trạng thái rà soát không hợp lệ.');
  }
  return { errors, counts, structurally_valid: errors.length === 0, human_review_complete: errors.length === 0 && rows.length > 0 && counts.pending === 0,
    fine_tuning_ready: false, reason: 'Bộ tập gán nhãn dev, chưa có phát hành tập huấn luyện hoặc kiểm thử độc lập.' };
}
module.exports = { hash, annotationHash, span, validateAnnotation, modelInput, auditCollection };
