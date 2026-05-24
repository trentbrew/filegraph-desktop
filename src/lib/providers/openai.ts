/**
 * OpenAI Provider Adapter
 *
 * Handles communication with OpenAI's Chat Completions API.
 * Also compatible with OpenAI-compatible APIs (Groq, Together, etc.)
 */

import type {
  ProviderAdapter,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ToolCall,
  ChatMessage,
} from './types'
import { PROVIDERS } from './registry'

/**
 * Convert ChatMessages to OpenAI format, handling image attachments for vision
 */
function convertMessagesToOpenAI(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map((msg) => {
    // Handle user messages with image attachments (vision)
    if (msg.role === 'user' && msg.attachments?.length) {
      const parts: OpenAIContentPart[] = []

      // Add text content first
      if (msg.content) {
        parts.push({ type: 'text', text: msg.content })
      }

      // Add image attachments
      for (const attachment of msg.attachments) {
        if (attachment.type.startsWith('image/')) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.type};base64,${attachment.data}`,
              detail: 'auto',
            },
          })
        }
      }

      // If we have parts, return multimodal format
      if (parts.length > 0) {
        return {
          role: msg.role,
          content: parts,
        }
      }
    }

    // Standard message format
    return {
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id,
    }
  })
}

interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null | OpenAIContentPart[]
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface OpenAIStreamDelta {
  role?: string
  content?: string | null
  tool_calls?: Array<{
    index: number
    id?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
}

interface OpenAIStreamChoice {
  index: number
  delta: OpenAIStreamDelta
  finish_reason: string | null
}

export const openaiAdapter: ProviderAdapter = {
  id: 'openai',

  async chat(request: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const provider = PROVIDERS[config.provider]
    const baseUrl = config.baseUrl || provider?.baseUrl || 'https://api.openai.com/v1'
    const url = `${baseUrl}/chat/completions`

    // Convert messages to OpenAI format (handles image attachments for vision)
    const messages = convertMessagesToOpenAI(request.messages)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools: request.tools,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    const message = data.choices[0].message

    return {
      content: message.content,
      toolCalls: message.tool_calls || [],
      finishReason: data.choices[0].finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    }
  },

  async chatStream(
    request: ChatRequest,
    config: ProviderConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
    const provider = PROVIDERS[config.provider]
    const baseUrl = config.baseUrl || provider?.baseUrl || 'https://api.openai.com/v1'
    const url = `${baseUrl}/chat/completions`

    // Convert messages to OpenAI format (handles image attachments for vision)
    const messages = convertMessagesToOpenAI(request.messages)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools: request.tools,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    const toolCalls: Map<number, ToolCall> = new Map()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const choice: OpenAIStreamChoice = parsed.choices?.[0]
          if (!choice) continue

          // Handle text content
          if (choice.delta.content) {
            fullContent += choice.delta.content
            onChunk({ content: choice.delta.content, done: false })
          }

          // Handle tool calls (streamed incrementally)
          if (choice.delta.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const existing = toolCalls.get(tc.index)
              if (existing) {
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments
                }
              } else {
                toolCalls.set(tc.index, {
                  id: tc.id || '',
                  type: 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  },
                })
              }
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    const finalToolCalls = Array.from(toolCalls.values())
    onChunk({ done: true, toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined })

    return {
      content: fullContent || null,
      toolCalls: finalToolCalls,
      finishReason: finalToolCalls.length > 0 ? 'tool_calls' : 'stop',
    }
  },

  async testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const provider = PROVIDERS[config.provider]
      const baseUrl = config.baseUrl || provider?.baseUrl || 'https://api.openai.com/v1'
      const url = `${baseUrl}/models`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { ok: false, error: error.error?.message || `HTTP ${response.status}` }
      }

      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
    }
  },
}
