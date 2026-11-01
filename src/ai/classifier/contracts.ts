export interface ClassifierIdentity {
  model: string;
  revision: string;
  tokenizerSha256: string;
  // Thứ tự phải đọc từ config đã pin, không suy từ vị trí mặc định.
  labels: ['benign', 'malicious'] | ['malicious', 'benign'];
}
export interface ClassifierSource {
  sourceId: string;
  filePath: string;
  sourceView: string;
  text: string;
  startLine: number;
}
// Offset dùng UTF-16 như String.slice của JavaScript; worker Python phải đổi hệ tọa độ.
export interface TokenOffset { start: number; end: number }
export interface SourceTokenizer {
  sha256: string;
  offsets(text: string): TokenOffset[];
  // Bao gồm special tokens và phải đếm lại đúng từng cửa sổ, không chỉ trừ hằng số.
  countInputTokens(text: string): number;
}
export interface SourceWindow {
  id: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  text: string;
  inputTokens: number;
}
export interface ClassifierRequest {
  protocol: 1;
  model: string;
  revision: string;
  tokenizerSha256: string;
  windows: Array<{ id: string; text: string }>;
}
// Adapter xác thực unknown ở biên IPC, không tin type assertion của worker.
export interface ClassifierSession {
  classify(request: ClassifierRequest, signal: AbortSignal): Promise<unknown>;
  // Phải chấm dứt worker đang sở hữu, kể cả khi nó không nghe AbortSignal.
  terminate(): void;
}
export interface ClassifierAdapterOptions {
  identity: ClassifierIdentity;
  tokenizer: SourceTokenizer;
  maxInputTokens: number;
  overlapTokens: number;
  maxWindows: number;
  timeoutMs: number;
  lowThreshold: number;
  highThreshold: number;
  openSession(): ClassifierSession;
  signal?: AbortSignal;
}
export type ClassifierRoute = 'below_threshold' | 'review' | 'candidate';
export interface ScoredWindow extends SourceWindow {
  logits: number[];
  score: number;
  route: ClassifierRoute;
}
export interface ClassifierIssue {
  kind: 'invalid_input' | 'budget' | 'timeout' | 'cancelled' | 'invalid_response' | 'worker_error';
  message: string;
}
export interface ClassifierSourceResult {
  sourceId: string;
  filePath: string;
  sourceView: string;
  identity: ClassifierIdentity;
  windows: ScoredWindow[];
  issues: ClassifierIssue[];
  coverage: {
    sourceCharacters: number;
    scoredCharacters: number;
    plannedWindows: number;
    submittedWindows: number;
    scoredWindows: number;
    omittedWindows: number;
    complete: boolean;
  };
  // Chỉ là đầu ra tìm ứng viên; không có verdict/stance bảo mật.
  inferenceBackend: 'injected_session';
}

export type PreparedClassifierOptions = Omit<ClassifierAdapterOptions, 'tokenizer' | 'overlapTokens'>;
