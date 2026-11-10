import { EvidenceAssessment, EvidenceCitation, Finding, IpiCheckVerdict, IpiSuspicion, NeedsReviewKind, ReviewContract, ScanResult } from '../../../types';
import { AgentBatchResult, SemanticChunk } from './types';
import { directiveContextSchema, discoveryDirectiveContextSchema, parseDirectiveContext } from './directiveContext';
import { expandReferenceResponse, referenceReviewSchema, SourceReference } from './sourceReferences';
import { classicSpanSchema, expandClassicSpans } from './classicSpans';

export class InvalidAgentResponse extends Error {
  constructor(message: string) { super(`Invalid model response: ${message}`); }
}

/** Constrain generation AND independently validate the returned evidence. */
export function reviewSchema(chunks: SemanticChunk[], expected: IpiSuspicion[], contract: ReviewContract = 'classic-v1'): Record<string, unknown> {
  if (contract === 'classic-spans-v1') return classicSpanSchema(chunks, expected);
  if (contract === 'referenced-v1') return referenceReviewSchema(chunks, expected);
  const contextFields = contract === 'structured-v1' ? ['directiveContext'] : [];
  const properties = { stance: { type: 'string', enum: ['confirmed', 'dismissed', 'uncertain'] },
    reason: { type: 'string', minLength: 20 }, chunkId: { type: 'string', enum: chunks.map(chunk => chunk.chunkId) },
    quote: { type: 'string', minLength: 3 }, ...(contextFields.length ? { directiveContext: directiveContextSchema } : {}) };
  const assessmentShape = { type: 'object', additionalProperties: false, required: ['id', 'stance', 'reason', 'chunkId', 'quote', ...contextFields],
    properties: { id: { type: 'string' }, ...properties } };
  const variants = expected.map(item => ({ ...assessmentShape, properties: {
    ...assessmentShape.properties, id: { type: 'string', enum: [item.id] },
    chunkId: { type: 'string', enum: [item.citation?.chunkId] },
    quote: { type: 'string', enum: [item.citation?.quote] },
  } }));
  return { type: 'object', additionalProperties: false, required: ['analysis', 'assessments', 'discoveries'], properties: {
    analysis: { type: 'string', minLength: 3 },
    assessments: { type: 'array', minItems: expected.length, maxItems: expected.length,
      items: variants.length ? { anyOf: variants } : assessmentShape },
    discoveries: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['stance', 'reason', 'chunkId', 'quote', ...contextFields], properties: { ...properties,
        ...(contextFields.length ? { directiveContext: discoveryDirectiveContextSchema } : {}),
        stance: { type: 'string', enum: ['confirmed', 'uncertain'] } } } },
  } };
}

// Only reconcile ASCII layout whitespace. Never repair words, punctuation,
// Unicode characters, ellipses or model-added explanation.
function sourceExcerpt(text: string, quote: string): string | null {
  if (text.includes(quote)) return quote;
  const normalizedQuote = quote.replace(/[ \t\r\n]+/g, ' ').trim();
  if (normalizedQuote.length < 3) return null;
  const positions: Array<{ start: number; end: number }> = [];
  let normalized = '';
  for (let index = 0; index < text.length;) {
    const start = index;
    const whitespace = /[ \t\r\n]/.test(text[index]);
    index++;
    if (whitespace) while (index < text.length && /[ \t\r\n]/.test(text[index])) index++;
    normalized += whitespace ? ' ' : text[start];
    positions.push({ start, end: index });
  }
  const offset = normalized.indexOf(normalizedQuote);
  if (offset < 0 || normalized.indexOf(normalizedQuote, offset + 1) !== -1) return null;
  return text.slice(positions[offset].start, positions[offset + normalizedQuote.length - 1].end);
}

export function citationFor(chunkId: string, quote: string, chunks: SemanticChunk[], requiredStartLine?: number): EvidenceCitation {
  const chunk = chunks.find(item => item.chunkId === chunkId);
  const original = chunk && typeof quote === 'string' && quote.trim().length >= 3 ? sourceExcerpt(chunk.text, quote) : null;
  if (!chunk || !original) {
    throw new InvalidAgentResponse('citation must quote an exact excerpt from a supplied chunk');
  }
  const alignment = original !== quote ? { alignment: 'layout_whitespace' as const, modelQuote: quote } : {};
  quote = original;
  let offset = chunk.text.indexOf(quote);
  if (requiredStartLine !== undefined) {
    if (!Number.isSafeInteger(requiredStartLine) || requiredStartLine < 1) throw new InvalidAgentResponse('citation has an invalid source line');
    // Vị trí do scanner/ID đã gắn nguồn cung cấp, không phải gợi ý do model đoán.
    while (offset >= 0 && chunk.startLine + chunk.text.slice(0, offset).split(/\r\n?|\n/).length - 1 !== requiredStartLine) offset = chunk.text.indexOf(quote, offset + 1);
    if (offset < 0) throw new InvalidAgentResponse('citation does not occur at the required source line');
  }
  const startLine = chunk.startLine + chunk.text.slice(0, offset).split(/\r\n?|\n/).length - 1;
  return { ...alignment, chunkId, sourceChunkId: chunk.sourceChunkId, filePath: chunk.filePath,
    sourceView: chunk.sourceView, lineBasis: chunk.lineBasis,
    fileName: chunk.fileName, quote, startLine, endLine: startLine + quote.split(/\r\n?|\n/).length - 1 };
}

export function ruleSuspicions(findings: Finding[], chunks: SemanticChunk[]): IpiSuspicion[] {
  return findings.map((finding, index) => {
    const quote = finding.matchedText || null;
    const reportedLine = /:(\d+)$/.exec(finding.location)?.[1];
    const requiredLine = reportedLine === undefined ? undefined : Number(reportedLine);
    let citation: EvidenceCitation | null = null;
    for (const chunk of quote ? chunks.filter(item => item.filePath === finding.target && item.sourceView === finding.sourceView && item.text.includes(quote)) : []) {
      try { citation = citationFor(chunk.chunkId, quote!, chunks, requiredLine); break; }
      catch (error) { if (!(error instanceof InvalidAgentResponse)) throw error; }
    }
    return { id: `rule-${index + 1}`, source: 'rule', ruleId: finding.ruleId, location: finding.location,
      originalQuote: quote, citation,
      detector: null, verifier: null, status: 'unresolved' };
  });
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidAgentResponse('expected an object');
  return value as Record<string, unknown>;
}
function nonempty(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length < 3) throw new InvalidAgentResponse(`${field} must be a nonempty string`);
  return value;
}
function onlyKeys(row: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(row).some(key => !allowed.includes(key))) throw new InvalidAgentResponse('unexpected schema field');
}

export function parseAgentBatch(value: unknown, chunks: SemanticChunk[], expected: IpiSuspicion[], contract: ReviewContract = 'classic-v1'): AgentBatchResult {
  return parseBatch(value, chunks, expected, contract);
}

function parseBatch(value: unknown, chunks: SemanticChunk[], expected: IpiSuspicion[], contract: ReviewContract,
  locatedDiscoveries = false): AgentBatchResult {
  if (contract === 'classic-spans-v1') {
    try {
      const expanded = expandClassicSpans(value, chunks, expected);
      // Mã span đã được đối chiếu bảng nguồn; không coi là discovery chuỗi thiếu vị trí.
      const result = parseBatch(expanded.value, chunks, expected, 'classic-v1', true);
      const assessments = [...result.assessments.map(row => row.assessment), ...result.discoveries];
      assessments.forEach((assessment, index) => {
        const ref = expanded.selected[index], chunk = chunks.find(row => row.chunkId === ref.chunkId)!;
        const startLine = chunk.startLine + chunk.text.slice(0, ref.startOffset).split(/\r\n?|\n/).length - 1;
        assessment.citation = { ...assessment.citation, referenceId: ref.id, startOffset: ref.startOffset, endOffset: ref.endOffset, startLine, endLine: startLine + ref.text.split(/\r\n?|\n/).length - 1 };
      });
      return result;
    } catch (error) {
      if (error instanceof InvalidAgentResponse) throw error;
      throw new InvalidAgentResponse(error instanceof Error ? error.message : 'Phản hồi span không hợp lệ.');
    }
  }
  if (contract === 'referenced-v1') {
    try {
      const expanded = expandReferenceResponse(value, chunks, expected);
      const result = parseAgentBatch(expanded.data, chunks, expected, 'structured-v1');
      const restore = (assessment: EvidenceAssessment, ref: SourceReference) => {
        const chunk = chunks.find(item => item.chunkId === ref.chunkId)!;
        const startLine = chunk.startLine + chunk.text.slice(0, ref.startOffset).split(/\r\n?|\n/).length - 1;
        const citation = { ...assessment.citation, referenceId: ref.id, startOffset: ref.startOffset, endOffset: ref.endOffset, startLine,
          endLine: startLine + ref.text.split(/\r\n?|\n/).length - 1 };
        assessment.citation = citation;
        if (assessment.directiveContext?.directive) assessment.directiveContext.directive = citation;
      };
      result.assessments.forEach((row, index) => restore(row.assessment, expanded.assessmentRefs[index]));
      result.discoveries.forEach((row, index) => restore(row, expanded.discoveryRefs[index]));
      return result;
    } catch (error) {
      if (error instanceof InvalidAgentResponse) throw error;
      throw new InvalidAgentResponse(error instanceof Error ? error.message : 'Phản hồi tham chiếu không hợp lệ.');
    }
  }
  const data = object(value);
  onlyKeys(data, ['analysis', 'assessments', 'discoveries']);
  const analysis = nonempty(data.analysis, 'analysis');
  if (!Array.isArray(data.assessments) || !Array.isArray(data.discoveries)) throw new InvalidAgentResponse('assessments and discoveries must be arrays');
  const ids = new Set<string>();
  function assessment(input: unknown, original?: IpiSuspicion): EvidenceAssessment {
    const row = object(input);
    onlyKeys(row, [...(original ? ['id'] : []), 'stance', 'reason', 'chunkId', 'quote', ...(contract === 'structured-v1' ? ['directiveContext'] : [])]);
    if (!['confirmed', 'dismissed', 'uncertain'].includes(String(row.stance)) || typeof row.stance !== 'string') throw new InvalidAgentResponse('invalid stance');
    const reason = nonempty(row.reason, 'reason');
    if (reason.trim().length < 20) throw new InvalidAgentResponse('reason must explain context and intent, at least 20 characters');
    const quote = nonempty(row.quote, 'quote');
    // Khớp vị trí chưa đủ: dấu phân cách đơn thuần không chứng minh nhận định.
    // Chỉ chặn bằng chứng rỗng nội dung; không suy ra stance từ từ khóa.
    if (!/[\p{L}\p{N}]/u.test(quote)) throw new InvalidAgentResponse('citation must contain source content, not only separators or symbols');
    const chunkId = nonempty(row.chunkId, 'chunkId');
    const requiredLine = original?.citation?.chunkId === chunkId && original.citation.quote === quote ? original.citation.startLine : undefined;
    const citation = citationFor(chunkId, quote, chunks, requiredLine);
    if (!original && contract === 'classic-v1' && !locatedDiscoveries) {
      const text = chunks.find(item => item.chunkId === chunkId)!.text;
      const first = text.indexOf(citation.quote);
      if (text.indexOf(citation.quote, first + 1) >= 0) {
        throw new InvalidAgentResponse('citation is ambiguous: quote more surrounding source text to identify one occurrence');
      }
    }
    if (original?.citation?.chunkId === chunkId && original.citation.quote === quote
      && (original.citation.startOffset !== undefined || original.citation.endOffset !== undefined)) {
      const { startOffset: start, endOffset: end } = original.citation;
      const chunk = chunks.find(item => item.chunkId === chunkId)!;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start! < 0 || end! <= start! || end! > chunk.text.length
        || chunk.text.slice(start, end) !== quote
        || chunk.startLine + chunk.text.slice(0, start).split(/\r\n?|\n/).length - 1 !== original.citation.startLine
        || original.citation.endLine !== original.citation.startLine + quote.split(/\r\n?|\n/).length - 1) {
        throw new InvalidAgentResponse('Vị trí nguồn gốc không hợp lệ; không đoán lại lần xuất hiện khác.');
      }
      Object.assign(citation, { startOffset: start, endOffset: end,
        ...(original.citation.referenceId ? { referenceId: original.citation.referenceId } : {}) });
    }
    if (original?.citation && citation.chunkId !== original.citation.chunkId) throw new InvalidAgentResponse('review must cite the chunk containing the original suspicion');
    if (original?.citation && !citation.quote.includes(original.citation.quote) && !original.citation.quote.includes(citation.quote)) {
      throw new InvalidAgentResponse('review quote must overlap the original suspicious excerpt');
    }
    let directiveContext: EvidenceAssessment['directiveContext'];
    if (contract === 'structured-v1') {
      try {
        directiveContext = parseDirectiveContext(row.directiveContext, row.stance as EvidenceAssessment['stance'], !original,
          quote => citationFor(citation.chunkId, quote, chunks), citation);
      } catch (error) {
        if (error instanceof InvalidAgentResponse) throw error;
        throw new InvalidAgentResponse(error instanceof Error ? error.message : 'Nhận định directive không hợp lệ.');
      }
    }
    return { stance: row.stance as EvidenceAssessment['stance'], reason, citation, ...(directiveContext ? { directiveContext } : {}) };
  }
  const assessments = data.assessments.map(input => {
    const row = object(input);
    const id = nonempty(row.id, 'id');
    const original = expected.find(item => item.id === id);
    if (!original || ids.has(id)) throw new InvalidAgentResponse('unknown or duplicate suspicion ID');
    ids.add(id);
    return { id, assessment: assessment(row, original) };
  });
  if (ids.size !== expected.length) throw new InvalidAgentResponse('every supplied suspicion must be assessed');
  const discoveries = data.discoveries.map(input => {
    const result = assessment(input);
    if (result.stance === 'dismissed') throw new InvalidAgentResponse('new discoveries must be confirmed or uncertain');
    return result;
  });
  return { analysis, assessments, discoveries };
}

export function parseReviewJson(raw: string, chunks: SemanticChunk[], expected: IpiSuspicion[], contract: ReviewContract = 'classic-v1'): AgentBatchResult {
  // Parse syntax errors as response errors, not confirmed attacks or clean results.
  try {
    const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return parseAgentBatch(JSON.parse(body), chunks, expected, contract);
  } catch (error) {
    if (error instanceof InvalidAgentResponse) throw error;
    throw new InvalidAgentResponse('response is not valid JSON');
  }
}

export function applyBatch(result: AgentBatchResult, role: 'detector' | 'verifier', suspicions: IpiSuspicion[], chunks: SemanticChunk[] = []) {
  // Giữ mọi quan sát của cùng vai trò trước khi cập nhật/gộp nghi vấn.
  const observations = [...suspicions.flatMap(row => [row[role],
    ...(row.conflicts || []).filter(conflict => conflict.role === role).flatMap(conflict => conflict.assessments)]),
  ...result.assessments.map(row => row.assessment), ...result.discoveries].filter((row): row is EvidenceAssessment => !!row);
  const byId = new Map(chunks.map(chunk => [chunk.chunkId, chunk]));
  const located = (citation: EvidenceCitation) => Number.isSafeInteger(citation.startOffset) && Number.isSafeInteger(citation.endOffset)
    && citation.startOffset! >= 0 && citation.endOffset! - citation.startOffset! === citation.quote.length && citation.quote.length > 0;
  const absoluteOffset = (citation: EvidenceCitation, chunk: SemanticChunk): number | null => {
    if (!Number.isSafeInteger(chunk.sourceStartOffset) || chunk.sourceStartOffset! < 0 || !citation.quote) return null;
    if (located(citation)) {
      return chunk.text.slice(citation.startOffset, citation.endOffset) === citation.quote
        ? chunk.sourceStartOffset! + citation.startOffset! : null;
    }
    // Chỉ dùng vị trí duy nhất khớp cả nguyên văn lẫn dòng đã được xác thực.
    let match: number | null = null;
    for (let offset = chunk.text.indexOf(citation.quote); offset >= 0; offset = chunk.text.indexOf(citation.quote, offset + 1)) {
      if (chunk.startLine + chunk.text.slice(0, offset).split(/\r\n?|\n/).length - 1 !== citation.startLine) continue;
      if (match !== null) return null;
      match = chunk.sourceStartOffset! + offset;
    }
    return match;
  };
  const sameSourceOccurrence = (left: EvidenceCitation, right: EvidenceCitation) => {
    const a = byId.get(left.chunkId), b = byId.get(right.chunkId);
    if (!a?.filePath || !b || a.filePath !== b.filePath || a.sourceView !== b.sourceView || a.lineBasis !== b.lineBasis) return false;
    const x = absoluteOffset(left, a), y = absoluteOffset(right, b);
    if (x === null || y === null) return false;
    return (x <= y && left.quote.slice(y - x, y - x + right.quote.length) === right.quote)
      || (y <= x && right.quote.slice(x - y, x - y + left.quote.length) === left.quote);
  };
  const containsSameEvidence = (left: EvidenceCitation, right: EvidenceCitation) => {
    if (!(left.quote.includes(right.quote) || right.quote.includes(left.quote))) return false;
    if (left.chunkId !== right.chunkId) return sameSourceOccurrence(left, right);
    if (located(left) && located(right)) return left.startOffset! < right.endOffset! && right.startOffset! < left.endOffset!;
    // Câu giống nhau ở hai vùng dòng tách biệt không phải cùng bằng chứng.
    // Vị trí cũ không biết/sai dạng vẫn giữ cách đối chiếu bảo thủ trước đây.
    const known = [left.startLine, left.endLine, right.startLine, right.endLine].every(line => Number.isSafeInteger(line) && line > 0)
      && left.startLine <= left.endLine && right.startLine <= right.endLine;
    return !known || (left.startLine <= right.endLine && right.startLine <= left.endLine);
  };
  for (const item of result.assessments) {
    const suspicion = suspicions.find(row => row.id === item.id);
    if (suspicion) {
      suspicion[role] = item.assessment;
      // Bảng mã đã xác thực vị trí của chính nghi vấn này; giữ qua lượt Verifier.
      if (item.assessment.citation.referenceId && item.assessment.citation.startOffset !== undefined) suspicion.citation = item.assessment.citation;
    }
  }
  for (const assessment of result.discoveries) {
    // Merge overlapping exact excerpts in one chunk, not semantic guesses.
    const existing = suspicions.find(row => row.citation && containsSameEvidence(row.citation, assessment.citation));
    if (existing && !existing[role]) existing[role] = assessment;
    else if (existing && (existing[role]?.stance === assessment.stance
      || (existing.citation && sameSourceOccurrence(existing.citation, assessment.citation)))) continue;
    else suspicions.push({ id: `${role}-${suspicions.length + 1}`, source: role,
      location: `${assessment.citation.fileName}:${assessment.citation.startLine}`,
      originalQuote: assessment.citation.quote, citation: assessment.citation,
      detector: role === 'detector' ? assessment : null, verifier: role === 'verifier' ? assessment : null,
      status: 'unresolved' });
  }
  for (const row of suspicions) {
    const related = observations.filter(item => row.citation && containsSameEvidence(row.citation, item.citation));
    const conflicting = related.filter(item => related.some(other => item.stance !== other.stance && containsSameEvidence(item.citation, other.citation)));
    if (conflicting.length) {
      const unique = conflicting.filter((item, index) => conflicting.findIndex(other =>
        other.stance === item.stance && other.citation.chunkId === item.citation.chunkId && other.citation.quote === item.citation.quote &&
        other.citation.startLine === item.citation.startLine && other.citation.endLine === item.citation.endLine && other.reason === item.reason) === index);
      row.conflicts = [...(row.conflicts || []).filter(conflict => conflict.role !== role), { role, assessments: unique }];
    }
    const isConflict = !!row.conflicts?.length;
    const prevStatus = row.status;
    row.status = isConflict ? 'unresolved'
      : row.detector?.stance === 'confirmed' && row.verifier?.stance === 'confirmed' ? 'confirmed'
      : row.detector?.stance === 'dismissed' && row.verifier?.stance === 'dismissed' ? 'dismissed' : 'unresolved';
    // Gán needsReviewKind để UI phân biệt lý do — không thay đổi verdict.
    if (row.status === 'unresolved') {
      let kind: NeedsReviewKind;
      if (isConflict) {
        kind = 'conflict';
      } else if (!row.citation) {
        // Nghi vấn rule không có chunk tương ứng trong danh sách đã chọn.
        kind = 'coverage_incomplete';
      } else if (row.detector === null && row.verifier !== null) {
        // Verifier phát hiện nhưng Detector chưa xác nhận.
        kind = 'verifier_only';
      } else if (row.detector?.stance === 'uncertain' || row.verifier?.stance === 'uncertain') {
        kind = 'uncertain_evidence';
      } else {
        // Hai vai trò không đồng ý nhưng không mâu thuẫn nội bộ (một xem xét chưa hoàn tất).
        kind = 'uncertain_evidence';
      }
      // Giữ kind cũ nếu đã có, trừ khi có conflict mới phát hiện — conflict là priority cao hơn.
      if (!row.needsReviewKind || kind === 'conflict' || prevStatus !== 'unresolved') row.needsReviewKind = kind;
    } else {
      delete row.needsReviewKind;
    }
  }
}

export function coverageIssues(scan: ScanResult, chunks: SemanticChunk[]): string[] {
  const issues: string[] = [];
  const coverage = scan.metadata.coverage;
  if (!coverage) issues.push('Semantic coverage is unknown.');
  else if (coverage.coverageLimited || coverage.totalChunks !== chunks.length || coverage.aiReviewedChunks !== chunks.length) {
    issues.push(`Only ${chunks.length}/${coverage.totalChunks} extracted chunks were selected for AI review.`);
  }
  if (scan.metadata.documentLimitReached) issues.push('The folder document limit was reached.');
  if (!scan.metadata.fileResults) issues.push('Per-file extraction coverage is unknown.');
  else for (const file of scan.metadata.fileResults) if (!file.ok) issues.push(`Document extraction failed: ${file.filePath}`);
  for (const file of scan.metadata.fileResults || []) {
    if (file.ok && !chunks.some(chunk => chunk.filePath === file.filePath)) issues.push(`No selected text for document: ${file.filePath}`);
    if (file.extraction) {
      if (!file.extraction.sourcePreserved || !file.extraction.rawCoverageComplete) issues.push(`HTML source coverage is incomplete: ${file.filePath}`);
      for (const warning of file.extraction.warnings) issues.push(`${file.filePath}: ${warning}`);
    }
  }
  return issues;
}

export function conclude(suspicions: IpiSuspicion[], coverageReasons: string[], processingError?: string): IpiCheckVerdict {
  const conflicts = suspicions.filter(row => row.conflicts?.length);
  const confirmed = suspicions.filter(row => row.status === 'confirmed' && !row.conflicts?.length);
  const unresolved = suspicions.filter(row => row.status === 'unresolved' || row.conflicts?.length);
  const verifierOnly = suspicions.filter(row => row.needsReviewKind === 'verifier_only');
  const verdict = confirmed.length ? 'ipi_detected'
    : processingError || unresolved.length || coverageReasons.length ? 'needs_review' : 'not_detected';

  // Nhóm lý do needs_review theo loại để UI hiển thị rõ hơn.
  const conflictCount = conflicts.length;
  const uncertainCount = unresolved.filter(row => row.needsReviewKind === 'uncertain_evidence').length;
  const verifierOnlyCount = verifierOnly.length;
  const citationFailureCount = unresolved.filter(row => row.needsReviewKind === 'citation_failure').length;
  const coverageIncompleteCount = unresolved.filter(row => row.needsReviewKind === 'coverage_incomplete').length;

  const reasons = [
    ...(conflictCount ? [`${conflictCount} nghi vấn có nhận định tự mâu thuẫn trong cùng vai trò; cần đối chiếu nguồn, chưa được chốt bằng chứng này.`] : []),
    ...(confirmed.length ? [`${confirmed.length} suspicion(s) confirmed by both agents against quoted source evidence.`] : []),
    ...(verifierOnlyCount ? [`${verifierOnlyCount} nghi vấn chỉ Verifier phát hiện — cần Detector xác nhận trước khi chốt.`] : []),
    ...(uncertainCount ? [`${uncertainCount} nghi vấn còn bất định (thiếu bằng chứng hoặc không xác định người nhận).`] : []),
    ...(citationFailureCount ? [`${citationFailureCount} nghi vấn bị gián đoạn do lỗi trích dẫn; phần tài liệu này chưa được rà hoàn chỉnh.`] : []),
    ...(coverageIncompleteCount ? [`${coverageIncompleteCount} nghi vấn rule không có chunk tương ứng trong tập đã chọn.`] : []),
    ...(unresolved.length && !conflictCount && !uncertainCount && !verifierOnlyCount && !citationFailureCount && !coverageIncompleteCount
      ? [`${unresolved.length} suspicion(s) remain unresolved or disputed.`] : []),
    ...(suspicions.some(row => !row.citation) ? ['Some rule excerpts are unavailable in the selected source chunks and cannot be dismissed.'] : []),
    ...(processingError ? [processingError] : []), ...coverageReasons,
  ];
  if (!reasons.length) reasons.push('No unresolved or confirmed IPI evidence in the fully reviewed extracted text. This is not a guarantee of safety.');
  return { verdict, reasons, residualRisks: verdict === 'not_detected' ? [] : ['Human review is required before relying on unresolved or incomplete analysis.'],
    suspicions, coverageReasons, verifierOnlyCount };
}
