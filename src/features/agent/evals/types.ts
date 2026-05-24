/**
 * Agent Eval Types
 *
 * JSON-LD document schema for logging agent interactions.
 * Written to ~/.filegraph/@evals/ for TQL indexing and behavioral analysis.
 */

import type { ProviderId } from '@/lib/providers'

/**
 * A single tool call record within an eval
 */
export interface EvalToolCall {
  name: string
  args: Record<string, unknown>
  result?: unknown
  durationMs: number
  error?: string
}

/**
 * Eval input context
 */
export interface EvalInput {
  userMessage: string
  systemPromptHash: string
  toolCount: number
  historyLength: number
}

/**
 * Eval output data
 */
export interface EvalOutput {
  assistantMessage: string
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
  toolCalls: EvalToolCall[]
  toolCallRounds: number
  quickReplyDetected: boolean
}

/**
 * Eval metrics
 */
export interface EvalMetrics {
  latencyMs: number
  thinkingMs?: number
  inputTokens: number
  outputTokens: number
  cost: number
}

/**
 * Behavioral assertions — auto-checked per interaction
 */
export interface EvalAssertions {
  usedSandboxPath: boolean
  askedUnnecessaryQuestion: boolean
  usedSetupDevWorkspace: boolean
  verifiedGeneratedCode: boolean
  malformedFunctionCall: boolean
  emptyResponse: boolean
  toolCallSuccess: boolean
}

/**
 * Eval error record
 */
export interface EvalError {
  type: string
  detail: string
}

/**
 * Full JSON-LD eval document written to disk
 */
export interface AgentEvalDocument {
  '@context': { fg: string }
  '@id': string
  '@type': 'AgentEval'
  timestamp: string
  conversationId: string
  provider: ProviderId
  model: string
  input: EvalInput
  output: EvalOutput
  metrics: EvalMetrics
  assertions: EvalAssertions
  errors: EvalError[]
}

/**
 * Input data needed to build an eval document
 * (passed from the model provider after a request completes)
 */
export interface EvalLogInput {
  conversationId: string
  provider: ProviderId
  model: string
  userMessage: string
  assistantMessage: string
  systemPrompt: string
  toolCount: number
  historyLength: number
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
  toolCalls: EvalToolCall[]
  toolCallRounds: number
  latencyMs: number
  thinkingMs?: number
  inputTokens: number
  outputTokens: number
  cost: number
  errors?: EvalError[]
}
