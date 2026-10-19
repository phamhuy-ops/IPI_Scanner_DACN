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
}

export interface IpiLoopEvent {
  ts: number;
  phase: 'detect' | 'fix' | 'check' | 'done' | 'error';
  message: string;
  iteration?: number;
  findingCount?: number;
}

export interface IpiCheckVerdict {
  verdict: 'pass' | 'fail';
  reasons: string[];
  residualRisks: string[];
  providerUsed?: string;
  modelUsed?: string;
}

export type SemanticScanProfile = 'balanced' | 'deep';

export interface ScanResult {
  ok: boolean;
  mode: 'ipi-doc-scan';
  target?: string;
  findings: Finding[];
  metadata: {
    summary: { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> };
    scannedFiles?: number;
    extractedSnippets?: Array<{ filePath: string; fileName: string; chunks: string[]; findingsCount: number; sampleText: string }>;
    semanticChunks?: Array<{
      chunkId: string;
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

export interface IpiRunState {
  status: 'idle' | 'running' | 'passed' | 'failed';
  events: IpiLoopEvent[];
  scanResult: ScanResult | null;
  check: IpiCheckVerdict | null;
  error: string | null;
  fixModel?: string;
  checkModel?: string;
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
