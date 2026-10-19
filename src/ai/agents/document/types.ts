import { ScanResult } from '../../../types';

export interface SemanticChunk {
  chunkId: string;
  fileName: string;
  startLine: number;
  endLine: number;
  text: string;
  riskScore: number;
  findingCount: number;
  selectionReasons: string[];
}

export type SemanticCoverage = NonNullable<ScanResult['metadata']['coverage']>;

export interface DetectorBatchResult {
  hasIndirectInjection?: boolean;
  confidence?: string;
  intentAnalysis?: string;
  riskExplanation?: string;
}

export interface DetectorReview {
  model: string;
  batchCount: number;
  suspiciousBatchCount: number;
  semanticAnalysis: string;
  semanticRiskLevel: 'high' | 'low';
}
