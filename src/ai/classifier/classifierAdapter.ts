import { ClassifierAdapterOptions, ClassifierIssue, ClassifierRoute, ClassifierSession, ClassifierSource, ClassifierSourceResult, ScoredWindow, SourceWindow, PreparedClassifierOptions } from './contracts';
import { coveredCharacters, sourceWindows } from './sourceWindows';

class AdapterFailure extends Error {
  constructor(public kind: ClassifierIssue['kind'], message: string) { super(message); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AdapterFailure('invalid_response', 'Worker không trả object.');
  return value as Record<string, unknown>;
}
function keys(row: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(row).length !== allowed.length || allowed.some(key => !(key in row))) throw new AdapterFailure('invalid_response', 'Sai trường phản hồi worker.');
}
function validateOptions(options: PreparedClassifierOptions) {
  const identity = options.identity;
  if (!identity.model || !/^[a-f0-9]{40}$/.test(identity.revision) || !/^[a-f0-9]{64}$/.test(identity.tokenizerSha256) ||
      identity.labels.length !== 2 || new Set(identity.labels).size !== 2 ||
      !identity.labels.includes('benign') || !identity.labels.includes('malicious') ||
      !Number.isSafeInteger(options.maxInputTokens) || options.maxInputTokens < 1 || !Number.isSafeInteger(options.maxWindows) || options.maxWindows < 1 || !Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 ||
      !Number.isFinite(options.lowThreshold) || !Number.isFinite(options.highThreshold) || options.lowThreshold < 0 ||
      options.highThreshold > 1 || options.lowThreshold >= options.highThreshold) throw new Error('Cấu hình model/tokenizer/ngưỡng/ngân sách chưa hợp lệ hoặc chưa pin.');
}
function parseResponse(raw: unknown, expected: SourceWindow[], options: PreparedClassifierOptions): ScoredWindow[] {
  const row = object(raw);
  keys(row, ['protocol', 'model', 'revision', 'tokenizerSha256', 'labels', 'windows']);
  const id = options.identity;
  if (row.protocol !== 1 || row.model !== id.model || row.revision !== id.revision || row.tokenizerSha256 !== id.tokenizerSha256 ||
      JSON.stringify(row.labels) !== JSON.stringify(id.labels) || !Array.isArray(row.windows) || row.windows.length !== expected.length) {
    throw new AdapterFailure('invalid_response', 'Model/revision/tokenizer/nhãn hoặc số cửa sổ không khớp.');
  }
  const seen = new Set<string>();
  const scored = row.windows.map(value => {
    const result = object(value);
    keys(result, ['id', 'logits']);
    const window = expected.find(item => item.id === result.id);
    if (!window || seen.has(window.id) || !Array.isArray(result.logits) || result.logits.length !== 2 ||
        result.logits.some(n => typeof n !== 'number' || !Number.isFinite(n))) throw new AdapterFailure('invalid_response', 'ID trùng/lạ hoặc logits không hợp lệ.');
    seen.add(window.id);
    const logits = result.logits as number[];
    const max = Math.max(...logits);
    const exp = logits.map(n => Math.exp(n - max));
    const score = exp[id.labels.indexOf('malicious')] / (exp[0] + exp[1]);
    const route: ClassifierRoute = score >= options.highThreshold ? 'candidate' : score >= options.lowThreshold ? 'review' : 'below_threshold';
    return { ...window, logits: [...logits], score, route };
  });
  // Thứ tự worker không được làm thay đổi thứ tự nguồn.
  return expected.map(window => scored.find(item => item.id === window.id)!);
}

async function executeSource(source: ClassifierSource, options: PreparedClassifierOptions, buildPlan: () => SourceWindow[] | Promise<SourceWindow[]>): Promise<ClassifierSourceResult> {
  const issues: ClassifierIssue[] = [];
  let planned: SourceWindow[] = [];
  let submitted: SourceWindow[] = [];
  let windows: ScoredWindow[] = [];
  let session: ClassifierSession | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onParentAbort: (() => void) | undefined;
  const controller = new AbortController();
  try {
    try {
      validateOptions(options);
      planned = await buildPlan();
      if (!source.text.trim()) throw new Error('Nguồn rỗng hoặc chỉ có khoảng trắng, không có nội dung để phân loại.');
    } catch (error) { if (error instanceof AdapterFailure) throw error; throw new AdapterFailure('invalid_input', error instanceof Error ? error.message : String(error)); }
    submitted = planned.slice(0, options.maxWindows);
    if (submitted.length < planned.length) issues.push({ kind: 'budget', message: `Chưa giao ${planned.length - submitted.length}/${planned.length} cửa sổ vì giới hạn tài nguyên.` });
    if (options.signal?.aborted) throw new AdapterFailure('cancelled', 'Đã hủy trước khi mở worker.');
    session = options.openSession();
    const owner = session;
    const cancelled = new Promise<never>((_resolve, reject) => {
      const abort = (kind: 'timeout' | 'cancelled') => { controller.abort(); reject(new AdapterFailure(kind, kind === 'timeout' ? 'Worker quá thời hạn.' : 'Tác vụ đã bị hủy.')); };
      timer = setTimeout(() => abort('timeout'), options.timeoutMs);
      onParentAbort = () => abort('cancelled');
      options.signal?.addEventListener('abort', onParentAbort, { once: true });
      if (options.signal?.aborted) onParentAbort();
    });
    const response = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new AdapterFailure('cancelled', 'Đã hủy trước khi gửi cửa sổ.');
      return owner.classify({ protocol: 1, model: options.identity.model, revision: options.identity.revision,
        tokenizerSha256: options.identity.tokenizerSha256, windows: submitted.map(window => ({ id: window.id, text: window.text })) }, controller.signal);
    });
    windows = parseResponse(await Promise.race([response, cancelled]), submitted, options);
  } catch (error) {
    issues.push({ kind: error instanceof AdapterFailure ? error.kind : 'worker_error', message: error instanceof Error ? error.message : String(error) });
  } finally {
    if (timer) clearTimeout(timer);
    if (onParentAbort) options.signal?.removeEventListener('abort', onParentAbort);
    controller.abort();
    try { session?.terminate(); }
    catch (error) { issues.push({ kind: 'worker_error', message: `Không chấm dứt được worker: ${String(error)}` }); }
  }
  const sourceCharacters = typeof source.text === 'string' ? source.text.length : 0;
  const scoredCharacters = coveredCharacters(windows);
  return { sourceId: source.sourceId, filePath: source.filePath, sourceView: source.sourceView,
    identity: { ...options.identity, labels: [...options.identity.labels] }, windows, issues,
    coverage: { sourceCharacters, scoredCharacters, plannedWindows: planned.length, submittedWindows: submitted.length,
      scoredWindows: windows.length, omittedWindows: planned.length - submitted.length,
      complete: !issues.length && sourceCharacters > 0 && scoredCharacters === sourceCharacters && windows.length === planned.length },
    inferenceBackend: 'injected_session' };
}

export function classifySource(source: ClassifierSource, options: ClassifierAdapterOptions): Promise<ClassifierSourceResult> {
  return executeSource(source, options, () => {
    if (options.identity.tokenizerSha256 !== options.tokenizer.sha256) throw new Error('Tokenizer không khớp cấu hình đã pin.');
    return sourceWindows(source, options.tokenizer, options.maxInputTokens, options.overlapTokens);
  });
}

// Kế hoạch do worker tokenizer local chuẩn bị; vẫn xác thực nguyên văn và phạm vi ở biên IPC.
export function classifyPreparedSource(source: ClassifierSource, prepared: unknown, options: PreparedClassifierOptions): Promise<ClassifierSourceResult> {
  return executeSource(source, options, async () => {
    const data = object(prepared);
    keys(data, ['protocol', 'model', 'revision', 'tokenizerSha256', 'operation', 'sourceSha256', 'windows']);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source.text));
    const expectedHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (data.protocol !== 1 || data.operation !== 'prepare' || data.model !== options.identity.model || data.revision !== options.identity.revision ||
        data.tokenizerSha256 !== options.identity.tokenizerSha256 || data.sourceSha256 !== expectedHash || !Array.isArray(data.windows) || !data.windows.length ||
        !source.sourceId || !source.filePath || !source.sourceView || !Number.isSafeInteger(source.startLine) || source.startLine < 1) {
      throw new AdapterFailure('invalid_response', 'Kế hoạch tokenizer khác nguồn hoặc identity.');
    }
    let previousEnd = 0;
    let previousStart = -1;
    const boundary = (at: number) => !(at > 0 && at < source.text.length && /[\uD800-\uDBFF]/.test(source.text[at - 1]) && /[\uDC00-\uDFFF]/.test(source.text[at]));
    const windows = data.windows.map((raw, index) => {
      const row = object(raw);
      keys(row, ['id', 'startOffset', 'endOffset', 'startLine', 'endLine', 'text', 'inputTokens']);
      const start = row.startOffset as number, end = row.endOffset as number, count = row.inputTokens as number;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end > source.text.length || end <= start || start <= previousStart ||
          (index === 0 ? start !== 0 : start > previousEnd || end <= previousEnd) || !boundary(start) || !boundary(end) ||
          row.id !== 'window-' + (index + 1) || row.text !== source.text.slice(start, end) || !Number.isSafeInteger(count) || count < 1 || count > options.maxInputTokens) {
        throw new AdapterFailure('invalid_response', 'Cửa sổ chuẩn bị sai offset/token hoặc mất nguồn.');
      }
      const startLine = source.startLine + (source.text.slice(0, start).match(/\n/g)?.length || 0);
      const endLine = startLine + ((row.text as string).replace(/\n$/, '').match(/\n/g)?.length || 0);
      if (row.startLine !== startLine || row.endLine !== endLine) throw new AdapterFailure('invalid_response', 'Ánh xạ dòng tokenizer không khớp nguồn.');
      previousStart = start; previousEnd = end;
      return { id: row.id as string, startOffset: start, endOffset: end, startLine, endLine, text: row.text as string, inputTokens: count };
    });
    if (previousEnd !== source.text.length) throw new AdapterFailure('invalid_response', 'Tokenizer chưa giữ hết phần cuối nguồn.');
    return windows;
  });
}
