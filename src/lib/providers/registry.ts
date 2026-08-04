/**
 * Provider Registry
 *
 * Central registry of available model providers and their presets.
 */

import type { ProviderDefinition, ProviderId, ModelPreset, ProviderConfig } from './types'

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run models locally on your machine',
    requiresApiKey: false,
    baseUrl: 'http://localhost:11434',
    icon: 'cpu',
    models: [
      {
        id: 'gemma4',
        name: 'Gemma 4',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: false,
        description: 'Google Gemma 4 local model',
      },
      {
        id: 'llama3-groq-tool-use',
        name: 'Llama 3 Groq Tool Use',
        contextWindow: 8192,
        supportsTools: true,
        supportsVision: false,
        description: 'Best for function calling',
      },
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: false,
        description: 'General purpose, fast',
      },
      {
        id: 'qwen2.5-coder',
        name: 'Qwen 2.5 Coder',
        contextWindow: 32768,
        supportsTools: true,
        supportsVision: false,
        description: 'Optimized for code',
      },
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        contextWindow: 32768,
        supportsTools: true,
        supportsVision: false,
        description: 'Reasoning model',
      },
      {
        id: 'llava',
        name: 'LLaVA',
        contextWindow: 4096,
        supportsTools: false,
        supportsVision: true,
        description: 'Vision model',
      },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models via OpenAI API',
    requiresApiKey: true,
    baseUrl: 'https://api.openai.com/v1',
    icon: 'cloud',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: true,
        description: 'Most capable',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: true,
        description: 'Fast and affordable',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: true,
        description: 'Previous generation',
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models via Anthropic API',
    requiresApiKey: true,
    baseUrl: 'https://api.anthropic.com/v1',
    icon: 'sparkles',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
        description: 'Best balance of speed and capability',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
        description: 'Fastest',
      },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference',
    requiresApiKey: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    icon: 'zap',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: false,
        description: 'Most capable on Groq',
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        contextWindow: 128000,
        supportsTools: true,
        supportsVision: false,
        description: 'Ultra fast',
      },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini models via Google AI API',
    requiresApiKey: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    icon: 'sparkles',
    models: [
      {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        description: 'Pro-grade reasoning at Flash speed',
      },
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        description: 'Most capable reasoning model',
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        description: 'Fast and efficient',
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        description: 'Previous generation flagship',
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        description: 'Lightweight and ultra-fast',
      },
    ],
  },
}

export const PROVIDER_LIST = Object.values(PROVIDERS)

export function getProvider(id: ProviderId): ProviderDefinition | undefined {
  return PROVIDERS[id]
}

export function getModel(providerId: ProviderId, modelId: string): ModelPreset | undefined {
  return PROVIDERS[providerId]?.models.find((m) => m.id === modelId)
}

export function getDefaultModel(providerId: ProviderId): ModelPreset | undefined {
  return PROVIDERS[providerId]?.models[0]
}

const DEFAULT_PROVIDER: ProviderId = 'ollama'
const DEFAULT_MODEL = 'gemma4'

export function getDefaultConfig(): ProviderConfig {
  // Check localStorage for user's preferred default
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('filegraph-default-model')
    if (saved) {
      try {
        const { provider, model } = JSON.parse(saved)
        if (PROVIDERS[provider as ProviderId]?.models.some((m) => m.id === model)) {
          return { provider, model }
        }
      } catch {}
    }
  }
  return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL }
}

export function setDefaultConfig(config: ProviderConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('filegraph-default-model', JSON.stringify(config))
  }
}

export function clearDefaultConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('filegraph-default-model')
  }
}

/**
 * Get recommended models that support function calling
 */
export function getToolCapableModels(): Array<{ provider: ProviderDefinition; model: ModelPreset }> {
  const results: Array<{ provider: ProviderDefinition; model: ModelPreset }> = []

  for (const provider of PROVIDER_LIST) {
    for (const model of provider.models) {
      if (model.supportsTools) {
        results.push({ provider, model })
      }
    }
  }

  return results
}
