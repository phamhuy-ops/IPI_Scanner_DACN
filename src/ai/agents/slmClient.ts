import { assertSlmModel, endpointsForRole, SlmEndpoint, SlmRole } from './slmCatalog';

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
  if (start === -1 || end <= start) throw new Error('SLM không trả JSON hợp lệ');
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

async function callEndpoint(ep: SlmEndpoint, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  assertSlmModel(ep.model);
  const bridge = getWorkbenchBridge();
  if (!bridge?.aiFetch) throw new Error('Cần chạy trong Electron để gọi SLM.');

  const body: Record<string, unknown> = {
    model: ep.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 1400,
  };
  if (jsonMode && ep.providerId !== 'huggingface') {
    body.response_format = { type: 'json_object' };
  }

  const resp = await bridge.aiFetch({
    providerId: ep.providerId,
    url: ep.url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 45_000,
  });

  if (!resp.ok) {
    const err = resp.error || resp.body?.slice(0, 240) || `HTTP ${resp.status}`;
    throw new Error(`${ep.providerId}/${ep.model}: ${err}`);
  }

  const parsed = JSON.parse(resp.body) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error(`${ep.providerId}/${ep.model}: empty response`);
  return text;
}

export async function generateWithSlm(
  role: SlmRole,
  systemPrompt: string,
  userPrompt: string,
  options?: { preferModel?: string; providerMode?: 'auto' | 'ollama' | 'cloud' },
): Promise<SlmGenerateResult> {
  const endpoints = endpointsForRole(role, options?.providerMode || 'auto');
  const ordered = options?.preferModel
    ? [...endpoints].sort((a, b) => Number(b.model === options.preferModel) - Number(a.model === options.preferModel))
    : endpoints;

  const errors: string[] = [];
  for (const ep of ordered) {
    try {
      const text = await callEndpoint(ep, systemPrompt, userPrompt, true);
      return { text, providerId: ep.providerId, model: ep.model };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    `Không gọi được SLM cho vai trò ${role}. Hãy khởi động Ollama (127.0.0.1:11434) hoặc cấu hình API key Groq/OpenRouter. Chi tiết: ${errors.slice(0, 3).join(' | ')}`,
  );
}
