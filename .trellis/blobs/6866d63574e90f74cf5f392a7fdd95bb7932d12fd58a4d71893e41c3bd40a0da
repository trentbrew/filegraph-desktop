/**
 * Agent Telemetry Types
 *
 * Data models for tracking agent usage, performance, and costs.
 */

import type { ProviderId } from '@/lib/providers'

/**
 * Token usage for a single request
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

/**
 * A single tool invocation
 */
export interface ToolInvocation {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  durationMs: number
  error?: string
}

/**
 * Reasoning step from chain-of-thought
 */
export interface ReasoningStep {
  type: 'assess' | 'plan' | 'execute' | 'synthesize'
  content: string
  timestamp: number
}

/**
 * A single agent request/response cycle
 */
export interface AgentRequest {
  id: string
  conversationId: string
  timestamp: number

  // Request
  userMessage: string
  provider: ProviderId
  model: string

  // Response
  assistantMessage: string
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'

  // Metrics
  tokens: TokenUsage
  cost: {
    input: number
    output: number
    total: number
  }
  latencyMs: number
  thinkingMs?: number
  streamingMs?: number

  // Tool usage
  toolCalls: ToolInvocation[]
  toolCallRounds: number

  // Reasoning
  reasoning?: ReasoningStep[]

  // Errors
  error?: string
  errorType?: 'api' | 'tool' | 'parse' | 'network' | 'abort'
}

/**
 * Aggregated session stats
 */
export interface SessionStats {
  requestCount: number
  successCount: number
  errorCount: number
  totalTokens: TokenUsage
  totalCost: number
  avgLatencyMs: number
  toolCallCount: number
  mostUsedTools: Array<{ name: string; count: number }>
  startTime: number
}

/**
 * Historical daily stats (persisted)
 */
export interface DailyStats {
  date: string // YYYY-MM-DD
  requestCount: number
  successCount: number
  errorCount: number
  tokens: TokenUsage
  cost: number
  avgLatencyMs: number
  byProvider: Record<ProviderId, { requests: number; tokens: number; cost: number }>
  byModel: Record<string, { requests: number; tokens: number; cost: number }>
}

/**
 * Model pricing (per 1M tokens)
 */
export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
  audioPer1M?: number
}

/**
 * Pricing registry
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 3
  'gemini-3-flash-preview': { inputPer1M: 0.5, outputPer1M: 3.0 },
  'gemini-3-pro-preview': { inputPer1M: 2.5, outputPer1M: 15.0 },
  // Gemini 2.5
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 5.0 },
  // OpenAI
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { inputPer1M: 10.0, outputPer1M: 30.0 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-5-haiku-20241022': { inputPer1M: 0.8, outputPer1M: 4.0 },
  // Groq (free tier, but track anyway)
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.1-8b-instant': { inputPer1M: 0.05, outputPer1M: 0.08 },
  // Ollama (local, free)
  'llama3-groq-tool-use': { inputPer1M: 0, outputPer1M: 0 },
  'llama3.2': { inputPer1M: 0, outputPer1M: 0 },
  'qwen2.5-coder': { inputPer1M: 0, outputPer1M: 0 },
  'deepseek-r1': { inputPer1M: 0, outputPer1M: 0 },
  llava: { inputPer1M: 0, outputPer1M: 0 },
}

/**
 * Calculate cost for a request
 */
export function calculateCost(model: string, tokens: TokenUsage): { input: number; output: number; total: number } {
  const pricing = MODEL_PRICING[model] || { inputPer1M: 0, outputPer1M: 0 }
  const input = (tokens.inputTokens / 1_000_000) * pricing.inputPer1M
  const output = (tokens.outputTokens / 1_000_000) * pricing.outputPer1M
  return { input, output, total: input + output }
}
