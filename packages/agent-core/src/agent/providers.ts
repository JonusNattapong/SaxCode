export type ProviderType = 'anthropic' | 'kilocode' | 'ollama' | 'openai' | 'deepseek' | 'gemini';

export interface ProviderConfig {
  name: string;
  baseURL: string;
  defaultModel: string;
  apiKeyEnv: string;
  isCustomStatus?: boolean; // For local/custom providers
}

export const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  kilocode: {
    name: 'KiloCode',
    baseURL: 'https://api.kilocode.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyEnv: 'KILOCODE_API_KEY'
  },
  ollama: {
    name: 'Ollama',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5-coder:7b',
    apiKeyEnv: '' // Not needed for local
  },
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY'
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-pro',
    apiKeyEnv: 'GEMINI_API_KEY'
  }
};
