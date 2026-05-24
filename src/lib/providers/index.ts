/**
 * Model Providers Module
 *
 * Unified interface for multiple LLM providers.
 */

export * from './types'
export {
  PROVIDERS,
  PROVIDER_LIST,
  getProvider,
  getModel,
  getDefaultModel,
  getDefaultConfig,
  setDefaultConfig,
  clearDefaultConfig,
  getToolCapableModels,
} from './registry'

import type { ProviderAdapter, ProviderId } from './types'
import { openaiAdapter } from './openai'
import { ollamaAdapter } from './ollama'
import { geminiAdapter } from './gemini'

const adapters: Record<ProviderId, ProviderAdapter> = {
  openai: openaiAdapter,
  ollama: ollamaAdapter,
  anthropic: openaiAdapter, // Anthropic has a different API, but we can add it later
  groq: openaiAdapter, // Groq is OpenAI-compatible
  gemini: geminiAdapter,
}

export function getAdapter(provider: ProviderId): ProviderAdapter {
  const adapter = adapters[provider]
  if (!adapter) {
    throw new Error(`Unknown provider: ${provider}`)
  }
  return adapter
}

export { openaiAdapter } from './openai'
export { ollamaAdapter } from './ollama'
export { geminiAdapter } from './gemini'
