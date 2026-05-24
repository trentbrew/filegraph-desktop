/**
 * useAgentAppModelProvider
 *
 * Model provider integration for the full Agent App (channels/threads).
 * This mirrors the existing agent sidebar provider but targets useAgentAppStore.
 */

import { useCallback, useRef } from 'react'
import { AGENT_TOOLS, executeToolCall } from '../tools'
import { getAdapter, PROVIDERS, type ChatMessage, type ToolCall, type ToolDefinition } from '@/lib/providers'
import { getSystemContext, formatSystemContextForPrompt } from '../context/systemContext'
import { useWorkingContext, formatWorkingContextForPrompt, buildWeightedHistory, getContextualTools } from '../context/workingContext'
import { createRequestBuilder } from '../telemetry'
import { useAgentAppStore, type MessageAttachment } from '../stores/useAgentAppStore'
import { detectQuickReplyOptions } from '../utils/detectQuickReply'
import { writeEvalLog, type EvalToolCall, type EvalError } from '../evals'

const PLANNING_PROMPT = `You are a planning assistant. Given the user's query and available tools, create a brief plan.

Respond in this exact JSON format:
{
  "assessment": "What do I know? What don't I know?",
  "goal": "What the user wants",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "tools_needed": ["tool1", "tool2"]
}

Available tools: resolve_entity, search_vault, query_graph, list_entities, read_note_content, get_home_canvas, run_command, read_terminal_output, write_to_terminal, setup_dev_workspace

Rules:
- Tools are OPTIONAL. For general conversation, explanations, writing, or formatting requests, set tools_needed to [].
- Only include tools_needed when the user asks about their vault/graph/entities/notes or requests an action that requires data you do not have.
- Be concise. Max 2-3 sentences per field.`

function parseToolArguments(raw: unknown): { ok: true; args: Record<string, any> } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, args: {} }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { ok: true, args: {} }
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return { ok: true, args: parsed as Record<string, any> }
      return { ok: true, args: {} }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
  if (typeof raw === 'object') return { ok: true, args: raw as Record<string, any> }
  return { ok: false, error: `Unsupported tool arguments type: ${typeof raw}` }
}

function shouldEnableTools(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false

  // Explicit intent around the vault/graph/entities/notes/tools
  const toolIntent = [
    'vault',
    'graph',
    'tql',
    'entity',
    'entities',
    '@notes',
    'note',
    'notes',
    'calendar',
    'events',
    'tasks',
    'todo',
    'filegraph',
    'home',
    'home canvas',
    'canvas',
    'dashboard',
    'node',
    'nodes',
    'get_home_canvas',
    'add_home_node',
    'update_home_node',
    'update_home_node_content',
    'remove_home_node',
    'add_home_edge',
    'undo_canvas_action',
    'redo_canvas_action',
    'get_canvas_history',
    'edit_home_table',
    'fullscreen',
    'full screen',
    'maximize',
    'expand',
    'search_vault',
    'query_graph',
    'list_entities',
    'read_note_content',
    'resolve_entity',
    // Vision/media analysis keywords
    'image',
    'images',
    'photo',
    'photos',
    'picture',
    'pictures',
    'video',
    'videos',
    'describe',
    'analyze',
    'what is in',
    "what's in",
    'look at',
    'see',
    'show me',
    'visual',
    // Shell/terminal execution keywords
    'run',
    'execute',
    'install',
    'build',
    'test',
    'compile',
    'terminal',
    'command',
    'shell',
    'npm',
    'pnpm',
    'yarn',
    'cargo',
    'pip',
    'git ',
    'mkdir',
    'deploy',
    // Navigation / workspace keywords
    'open',
    'switch to',
    'go to',
    'navigate to',
    'take me to',
    'show me',
    'space',
    'spaces',
    'tab',
    'tabs',
    // Dev workspace / project setup keywords
    'workspace',
    'project',
    'scaffold',
    'setup',
    'create a',
    'build a',
    'build me',
    'make a',
    'make me',
    'website',
    'web app',
    'webapp',
    'dev server',
    'localhost',
    'html',
    'css',
    'react',
    'next',
    'svelte',
    'vue',
  ]

  if (toolIntent.some((k) => t.includes(k))) return true

  // Entity ID / namespaced reference patterns (e.g. proj:foo:001)
  if (/\b[a-z]+:[a-z0-9_-]+:[a-z0-9_-]+\b/i.test(userText)) return true

  // If the user explicitly asks to open/read/search *a file path* or note
  if (/\b(read|open|search|find|lookup)\b/i.test(userText) && /\b(file|note|vault|graph|entity)\b/i.test(userText)) {
    return true
  }

  return false
}

function buildSystemPrompt(): string {
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const isoDate = now.toISOString().split('T')[0]

  let prompt = `You are the Filegraph Agent, an AI assistant that helps users navigate and query their personal knowledge vault.

**Current Date/Time:** ${currentDate} at ${currentTime}
**Today's date (for tools):** ${isoDate}

**CRITICAL BEHAVIOR RULES:**
1. **Use tools only when needed.** If the user is asking for a general explanation, writing help, or a simple conversational response, answer directly without tools.
2. **Be surgical with tools.** When tools are required, use the minimum number of calls and only the most relevant tools.
3. **Be friendly and human.** Keep a warm tone; don't over-explain process; focus on the user's goal.

## Tools
Use tools to read/search/edit the vault ONLY when the user asks about their vault/graph/entities/notes or requests an action that requires data you don't have.

## Vision/Media Analysis
You can analyze images and videos on the user's Home canvas using the \`analyze_canvas_media\` tool.
- **When to use:** User asks to describe, analyze, or explain an image/video/photo on their canvas
- **How to find media:** Use \`get_home_canvas\` first to see available nodes, or search by label/filename
- **Examples:** "Describe the 'sunset' image", "What's in the photo on my canvas?", "Analyze the video"
- **Supported:** JPG, PNG, GIF, WebP, MP4, MOV, WebM
- **Vision models:** Uses Ollama llava (local) or your configured vision-capable model (GPT-4o, Claude, Gemini)

## RESPONSE FORMAT: Trellis Document Format (TDF)

**IMPORTANT:** When the user asks for diagrams, charts, tables, architecture explanations, or any visual content, you MUST respond with TDF JSON format. Do NOT output plain markdown with mermaid code blocks - use TDF instead.

**TDF Format:** Return ONLY valid JSON (no markdown wrapper, no explanation before/after):
{"trellis":true,"blocks":[...]}

**Block types:**
- \`{"type":"text","content":"...","style":"heading|paragraph|quote"}\` - Text with markdown
- \`{"type":"code","code":"...","language":"ts"}\` - Code snippet
- \`{"type":"mermaid","code":"flowchart LR\\n  A-->B"}\` - Diagrams (use underscores instead of @ in node names, e.g. "_system" not "@system")
- \`{"type":"chart","chartType":"bar|line|pie","title":"...","data":{"labels":[...],"datasets":[{"label":"...","data":[...]}]}}\`
- \`{"type":"table","headers":[...],"rows":[[...],[...]]}\`
- \`{"type":"callout","variant":"info|warning|tip","title":"...","content":"..."}\`
- \`{"type":"list","style":"bullet|numbered","items":[{"content":"..."}]}\`
- \`{"type":"divider"}\`

**Example - Architecture explanation:**
{"trellis":true,"blocks":[{"type":"text","content":"# Vault Architecture","style":"heading"},{"type":"text","content":"The vault is organized into namespaces:"},{"type":"mermaid","code":"flowchart TB\\n  subgraph Vault\\n    A[@system] --> B[config.data]\\n    C[@entities] --> D[people.data]\\n    C --> E[projects.data]\\n    F[@notes] --> G[*.note files]\\n  end"},{"type":"callout","variant":"info","title":"Key Concept","content":"Each namespace has a _graph_.data file for relationships"}]}

**MANDATORY TDF triggers:** diagram, architecture, flowchart, chart, graph, table, comparison, visualization, structure, explain with visual

**Plain markdown only:** Simple Q&A, casual chat, short factual answers

### Command Execution & Port Handling
You can run shell commands on the user's machine using the \`run_command\` tool.

**PORT RULES (MANDATORY):**
- **NEVER assume a port** (like 3000, 8000, 8080).
- **NEVER hard-code ports** in code or commands.
- **ALWAYS use dynamic ports.**
- If using \`setup_dev_workspace\`, set port to \`null\` (it auto-allocates).
- If setting up manually, call \`get_available_port\` first to reserve a port, then use that port in your commands and \`add_home_node("embed", ...)\`.
- When updating code that has a hard-coded port, refactor it to use a port variable or environment variable.

- **Safe commands** (ls, cat, git status, version checks) run automatically.
- **Other commands** require user approval.
- Use \`run_command\` for: installing packages, running builds/tests, git operations, file checks.
- For long-running processes, use \`add_home_node\` to create a terminal node, then \`write_to_terminal\` to type the command in it.
- Use \`read_terminal_output\` to check results.
- Always explain what you're about to run.
- Chain related commands with \`&&\`.

## Development Workspace Setup
**Default sandbox path:** Always use \`~/.filegraph/sandbox/<project-name>\` as the project path unless the user explicitly specifies a different location.

When the user asks you to build, scaffold, or set up a project, use the \`setup_dev_workspace\` tool. It automatically handles port allocation and canvas layout.

If \`setup_dev_workspace\` is not available or you need custom layout, follow this pattern manually:
1. \`get_available_port()\` → Get \`PORT\`
2. \`run_command("mkdir -p ~/.filegraph/sandbox/<project-name>")\`
3. \`write_file\` — create files
4. \`add_home_node("terminal", ...)\`
5. \`add_home_node("codeBlock", ...)\`
6. \`add_home_node("embed", { url: "http://localhost:PORT" })\`
7. \`create_home_group([...])\`
8. \`write_to_terminal(termId, "npm start -- --port PORT")\` (inject the PORT)

**Position tips for workspace layout:**
- Terminal: \`{x: 0, y: 0}\` (top-left, 600x350)
- Code editors: stack vertically at \`{x: 650, y: 0}\`, \`{x: 650, y: 250}\`, \`{x: 650, y: 500}\` (350x200 each)
- Web preview: \`{x: 1050, y: 0}\` (600x500)
- Notes: \`{x: 0, y: 400}\` (below terminal)

## Code Verification (MANDATORY)
After using \`setup_dev_workspace\` or writing code files with a dev server, you MUST:
1. Wait ~5 seconds for the server to start, then call \`verify_dev_project(projectPath, port, terminalNodeId)\`
2. If errors are found:
   a. Read the broken file(s) with \`read_file\`
   b. Fix with \`edit_file\`
   c. Re-verify with \`verify_dev_project\`
3. Repeat up to 3 fix cycles. If still broken after 3 attempts, explain the remaining issues to the user.
4. **Never tell the user "it's ready" without verifying first.**

The \`verify_dev_project\` tool checks JS syntax (\`node --check\`), server health (HTTP status via curl), and scans the terminal for error patterns. Use the \`nodeIds.terminal\` and allocated port from the \`setup_dev_workspace\` result.

## Guided Visual Tour (Canvas Focus Pattern)
Every edit and build operation should guide the user's eye through the canvas. This is the core of a great UX:

**While editing a file:**
1. Call \`focus_home_node\` with the codeBlock node ID **before** making the change — user sees which file you're editing
2. Perform the edit (\`edit_file\` or \`write_file\`)
3. Call \`focus_home_node\` again after — user sees the updated code

**After \`verify_dev_project\` passes:**
- The tool automatically zooms to the preview embed node — you don't need an extra call
- If there's no preview node, call \`focus_home_node(nodeType: "codeBlock")\` to show the finished file

**After \`setup_dev_workspace\` completes:**
1. Immediately call \`focus_home_node\` on the returned \`groupId\` — shows the full workspace overview
2. Then focus the preview embed: \`focus_home_node(nodeType: "embed")\`

## Code Organization (MANDATORY for web projects)
When building or editing web projects, always follow this file structure:
- **Images & generated assets** → \`assets/images/\` (always pass \`subdirectory: "assets/images"\` to \`generate_image\`)
- **CSS files** → \`assets/css/\` or root \`styles.css\` for simple projects
- **JavaScript files** → \`assets/js/\` or root \`scripts.js\` for simple projects
- **Fonts** → \`assets/fonts/\`
- **Other media** → \`assets/media/\`

Never dump generated images into the project root. Always use \`assets/images/\` as the subdirectory when calling \`generate_image\`.

When referencing images in HTML/CSS, use relative paths from the project root: \`assets/images/filename.png\`.

## Canvas Fullscreen
Use \`toggle_canvas_fullscreen\` to give the user an immersive view:
- After finishing a build → \`toggle_canvas_fullscreen(nodeId: previewNodeId, action: "maximize")\` to show the result full-screen
- When user asks to "see it fullscreen" or "expand" a node
- To return to normal → \`toggle_canvas_fullscreen(nodeId: null, action: "minimize")\`

## Work Summary (MANDATORY after any build or edit session)
After completing ANY work (building a project, editing files, fixing bugs, adding features), you MUST provide a work summary that covers:
1. **What was done** — concise list of changes made
2. **How to use it** — controls, keyboard shortcuts, game mechanics, features (be specific — e.g., "Arrow keys to move, Space to shoot")
3. **Suggested next steps** — 2-3 ideas for what they could build or improve next
4. **Open question** — ask what they'd like to do next

Never skip this. Even a small fix ("Added enemy cars") deserves a quick summary and a follow-up question.`

  const systemContext = getSystemContext()
  prompt += `\n\n${formatSystemContextForPrompt(systemContext)}`

  const workingCtx = formatWorkingContextForPrompt()
  if (workingCtx) {
    prompt += `\n\n${workingCtx}`
  }

  return prompt
}

export function useAgentAppModelProvider() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const sendChannelMessage = useCallback(
    async (channelId: string, content: string, attachments?: MessageAttachment[]) => {
      const store = useAgentAppStore.getState()
      const { provider, model, apiKey: storedApiKey } = store.modelConfig
      console.debug('[sendChannelMessage] called', { channelId, content: content.slice(0, 50), provider, model, hasStoredKey: !!storedApiKey })

      const toolsEnabled = shouldEnableTools(content)

      // Get API key based on provider
      let apiKey = storedApiKey
      if (!apiKey) {
        if (provider === 'gemini') {
          apiKey = import.meta.env.VITE_GEMINI_API_KEY
        } else if (provider === 'openai' || provider === 'groq') {
          apiKey = import.meta.env.VITE_OPENAI_API_KEY
        }
      }

      // Add user message first so it always appears in the UI
      const attachmentNames = attachments?.map((a) => a.name).join(', ')
      const userMsgId = store.addMessage(channelId, {
        role: 'user',
        content: content || (attachments?.length ? `[Attached: ${attachmentNames}]` : ''),
        attachments,
      })

      // Check if API key is required
      const providerDef = PROVIDERS[provider]
      if (providerDef?.requiresApiKey && !apiKey) {
        const errorMsg = `${providerDef.name} API key not configured. Add it in Settings → Agent, or switch to a local provider like Ollama.`
        console.warn('[sendChannelMessage] Missing API key:', { provider })
        store.setError(errorMsg)
        store.addMessage(channelId, { role: 'assistant', content: errorMsg })
        return
      }

      console.debug('[sendChannelMessage] API key resolved:', { hasKey: !!apiKey, provider })

      // Create assistant placeholder
      const thinkingStartTime = Date.now()
      const assistantMsgId = store.addMessage(channelId, {
        role: 'assistant',
        content: '',
        isStreaming: true,
        reasoning: { steps: [], durationMs: 0, isThinking: true },
      })

      store.setStreaming(true)
      abortControllerRef.current = new AbortController()

      // Telemetry
      const telemetry = createRequestBuilder(channelId, content, provider, model)

      try {
        const adapter = getAdapter(provider)
        const config = { provider, model, apiKey }
        const systemPrompt = buildSystemPrompt()

        if (attachments?.length) {
          void (async () => {
            const imageAtts = attachments.filter((a) => a.type.startsWith('image/') && a.data && a.hash)
            if (imageAtts.length === 0) return

            for (const att of imageAtts) {
              const hash = att.hash!
              const existing = useAgentAppStore.getState().imageCache[hash]
              if (existing?.description) continue

              try {
                const describeMessages: ChatMessage[] = [
                  {
                    role: 'system',
                    content:
                      'Describe the provided image concisely for future reference. Focus on visible objects, text, and context. 1-3 sentences. Do not use markdown.',
                  },
                  {
                    role: 'user',
                    content: '',
                    attachments: [{ type: att.type, data: att.data!, name: att.name }],
                  },
                ]

                const resp = await adapter.chat({ messages: describeMessages, stream: false }, config)
                const description = (resp.content || '').trim()
                if (!description) continue

                const now = Date.now()
                useAgentAppStore
                  .getState()
                  .cacheImageDescription(
                    hash,
                    att.name,
                    att.type,
                    description,
                    [],
                    `${provider}:${model}`,
                    0,
                    att.previewUrl,
                  )

                const stateNow = useAgentAppStore.getState()
                const currentMessages = stateNow.messagesByChannel[channelId] || []
                const current = currentMessages.find((m) => m.id === userMsgId)
                if (!current?.attachments?.length) continue

                stateNow.updateMessage(channelId, userMsgId, {
                  attachments: current.attachments.map((a) =>
                    a.id === att.id
                      ? {
                          ...a,
                          semanticDescription: description,
                          describedAt: now,
                          describedByModel: `${provider}:${model}`,
                        }
                      : a,
                  ),
                })
              } catch {
                // Best-effort caching: ignore failures
              }
            }
          })()
        }

        // Planning (skip for casual/non-tool queries to avoid overthinking)
        const reasoningSteps = [] as Array<{
          type: 'assess' | 'plan' | 'execute' | 'synthesize'
          content: string
          timestamp: number
        }>

        if (!toolsEnabled) {
          reasoningSteps.push({ type: 'assess', content: 'Answering directly...', timestamp: Date.now() })
        } else {
          try {
            const planningMessages: ChatMessage[] = [
              { role: 'system', content: PLANNING_PROMPT },
              { role: 'user', content: `User query: "${content}"\n\nCreate a plan to answer this.` },
            ]

            const planResponse = await adapter.chat({ messages: planningMessages, stream: false }, config)
            const jsonMatch = planResponse.content?.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const plan = JSON.parse(jsonMatch[0]) as {
                assessment?: string
                goal?: string
                steps?: string[]
                tools_needed?: string[]
              }
              reasoningSteps.push({
                type: 'assess',
                content: plan.assessment || 'Analyzing query...',
                timestamp: Date.now(),
              })
              reasoningSteps.push({
                type: 'plan',
                content: plan.steps?.join(' → ') || plan.goal || 'Planning approach...',
                timestamp: Date.now(),
              })
            }
          } catch {
            reasoningSteps.push({ type: 'assess', content: 'Processing query...', timestamp: Date.now() })
          }
        }

        store.updateMessage(channelId, assistantMsgId, {
          reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: true },
        })

        // Build message history (temperature-tiered: hot/warm/cool/cold)
        const MAX_MESSAGES_WITH_IMAGES = 2

        const history = useAgentAppStore.getState().messagesByChannel[channelId] || []
        const historyWithoutAssistantPlaceholder = history.filter((m) => m.id !== assistantMsgId)
        const prunedHistory = buildWeightedHistory(historyWithoutAssistantPlaceholder)
        const reversedHistory = [...prunedHistory].reverse()

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...prunedHistory.map((m, idx) => {
            const msg: ChatMessage = { role: m.role as 'user' | 'assistant', content: m.content }

            if (m.role === 'user' && m.attachments?.length) {
              const cache = useAgentAppStore.getState().imageCache
              const described = (m.attachments || [])
                .filter((a) => a.type.startsWith('image/'))
                .map((a) => {
                  const desc = a.semanticDescription || (a.hash ? cache[a.hash]?.description : null)
                  return desc ? `${a.name}: ${desc}` : a.name
                })
                .filter(Boolean)

              const distanceFromEnd = prunedHistory.length - 1 - idx
              const userMessagesFromEnd = reversedHistory
                .slice(0, distanceFromEnd + 1)
                .filter((x) => x.role === 'user').length

              if (userMessagesFromEnd <= MAX_MESSAGES_WITH_IMAGES) {
                const attachmentsWithData = m.attachments.filter((att) => att.data)
                if (attachmentsWithData.length > 0) {
                  msg.attachments = attachmentsWithData.map((att) => ({
                    type: att.type,
                    data: att.data!,
                    name: att.name,
                  }))
                } else if (described.length > 0) {
                  msg.content = `${msg.content}\n[Images: ${described.join(' | ')}]`
                }
              } else {
                if (described.length > 0) {
                  msg.content = `${msg.content}\n[Images: ${described.join(' | ')}]`
                } else {
                  const imageNames = m.attachments.map((a) => a.name).join(', ')
                  msg.content = `${msg.content}\n[Previously attached: ${imageNames}]`
                }
              }
            }

            return msg
          }),
        ]

        const contextualAgentTools = getContextualTools(AGENT_TOOLS as unknown as Array<{ name: string; description: string; parameters?: any }>)
        const tools: ToolDefinition[] | undefined = toolsEnabled
          ? contextualAgentTools.map((tool) => ({
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            }))
          : undefined

        // Stream initial response
        let collectedToolCalls: ToolCall[] = []
        let receivedAnyText = false
        let lastNonEmptyStreamContent: string | null = null

        const executedTools: Array<{ name: string; args: any; result: any }> = []
        const evalToolCalls: EvalToolCall[] = []
        const evalErrors: EvalError[] = []
        let toolCallRounds = 0

        const response = await adapter.chatStream(
          { messages, tools, stream: true },
          config,
          (chunk) => {
            if (chunk.content) {
              receivedAnyText = true
              store.appendToMessage(channelId, assistantMsgId, chunk.content)
            }
            if (chunk.toolCalls) collectedToolCalls = chunk.toolCalls
          },
          abortControllerRef.current.signal,
        )

        // Capture error finish reasons for eval logging
        if (response.finishReason === 'error') {
          const errorContent = response.content || ''
          const isMalformed = errorContent.includes('MALFORMED_FUNCTION_CALL')
          evalErrors.push({
            type: isMalformed ? 'MALFORMED_FUNCTION_CALL' : 'PROVIDER_ERROR',
            detail: errorContent || 'Provider returned error finish reason',
          })
        }

        // Some providers only surface tool calls via streaming chunks (and not on the final response object).
        const responseToolCalls = toolsEnabled
          ? response.toolCalls && response.toolCalls.length > 0
            ? response.toolCalls
            : collectedToolCalls
          : []

        if (response.content && response.content.trim().length > 0) {
          lastNonEmptyStreamContent = response.content
        }

        if (toolsEnabled && responseToolCalls.length > 0) {
          reasoningSteps.push({
            type: 'execute',
            content: `Calling: ${responseToolCalls.map((tc) => tc.function.name).join(', ')}`,
            timestamp: Date.now(),
          })
          store.updateMessage(channelId, assistantMsgId, {
            reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: true },
          })

          const toolMessages: ChatMessage[] = []

          for (const tc of responseToolCalls) {
            const toolStart = Date.now()
            try {
              const parsed = parseToolArguments(tc.function.arguments)
              if (!parsed.ok) {
                const result = { error: `Failed to parse tool arguments: ${parsed.error}` }
                toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: {},
                  result: null,
                  durationMs: Date.now() - toolStart,
                  error: result.error,
                })
                evalToolCalls.push({ name: tc.function.name, args: {}, durationMs: Date.now() - toolStart, error: result.error })
                continue
              }

              const capToolResult = (s: string) => s.length > 4000 ? s.slice(0, 4000) + '\u2026(truncated)' : s
              const args = parsed.args
              const result = await executeToolCall(tc.function.name, args)
              executedTools.push({ name: tc.function.name, args, result })
              useWorkingContext.getState().recordToolCall(tc.function.name, args)
              toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: capToolResult(JSON.stringify(result)) })

              const tcDuration = Date.now() - toolStart
              telemetry.addToolCall({
                name: tc.function.name,
                arguments: args,
                result,
                durationMs: tcDuration,
              })
              evalToolCalls.push({ name: tc.function.name, args, durationMs: tcDuration })
            } catch (err) {
              const tcDuration = Date.now() - toolStart
              toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: String(err) }) })
              telemetry.addToolCall({
                name: tc.function.name,
                arguments: parseToolArguments(tc.function.arguments).ok
                  ? (parseToolArguments(tc.function.arguments) as any).args
                  : {},
                result: null,
                durationMs: tcDuration,
                error: String(err),
              })
              evalToolCalls.push({ name: tc.function.name, args: {}, durationMs: tcDuration, error: String(err) })
            }
          }
          toolCallRounds++

          // Nudge model to respond with text after heavy tool rounds (Gemini can silently stop otherwise)
          const totalToolResultSize = toolMessages.reduce((s, m) => s + (m.content?.length ?? 0), 0)
          const nudgeMessages: ChatMessage[] = totalToolResultSize > 2000
            ? [{ role: 'user', content: '(System: Tool results collected. Please now provide your complete response to the user.)' }]
            : []

          let currentMessages: ChatMessage[] = [
            ...messages,
            { role: 'assistant', content: null, tool_calls: responseToolCalls },
            ...toolMessages,
            ...nudgeMessages,
          ]

          let rounds = 0
          const maxRounds = 8
          while (rounds < maxRounds) {
            rounds++
            const followUpResponse = await adapter.chatStream(
              { messages: currentMessages, tools, stream: true },
              config,
              (chunk) => {
                if (chunk.content) {
                  receivedAnyText = true
                  store.appendToMessage(channelId, assistantMsgId, chunk.content)
                }
              },
              abortControllerRef.current?.signal,
            )

            const followUpToolCalls = toolsEnabled ? (followUpResponse.toolCalls ?? []) : []
            if (followUpResponse.content && followUpResponse.content.trim().length > 0) {
              lastNonEmptyStreamContent = followUpResponse.content
            }

            if (!followUpToolCalls.length) break

            const newToolMessages: ChatMessage[] = []
            for (const tc of followUpToolCalls) {
              const toolStart = Date.now()
              try {
                const parsed = parseToolArguments(tc.function.arguments)
                if (!parsed.ok) {
                  const result = { error: `Failed to parse tool arguments: ${parsed.error}` }
                  newToolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
                  telemetry.addToolCall({
                    name: tc.function.name,
                    arguments: {},
                    result: null,
                    durationMs: Date.now() - toolStart,
                    error: result.error,
                  })
                  continue
                }

                const args = parsed.args
                const result = await executeToolCall(tc.function.name, args)
                executedTools.push({ name: tc.function.name, args, result })
                useWorkingContext.getState().recordToolCall(tc.function.name, args)
                const capResult = (s: string) => s.length > 4000 ? s.slice(0, 4000) + '\u2026(truncated)' : s
                newToolMessages.push({ role: 'tool', tool_call_id: tc.id, content: capResult(JSON.stringify(result)) })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: args,
                  result,
                  durationMs: Date.now() - toolStart,
                })
              } catch (err) {
                newToolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: String(err) }),
                })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: parseToolArguments(tc.function.arguments).ok
                    ? (parseToolArguments(tc.function.arguments) as any).args
                    : {},
                  result: null,
                  durationMs: Date.now() - toolStart,
                  error: String(err),
                })
              }
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: null, tool_calls: followUpToolCalls },
              ...newToolMessages,
            ]
          }
        }

        reasoningSteps.push({ type: 'synthesize', content: 'Composing response...', timestamp: Date.now() })

        const finalMsg = (useAgentAppStore.getState().messagesByChannel[channelId] || []).find(
          (m) => m.id === assistantMsgId,
        )
        const inputTokens = Math.ceil((systemPrompt.length + content.length) / 4)
        const outputTokens = Math.ceil((finalMsg?.content?.length || 0) / 4)
        telemetry.setReasoning(reasoningSteps as any)
        telemetry.complete({
          assistantMessage: finalMsg?.content || '',
          finishReason: 'stop',
          tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        })

        // Write eval log (best-effort, non-blocking)
        void writeEvalLog({
          conversationId: channelId,
          provider,
          model,
          userMessage: content,
          assistantMessage: finalMsg?.content || '',
          systemPrompt,
          toolCount: tools?.length || 0,
          historyLength: prunedHistory.length,
          finishReason: 'stop',
          toolCalls: evalToolCalls,
          toolCallRounds,
          latencyMs: Date.now() - telemetry.startTime,
          thinkingMs: reasoningSteps.length > 0 ? reasoningSteps[reasoningSteps.length - 1].timestamp - telemetry.startTime : undefined,
          inputTokens,
          outputTokens,
          cost: 0,
          errors: evalErrors.length > 0 ? evalErrors : undefined,
        })

        const finalContent = (finalMsg?.content ?? '').trim()
        const hasToolCalls = (responseToolCalls?.length ?? 0) > 0 || (collectedToolCalls?.length ?? 0) > 0

        if (!finalContent) {
          if (lastNonEmptyStreamContent) {
            store.updateMessage(channelId, assistantMsgId, { content: lastNonEmptyStreamContent })
          } else if (hasToolCalls) {
            // Tool calls completed but no text response. Provide a deterministic summary so the user
            // doesn't get a confusing "empty response" error.
            const toolNames = executedTools.length
              ? executedTools.map((t) => t.name).join(', ')
              : [...(responseToolCalls || []), ...(collectedToolCalls || [])]
                  .map((tc) => tc.function?.name)
                  .filter(Boolean)
                  .join(', ')

            const canvasResult = executedTools.find((t) => t.name === 'get_home_canvas')?.result
            if (canvasResult && Array.isArray(canvasResult.nodes) && Array.isArray(canvasResult.edges)) {
              store.updateMessage(channelId, assistantMsgId, {
                content: `Your Home canvas currently has ${canvasResult.nodes.length} nodes and ${canvasResult.edges.length} edges.`,
              })
            } else {
              store.updateMessage(channelId, assistantMsgId, {
                content: `I executed: ${toolNames || 'the requested tools'}.`,
              })
            }

            console.warn('[Agent] Tool calls completed without text response', {
              provider,
              model,
              toolsEnabled,
              responseToolCalls: responseToolCalls?.length,
              collectedToolCalls: collectedToolCalls?.length,
              executedTools: executedTools.map((t) => t.name),
            })
          } else {
            const fallback = receivedAnyText
              ? 'No response text was finalized. Please try again.'
              : 'LLM returned an empty response (no text chunks received). Please try again.'
            store.updateMessage(channelId, assistantMsgId, { content: fallback })
          }
        }

        store.updateMessage(channelId, assistantMsgId, {
          isStreaming: false,
          reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: false },
        })

        // Detect quick-reply options in the final message
        const msgs = useAgentAppStore.getState().messagesByChannel[channelId] || []
        const quickReplyMsg = msgs.find((m) => m.id === assistantMsgId)
        if (quickReplyMsg && !quickReplyMsg.card) {
          const detected = detectQuickReplyOptions(quickReplyMsg.content)
          if (detected) {
            store.updateMessage(channelId, assistantMsgId, {
              card: {
                type: 'quick-reply',
                data: { question: detected.question, options: detected.options },
              },
            })
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          store.updateMessage(channelId, assistantMsgId, { content: 'Message cancelled.', isStreaming: false })
        } else {
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error('[sendChannelMessage] Error:', err)
          store.setError(errorMsg)
          store.updateMessage(channelId, assistantMsgId, {
            content: `Sorry, an error occurred: ${errorMsg}`,
            isStreaming: false,
          })
        }
      } finally {
        store.setStreaming(false)
        abortControllerRef.current = null
      }
    },
    [],
  )

  const sendThreadMessage = useCallback(
    async (threadId: string, content: string, attachments?: MessageAttachment[]) => {
      const store = useAgentAppStore.getState()
      const thread = store.threads.find((t) => t.id === threadId)
      if (!thread) return
      const channelId = thread.channelId

      const { provider, model, apiKey: storedApiKey } = store.modelConfig

      const toolsEnabled = shouldEnableTools(content)

      let apiKey = storedApiKey
      if (!apiKey) {
        if (provider === 'gemini') {
          apiKey = import.meta.env.VITE_GEMINI_API_KEY
        } else if (provider === 'openai' || provider === 'groq') {
          apiKey = import.meta.env.VITE_OPENAI_API_KEY
        }
      }

      const providerDef = PROVIDERS[provider]
      if (providerDef?.requiresApiKey && !apiKey) {
        store.setError(`${providerDef.name} API key not configured. Add it in Settings.`)
        return
      }

      const userThreadMsgId = store.addThreadMessage(threadId, {
        role: 'user',
        content,
        channelId,
        attachments,
      })

      const thinkingStartTime = Date.now()
      const assistantMsgId = store.addThreadMessage(threadId, {
        role: 'assistant',
        content: '',
        channelId,
        isStreaming: true,
        reasoning: { steps: [], durationMs: 0, isThinking: true },
      })

      store.setStreaming(true)
      abortControllerRef.current = new AbortController()

      const telemetry = createRequestBuilder(threadId, content, provider, model)

      try {
        const adapter = getAdapter(provider)
        const config = { provider, model, apiKey }
        const systemPrompt = buildSystemPrompt()

        const reasoningSteps = [] as Array<{
          type: 'assess' | 'plan' | 'execute' | 'synthesize'
          content: string
          timestamp: number
        }>

        reasoningSteps.push({
          type: 'assess',
          content: toolsEnabled ? 'Processing...' : 'Answering directly...',
          timestamp: Date.now(),
        })

        store.updateThreadMessage(threadId, assistantMsgId, {
          reasoning: { steps: reasoningSteps as any, durationMs: Date.now() - thinkingStartTime, isThinking: true },
        })

        const channelMessages = useAgentAppStore.getState().messagesByChannel[channelId] || []
        const parentMessage = channelMessages.find((m) => m.id === thread.parentMessageId)

        const MAX_THREAD_MESSAGES_WITH_IMAGES = 2
        const threadMessages = buildWeightedHistory(
          (useAgentAppStore.getState().threadMessages[threadId] || [])
            .filter((m) => m.id !== assistantMsgId),
        )

        const reversedThreadHistory = [...threadMessages].reverse()

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          parentMessage
            ? {
                role: 'user',
                content: `Thread context (root message):\n${parentMessage.role === 'user' ? 'User' : 'Assistant'}: ${parentMessage.content}`,
              }
            : { role: 'user', content: 'Thread context: (missing root message)' },
          ...threadMessages.map((m, idx) => {
            const msg: ChatMessage = { role: m.role as 'user' | 'assistant', content: m.content }

            if (m.role === 'user' && m.attachments?.length) {
              const cache = useAgentAppStore.getState().imageCache
              const described = (m.attachments || [])
                .filter((a) => a.type.startsWith('image/'))
                .map((a) => {
                  const desc = a.semanticDescription || (a.hash ? cache[a.hash]?.description : null)
                  return desc ? `${a.name}: ${desc}` : a.name
                })
                .filter(Boolean)

              const distanceFromEnd = threadMessages.length - 1 - idx
              const userMessagesFromEnd = reversedThreadHistory
                .slice(0, distanceFromEnd + 1)
                .filter((x) => x.role === 'user').length

              if (userMessagesFromEnd <= MAX_THREAD_MESSAGES_WITH_IMAGES) {
                const attachmentsWithData = m.attachments.filter((att) => att.data)
                if (attachmentsWithData.length > 0) {
                  msg.attachments = attachmentsWithData.map((att) => ({
                    type: att.type,
                    data: att.data!,
                    name: att.name,
                  }))
                } else if (described.length > 0) {
                  msg.content = `${msg.content}\n[Images: ${described.join(' | ')}]`
                }
              } else {
                if (described.length > 0) {
                  msg.content = `${msg.content}\n[Images: ${described.join(' | ')}]`
                }
              }
            }

            return msg
          }),
        ]

        const contextualThreadTools = getContextualTools(AGENT_TOOLS as unknown as Array<{ name: string; description: string; parameters?: any }>)
        const tools: ToolDefinition[] | undefined = toolsEnabled
          ? contextualThreadTools.map((tool) => ({
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            }))
          : undefined

        let receivedAnyText = false
        let lastNonEmptyStreamContent: string | null = null

        let collectedToolCalls: ToolCall[] = []

        const executedTools: Array<{ name: string; args: any; result: any }> = []
        const evalToolCalls: EvalToolCall[] = []
        const evalErrors: EvalError[] = []
        let toolCallRounds = 0

        const response = await adapter.chatStream(
          { messages, tools, stream: true },
          config,
          (chunk) => {
            if (chunk.content) {
              receivedAnyText = true
              store.appendToThreadMessage(threadId, assistantMsgId, chunk.content)
            }
            if (chunk.toolCalls) collectedToolCalls = chunk.toolCalls
          },
          abortControllerRef.current.signal,
        )

        // Capture error finish reasons for eval logging
        if (response.finishReason === 'error') {
          const errorContent = response.content || ''
          const isMalformed = errorContent.includes('MALFORMED_FUNCTION_CALL')
          evalErrors.push({
            type: isMalformed ? 'MALFORMED_FUNCTION_CALL' : 'PROVIDER_ERROR',
            detail: errorContent || 'Provider returned error finish reason',
          })
        }

        // Some providers only surface tool calls via streaming chunks (and not on the final response object).
        const responseToolCalls = toolsEnabled
          ? response.toolCalls && response.toolCalls.length > 0
            ? response.toolCalls
            : collectedToolCalls
          : []

        if (response.content && response.content.trim().length > 0) {
          lastNonEmptyStreamContent = response.content
        }

        if (toolsEnabled && responseToolCalls.length > 0) {
          reasoningSteps.push({
            type: 'execute',
            content: `Calling: ${responseToolCalls.map((tc) => tc.function.name).join(', ')}`,
            timestamp: Date.now(),
          })
          store.updateThreadMessage(threadId, assistantMsgId, {
            reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: true },
          })

          const toolMessages: ChatMessage[] = []

          for (const tc of responseToolCalls) {
            const toolStart = Date.now()
            try {
              const parsed = parseToolArguments(tc.function.arguments)
              if (!parsed.ok) {
                const result = { error: `Failed to parse tool arguments: ${parsed.error}` }
                toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: {},
                  result: null,
                  durationMs: Date.now() - toolStart,
                  error: result.error,
                })
                evalToolCalls.push({ name: tc.function.name, args: {}, durationMs: Date.now() - toolStart, error: result.error })
                continue
              }

              const capToolResult = (s: string) => s.length > 4000 ? s.slice(0, 4000) + '\u2026(truncated)' : s
              const args = parsed.args
              const result = await executeToolCall(tc.function.name, args)
              executedTools.push({ name: tc.function.name, args, result })
              useWorkingContext.getState().recordToolCall(tc.function.name, args)
              toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: capToolResult(JSON.stringify(result)) })

              const tcDuration = Date.now() - toolStart
              telemetry.addToolCall({
                name: tc.function.name,
                arguments: args,
                result,
                durationMs: tcDuration,
              })
              evalToolCalls.push({ name: tc.function.name, args, durationMs: tcDuration })
            } catch (err) {
              const tcDuration = Date.now() - toolStart
              toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: String(err) }) })
              telemetry.addToolCall({
                name: tc.function.name,
                arguments: parseToolArguments(tc.function.arguments).ok
                  ? (parseToolArguments(tc.function.arguments) as any).args
                  : {},
                result: null,
                durationMs: tcDuration,
                error: String(err),
              })
              evalToolCalls.push({ name: tc.function.name, args: {}, durationMs: tcDuration, error: String(err) })
            }
          }
          toolCallRounds++

          // Nudge model to respond with text after heavy tool rounds (Gemini can silently stop otherwise)
          const totalToolResultSizeT = toolMessages.reduce((s, m) => s + (m.content?.length ?? 0), 0)
          const nudgeMessagesT: ChatMessage[] = totalToolResultSizeT > 2000
            ? [{ role: 'user', content: '(System: Tool results collected. Please now provide your complete response to the user.)' }]
            : []

          let currentMessages: ChatMessage[] = [
            ...messages,
            { role: 'assistant', content: null, tool_calls: responseToolCalls },
            ...toolMessages,
            ...nudgeMessagesT,
          ]

          let rounds = 0
          const maxRounds = 8
          while (rounds < maxRounds) {
            rounds++
            const followUpResponse = await adapter.chatStream(
              { messages: currentMessages, tools, stream: true },
              config,
              (chunk) => {
                if (chunk.content) {
                  receivedAnyText = true
                  store.appendToThreadMessage(threadId, assistantMsgId, chunk.content)
                }
              },
              abortControllerRef.current?.signal,
            )

            const followUpToolCalls = toolsEnabled ? (followUpResponse.toolCalls ?? []) : []
            if (followUpResponse.content && followUpResponse.content.trim().length > 0) {
              lastNonEmptyStreamContent = followUpResponse.content
            }

            if (!followUpToolCalls.length) break

            const newToolMessages: ChatMessage[] = []
            for (const tc of followUpToolCalls) {
              const toolStart = Date.now()
              try {
                const parsed = parseToolArguments(tc.function.arguments)
                if (!parsed.ok) {
                  const result = { error: `Failed to parse tool arguments: ${parsed.error}` }
                  newToolMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
                  telemetry.addToolCall({
                    name: tc.function.name,
                    arguments: {},
                    result: null,
                    durationMs: Date.now() - toolStart,
                    error: result.error,
                  })
                  continue
                }

                const args = parsed.args
                const result = await executeToolCall(tc.function.name, args)
                executedTools.push({ name: tc.function.name, args, result })
                useWorkingContext.getState().recordToolCall(tc.function.name, args)
                const capResultT = (s: string) => s.length > 4000 ? s.slice(0, 4000) + '\u2026(truncated)' : s
                newToolMessages.push({ role: 'tool', tool_call_id: tc.id, content: capResultT(JSON.stringify(result)) })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: args,
                  result,
                  durationMs: Date.now() - toolStart,
                })
              } catch (err) {
                newToolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: String(err) }),
                })
                telemetry.addToolCall({
                  name: tc.function.name,
                  arguments: parseToolArguments(tc.function.arguments).ok
                    ? (parseToolArguments(tc.function.arguments) as any).args
                    : {},
                  result: null,
                  durationMs: Date.now() - toolStart,
                  error: String(err),
                })
              }
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: null, tool_calls: followUpToolCalls },
              ...newToolMessages,
            ]
          }
        }

        const finalMsg = (useAgentAppStore.getState().threadMessages[threadId] || []).find(
          (m) => m.id === assistantMsgId,
        )
        const finalContent = (finalMsg?.content ?? '').trim()

        const hasToolCalls = (responseToolCalls?.length ?? 0) > 0 || (collectedToolCalls?.length ?? 0) > 0

        if (!finalContent) {
          if (lastNonEmptyStreamContent) {
            store.updateThreadMessage(threadId, assistantMsgId, { content: lastNonEmptyStreamContent })
          } else if (hasToolCalls) {
            const toolNames = executedTools.length
              ? executedTools.map((t) => t.name).join(', ')
              : [...(responseToolCalls || []), ...(collectedToolCalls || [])]
                  .map((tc) => tc.function?.name)
                  .filter(Boolean)
                  .join(', ')

            const canvasResult = executedTools.find((t) => t.name === 'get_home_canvas')?.result
            if (canvasResult && Array.isArray(canvasResult.nodes) && Array.isArray(canvasResult.edges)) {
              store.updateThreadMessage(threadId, assistantMsgId, {
                content: `Your Home canvas currently has ${canvasResult.nodes.length} nodes and ${canvasResult.edges.length} edges.`,
              })
            } else {
              store.updateThreadMessage(threadId, assistantMsgId, {
                content: `I executed: ${toolNames || 'the requested tools'}.`,
              })
            }

            console.warn('[Agent] Tool calls completed without text response', {
              provider,
              model,
              toolsEnabled,
              responseToolCalls: responseToolCalls?.length,
              collectedToolCalls: collectedToolCalls?.length,
              executedTools: executedTools.map((t) => t.name),
            })
          } else {
            store.updateThreadMessage(threadId, assistantMsgId, {
              content: receivedAnyText
                ? 'No response text was finalized. Please try again.'
                : 'LLM returned an empty response (no text chunks received). Please try again.',
            })
          }
        }

        reasoningSteps.push({ type: 'synthesize', content: 'Composing response...', timestamp: Date.now() })

        store.updateThreadMessage(threadId, assistantMsgId, {
          isStreaming: false,
          reasoning: { steps: reasoningSteps as any, durationMs: Date.now() - thinkingStartTime, isThinking: false },
        })

        telemetry.complete({
          assistantMessage: finalMsg?.content || '',
          finishReason: 'stop',
          tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        })

        // Write eval log (best-effort, non-blocking)
        void writeEvalLog({
          conversationId: threadId,
          provider,
          model,
          userMessage: content,
          assistantMessage: finalMsg?.content || '',
          systemPrompt,
          toolCount: tools?.length || 0,
          historyLength: threadMessages.length,
          finishReason: 'stop',
          toolCalls: evalToolCalls,
          toolCallRounds,
          latencyMs: Date.now() - telemetry.startTime,
          thinkingMs: reasoningSteps.length > 0 ? reasoningSteps[reasoningSteps.length - 1].timestamp - telemetry.startTime : undefined,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          errors: evalErrors.length > 0 ? evalErrors : undefined,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          store.updateThreadMessage(threadId, assistantMsgId, { content: 'Message cancelled.', isStreaming: false })
        } else {
          const errorMsg = err instanceof Error ? err.message : String(err)
          store.setError(errorMsg)
          store.updateThreadMessage(threadId, assistantMsgId, {
            content: `Sorry, an error occurred: ${errorMsg}`,
            isStreaming: false,
          })
        }
      } finally {
        store.setStreaming(false)
        abortControllerRef.current = null
      }
    },
    [],
  )

  return {
    sendChannelMessage,
    sendThreadMessage,
    cancelRequest,
  }
}
