/**
 * Ollama Provider Adapter
 *
 * Handles communication with local Ollama instance.
 */

import type { ProviderAdapter, ProviderConfig, ChatRequest, ChatResponse, StreamChunk, ToolCall } from './types'
import { PROVIDERS } from './registry'

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
}

interface OllamaToolCall {
  id?: string
  function: {
    name: string
    arguments: Record<string, unknown> | string
  }
}

interface OllamaStreamResponse {
  message?: {
    role: string
    content: string
    tool_calls?: OllamaToolCall[]
  }
  done: boolean
}

function normalizeToolCalls(ollamaToolCalls: OllamaToolCall[] | undefined): ToolCall[] {
  if (!ollamaToolCalls) return []

  return ollamaToolCalls.map((tc, i) => ({
    id: tc.id || `tool-${i}`,
    type: 'function' as const,
    function: {
      name: tc.function.name,
      arguments:
        typeof tc.function.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function.arguments),
    },
  }))
}

export const ollamaAdapter: ProviderAdapter = {
  id: 'ollama',

  async chat(request: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const provider = PROVIDERS.ollama
    const baseUrl = config.baseUrl || provider.baseUrl
    const url = `${baseUrl}/api/chat`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        tools: request.tools,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errMsg = error.error || `API error: ${response.status}`
      if (response.status === 404 || errMsg.includes('not found')) {
        throw new Error(`${errMsg}. Please ensure Ollama is running and run "ollama pull ${config.model}" in your terminal.`)
      }
      throw new Error(errMsg)
    }

    const data = await response.json()
    const message = data.message

    return {
      content: message.content || null,
      toolCalls: normalizeToolCalls(message.tool_calls),
      finishReason: message.tool_calls?.length ? 'tool_calls' : 'stop',
    }
  },

  async chatStream(
    request: ChatRequest,
    config: ProviderConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
    const provider = PROVIDERS.ollama
    const baseUrl = config.baseUrl || provider.baseUrl
    const url = `${baseUrl}/api/chat`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        tools: request.tools,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errMsg = error.error || `API error: ${response.status}`
      if (response.status === 404 || errMsg.includes('not found')) {
        throw new Error(`${errMsg}. Please ensure Ollama is running and run "ollama pull ${config.model}" in your terminal.`)
      }
      throw new Error(errMsg)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let toolCalls: ToolCall[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const parsed: OllamaStreamResponse = JSON.parse(trimmed)

          if (parsed.message?.content) {
            fullContent += parsed.message.content
            onChunk({ content: parsed.message.content, done: false })
          }

          // Ollama sends tool_calls in a single chunk (not streamed incrementally)
          if (parsed.message?.tool_calls) {
            toolCalls = normalizeToolCalls(parsed.message.tool_calls)
          }

          if (parsed.done) {
            onChunk({ done: true, toolCalls: toolCalls.length > 0 ? toolCalls : undefined })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return {
      content: fullContent || null,
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    }
  },

  async testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const provider = PROVIDERS.ollama
      const baseUrl = config.baseUrl || provider.baseUrl
      const url = `${baseUrl}/api/tags`

      const response = await fetch(url)

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` }
      }

      const data = await response.json()

      // Check if the configured model is available
      const models = data.models || []
      const hasModel = models.some(
        (m: { name: string }) => m.name === config.model || m.name.startsWith(`${config.model}:`),
      )

      if (!hasModel && config.model) {
        return {
          ok: true,
          error: `Model "${config.model}" not found. Available: ${models.map((m: { name: string }) => m.name).join(', ')}`,
        }
      }

      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Connection failed. Is Ollama running?',
      }
    }
  },
}
