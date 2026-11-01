import { IpiBatchReviewSummary, IpiReviewProgress } from '../../../types';
import { AgentBatchResult } from './types';

export function acceptedBatchSummary(suppliedSuspicionCount: number, result: AgentBatchResult): IpiBatchReviewSummary {
  const stanceCounts = { confirmed: 0, dismissed: 0, uncertain: 0 };
  for (const row of [...result.assessments.map(item => item.assessment), ...result.discoveries]) stanceCounts[row.stance]++;
  return { suppliedSuspicionCount, responseAssessmentCount: result.assessments.length,
    responseDiscoveryCount: result.discoveries.length, stanceCounts };
}

export function reviewProgressCounts(progress: IpiReviewProgress) {
  const selected = new Set(progress.selectedChunkIds);
  const detector = new Set(progress.detectorReviewedChunkIds.filter(id => selected.has(id)));
  const verifier = new Set(progress.verifierReviewedChunkIds.filter(id => selected.has(id)));
  const completed = [...detector].filter(id => verifier.has(id)).length;
  return { total: progress.totalChunks, selected: selected.size, detector: detector.size, verifier: verifier.size, completed,
    remaining: progress.totalChunks === null ? null : Math.max(0, progress.totalChunks - completed) };
}

export function incompleteReviewReasons(progress: IpiReviewProgress): string[] {
  if (progress.verifierRequiredChunkIds) {
    const detectorMissing = progress.selectedChunkIds.filter(id => !progress.detectorReviewedChunkIds.includes(id));
    const verifierMissing = progress.verifierRequiredChunkIds.filter(id => !progress.verifierReviewedChunkIds.includes(id));
    return detectorMissing.length || verifierMissing.length
      ? [`Bản thử tách vai trò chưa hoàn tất: Detector thiếu ${detectorMissing.length} đoạn, Verifier thiếu ${verifierMissing.length} đoạn có ứng viên.`] : [];
  }
  const counts = reviewProgressCounts(progress);
  return counts.completed < counts.selected
    ? [`Hai model mới xử lý hợp lệ ${counts.completed}/${counts.selected} đoạn đã chọn (Detector: ${counts.detector}, Verifier: ${counts.verifier}); phần còn lại chưa hoàn tất.`]
    : [];
}
