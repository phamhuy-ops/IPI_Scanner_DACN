import { IpiSuspicion } from '../../../types';
import { SemanticChunk } from './types';
import { withTimeout } from '../slmClient';

export interface SkillSlot {
  decision: string;
  reason: string;
  references: Array<{ text: string; start: number; end: number }>;
  origin: 'model' | 'source-binding';
}
export interface SkillReview {
  status: 'complete' | 'error';
  recipient?: SkillSlot;
  context?: SkillSlot;
  evidence?: SkillSlot;
  error?: string;
}
export type SkillReviewer = (input: { source: string; target: string; deadline: number }) => Promise<SkillReview>;
export interface SkillAuditTrace {
  version: 'frozen-skills-v1';
  configurationHash: string;
  coverageLimited: boolean;
  rows: Array<{ suspicionId: string; chunkId?: string; action: 'kept' | 'dismissed' | 'review'; result: SkillReview }>;
}

function grounded(slot: SkillSlot | undefined, source: string, values: string[]): boolean {
  return !!slot && values.includes(slot.decision) && typeof slot.reason === 'string' && slot.reason.length >= 20
    && Array.isArray(slot.references) && slot.references.length > 0 && slot.references.every(ref => Number.isInteger(ref.start)
      && Number.isInteger(ref.end) && ref.start >= 0 && ref.end > ref.start && ref.end <= source.length
      && source.slice(ref.start, ref.end) === ref.text);
}

// Nhánh thử bật rõ: không tạo xác nhận tấn công mới từ điểm thành phần.
export async function auditWithSkills(chunks: SemanticChunk[], suspicions: IpiSuspicion[], reviewer: SkillReviewer,
  deadline: number, configurationHash: string): Promise<SkillAuditTrace> {
  const trace: SkillAuditTrace = { version: 'frozen-skills-v1', configurationHash, coverageLimited: false, rows: [] };
  for (const item of suspicions) {
    let result: SkillReview;
    const chunk = chunks.find(row => row.chunkId === item.citation?.chunkId);
    try {
      if (!chunk || !item.citation?.quote || !chunk.text.includes(item.citation.quote)) throw Error('Không neo được target vào chunk gốc.');
      if (Date.now() >= deadline) throw Error('Hết ngân sách trước lượt kiểm chứng skill.');
      result = await withTimeout(reviewer({ source: chunk.text, target: item.citation.quote, deadline }), deadline - Date.now());
      if (result.status !== 'complete' || !grounded(result.recipient, chunk.text, ['ai', 'human', 'other', 'unknown'])
        || !grounded(result.context, chunk.text, ['active', 'descriptive', 'unknown'])
        || !grounded(result.evidence, chunk.text, ['supported', 'contradicted', 'insufficient'])) {
        result = { ...result, status: 'error', error: result.error || 'Skill chưa đủ kết quả và bằng chứng hợp lệ.' };
      }
    } catch (error) { result = { status: 'error', error: String(error) }; }
    let action: 'kept' | 'dismissed' | 'review' = 'kept';
    if (result.status === 'error') trace.coverageLimited = true;
    const supported = result.status === 'complete' && result.evidence?.decision === 'supported';
    // Chỉ loại nghi vấn khi khung mô tả có bằng chứng, không có xung đột nội tại.
    if (supported && result.context?.decision === 'descriptive' && result.recipient?.decision !== 'unknown' && !item.conflicts?.length) {
      item.status = 'dismissed'; delete item.needsReviewKind; action = 'dismissed';
    } else if (item.status === 'confirmed' && !(supported && result.context?.decision === 'active' && result.recipient?.decision === 'ai')) {
      item.status = 'unresolved'; item.needsReviewKind = 'uncertain_evidence'; action = 'review';
    }
    trace.rows.push({ suspicionId: item.id, chunkId: chunk?.chunkId, action, result });
  }
  return trace;
}
