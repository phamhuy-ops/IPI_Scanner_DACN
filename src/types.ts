export interface Finding {
  ruleId: string;
  owaspCategory: 'LLM01';
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low' | 'potential';
  target: string;
  location: string;
  evidence: string[];
  remediation: string;
  references: string[];
  collector: 'document';
  matchedText?: string;
  sourceView?: string;
}

export type SecurityVerdict = 'ipi_detected' | 'not_detected' | 'needs_review';
export type AssessmentStance = 'confirmed' | 'dismissed' | 'uncertain';
/** Phân loại lý do cần xem xét thủ công, không thay đổi verdict. */
export type NeedsReviewKind = 'conflict' | 'uncertain_evidence' | 'citation_failure' | 'coverage_incomplete' | 'verifier_only';
export type ReviewContract = 'classic-v1' | 'classic-spans-v1' | 'structured-v1' | 'referenced-v1';
export type VerifierOutputFormat = 'standard' | 'compact-v1';
export interface DirectiveContext {
  addressee: 'assistant' | 'human' | 'none' | 'unclear';
  framing: 'active' | 'quoted_example' | 'descriptive' | 'unclear';
  deviation: 'answer_manipulation' | 'task_override' | 'data_disclosure' | 'tool_misuse' | 'none' | 'unclear';
  directive: EvidenceCitation | null;
  context: EvidenceCitation;
}
export interface EvidenceCitation {
  referenceId?: string;
  // Vị trí UTF-16 trong chunk, khoảng [startOffset, endOffset), do bảng nguồn xác thực.
  startOffset?: number;
  endOffset?: number;
  alignment?: 'layout_whitespace';
  modelQuote?: string;
  chunkId: string;
  sourceChunkId?: string;
  filePath?: string;
  sourceView?: string;
  lineBasis?: string;
  fileName: string;
  quote: string;
  startLine: number;
  endLine: number;
}
export interface EvidenceAssessment {
  stance: AssessmentStance;
  reason: string;
  citation: EvidenceCitation;
  directiveContext?: DirectiveContext;
}
export interface IpiSuspicion {
  conflicts?: Array<{ role: 'detector' | 'verifier'; assessments: EvidenceAssessment[] }>;
  id: string;
  source: 'rule' | 'detector' | 'verifier';
  ruleId?: string;
  location: string;
  originalQuote: string | null;
  citation: EvidenceCitation | null;
  detector: EvidenceAssessment | null;
  verifier: EvidenceAssessment | null;
  status: 'confirmed' | 'dismissed' | 'unresolved';
  /** Lý do chi tiết hơn khi status là unresolved — hỗ trợ hiển thị UI, không ảnh hưởng verdict. */
  needsReviewKind?: NeedsReviewKind;
}

export interface IpiLoopEvent {
  ts: number;
  phase: 'detect' | 'fix' | 'check' | 'done' | 'error';
  message: string;
  iteration?: number;
  findingCount?: number;
}

export interface IpiCheckVerdict {
  verdict: SecurityVerdict;
  reasons: string[];
  residualRisks: string[];
  providerUsed?: string;
  modelUsed?: string;
  suspicions: IpiSuspicion[];
  coverageReasons: string[];
  /** Nghi vấn chỉ có Verifier xác nhận, chưa có Detector — luôn cần xem xét thủ công. */
  verifierOnlyCount: number;
}

export type SemanticScanProfile = 'balanced' | 'deep';

export interface ExtractionMetadata {
  format: 'html';
  sourcePreserved: boolean;
  sourceCharacters: number;
  sourceViews: Array<{ id: string; lineBasis: string }>;
  regions: Array<{ kind: string; startOffset: number; endOffset: number; startLine: number; endLine: number; closed: boolean }>;
  warnings: string[];
  limitations: string[];
  rawChunks?: number;
  selectedRawChunks?: number;
  rawCoverageComplete?: boolean;
}

export interface ScanResult {
  ok: boolean;
  mode: 'ipi-doc-scan';
  target?: string;
  findings: Finding[];
  metadata: {
    summary: { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> };
    scannedFiles?: number;
    fileResults?: Array<{ filePath: string; ok: boolean; error?: string; extraction?: ExtractionMetadata }>;
    documentLimitReached?: boolean;
    extractedSnippets?: Array<{ filePath: string; fileName: string; sourceView?: string; chunks: string[]; findingsCount: number; sampleText: string }>;
    semanticChunkCatalog?: NonNullable<ScanResult['metadata']['semanticChunks']>;
    semanticChunks?: Array<{
      chunkId: string;
      sourceView?: string;
      lineBasis?: string;
      filePath: string;
      fileName: string;
      index: number;
      startLine: number;
      endLine: number;
      text: string;
      riskScore: number;
      findingCount: number;
      selectionReasons: string[];
    }>;
    coverage?: {
      mode: 'hybrid-priority-sampling';
      scanProfile: SemanticScanProfile;
      totalChunks: number;
      aiReviewedChunks: number;
      highRiskChunks: number;
      highRiskChunksReviewed: number;
      coverageLimited: boolean;
      maxAiChunks: number;
      detectorBatchSize: number;
      verifierEvidenceCharacters: number;
    };
    [key: string]: unknown;
  };
  error?: string;
}

export interface IpiBatchReviewSummary {
  suppliedSuspicionCount: number;
  responseAssessmentCount: number;
  responseDiscoveryCount: number;
  stanceCounts: Record<AssessmentStance, number>;
}

export interface IpiReviewProgress {
  // Chỉ ghi phản hồi đã qua parser; không chứng minh model hiểu đúng nguồn.
  batchReviews?: Array<IpiBatchReviewSummary & {
    role: 'detector' | 'verifier'; model: string; sourceChunkIds: string[];
  }>;
  // Chỉ có trong bản thử: phạm vi xác minh ứng viên, không phải tìm kiếm toàn tài liệu.
  verifierRequiredChunkIds?: string[];
  totalChunks: number | null;
  selectedChunkIds: string[];
  detectorReviewedChunkIds: string[];
  verifierReviewedChunkIds: string[];
}

export interface IpiBatchFailure {
  // Lịch sử lỗi vẫn giữ; chỉ recovered khi mọi đoạn của batch đã review hợp lệ.
  recovery?: 'pending' | 'recovered' | 'incomplete';
  role: 'detector' | 'verifier';
  model: string;
  code: 'invalid_json' | 'invalid_citation' | 'invalid_schema' | 'output_truncated' | 'output_repetition' | 'connection_error' | 'timeout' | 'model_error';
  message: string;
  durationMs: number;
  chunks: Array<{ chunkId: string; fileName: string; filePath?: string; startLine: number; endLine: number }>;
}

export interface IpiRunState {
  skillAudit?: import('./ai/agents/document/skillAudit').SkillAuditTrace;
  // Nhánh đối chứng: dữ kiện nguồn và giới hạn của lượt rà phụ thuộc ngữ cảnh.
  contextDependencyModel?: string;
  verifierEvidenceMode?: 'split-views-multiple-targets-v1';
  contextDependencyReview?: {
    requestedModel: string;
    modelUsed: string | null;
    providerUsed: string | null;
    status: 'complete' | 'limited' | 'error';
    reviewedSourceChunkIds: string[];
    coverageLimited: boolean;
    limitations: string[];
    facts: IpiContextDependencyFact[];
  };
  detectorFlow?: 'source-review-v1' | 'source-review-compact-v1';
  evidencePresentation?: 'stable-alias-v1';
  batchFailures?: IpiBatchFailure[];
  reviewArchitecture?: 'candidate-only-v1';
  reviewProgress?: IpiReviewProgress;
  verifierOutput?: VerifierOutputFormat;
  reviewContract?: ReviewContract;
  status: 'idle' | 'running' | 'completed' | 'error';
  processingStatus: 'idle' | 'running' | 'completed' | 'model_error' | 'timeout' | 'invalid_response' | 'scan_error';
  suspicions: IpiSuspicion[];
  events: IpiLoopEvent[];
  scanResult: ScanResult | null;
  check: IpiCheckVerdict | null;
  error: string | null;
  fixModel?: string;
  checkModel?: string;
}

export interface IpiContextDependencyFact {
  hasDirective: boolean;
  directive: EvidenceCitation;
  explicitExecutor: EvidenceCitation | null;
  unresolvedDependency: EvidenceCitation | null;
  humanOrExample: EvidenceCitation | null;
  clearAIRedirection: EvidenceCitation | null;
  modelReason: string;
}

declare global {
  interface Window {
    owaspWorkbench?: {
      scanIpiDoc: (filePaths: string[], scanProfile?: SemanticScanProfile) => Promise<ScanResult>;
      scanIpiDocFolder: (folderPath: string, scanProfile?: SemanticScanProfile) => Promise<ScanResult>;
      pickFolder: () => Promise<{ ok: boolean; folderPath?: string }>;
      pickFiles: () => Promise<{ ok: boolean; filePaths: string[] }>;
      stopScan: () => Promise<{ ok: boolean; error?: string }>;
      checkOllama: () => Promise<{ ok: boolean; models?: string[]; error?: string }>;
      aiFetch: (payload: {
        providerId: 'ollama';
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeoutMs?: number;
      }) => Promise<{ ok: boolean; status: number; body: string; error?: string }>;
      saveCleanFile: (payload: { defaultFilename?: string; content: string; originalPath?: string }) => Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      onScanProgress: (callback: (event: unknown) => void) => unknown;
      offScanProgress: (listener?: unknown) => void;
    };
  }
}
