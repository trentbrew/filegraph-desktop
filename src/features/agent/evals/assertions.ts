/**
 * Agent Eval Assertions
 *
 * Behavioral checks run automatically after each agent interaction.
 * These detect common failure modes like ignoring the sandbox path,
 * asking unnecessary questions, or producing empty responses.
 */

import type { EvalAssertions, EvalLogInput } from './types'

/**
 * Run all behavioral assertions against a completed interaction
 */
export function runEvalAssertions(input: EvalLogInput): EvalAssertions {
  return {
    usedSandboxPath: checkUsedSandboxPath(input),
    askedUnnecessaryQuestion: checkAskedUnnecessaryQuestion(input),
    usedSetupDevWorkspace: checkUsedSetupDevWorkspace(input),
    verifiedGeneratedCode: checkVerifiedGeneratedCode(input),
    malformedFunctionCall: checkMalformedFunctionCall(input),
    emptyResponse: checkEmptyResponse(input),
    toolCallSuccess: checkToolCallSuccess(input),
  }
}

/**
 * Did tool calls use ~/.filegraph/sandbox/ paths?
 * Only relevant when the agent made file/workspace tool calls.
 */
function checkUsedSandboxPath(input: EvalLogInput): boolean {
  const workspaceTools = ['setup_dev_workspace', 'write_file', 'run_command']
  const relevantCalls = input.toolCalls.filter((tc) => workspaceTools.includes(tc.name))
  if (relevantCalls.length === 0) return true // N/A — vacuously true

  const sandboxPattern = /~?\/?\.filegraph\/sandbox\//
  return relevantCalls.some((tc) => {
    const argsStr = JSON.stringify(tc.args)
    return sandboxPattern.test(argsStr)
  })
}

/**
 * Did the agent ask for info it should already know?
 * Detects questions about project path, directory location, etc.
 */
function checkAskedUnnecessaryQuestion(input: EvalLogInput): boolean {
  const msg = input.assistantMessage.toLowerCase()

  const unnecessaryPatterns = [
    /where (?:would you like|should I|do you want).+(?:put|place|save|create|store)/,
    /what (?:directory|path|folder|location)/,
    /which (?:directory|path|folder)/,
    /where .+(?:files|project)/,
  ]

  return unnecessaryPatterns.some((p) => p.test(msg))
}

/**
 * For build/scaffold requests, did the agent use setup_dev_workspace?
 * Only flags if the user asked to build something AND tools were available.
 */
function checkUsedSetupDevWorkspace(input: EvalLogInput): boolean {
  const buildKeywords = /\b(build|create|scaffold|set up|setup|make|start)\b.*\b(website|app|project|site|page)\b/i
  if (!buildKeywords.test(input.userMessage)) return true // N/A

  return input.toolCalls.some((tc) => tc.name === 'setup_dev_workspace')
}

/**
 * If setup_dev_workspace was called, did the agent also call verify_dev_project?
 */
function checkVerifiedGeneratedCode(input: EvalLogInput): boolean {
  const didScaffold = input.toolCalls.some((tc) => tc.name === 'setup_dev_workspace')
  if (!didScaffold) return true // N/A — vacuously true

  return input.toolCalls.some((tc) => tc.name === 'verify_dev_project')
}

/**
 * Was there a MALFORMED_FUNCTION_CALL error?
 */
function checkMalformedFunctionCall(input: EvalLogInput): boolean {
  if (!input.errors) return false
  return input.errors.some((e) => e.type === 'MALFORMED_FUNCTION_CALL')
}

/**
 * Did the agent produce an empty or near-empty response?
 */
function checkEmptyResponse(input: EvalLogInput): boolean {
  return input.assistantMessage.trim().length < 5
}

/**
 * Did all tool calls succeed (no errors)?
 */
function checkToolCallSuccess(input: EvalLogInput): boolean {
  if (input.toolCalls.length === 0) return true
  return input.toolCalls.every((tc) => !tc.error)
}
