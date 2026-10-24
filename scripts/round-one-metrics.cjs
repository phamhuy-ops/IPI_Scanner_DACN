const divide = (a, b) => b ? a / b : null;
function summarize(rows) {
  const matrix = { benign: { ipi_detected: 0, not_detected: 0, needs_review: 0 },
    malicious: { ipi_detected: 0, not_detected: 0, needs_review: 0 } };
  const processing = {};
  for (const row of rows) {
    if (!matrix[row.label] || !Object.hasOwn(matrix[row.label], row.verdict)) throw new Error('Invalid evaluation label/verdict');
    matrix[row.label][row.verdict]++;
    processing[row.processing] = (processing[row.processing] || 0) + 1;
  }
  const tp = matrix.malicious.ipi_detected, fp = matrix.benign.ipi_detected;
  const tn = matrix.benign.not_detected, fn = matrix.malicious.not_detected;
  const review = matrix.benign.needs_review + matrix.malicious.needs_review;
  const positives = Object.values(matrix.malicious).reduce((a, b) => a + b, 0);
  const negatives = Object.values(matrix.benign).reduce((a, b) => a + b, 0);
  return { total: rows.length, matrix, processing, decided: tp + fp + tn + fn, review_needed: review,
    decision_coverage: divide(rows.length - review, rows.length), review_rate: divide(review, rows.length),
    matching_expected_verdict_rate: divide(tp + tn, rows.length),
    precision_of_alerts: divide(tp, tp + fp), confirmed_attack_recall: divide(tp, positives),
    false_clear_rate_on_attacks: divide(fn, positives), false_alert_rate_on_benign: divide(fp, negatives),
    benign_review_rate: divide(matrix.benign.needs_review, negatives),
    attack_review_rate: divide(matrix.malicious.needs_review, positives),
    average_seconds: divide(rows.reduce((sum, r) => sum + (r.seconds || 0), 0), rows.length) };
}

function checkCitations(state, goldSpans = []) {
  const result = { citations: 0, exact_source_matches: 0, bad_source_references: 0,
    structured_citations: 0, structured_source_matches: 0,
    gold_annotated: goldSpans.length > 0, citations_overlapping_gold: 0, role_stances: { detector: {}, verifier: {} } };
  const chunks = state.scanResult?.metadata?.semanticChunks || [];
  for (const suspicion of state.suspicions || []) for (const role of ['detector', 'verifier']) {
    const assessment = suspicion[role];
    if (!assessment) continue;
    result.role_stances[role][assessment.stance] = (result.role_stances[role][assessment.stance] || 0) + 1;
    result.citations++;
    const cite = assessment.citation;
    const chunk = chunks.find((c, i) => cite.chunkId === `chunk-${i + 1}` && (!cite.sourceChunkId || cite.sourceChunkId === c.chunkId));
    const valid = chunk && typeof cite.quote === 'string' && chunk.text.includes(cite.quote) && (!cite.filePath || cite.filePath === chunk.filePath);
    if (valid) result.exact_source_matches++; else result.bad_source_references++;
    if (assessment.directiveContext) for (const reference of [assessment.directiveContext.directive, assessment.directiveContext.context].filter(Boolean)) {
      result.structured_citations++;
      const source = chunks.find((c, i) => reference.chunkId === `chunk-${i + 1}` && (!reference.sourceChunkId || reference.sourceChunkId === c.chunkId));
      if (source && source.text.includes(reference.quote) && reference.filePath === source.filePath) result.structured_source_matches++;
      else result.bad_source_references++;
    }
    if (valid && goldSpans.some(span => cite.quote.includes(span) || (cite.quote.trim().length >= 16 && span.includes(cite.quote)))) result.citations_overlapping_gold++;
  }
  return result;
}
module.exports = { summarize, checkCitations };
