import { assertSlmModel, endpointsForRole, SlmEndpoint, SlmRole } from './slmCatalog';
import { assertCompleteSlmResponse, SlmConnectionError, SlmOutputTruncatedError } from './slmResponse';

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

async function callEndpoint(ep: SlmEndpoint, systemPrompt: string, userPrompt: string, jsonMode: boolean, timeoutMs: number, responseSchema?: Record<string, unknown>, beforeRequest?: () => void): Promise<string> {
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
    max_tokens: 1400,
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
    usage?: { completion_tokens?: number };
  };
  assertCompleteSlmResponse(parsed, ep.model);
  const text = parsed.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error(`${ep.providerId}/${ep.model}: empty response`);
  return text;
}

export async function generateWithSlm(
  role: SlmRole,
  systemPrompt: string,
  userPrompt: string,
  options?: { preferModel?: string; providerMode?: 'ollama'; timeoutMs?: number; responseSchema?: Record<string, unknown>; beforeRequest?: () => void },
): Promise<SlmGenerateResult> {
  // Model được chọn rõ là ràng buộc; lỗi phải hiện ra thay vì đổi model âm thầm.
  const ordered = endpointsForRole(role, options?.providerMode || 'ollama', options?.preferModel);

  const errors: string[] = [];
  const deadline = Date.now() + (options?.timeoutMs ?? 45_000);
  for (const ep of ordered) {
    try {
      const text = await callEndpoint(ep, systemPrompt, userPrompt, true, deadline - Date.now(), options?.responseSchema, options?.beforeRequest);
      return { text, providerId: ep.providerId, model: ep.model };
    } catch (err) {
      // Đầu ra bị cắt là lỗi phản hồi, không phải lỗi kết nối để đổi endpoint.
      if (err instanceof SlmOutputTruncatedError || err instanceof SlmConnectionError) throw err;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const details = errors.slice(0, 3).join(' | ');
  // Timeout không chứng minh thiếu model; giữ từ khóa để pipeline phân loại đúng.
  if (/timeout|timed out|deadline|TimeoutError/i.test(details)) {
    throw new Error(`Analysis timeout: model local chưa hoàn tất vai trò ${role} trong ngân sách. Kiểm tra tải máy, phạm vi tài liệu và phần chưa được rà trước khi thử lại. Details: ${details}`);
  }
  throw new Error(`Không gọi được model local cho vai trò ${role}. Kiểm tra trạng thái Ollama và model đã chọn. Details: ${details}`);
}

/** Ask Ollama to release VRAM; failure here must never fail a security scan. */
export async function releaseSlmModel(model: string): Promise<void> {
  try {
    assertSlmModel(model);
    const bridge = getWorkbenchBridge();
    if (!bridge?.aiFetch) return;

    await withTimeout(bridge.aiFetch({
      providerId: 'ollama',
      url: 'http://127.0.0.1:11434/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: 0 }),
      timeoutMs: 1_500,
    }), 1_500);
  } catch {
    // Best-effort cleanup only. The next Ollama request can still evict the model.
  }
}
