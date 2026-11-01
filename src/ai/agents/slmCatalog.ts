/** Local TinyLLM allowlist for the IPI document pipeline. */

export type SlmRole = 'fix' | 'check';
export type SlmProviderMode = 'ollama';

export interface SlmEndpoint {
  providerId: 'ollama';
  url: string;
  model: string;
  roles: SlmRole[];
  maxParamsB: number;
  // Chỉ dùng khi người dùng chọn rõ; không thêm vào chuỗi fallback mặc định.
  explicitSelectionOnly?: boolean;
}

const BLOCKED_MODEL_RE = /70b|72b|65b|34b|32b|27b|13b|11b|gemini|gpt-4|claude|opus|sonnet|pro/i;

export const SLM_ENDPOINTS: SlmEndpoint[] = [
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'gemma3:1b',
    roles: ['fix', 'check'],
    maxParamsB: 1,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen2.5-coder:1.5b',
    roles: ['check', 'fix'],
    maxParamsB: 1.5,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen2.5:1.5b-instruct',
    roles: ['check', 'fix'],
    maxParamsB: 1.5,
    explicitSelectionOnly: true,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen3:4b-instruct-2507-q4_K_M',
    roles: ['fix', 'check'],
    maxParamsB: 4,
    // Người dùng đã cho phép đối chứng cả hai vai trò khi chọn rõ; không vào fallback.
    explicitSelectionOnly: true,
  },
];

export function assertSlmModel(model: string): void {
  if (BLOCKED_MODEL_RE.test(model) || /[1-9]\d{2,}b/i.test(model)) {
    throw new Error(`Model "${model}" is not an SLM — IPI pipeline only allows small models (<= 9B).`);
  }
}

export function endpointsForRole(role: SlmRole, mode: SlmProviderMode = 'ollama', selectedModel?: string): SlmEndpoint[] {
  void mode;
  if (selectedModel !== undefined) {
    assertSlmModel(selectedModel);
    const selected = SLM_ENDPOINTS.filter(ep => ep.model === selectedModel && ep.roles.includes(role) && ep.maxParamsB <= 4);
    if (!selected.length) throw new Error(`Model được chọn "${selectedModel}" chưa được hỗ trợ cho vai trò ${role}; không tự đổi sang model khác.`);
    return selected;
  }
  return SLM_ENDPOINTS
    .filter((ep) => !ep.explicitSelectionOnly && ep.roles.includes(role) && ep.maxParamsB <= 1.5)
    .sort((a, b) => Number(a.roles[0] !== role) - Number(b.roles[0] !== role));
}
