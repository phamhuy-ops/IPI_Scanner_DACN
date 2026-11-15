/** Local TinyLLM allowlist for the IPI document pipeline. */

export type SlmRole = 'fix' | 'check';
export type SlmProviderMode = 'ollama';

export interface SlmEndpoint {
  providerId: 'ollama';
  url: string;
  model: string;
  roles: SlmRole[];
  maxParamsB: number;
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
];

export function assertSlmModel(model: string): void {
  if (BLOCKED_MODEL_RE.test(model) || /[1-9]\d{2,}b/i.test(model)) {
    throw new Error(`Model "${model}" is not an SLM — IPI pipeline only allows small models (<= 9B).`);
  }
}

export function endpointsForRole(role: SlmRole, mode: SlmProviderMode = 'ollama'): SlmEndpoint[] {
  void mode;
  return SLM_ENDPOINTS
    .filter((ep) => ep.roles.includes(role) && ep.maxParamsB <= 1.5)
    .sort((a, b) => Number(a.roles[0] !== role) - Number(b.roles[0] !== role));
}
