import { EvidenceAssessment, EvidenceCitation, Finding, IpiCheckVerdict, IpiSuspicion, ReviewContract, ScanResult } from '../../../types';
import { AgentBatchResult, SemanticChunk } from './types';
import { directiveContextSchema, discoveryDirectiveContextSchema, parseDirectiveContext } from './directiveContext';
import { expandReferenceResponse, referenceReviewSchema, SourceReference } from './sourceReferences';

export class InvalidAgentResponse extends Error {
  constructor(message: string) { super(`Invalid model response: ${message}`); }
}

/** Constrain generation AND independently validate the returned evidence. */
export function reviewSchema(chunks: SemanticChunk[], expected: IpiSuspicion[], contract: ReviewContract = 'classic-v1'): Record<string, unknown> {
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

export function citationFor(chunkId: string, quote: string, chunks: SemanticChunk[]): EvidenceCitation {
  const chunk = chunks.find(item => item.chunkId === chunkId);
  const original = chunk && typeof quote === 'string' && quote.trim().length >= 3 ? sourceExcerpt(chunk.text, quote) : null;
  if (!chunk || !original) {
    throw new InvalidAgentResponse('citation must quote an exact excerpt from a supplied chunk');
  }
  const alignment = original !== quote ? { alignment: 'layout_whitespace' as const, modelQuote: quote } : {};
  quote = original;
  const offset = chunk.text.indexOf(quote);
  const startLine = chunk.startLine + chunk.text.slice(0, offset).split(/\r\n?|\n/).length - 1;
  return { ...alignment, chunkId, sourceChunkId: chunk.sourceChunkId, filePath: chunk.filePath,
    sourceView: chunk.sourceView, lineBasis: chunk.lineBasis,
    fileName: chunk.fileName, quote, startLine, endLine: startLine + quote.split(/\r\n?|\n/).length - 1 };
}

export function ruleSuspicions(findings: Finding[], chunks: SemanticChunk[]): IpiSuspicion[] {
  return findings.map((finding, index) => {
    const quote = finding.matchedText || null;
    const chunk = quote ? chunks.find(item => item.filePath === finding.target && item.sourceView === finding.sourceView && item.text.includes(quote)) : undefined;
    return { id: `rule-${index + 1}`, source: 'rule', ruleId: finding.ruleId, location: finding.location,
      originalQuote: quote, citation: chunk && quote ? citationFor(chunk.chunkId, quote, chunks) : null,
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
  if (contract === 'referenced-v1') {
    try {
      const expanded = expandReferenceResponse(value, chunks, expected);
      const result = parseAgentBatch(expanded.data, chunks, expected, 'structured-v1');
      const restore = (assessment: EvidenceAssessment, ref: SourceReference) => {
        const chunk = chunks.find(item => item.chunkId === ref.chunkId)!;
        const startLine = chunk.startLine + chunk.text.slice(0, ref.startOffset).split(/\r\n?|\n/).length - 1;
        const citation = { ...assessment.citation, referenceId: ref.id, startLine,
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
    const citation = citationFor(nonempty(row.chunkId, 'chunkId'), nonempty(row.quote, 'quote'), chunks);
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

export function applyBatch(result: AgentBatchResult, role: 'detector' | 'verifier', suspicions: IpiSuspicion[]) {
  for (const item of result.assessments) {
    const suspicion = suspicions.find(row => row.id === item.id);
    if (suspicion) suspicion[role] = item.assessment;
  }
  for (const assessment of result.discoveries) {
    // Merge overlapping exact excerpts in one chunk, not semantic guesses.
    const existing = suspicions.find(row => row.citation?.chunkId === assessment.citation.chunkId &&
      (row.citation.quote.includes(assessment.citation.quote) || assessment.citation.quote.includes(row.citation.quote)));
    if (existing && !existing[role]) existing[role] = assessment;
    else if (existing?.[role]?.stance === assessment.stance) continue;
    else suspicions.push({ id: `${role}-${suspicions.length + 1}`, source: role,
      location: `${assessment.citation.fileName}:${assessment.citation.startLine}`,
      originalQuote: assessment.citation.quote, citation: assessment.citation,
      detector: role === 'detector' ? assessment : null, verifier: role === 'verifier' ? assessment : null,
      status: 'unresolved' });
  }
  for (const row of suspicions) {
    row.status = row.detector?.stance === 'confirmed' && row.verifier?.stance === 'confirmed' ? 'confirmed'
      : row.detector?.stance === 'dismissed' && row.verifier?.stance === 'dismissed' ? 'dismissed' : 'unresolved';
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
  const confirmed = suspicions.filter(row => row.status === 'confirmed');
  const unresolved = suspicions.filter(row => row.status === 'unresolved');
  const verdict = confirmed.length ? 'ipi_detected'
    : processingError || unresolved.length || coverageReasons.length ? 'needs_review' : 'not_detected';
  const reasons = [
    ...(confirmed.length ? [`${confirmed.length} suspicion(s) confirmed by both agents against quoted source evidence.`] : []),
    ...(unresolved.length ? [`${unresolved.length} suspicion(s) remain unresolved or disputed.`] : []),
    ...(suspicions.some(row => !row.citation) ? ['Some rule excerpts are unavailable in the selected source chunks and cannot be dismissed.'] : []),
    ...(processingError ? [processingError] : []), ...coverageReasons,
  ];
  if (!reasons.length) reasons.push('No unresolved or confirmed IPI evidence in the fully reviewed extracted text. This is not a guarantee of safety.');
  return { verdict, reasons, residualRisks: verdict === 'not_detected' ? [] : ['Human review is required before relying on unresolved or incomplete analysis.'],
    suspicions, coverageReasons };
}
