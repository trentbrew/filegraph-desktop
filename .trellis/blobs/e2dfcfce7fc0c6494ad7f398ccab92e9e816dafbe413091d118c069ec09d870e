/**
 * Agent Eval Logger
 *
 * Writes JSON-LD eval documents to ~/.filegraph/@evals/<date>/<uuid>.jsonld
 * for TQL indexing and behavioral analysis.
 */

import { invoke } from '@tauri-apps/api/core'
import { homeDir } from '@tauri-apps/api/path'
import type { AgentEvalDocument, EvalLogInput } from './types'
import { runEvalAssertions } from './assertions'

const EVALS_NAMESPACE = '@evals'

/**
 * Hash a string to a short hex digest (for system prompt versioning)
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Write an eval log document to disk.
 *
 * Best-effort: failures are logged but never thrown so they don't
 * interfere with the chat flow.
 */
export async function writeEvalLog(input: EvalLogInput): Promise<string | null> {
  try {
    const home = await homeDir()
    const vaultRoot = `${home.replace(/\/$/, '')}/.filegraph`
    const now = new Date()
    const dateDir = now.toISOString().split('T')[0] // YYYY-MM-DD
    const evalId = crypto.randomUUID()

    const evalsDir = `${vaultRoot}/${EVALS_NAMESPACE}/${dateDir}`

    // Ensure directory exists
    await invoke('shell_exec', {
      cmd: `mkdir -p "${evalsDir}"`,
      cwd: null,
      timeoutMs: 5_000,
      maxOutput: 1_000,
    })

    // Build assertions
    const assertions = runEvalAssertions(input)

    // Hash system prompt for versioning
    const systemPromptHash = await hashString(input.systemPrompt)

    // Build the JSON-LD document
    const doc: AgentEvalDocument = {
      '@context': { fg: 'https://filegraph.local/evals/' },
      '@id': `fg:eval:${evalId}`,
      '@type': 'AgentEval',
      timestamp: now.toISOString(),
      conversationId: input.conversationId,
      provider: input.provider,
      model: input.model,
      input: {
        userMessage: input.userMessage,
        systemPromptHash,
        toolCount: input.toolCount,
        historyLength: input.historyLength,
      },
      output: {
        assistantMessage: input.assistantMessage,
        finishReason: input.finishReason,
        toolCalls: input.toolCalls,
        toolCallRounds: input.toolCallRounds,
        quickReplyDetected: false, // Will be set by caller if needed
      },
      metrics: {
        latencyMs: input.latencyMs,
        thinkingMs: input.thinkingMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cost: input.cost,
      },
      assertions,
      errors: input.errors || [],
    }

    const filePath = `${evalsDir}/${evalId}.jsonld`
    await invoke('write_text_file', {
      filePath,
      content: JSON.stringify(doc, null, 2),
    })

    // Log assertion failures to console for visibility during development
    const failures = Object.entries(assertions).filter(
      ([key, value]) => {
        // For these assertions, true = bad
        if (key === 'askedUnnecessaryQuestion' || key === 'malformedFunctionCall' || key === 'emptyResponse') {
          return value === true
        }
        // For these assertions, false = bad
        return value === false
      },
    )

    if (failures.length > 0) {
      console.warn(
        `[AgentEval] Assertion failures:`,
        Object.fromEntries(failures),
        `| ${filePath}`,
      )
    } else {
      console.debug(`[AgentEval] All assertions passed | ${filePath}`)
    }

    return evalId
  } catch (err) {
    console.warn('[AgentEval] Failed to write eval log (non-fatal):', err)
    return null
  }
}
