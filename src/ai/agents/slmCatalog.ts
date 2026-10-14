/**
 * Allowlist SLM cho pipeline IPI.
 * Chỉ model <= ~9B. Cấm 70B / Gemini Pro-class.
 */

export type SlmRole = 'fix' | 'check';
export type SlmProviderMode = 'auto' | 'ollama' | 'cloud';

export interface SlmEndpoint {
  providerId: 'groq' | 'openrouter' | 'together' | 'huggingface' | 'ollama';
  url: string;
  model: string;
  roles: SlmRole[];
  maxParamsB: number;
}

const BLOCKED_MODEL_RE = /70b|72b|65b|34b|32b|27b|13b|11b|gemini|gpt-4|claude|opus|sonnet|pro/i;

export const SLM_ENDPOINTS: SlmEndpoint[] = [
  {
    providerId: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    roles: ['fix', 'check'],
    maxParamsB: 8,
  },
  {
    providerId: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'gemma2-9b-it',
    roles: ['check', 'fix'],
    maxParamsB: 9,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'llama3.1:8b',
    roles: ['fix', 'check'],
    maxParamsB: 8,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'gemma2:9b',
    roles: ['check', 'fix'],
    maxParamsB: 9,
  },
  {
    providerId: 'ollama',
    url: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen2.5:7b',
    roles: ['fix', 'check'],
    maxParamsB: 7,
  },
  {
    providerId: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    roles: ['fix', 'check'],
    maxParamsB: 8,
  },
  {
    providerId: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'mistralai/mistral-7b-instruct:free',
    roles: ['check', 'fix'],
    maxParamsB: 7,
  },
  {
    providerId: 'together',
    url: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo-Free',
    roles: ['fix', 'check'],
    maxParamsB: 8,
  },
  {
    providerId: 'huggingface',
    url: 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    roles: ['fix', 'check'],
    maxParamsB: 8,
  },
];

export function assertSlmModel(model: string): void {
  if (BLOCKED_MODEL_RE.test(model) || /[1-9]\d{2,}b/i.test(model)) {
    throw new Error(`Model "${model}" không phải SLM — pipeline IPI chỉ dùng model nhỏ (<= 9B).`);
  }
}

export function endpointsForRole(role: SlmRole, mode: SlmProviderMode = 'auto'): SlmEndpoint[] {
  let list = SLM_ENDPOINTS.filter((ep) => ep.roles.includes(role) && ep.maxParamsB <= 9);

  if (mode === 'ollama') {
    list = [
      ...list.filter((ep) => ep.providerId === 'ollama'),
      ...list.filter((ep) => ep.providerId !== 'ollama'),
    ];
  } else if (mode === 'cloud') {
    list = list.filter((ep) => ep.providerId !== 'ollama');
  }

  return list.sort((a, b) => {
    // If mode is ollama, prioritize ollama
    if (mode === 'ollama') {
      if (a.providerId === 'ollama' && b.providerId !== 'ollama') return -1;
      if (b.providerId === 'ollama' && a.providerId !== 'ollama') return 1;
    }
    return Number(a.roles[0] !== role) - Number(b.roles[0] !== role);
  });
}
