import { assertSlmModel, endpointsForRole, SlmEndpoint, SlmRole } from './slmCatalog';
import { assertCompleteSlmResponse, SlmConnectionError, SlmOutputTruncatedError } from './slmResponse';

export interface SlmRequestMetrics {
  model: string;
  durationMs: number;
  totalTokens?: number;
}

export interface SlmGenerateResult {
  text: string;
  providerId: string;
  model: string;
}

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] || raw).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('SLM did not return valid JSON');
  return body.slice(start, end + 1);
}

export function parseSlmJson<T>(raw: string): T {
  return JSON.parse(extractJsonObject(raw)) as T;
}

function getWorkbenchBridge() {
  if (typeof window !== 'undefined' && window.owaspWorkbench) {
    return window.owaspWorkbench;
  }
  return (globalThis as unknown as { owaspWorkbench?: typeof window.owaspWorkbench }).owaspWorkbench;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Analysis timeout: local request deadline exceeded')), Math.max(0, timeoutMs));
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function callEndpoint(ep: SlmEndpoint, systemPrompt: string, userPrompt: string, jsonMode: boolean, timeoutMs: number, responseSchema?: Record<string, unknown>, beforeRequest?: () => void, onUsage?: (tokens: number) => void, maxOutputTokens = 1400): Promise<string> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Analysis timeout: no time remaining');
  assertSlmModel(ep.model);
  const bridge = getWorkbenchBridge();
  if (!bridge?.aiFetch) throw new Error('Run inside Electron to call the SLM.');

  const body: Record<string, unknown> = {
    model: ep.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
    max_tokens: maxOutputTokens,
  };
  if (jsonMode) {
    body.response_format = responseSchema
      ? { type: 'json_schema', json_schema: { name: 'ipi_review', strict: true, schema: responseSchema } }
      : { type: 'json_object' };
  }

  beforeRequest?.();
  const resp = await withTimeout(bridge.aiFetch({
    providerId: ep.providerId,
    url: ep.url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
  }), timeoutMs);

  if (!resp.ok) {
    const err = resp.error || resp.body?.slice(0, 240) || `HTTP ${resp.status}`;
    if (resp.status === 0 && !/timeout|timed out|deadline|abort/i.test(err)
      && /fetch failed|failed to fetch|ECONNREFUSED|ECONNRESET|ENOTFOUND|network connection/i.test(err)) {
      throw new SlmConnectionError(`${ep.providerId}/${ep.model}: ${err}`);
    }
    throw new Error(`${ep.providerId}/${ep.model}: ${err}`);
  }

  const parsed = JSON.parse(resp.body) as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
    usage?: { completion_tokens?: number; prompt_tokens?: number; total_tokens?: number };
  };
  const usage = parsed.usage;
  const tokens = usage?.total_tokens ?? (usage?.prompt_tokens !== undefined && usage.completion_tokens !== undefined ? usage.prompt_tokens + usage.completion_tokens : undefined);
  if (typeof tokens === 'number' && Number.isInteger(tokens) && tokens >= 0) onUsage?.(tokens);
  assertCompleteSlmResponse(parsed, ep.model);
  const text = parsed.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error(`${ep.providerId}/${ep.model}: empty response`);
  return text;
}

export async function generateWithSlm(
  role: SlmRole,
  systemPrompt: string,
  userPrompt: string,
  options?: { preferModel?: string; providerMode?: 'ollama'; timeoutMs?: number; maxOutputTokens?: number; responseSchema?: Record<string, unknown>; beforeRequest?: () => void; onRequestMetrics?: (metrics: SlmRequestMetrics) => void },
): Promise<SlmGenerateResult> {
  // Model được chọn rõ là ràng buộc; lỗi phải hiện ra thay vì đổi model âm thầm.
  const ordered = endpointsForRole(role, options?.providerMode || 'ollama', options?.preferModel);

  const errors: string[] = [];
  const deadline = Date.now() + (options?.timeoutMs ?? 45_000);
  for (const ep of ordered) {
    const started = Date.now();
    let totalTokens: number | undefined;
    try {
      const text = await callEndpoint(ep, systemPrompt, userPrompt, true, deadline - Date.now(), options?.responseSchema, options?.beforeRequest, tokens => { totalTokens = tokens; }, options?.maxOutputTokens);
      return { text, providerId: ep.providerId, model: ep.model };
    } catch (err) {
      // Đầu ra bị cắt là lỗi phản hồi, không phải lỗi kết nối để đổi endpoint.
      if (err instanceof SlmOutputTruncatedError || err instanceof SlmConnectionError) throw err;
      errors.push(err instanceof Error ? err.message : String(err));
    } finally {
      options?.onRequestMetrics?.({ model: ep.model, durationMs: Date.now() - started, totalTokens });
    }
  }

  const details = errors.slice(0, 3).join(' | ');
  // Timeout không chứng minh thiếu model; giữ từ khóa để pipeline phân loại đúng.
  if (/timeout|timed out|deadline|TimeoutError/i.test(details)) {
    throw new Error(`Analysis timeout: model local chưa hoàn tất vai trò ${role} trong ngân sách. Kiểm tra tải máy, phạm vi tài liệu và phần chưa được rà trước khi thử lại. Details: ${details}`);
  }
  throw new Error(`Không gọi được model local cho vai trò ${role}. Kiểm tra trạng thái Ollama và model đã chọn. Details: ${details}`);
}

export async function releaseSlmModel(model: string, verify = false): Promise<void> {
  const bridge = getWorkbenchBridge();
  try {
    assertSlmModel(model);
    if (bridge?.aiFetch) await withTimeout(bridge.aiFetch({
      providerId: 'ollama',
      url: 'http://127.0.0.1:11434/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: 0 }),
      timeoutMs: verify ? 5_000 : 1_500,
    }), verify ? 5_000 : 1_500);
  } catch {
    // Lượt chuyển agent kiểm tra trạng thái thật ngay cả khi yêu cầu giải phóng hết hạn.
  }
  if (!verify) return;

  for (let attempt = 0; attempt < 4 && bridge?.aiFetch; attempt++) {
    try {
      const response = await withTimeout(bridge.aiFetch({
        providerId: 'ollama', url: 'http://127.0.0.1:11434/api/ps', method: 'GET', timeoutMs: 1_500,
      }), 1_500);
      const loaded = response.ok ? JSON.parse(response.body).models : undefined;
      if (Array.isArray(loaded) && !loaded.some(entry => entry.name === model || entry.model === model)) return;
    } catch {
      // Thử đọc lại trạng thái trước khi dừng chuyển agent.
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Chưa xác nhận Ollama đã giải phóng ${model}. Đã dừng trước khi nạp agent tiếp theo.`);
}
