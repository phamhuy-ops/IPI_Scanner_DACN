import { AssessmentStance, EvidenceAssessment, IpiBatchReviewSummary, ScanResult } from '../../../types';

export interface SemanticChunk {
  chunkId: string;
  sourceChunkId?: string;
  sourceStartOffset?: number;
  sourceView?: string;
  lineBasis?: string;
  filePath?: string;
  fileName: string;
  startLine: number;
  endLine: number;
  text: string;
  riskScore: number;
  findingCount: number;
  selectionReasons: string[];
}

export type SemanticCoverage = NonNullable<ScanResult['metadata']['coverage']>;

export interface ReviewedBatch {
  chunkIds: string[];
  model: string;
  audit?: IpiBatchReviewSummary;
}

export interface FailedBatch extends ReviewedBatch {
  recoveryScheduled?: boolean;
  error: unknown;
  durationMs: number;
}

export interface ModelAssessment {
  id: string;
  stance: AssessmentStance;
  reason: string;
  chunkId: string;
  quote: string;
}
export interface AgentBatchResult {
  analysis: string;
  assessments: Array<{ id: string; assessment: EvidenceAssessment }>;
  discoveries: EvidenceAssessment[];
}
export interface DetectorReview {
  model: string;
  batchCount: number;
  suspiciousBatchCount: number;
  semanticAnalysis: string;
  reviewedChunkIds: string[];
}
