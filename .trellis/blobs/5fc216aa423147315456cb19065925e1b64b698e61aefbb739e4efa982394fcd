/**
 * Tool Bridge for Live Mode
 *
 * Converts existing AGENT_TOOLS (OpenAI-style) to Gemini Live API
 * functionDeclarations format, and handles executing tool calls
 * from the Live session.
 */

import { AGENT_TOOLS, executeToolCall } from '../tools'
import type { LiveFunctionCall } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Schema Conversion (OpenAI → Gemini)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert OpenAI-style JSON schema to Gemini-compatible format.
 * Gemini uses uppercase type names and doesn't support union types.
 *
 * Duplicated from gemini.ts since it's not exported — kept in sync.
 */
function convertSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema

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

  if (type === 'OBJECT') {
    if (schema.properties) {
      result.properties = {}
      for (const [key, val] of Object.entries(schema.properties as Record<string, unknown>)) {
        ;(result.properties as Record<string, unknown>)[key] = convertSchemaToGemini(
          val as Record<string, unknown>,
        )
      }
    }
    if (schema.required) result.required = schema.required
  }

  if (type === 'ARRAY') {
    if (schema.items) result.items = convertSchemaToGemini(schema.items as Record<string, unknown>)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert AGENT_TOOLS to Gemini Live API functionDeclarations format.
 * Returns the tools array in the shape expected by the Live API config.
 */
export function getGeminiFunctionDeclarations(): Array<{
  functionDeclarations: Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
  }>
}> {
  const declarations = AGENT_TOOLS.filter(
    (tool) => tool.type === 'function' && tool.name && tool.parameters,
  ).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: convertSchemaToGemini(tool.parameters as Record<string, unknown>),
  }))

  return [{ functionDeclarations: declarations }]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Execution
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolExecutionResult {
  id: string
  name: string
  response: Record<string, unknown>
}

/**
 * Execute a batch of function calls from the Live session and return
 * results formatted for `session.sendToolResponse()`.
 */
export async function executeLiveToolCalls(
  functionCalls: LiveFunctionCall[],
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = []

  for (const fc of functionCalls) {
    try {
      const result = await executeToolCall(fc.name, fc.args)

      // Strip __card__ from result if present (internal to text chat)
      let cleanResult = result
      if (result && typeof result === 'object' && '__card__' in result) {
        const { __card__, ...rest } = result
        cleanResult = rest
      }

      results.push({
        id: fc.id,
        name: fc.name,
        response: { result: cleanResult },
      })
    } catch (err) {
      console.error(`[ToolBridge] Error executing ${fc.name}:`, err)
      results.push({
        id: fc.id,
        name: fc.name,
        response: { error: err instanceof Error ? err.message : String(err) },
      })
    }
  }

  return results
}
