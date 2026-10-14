export interface AuthConfig {
  cookie?: string;
  bearerToken?: string;
  authorization?: string;
  customHeaders?: string | Record<string, string>;
}

export interface ScanProgressEvent {
  stage: 'crawl' | 'probe' | 'analyze' | 'fuzz' | 'found' | 'done' | 'error';
  msg: string;
  level: 'info' | 'warn' | 'success' | 'error';
  ts: number;
}

export interface Finding {
  ruleId: string;
  owaspCategory: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low' | 'potential';
  target: string;
  location: string;
  evidence: string[];
  remediation: string;
  remediationPlan?: RemediationPlan;
  references: string[];
  collector: 'blackbox' | 'source' | 'active-fuzzer' | 'document';
}

export interface RemediationPlan {
  summary: string;
  confidenceNote: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  url?: string;
  locationHint: string;
  steps: string[];
  suggestedChange?: {
    from?: string;
    to: string;
    language?: string;
  };
}

export interface AttackSurfaceRoute {
  route: string;
  status: number;
  weight: number;
}

export interface AttackSurface {
  score: number;
  exposedRoutes: AttackSurfaceRoute[];
}

export interface CspAnalysis {
  present: boolean;
  value?: string;
  issues: string[];
}

export type AppTab = 'url' | 'project' | 'checklist' | 'ipi';

export interface IpiPatch {
  filePath: string;
  search: string;
  replace: string;
  explanation?: string;
}

export interface IpiLoopEvent {
  ts: number;
  phase: 'detect' | 'fix' | 'apply' | 're-scan' | 'check' | 'done' | 'error';
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

export interface IpiRunState {
  status: 'idle' | 'running' | 'passed' | 'failed';
  events: IpiLoopEvent[];
  scanResult: ScanResult | null;
  lastPatches: IpiPatch[];
  check: IpiCheckVerdict | null;
  error: string | null;
  fixModel?: string;
  checkModel?: string;
}

export interface ScanResult {
  ok: boolean;
  mode: 'url-scan' | 'project-scan' | 'ipi-scan' | 'ipi-doc-scan';
  scannedUrl?: string;
  finalUrl?: string;
  target?: string;
  status?: number;
  title?: string;
  findings: Finding[];
  metadata: {
    summary: {
      total: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    headers?: Record<string, string>;
    formsDetected?: number;
    linksDetected?: number;
    authHints?: unknown;
    auth?: unknown;
    crawledEndpointsCount?: number;
    allowMethods?: string[];
    scannedFiles?: number;
    packageJsonFound?: boolean;
    csprojCount?: number;
    configCount?: number;
    techStack?: string[];
    cspAnalysis?: CspAnalysis;
    attackSurface?: AttackSurface;
    coverageNotes?: string[];
    extractedSnippets?: Array<{
      filePath: string;
      fileName: string;
      chunks: string[];
      findingsCount: number;
      sampleText: string;
    }>;
  };
  error?: string;
}

export interface ChecklistData {
  categories: { id: string; name: string }[];
  designQuestions: string[];
}

export interface ScanHistoryEntry {
  id: string;
  ts: number;
  mode: 'url-scan' | 'project-scan' | 'ipi-scan' | 'ipi-doc-scan';
  target: string;
  riskScore?: number;
  summary: {
    total: number;
    bySeverity: Record<string, number>;
  };
  scanResult: ScanResult;
}

// Exposed Electron API
declare global {
  interface Window {
    owaspWorkbench: {
      scanUrl: (payload: {
        url: string;
        auth?: AuthConfig;
        maxDepth?: number;
        maxBudget?: number;
      }) => Promise<ScanResult>;
      scanProject: (folderPath: string) => Promise<ScanResult>;
      scanIpi: (folderPath: string) => Promise<ScanResult>;
      scanIpiDoc: (filePaths: string[]) => Promise<ScanResult>;
      pickFiles: () => Promise<{ ok: boolean; filePaths: string[] }>;
      readIpiSnippet: (payload: {
        folderPath: string;
        filePath: string;
        aroundLine?: number;
        radius?: number;
      }) => Promise<{
        ok: boolean;
        filePath?: string;
        rel?: string;
        from?: number;
        to?: number;
        snippet?: string;
        content?: string;
        error?: string;
      }>;
      applyIpiPatches: (payload: {
        folderPath: string;
        patches: IpiPatch[];
      }) => Promise<{ ok: boolean; results?: Array<{ ok: boolean; rel?: string; error?: string }>; error?: string }>;
      getChecklist: () => Promise<{ ok: boolean; data?: ChecklistData; error?: string }>;
      pickFolder: () => Promise<{ ok: boolean; folderPath?: string }>;
      openDocs: (url: string) => Promise<{ ok: boolean; error?: string }>;
      exportReport: (payload: {
        format: 'json' | 'html';
        scanResult: ScanResult;
      }) => Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      saveCleanFile: (payload: {
        defaultFilename?: string;
        content: string;
        originalPath?: string;
      }) => Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      stopScan: () => Promise<{ ok: boolean; error?: string }>;
      aiFetch: (payload: {
        providerId: 'openrouter' | 'groq' | 'gemini' | 'together' | 'huggingface' | 'ollama';
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeoutMs?: number;
      }) => Promise<{ ok: boolean; status: number; body: string; headers?: Record<string, string>; error?: string }>;
      checkOllama: () => Promise<{ ok: boolean; models?: string[]; error?: string }>;
      getAIProviders: () => Promise<Record<string, { configured: boolean }>>;
      getAIConfig: () => Promise<{
        ok: boolean;
        userDataPath?: string;
        providers?: Record<string, { configured: boolean; stored: boolean; envKeys: string[] }>;
        error?: string;
      }>;
      saveAIConfig: (payload: { keys: Record<string, string> }) => Promise<{
        ok: boolean;
        userDataPath?: string;
        providers?: Record<string, { configured: boolean; stored: boolean }>;
        error?: string;
      }>;
      onScanProgress: (cb: (event: ScanProgressEvent) => void) => unknown;
      offScanProgress: (listener?: unknown) => void;
    };
  }
}
