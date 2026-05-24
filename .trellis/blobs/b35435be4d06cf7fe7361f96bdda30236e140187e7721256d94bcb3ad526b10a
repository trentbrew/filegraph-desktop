/**
 * Gemini Provider Adapter
 *
 * Handles communication with Google's Generative AI API.
 * Gemini uses a different API format than OpenAI.
 */

import type {
  ProviderAdapter,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ToolCall,
  ChatMessage,
  ToolDefinition,
  GroundingMetadata,
} from './types'
import { PROVIDERS } from './registry'

function flattenSystemIntoUserMessages(messages: ChatMessage[]): ChatMessage[] {
  const systemText = messages
    .filter((m) => m.role === 'system' && m.content)
    .map((m) => m.content)
    .join('\n\n')

  const nonSystem = messages.filter((m) => m.role !== 'system')
  if (!systemText.trim()) return nonSystem

  const out: ChatMessage[] = []
  let injected = false

  for (const msg of nonSystem) {
    if (!injected && msg.role === 'user') {
      out.push({
        ...msg,
        content: `${systemText}\n\n${msg.content || ''}`.trim(),
      })
      injected = true
    } else {
      out.push(msg)
    }
  }

  if (!injected) {
    out.unshift({ role: 'user', content: systemText })
  }

  return out
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiFunctionCall {
  name: string
  args: Record<string, unknown>
}

interface GeminiInlineData {
  mimeType: string
  data: string // Base64 encoded
}

interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: GeminiFunctionResponse
  thoughtSignature?: string
  inlineData?: GeminiInlineData // For images/files
}

interface GeminiFunctionResponse {
  name: string
  response: Record<string, unknown>
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
  }>
}

function convertMessagesToGemini(messages: ChatMessage[]): {
  contents: GeminiContent[]
  systemInstruction?: { parts: Array<{ text: string }> }
} {
  const contents: GeminiContent[] = []
  let systemInstruction: { parts: Array<{ text: string }> } | undefined

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content || '' }] }
    } else if (msg.role === 'user') {
      // Build parts array - text first, then any image attachments
      const parts: GeminiPart[] = []

      // Add text content if present
      if (msg.content) {
        parts.push({ text: msg.content })
      }

      // Add image attachments as inlineData parts
      if (msg.attachments?.length) {
        for (const attachment of msg.attachments) {
          // Only include image types for vision
          if (attachment.type.startsWith('image/')) {
            parts.push({
              inlineData: {
                mimeType: attachment.type,
                data: attachment.data,
              },
            })
          }
        }
      }

      // Ensure we have at least one part
      if (parts.length === 0) {
        parts.push({ text: '' })
      }

      contents.push({ role: 'user', parts })
    } else if (msg.role === 'assistant') {
      if (msg.tool_calls?.length) {
        contents.push({
          role: 'model',
          parts: msg.tool_calls.map((tc, idx) => {
            const part: GeminiPart = {
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments),
              },
            }
            // Include thoughtSignature if present (required for Gemini 3 models)
            // Only the first function call in parallel calls has the signature
            if (idx === 0 && tc.thoughtSignature) {
              part.thoughtSignature = tc.thoughtSignature
            }
            return part
          }),
        })
      } else {
        contents.push({ role: 'model', parts: [{ text: msg.content || '' }] })
      }
    } else if (msg.role === 'tool') {
      // Find the tool call this responds to
      const toolCallId = msg.tool_call_id
      const toolName =
        messages
          .find((m) => m.role === 'assistant' && m.tool_calls?.some((tc) => tc.id === toolCallId))
          ?.tool_calls?.find((tc) => tc.id === toolCallId)?.function.name || 'unknown'

      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: JSON.parse(msg.content || '{}'),
            },
          },
        ],
      })
    }
  }

  return { contents, systemInstruction }
}

/**
 * Convert OpenAI-style JSON schema to Gemini-compatible format.
 * Gemini uses uppercase type names and doesn't support union types.
 */
function convertSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema

  // Gemini doesn't support union types. We do a best-effort mapping:
  // - If the union is nullable (e.g. ['object','null']), strip null and keep the remaining type.
  // - If multiple non-null types remain, fall back to STRING and DROP incompatible keywords.
  let rawType = schema.type as string | string[] | undefined
  let normalized: string | undefined
  let isNullable = false

  if (Array.isArray(rawType)) {
    isNullable = rawType.includes('null')
    const nonNull = rawType.filter((t) => t !== 'null')
    if (nonNull.length === 1) normalized = nonNull[0]
    else normalized = undefined
  } else {
    normalized = rawType
  }

  let type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY' = 'STRING'
  if (normalized === 'string') type = 'STRING'
  else if (normalized === 'number' || normalized === 'integer') type = 'NUMBER'
  else if (normalized === 'boolean') type = 'BOOLEAN'
  else if (normalized === 'object') type = 'OBJECT'
  else if (normalized === 'array') type = 'ARRAY'

  const result: Record<string, unknown> = { type }
  if (isNullable) result.nullable = true
  if (schema.description) result.description = schema.description
  if (schema.enum) result.enum = schema.enum

  // Only OBJECT schemas may define properties/required in Gemini.
  if (type === 'OBJECT') {
    if (schema.properties) {
      result.properties = {}
      for (const [key, val] of Object.entries(schema.properties as Record<string, unknown>)) {
        ;(result.properties as Record<string, unknown>)[key] = convertSchemaToGemini(val as Record<string, unknown>)
      }
    }
    if (schema.required) result.required = schema.required
  }

  // Only ARRAY schemas may define items in Gemini.
  if (type === 'ARRAY') {
    if (schema.items) result.items = convertSchemaToGemini(schema.items as Record<string, unknown>)
  }

  return result
}

function convertToolsToGemini(
  tools?: ToolDefinition[],
  enableGoogleSearch?: boolean,
): Array<GeminiTool | { googleSearch: Record<string, never> }> | undefined {
  const geminiTools: Array<GeminiTool | { googleSearch: Record<string, never> }> = []

  // Add function declarations if provided
  if (tools?.length) {
    geminiTools.push({
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: convertSchemaToGemini(t.function.parameters),
      })),
    })
  }

  // Add Google Search grounding if enabled
  if (enableGoogleSearch) {
    geminiTools.push({ googleSearch: {} })
  }

  return geminiTools.length > 0 ? geminiTools : undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Malformed Python-style function call recovery
// ─────────────────────────────────────────────────────────────────────────────
// Gemini sometimes generates `print(default_api.func_name(kwarg=val, ...))`
// instead of JSON functionCall format. The arguments are correct, just in
// Python syntax. These helpers parse the Python call and convert to a ToolCall.

/**
 * Scan forward from `openPos` (which must point at `(` or `[`) to find
 * the matching closing bracket. Respects string literals and nesting.
 */
function findMatchingBracket(text: string, openPos: number): number {
  const open = text[openPos]
  const close = open === '(' ? ')' : ']'
  let depth = 1
  let i = openPos + 1

  while (i < text.length && depth > 0) {
    const ch = text[i]

    // Triple-quoted strings (''' or """)
    if (text.slice(i, i + 3) === "'''" || text.slice(i, i + 3) === '"""') {
      const q3 = text.slice(i, i + 3)
      i += 3
      while (i < text.length && text.slice(i, i + 3) !== q3) i++
      i += 3
      continue
    }

    // Regular strings
    if (ch === '"' || ch === "'") {
      const q = ch
      i++
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
          continue
        }
        if (text[i] === q) {
          i++
          break
        }
        i++
      }
      continue
    }

    if (ch === '(' || ch === '[') depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return i
    } else if ((ch === ')' || ch === ']') && ch !== close) {
      depth--
    }
    i++
  }
  return -1
}

/**
 * Split `text` on `delimiter` at the top level only
 * (not inside strings, parens, or brackets).
 */
function splitTopLevel(text: string, delimiter: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let i = 0

  while (i < text.length) {
    // Triple-quoted strings
    if (text.slice(i, i + 3) === "'''" || text.slice(i, i + 3) === '"""') {
      const q3 = text.slice(i, i + 3)
      current += q3
      i += 3
      while (i < text.length && text.slice(i, i + 3) !== q3) {
        current += text[i]
        i++
      }
      if (i < text.length) {
        current += q3
        i += 3
      }
      continue
    }

    // Regular strings
    if ((text[i] === '"' || text[i] === "'") && depth === 0) {
      const q = text[i]
      current += q
      i++
      while (i < text.length) {
        current += text[i]
        if (text[i] === '\\') {
          i++
          if (i < text.length) current += text[i]
          i++
          continue
        }
        if (text[i] === q) {
          i++
          break
        }
        i++
      }
      continue
    }

    if (text[i] === '(' || text[i] === '[') {
      depth++
      current += text[i]
      i++
      continue
    }
    if (text[i] === ')' || text[i] === ']') {
      depth--
      current += text[i]
      i++
      continue
    }

    if (depth === 0 && text[i] === delimiter) {
      parts.push(current)
      current = ''
      i++
      continue
    }

    current += text[i]
    i++
  }

  if (current.trim()) parts.push(current)
  return parts
}

/**
 * Find the first occurrence of `char` at the top level (depth 0),
 * respecting strings and brackets. Returns -1 if not found.
 */
function findTopLevelChar(text: string, char: string): number {
  let depth = 0
  let i = 0

  while (i < text.length) {
    // Triple-quoted strings
    if (text.slice(i, i + 3) === "'''" || text.slice(i, i + 3) === '"""') {
      const q3 = text.slice(i, i + 3)
      i += 3
      while (i < text.length && text.slice(i, i + 3) !== q3) i++
      i += 3
      continue
    }

    // Regular strings
    if (text[i] === '"' || text[i] === "'") {
      const q = text[i]
      i++
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
          continue
        }
        if (text[i] === q) {
          i++
          break
        }
        i++
      }
      continue
    }

    if (text[i] === '(' || text[i] === '[') depth++
    else if (text[i] === ')' || text[i] === ']') depth--
    else if (depth === 0 && text[i] === char) return i

    i++
  }
  return -1
}

/** Parse a Python value literal into a JS value. */
function parsePythonValue(raw: string): unknown {
  const v = raw.trim()
  if (v === 'None') return null
  if (v === 'True') return true
  if (v === 'False') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)

  // Triple-quoted string
  if (v.startsWith("'''") && v.endsWith("'''")) return v.slice(3, -3)
  if (v.startsWith('"""') && v.endsWith('"""')) return v.slice(3, -3)

  // Regular string
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
  }

  // Array
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim()
    if (!inner) return []
    return splitTopLevel(inner, ',')
      .map((el) => parsePythonValue(el.trim()))
      .filter((x) => x !== undefined)
  }

  // Nested object: default_api.ClassName(kwargs) or ClassName(kwargs)
  const objMatch = v.match(/^(?:default_api\.)?\w+\(/)
  if (objMatch) {
    const parenPos = v.indexOf('(')
    const closePos = findMatchingBracket(v, parenPos)
    if (closePos > 0) {
      const innerKwargs = v.slice(parenPos + 1, closePos).trim()
      return parsePythonKwargs(innerKwargs)
    }
  }

  // Fallback: return as-is string
  return v
}

/** Parse `key=val, key2=val2, ...` into a Record. */
function parsePythonKwargs(argsStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const parts = splitTopLevel(argsStr, ',')

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const eqPos = findTopLevelChar(trimmed, '=')
    if (eqPos < 0) continue

    const key = trimmed.slice(0, eqPos).trim()
    const valueStr = trimmed.slice(eqPos + 1).trim()
    result[key] = parsePythonValue(valueStr)
  }

  return result
}

/**
 * Attempt to recover a valid ToolCall from Gemini's malformed Python-style
 * function call.  Returns null if parsing fails.
 */
function recoverMalformedToolCall(finishMessage: string): ToolCall | null {
  try {
    // Strip "Malformed function call: " prefix
    let text = finishMessage.replace(/^Malformed function call:\s*/i, '').trim()

    // Strip outer print(...)
    if (text.startsWith('print(') && text.endsWith(')')) {
      text = text.slice(6, -1).trim()
    }

    // Extract function name: default_api.function_name( or function_name(
    const funcMatch = text.match(/^(?:default_api\.)?(\w+)\(/)
    if (!funcMatch) return null

    const funcName = funcMatch[1]
    const parenPos = text.indexOf('(')
    const closePos = findMatchingBracket(text, parenPos)
    if (closePos < 0) return null

    const argsStr = text.slice(parenPos + 1, closePos).trim()
    const args = argsStr ? parsePythonKwargs(argsStr) : {}

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Gemini] Recovered malformed Python call →', funcName, Object.keys(args))
    }

    return {
      id: 'gemini-recovered-0',
      type: 'function',
      function: {
        name: funcName,
        arguments: JSON.stringify(args),
      },
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Gemini] Failed to recover malformed call:', err)
    }
    return null
  }
}

function extractToolCalls(
  candidate: {
    content?: { parts?: Array<{ functionCall?: GeminiFunctionCall; text?: string; thoughtSignature?: string }> }
  },
  toolsEnabled: boolean,
): ToolCall[] {
  if (!toolsEnabled) return []
  const parts = candidate.content?.parts || []
  const toolCalls: ToolCall[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.functionCall) {
      toolCalls.push({
        id: `gemini-tool-${i}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args),
        },
        // Capture thoughtSignature for Gemini 3 models (only on first function call)
        thoughtSignature: part.thoughtSignature,
      })
    }
  }

  return toolCalls
}

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',

  async chat(request: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const provider = PROVIDERS.gemini
    const baseUrl = config.baseUrl || provider.baseUrl
    const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`

    const { contents, systemInstruction } = convertMessagesToGemini(request.messages)
    const tools = convertToolsToGemini(request.tools)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        tools,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]

    // Check for MALFORMED_FUNCTION_CALL before extracting parts
    if (candidate?.finishReason === 'MALFORMED_FUNCTION_CALL') {
      const detail = candidate.finishMessage || 'unknown'
      console.warn('[Gemini] chat() MALFORMED_FUNCTION_CALL:', detail)

      // Try to recover the tool call from the Python-style syntax
      const recovered = recoverMalformedToolCall(detail)
      if (recovered) {
        return {
          content: null,
          toolCalls: [recovered],
          finishReason: 'tool_calls',
        }
      }

      return {
        content: null,
        toolCalls: [],
        finishReason: 'error',
      }
    }

    const parts = candidate?.content?.parts || []

    const textContent = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join('')
    const toolCalls = extractToolCalls(candidate, !!request.tools?.length)

    return {
      content: textContent || null,
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    }
  },

  async chatStream(
    request: ChatRequest,
    config: ProviderConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
    const provider = PROVIDERS.gemini
    const baseUrl = config.baseUrl || provider.baseUrl
    const url = `${baseUrl}/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`

    const { contents, systemInstruction } = convertMessagesToGemini(request.messages)
    const tools = convertToolsToGemini(request.tools)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        tools,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    // Debug: Log request details for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Gemini] Streaming request:', {
        model: config.model,
        messageCount: contents.length,
        hasSystemInstruction: !!systemInstruction,
        toolCount:
          (tools?.find((t): t is GeminiTool => 'functionDeclarations' in t) as GeminiTool | undefined)
            ?.functionDeclarations?.length || 0,
      })
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let toolCalls: ToolCall[] = []
    let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop'
    let safetyBlocked = false
    let lastError: string | null = null
    let streamedAnyText = false
    let chunkCount = 0
    let dataLineCount = 0
    let parsedCount = 0
    let groundingMetadata: GroundingMetadata | undefined

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunkCount++
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        dataLineCount++
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          parsedCount++

          // Check for errors in the response
          if (parsed.error) {
            lastError = parsed.error.message || JSON.stringify(parsed.error)
            console.warn('[Gemini] API error in stream:', parsed.error)
            continue
          }

          const candidate = parsed.candidates?.[0]

          // If no candidate, check for promptFeedback (indicates blocking at prompt level)
          if (!candidate && parsed.promptFeedback) {
            const feedback = parsed.promptFeedback
            if (feedback.blockReason) {
              safetyBlocked = true
              finishReason = feedback.blockReason
              console.warn('[Gemini] Prompt blocked:', feedback.blockReason, feedback.safetyRatings)
            }
            continue
          }

          // If no candidate at all, skip this chunk
          if (!candidate) {
            continue
          }

          // Check if content was blocked
          if (candidate.finishReason) {
            // Map Gemini's finishReason to our expected types
            const reason = candidate.finishReason
            if (reason === 'STOP') {
              finishReason = 'stop'
            } else if (reason === 'MAX_TOKENS' || reason === 'LENGTH') {
              finishReason = 'length'
            } else if (reason === 'SAFETY' || reason === 'RECITATION') {
              finishReason = 'error'
              safetyBlocked = true
              console.warn('[Gemini] Content blocked:', reason, candidate.safetyRatings)
            } else if (reason === 'MALFORMED_FUNCTION_CALL') {
              finishReason = 'error'
              const detail = candidate.finishMessage || 'unknown'
              lastError = `MALFORMED_FUNCTION_CALL: ${detail}`
              console.warn('[Gemini] Malformed function call:', {
                finishReason: reason,
                index: candidate.index,
                finishMessage: detail,
              })
            }
          }

          // Check for safety ratings that might indicate blocking
          if (candidate.safetyRatings) {
            const blockedRatings = candidate.safetyRatings.filter((r: { blocked?: boolean }) => r.blocked === true)
            if (blockedRatings.length > 0) {
              safetyBlocked = true
              console.warn('[Gemini] Safety filter triggered:', blockedRatings)
            }
          }

          const parts = candidate?.content?.parts || []

          if (parts.length === 0 && candidate) {
            // Log when we have a candidate but no parts - this might indicate blocking or empty response
            console.debug('[Gemini] Candidate with no parts:', {
              finishReason: candidate.finishReason,
              safetyRatings: candidate.safetyRatings,
              index: candidate.index,
              hasContent: !!candidate.content,
            })
          }

          for (const part of parts) {
            if (part.text) {
              fullContent += part.text
              streamedAnyText = true
              onChunk({ content: part.text, done: false })
            }
            if (part.functionCall && !!request.tools?.length) {
              toolCalls.push({
                id: `gemini-tool-${toolCalls.length}`,
                type: 'function',
                function: {
                  name: part.functionCall.name,
                  arguments: JSON.stringify(part.functionCall.args),
                },
                // Capture thoughtSignature for Gemini 3 models
                thoughtSignature: part.thoughtSignature,
              })
            }
          }

          // Extract grounding metadata (web search citations) if present
          if (candidate.groundingMetadata) {
            groundingMetadata = candidate.groundingMetadata as GroundingMetadata
          }
        } catch (err) {
          // Log parsing errors for debugging
          const errorMsg = err instanceof Error ? err.message : String(err)
          if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
            // Only log JSON parsing errors, not other errors
            console.debug('[Gemini] Failed to parse SSE line:', errorMsg, 'Line:', line.substring(0, 100))
          }
        }
      }
    }

    // Debug: Log response details, especially for empty responses
    if (!fullContent && toolCalls.length === 0) {
      console.warn('[Gemini] Empty response received:', {
        model: config.model,
        finishReason,
        safetyBlocked,
        lastError,
        bufferLength: buffer.length,
        chunkCount,
        dataLineCount,
        parsedCount,
        finalBuffer: buffer.substring(0, 200), // First 200 chars of remaining buffer
      })
    } else if (process.env.NODE_ENV === 'development') {
      console.debug('[Gemini] Response complete:', {
        model: config.model,
        contentLength: fullContent.length,
        toolCallsCount: toolCalls.length,
        finishReason,
        chunkCount,
        dataLineCount,
        parsedCount,
      })
    }

    // Best-effort retry: Gemini streaming can occasionally return STOP with an empty candidate,
    // or MALFORMED_FUNCTION_CALL when it fails to generate valid tool call JSON.
    const isMalformedFunctionCall = lastError?.startsWith('MALFORMED_FUNCTION_CALL')

    // Try to recover a valid tool call from the Python-style syntax before retrying.
    if (isMalformedFunctionCall && lastError) {
      const malformedDetail = lastError.replace(/^MALFORMED_FUNCTION_CALL:\s*/, '')
      const recovered = recoverMalformedToolCall(malformedDetail)
      if (recovered) {
        console.warn('[Gemini] Recovered MALFORMED_FUNCTION_CALL via Python parser')
        toolCalls = [recovered]
        finishReason = 'stop'
        lastError = null
        onChunk({ done: true, toolCalls: [recovered] })
        return {
          content: fullContent || null,
          toolCalls: [recovered],
          finishReason: 'tool_calls',
          groundingMetadata,
        }
      }
    }

    const shouldRetry =
      !fullContent && toolCalls.length === 0 && !safetyBlocked && (!lastError || isMalformedFunctionCall)

    if (shouldRetry) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            isMalformedFunctionCall
              ? '[Gemini] Retrying MALFORMED_FUNCTION_CALL with non-stream chat()...'
              : '[Gemini] Retrying empty stream response with non-stream generateContent...',
          )
        }

        // First retry: same request with tools via non-stream chat().
        // For MALFORMED_FUNCTION_CALL, non-deterministic generation may succeed on retry.
        // If chat() also returns MALFORMED (finishReason: 'error'), it falls through.
        const retry = await geminiAdapter.chat({ ...request, stream: false }, config)
        if ((retry.content && retry.content.trim()) || (retry.toolCalls && retry.toolCalls.length > 0)) {
          if (retry.content) {
            onChunk({ content: retry.content, done: false })
          }
          onChunk({ done: true, toolCalls: retry.toolCalls?.length ? retry.toolCalls : undefined })
          return {
            content: retry.content,
            toolCalls: retry.toolCalls || [],
            finishReason: retry.finishReason,
          }
        }

        if (process.env.NODE_ENV === 'development' && isMalformedFunctionCall) {
          console.warn('[Gemini] Retry with tools also failed, falling back to no-tools...')
        }

        // Second retry: without tools (last resort for getting any content).
        const retryNoTools = await geminiAdapter.chat({ ...request, tools: [], stream: false }, config)
        if (retryNoTools.content && retryNoTools.content.trim()) {
          // For MALFORMED_FUNCTION_CALL: the no-tools response is just a text description.
          // Try one more time WITH tools, injecting the model's own text as context + a hint.
          if (isMalformedFunctionCall && request.tools?.length) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Gemini] Got text-only fallback for MALFORMED, retrying with tools + hint...')
            }
            try {
              const hintMessages: ChatMessage[] = [
                ...request.messages,
                { role: 'assistant', content: retryNoTools.content },
                {
                  role: 'user',
                  content:
                    'Please execute the above plan using the available function tools. Call the appropriate function with valid JSON arguments.',
                },
              ]
              const retryWithHint = await geminiAdapter.chat(
                { ...request, messages: hintMessages, stream: false },
                config,
              )
              if (retryWithHint.toolCalls && retryWithHint.toolCalls.length > 0) {
                if (retryWithHint.content) {
                  onChunk({ content: retryWithHint.content, done: false })
                }
                onChunk({
                  done: true,
                  toolCalls: retryWithHint.toolCalls.length ? retryWithHint.toolCalls : undefined,
                })
                lastError = null
                return {
                  content: retryWithHint.content,
                  toolCalls: retryWithHint.toolCalls,
                  finishReason: retryWithHint.finishReason,
                }
              }
            } catch {
              // Hint retry failed — fall through to return text-only response
            }
          }

          onChunk({ content: retryNoTools.content, done: false })
          onChunk({ done: true })
          lastError = null // Clear the malformed error since we recovered
          return {
            content: retryNoTools.content,
            toolCalls: [],
            finishReason: retryNoTools.finishReason,
          }
        }

        const retryNoSystem = await geminiAdapter.chat(
          {
            ...request,
            messages: flattenSystemIntoUserMessages(request.messages),
            tools: [],
            stream: false,
          },
          config,
        )
        if (retryNoSystem.content && retryNoSystem.content.trim()) {
          onChunk({ content: retryNoSystem.content, done: false })
          onChunk({ done: true })
          lastError = null
          return {
            content: retryNoSystem.content,
            toolCalls: [],
            finishReason: retryNoSystem.finishReason,
          }
        }
      } catch (err) {
        // Ignore retry failures and fall through to existing empty-response handling
        const msg = err instanceof Error ? err.message : String(err)
        lastError = msg
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Gemini] Retry failed:', err)
        }
      }
    }

    // If content was blocked, provide a helpful message
    if (safetyBlocked && !fullContent && toolCalls.length === 0) {
      fullContent =
        'I apologize, but I cannot generate a response to this request due to content safety filters. Please try rephrasing your question.'
    }

    // If we have an error but no content, include it
    if (lastError && !fullContent && toolCalls.length === 0) {
      fullContent = `Error: ${lastError}`
      finishReason = 'error'
    }

    // Ensure the UI gets *some* visible content when we have content but no streamed text.
    // Avoid duplicating text: if we've already streamed chunks, don't emit fullContent again.
    if (!streamedAnyText && fullContent && fullContent.trim().length > 0 && toolCalls.length === 0) {
      onChunk({ content: fullContent, done: false })
    }

    onChunk({ done: true, toolCalls: toolCalls.length > 0 ? toolCalls : undefined, groundingMetadata })

    return {
      content: fullContent || null,
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : finishReason,
      groundingMetadata,
    }
  },

  async testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const provider = PROVIDERS.gemini
      const baseUrl = config.baseUrl || provider.baseUrl
      const url = `${baseUrl}/models?key=${config.apiKey}`

      const response = await fetch(url)

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
