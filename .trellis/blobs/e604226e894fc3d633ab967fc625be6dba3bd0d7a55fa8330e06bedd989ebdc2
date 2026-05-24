/**
 * Model Provider Types
 *
 * Unified type definitions for multi-provider LLM support.
 */

export type ProviderId = 'openai' | 'ollama' | 'anthropic' | 'groq' | 'gemini'

export interface ModelPreset {
  id: string
  name: string
  contextWindow: number
  supportsTools: boolean
  supportsVision: boolean
  description?: string
}

export interface ProviderDefinition {
  id: ProviderId
  name: string
  description: string
  requiresApiKey: boolean
  baseUrl: string
  models: ModelPreset[]
  icon?: string
}

export interface ProviderConfig {
  provider: ProviderId
  model: string
  apiKey?: string
  baseUrl?: string // Custom endpoint override
}

export interface ChatMessageAttachment {
  type: string // MIME type (e.g., 'image/png', 'image/jpeg')
  data: string // Base64 encoded data
  name?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  attachments?: ChatMessageAttachment[] // For multimodal content
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
  /** Gemini 3 models require thoughtSignature to be preserved in conversation history */
  thoughtSignature?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatRequest {
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  stream?: boolean
}

// Gemini grounding metadata for web search citations
export interface GroundingChunk {
  web?: {
    uri: string
    title?: string
  }
}

export interface GroundingSupport {
  segment?: {
    startIndex?: number
    endIndex?: number
    text?: string
  }
  groundingChunkIndices?: number[]
  confidenceScores?: number[]
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[]
  groundingSupports?: GroundingSupport[]
  webSearchQueries?: string[]
  searchEntryPoint?: {
    renderedContent?: string
  }
}

export interface ChatResponse {
  content: string | null
  toolCalls: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
  groundingMetadata?: GroundingMetadata
}

export interface StreamChunk {
  content?: string
  toolCalls?: ToolCall[]
  done: boolean
  groundingMetadata?: GroundingMetadata
}

export interface ProviderAdapter {
  id: ProviderId

  /**
   * Send a chat completion request (non-streaming)
   */
  chat(request: ChatRequest, config: ProviderConfig): Promise<ChatResponse>

  /**
   * Send a streaming chat completion request
   */
  chatStream(
    request: ChatRequest,
    config: ProviderConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<ChatResponse>

  /**
   * Test if the provider is available/configured
   */
  testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }>
}
