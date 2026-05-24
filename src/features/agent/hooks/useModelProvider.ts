/**
 * useModelProvider - Multi-provider LLM integration
 *
 * Provides chat completion with function calling support.
 * Supports OpenAI, Ollama, and other providers via shared adapter.
 */

import { useCallback, useRef } from 'react'
import { useChatStore, type FileContext, type Reasoning, type ReasoningStep } from './useChatStore'
import { AGENT_TOOLS, executeToolCall } from '../tools'
import { getAdapter, PROVIDERS, type ChatMessage, type ToolCall, type ToolDefinition } from '@/lib/providers'
import { getSystemContext, formatSystemContextForPrompt } from '../context/systemContext'
import { useWorkingContext, formatWorkingContextForPrompt, buildWeightedHistory, getContextualTools } from '../context/workingContext'
import { createRequestBuilder, type ToolInvocation } from '../telemetry'
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

Available tools: resolve_entity, search_vault, query_graph, list_entities, read_note_content, get_home_canvas

Be concise. Max 2-3 sentences per field.`

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

/**
 * Process Gemini grounding metadata to add inline citations and extract sources
 */
function processGroundingMetadata(
  text: string,
  metadata: import('@/lib/providers/types').GroundingMetadata,
): { textWithCitations: string; sources: Array<{ url: string; title?: string }> } {
  const chunks = metadata.groundingChunks || []
  const supports = metadata.groundingSupports || []

  // Extract unique sources from grounding chunks
  const sources: Array<{ url: string; title?: string }> = []
  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      // Avoid duplicates
      if (!sources.some((s) => s.url === chunk.web!.uri)) {
        sources.push({ url: chunk.web.uri, title: chunk.web.title })
      }
    }
  }

  // If no supports, just return sources without inline citations
  if (supports.length === 0) {
    return { textWithCitations: text, sources }
  }

  // Sort supports by endIndex descending to avoid index shifting when inserting
  const sortedSupports = [...supports].sort((a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0))

  let result = text
  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex
    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue
    }

    // Build citation links
    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri
        if (uri) {
          return `[${i + 1}](${uri})`
        }
        return null
      })
      .filter(Boolean)

    if (citationLinks.length > 0) {
      const citationString = ' ' + citationLinks.join(', ')
      result = result.slice(0, endIndex) + citationString + result.slice(endIndex)
    }
  }

  return { textWithCitations: result, sources }
}

export function useModelProvider() {
  const {
    addMessage,
    updateMessage,
    appendToMessage,
    setStreaming,
    setError,
    getConversationHistory,
    modelConfig,
    fileContext,
  } = useChatStore()

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Build system prompt with file context
   */
  const buildSystemPrompt = useCallback((context: FileContext | null): string => {
    // Provide current date/time so the agent knows what "today" means
    const now = new Date()
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const isoDate = now.toISOString().split('T')[0] // YYYY-MM-DD format for tool calls

    let prompt = `You are the Filegraph Agent, an AI assistant that helps users navigate and query their personal knowledge vault.

**Current Date/Time:** ${currentDate} at ${currentTime}
**Today's date (for tools):** ${isoDate}

**CRITICAL BEHAVIOR RULES:**
1. **Always use tools immediately.** NEVER say "I don't have information" without first searching.
2. **Be proactive and decisive.** When asked to do something, DO IT. Don't ask for clarification unless truly ambiguous.
3. **Make spontaneous choices.** If asked to "open a random file" or "pick one", just pick one yourself and do it.
4. **Act first, explain after.** Execute the action, then briefly describe what you did.
5. **When in doubt, take action.** It's better to do something reasonable than to ask permission.
6. **PROACTIVE ENTITY SYNTHESIS:** When working with emails or any content, actively identify and create entities:
   - **People**: If someone is mentioned in an email (sender, recipient, or mentioned), check if they exist with \`resolve_entity\`. If not, CREATE them using \`write_file\` or \`edit_file\` to add to \`@entities/people.data\`.
   - **Projects**: If a project/work item is mentioned, create or update project entities.
   - **Dates**: Extract and note important dates, deadlines, or time-sensitive information.
   - **Organizations**: Identify companies/organizations from email domains or mentions.
   - **Relationships**: Infer relationships (e.g., "Jolene works at HBC Law" from email domain).
   - **Communication Patterns**: Note writing style, tone, and communication preferences for people.
   - **Context**: Always include context about where information came from (e.g., "from email about payroll").

## Multi-Step Reasoning

For complex queries, break them down into steps:

### Example: "What projects is Lauren working on?"
1. First: \`resolve_entity({ name: "Lauren" })\` → Get person ID
2. Then: \`search_vault({ query: "Lauren" })\` in proj namespace → Find related projects
3. Or: \`query_graph({ operation: "find_by_attribute", attribute: "client", value: "<person-id>", namespace: "proj" })\`

### Example: "Who is working on the filegraph project?"
1. First: \`resolve_entity({ name: "filegraph", namespace: "proj" })\` → Get project details including team
2. The resolved entity contains team members, client, etc.

## Query Strategy

1. **Entity by name** → Use \`resolve_entity\` FIRST, then use the returned attributes
2. **Relationships** ("who works on X", "what does Y own") → resolve_entity + search_vault or query_graph
3. **Note content** → resolve_entity(namespace="note") + read_note_content
4. **Financial** → query_graph with aggregate
5. **Emails** → list_entities(namespace="email") or query_graph(namespace="email") to find emails by subject, sender, date, etc.

## Tools

### Reading
- **resolve_entity**: Fuzzy-match names → returns entity with ALL attributes (team, client, etc.)
- **search_vault**: Full-text search across vault - use for relationship discovery
- **query_graph**: Filter by attribute value, aggregations
- **list_entities**: Browse by namespace
- **read_note_content**: Get note file contents
- **read_file**: Read any file contents by path

### Writing
- **write_file**: Write/create files in the vault (full file overwrite)
  - Path: relative from vault root (e.g., \`@notes/my-note.note\`, \`@entities/people.data\`)
  - For .note files: content must be valid JSON with TipTap block structure
  - For .data files: content must be valid JSON with items array
  - Creates parent directories automatically
- **edit_file**: Make surgical edits to existing files (search-and-replace)
  - Provide \`old_string\` (exact text to find) and \`new_string\` (replacement)
  - \`old_string\` must be unique in the file - include surrounding context if needed
  - Use \`replace_all: true\` to replace all occurrences
  - Fails safely if string not found or found multiple times

### UI Interaction
- **switch_app**: Navigate to a different app (home, calendar, graph, settings, terminal, etc.)
- **preview_file**: Open a file in the preview pane (temporary tab)
- **open_file**: Open a file as a pinned editor tab
- **navigate_to_directory**: Navigate to a directory in the file browser
- **set_layout_mode**: Change file view (table, grid, columns, tree, canvas)
- **toggle_panel**: Show/hide panels (terminal, graph, agent, preview, file-explorer)
- **set_zoom**: Adjust UI zoom (50-200, or "in"/"out"/"reset")
- **set_theme**: Change theme mode (light/dark/system) or preset
- **open_terminal**: Open terminal in bash or tql mode
- **close_editor_tab**: Close an editor tab
- **set_search**: Set the file search filter
- **toggle_dotfiles**: Show/hide hidden files

### Home Canvas (Visual Output - Use Sparingly)
- **get_home_canvas**: Read current Home canvas state (nodes, edges, viewport)
- **add_home_node**: Add a new node (richText, stickyNote, embed/youtube, filePreview, image, shape, table, codeBlock)
- **update_home_node**: Move/resize/update data on a node
- **add_home_edge**: Connect two nodes
- **remove_home_edge**: Remove a connection/edge
- **remove_home_node**: Remove a node
- **auto_layout_home_canvas**: Auto-layout nodes using a graph layout (dagre)
- **grid_layout_home_canvas**: Arrange nodes into a grid
- **align_home_nodes**: Align nodes (left/center/right/top/middle/bottom)
- **distribute_home_nodes**: Distribute nodes evenly (horizontal/vertical)
- **create_home_group**: Group nodes into a container
- **ungroup_home_nodes**: Ungroup a container

**If the user asks what's on their canvas (or to list/summarize the Home canvas), ALWAYS call
\`get_home_canvas({ includeData: false })\` and summarize the nodes/edges in text.**

**IMPORTANT: Text responses are the default.** Only use Home canvas tools when visual output provides clear value that text cannot. Don't open or modify the canvas unless you have something genuinely worth showing.

### Web Search & Research (Gemini only)
- **web_search**: Search the web for current information using Google Search grounding. Use for recent events, current facts, real-time info. Returns results with citations.
- **deep_research**: Comprehensive multi-step research using Gemini Deep Research Agent. Autonomously plans, searches, and synthesizes a detailed cited report. Takes 1-5 minutes. Use for complex research questions.

### Memory & Personalization
- **get_user_profile**: Get the user's identity, personality, preferences, background, and goals
- **get_memories**: Retrieve relevant memories from long-term storage (search by query or category)
- **save_memory**: Save important information to remember across conversations
- **delete_memory**: Remove a memory by ID

### Widgets (Timer, etc.)
- **start_timer**: Start a countdown timer (minutes, optional name). Shows in status bar.
- **pause_timer**: Pause the running timer
- **resume_timer**: Resume a paused timer
- **stop_timer**: Stop and reset the timer
- **get_timer_state**: Get current timer status, remaining time, progress
- **get_enabled_widgets**: List enabled status bar widgets
- **enable_widget**: Enable a widget (timer, quick-notes, today-schedule, calculator, etc.)
- **disable_widget**: Disable a widget from the status bar

**Memory Best Practices:**
- Use \`get_user_profile\` at conversation start to personalize your approach
- Use \`save_memory\` when you learn something important (preferences, corrections, context)
- Don't save trivial information or things obvious from context
- Categories: preferences, system, development, workflow, project, personal

**DEFAULT: Respond with text.** Most questions deserve a text answer.

**Only use Home canvas when ALL of these are true:**
1. The user explicitly requests visualization ("show me", "diagram", "visualize", "draw")
2. OR the content genuinely requires spatial/visual representation that text cannot convey
3. AND you have concrete content to display (not just "let me show you" with nothing ready)

**DO NOT use canvas for:**
- Simple questions ("What is X?", "Who is Y?", "How do I...?")
- Yes/no answers
- Single facts, names, dates, or short explanations
- Summaries or status updates
- Conversational exchanges
- When you could answer in 1-3 paragraphs of text

**DO use canvas for:**
- Complex relationship diagrams (only when user asks or 4+ interconnected items)
- Side-by-side comparisons of 3+ items (when user requests comparison)
- Process flowcharts (when user asks to visualize a workflow)
- Code that needs syntax highlighting AND surrounding context nodes

**If using canvas, first call get_home_canvas to:**
- Check existing layout and avoid overlap
- Understand what's already there before adding

**Layout & Visual Communication Best Practices:**

*Positioning & Spacing:*
- Use generous spacing between nodes (400-600px horizontal, 300-400px vertical)
- Align related items in rows or columns for visual grouping
- Place primary/central concepts in the center, supporting items around them
- Use consistent grid alignment (multiples of 50px work well)

*Node Sizing (default sizes are large - embeds are 600x450, diagrams 500x350):*
- Text annotations: 280-400px wide
- Code blocks: 450px+ wide for readability
- Diagrams/mermaid: 500px+ to show full flowcharts
- Embeds/iframes: 600px+ (websites need space!)
- File previews: 450px+ for content visibility

*Connections & Flow:*
- Use connections to show relationships, data flow, or sequence
- Connect from source → target (top-to-bottom or left-to-right)
- Add labels to connections to explain the relationship
- Create visual hierarchies: parent nodes above children

*Effective Layouts:*
- **Comparison**: Side-by-side items at same Y position
- **Hierarchy**: Tree structure with parent centered above children
- **Process/Flow**: Left-to-right or top-to-bottom sequence
- **Radial**: Central concept with related items around it
- **Timeline**: Horizontal sequence with consistent spacing

*Example positions for 3 items in a row:*
\`\`\`
{ x: 50, y: 100 }   // Left
{ x: 550, y: 100 }  // Center
{ x: 1050, y: 100 } // Right
\`\`\`

*Example positions for hierarchy (1 parent, 2 children):*
\`\`\`
Parent:   { x: 400, y: 50 }
Child 1:  { x: 100, y: 450 }
Child 2:  { x: 700, y: 450 }
\`\`\`

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
**When the user asks to build, scaffold, or set up a NEW project:** use \`setup_dev_workspace\`. It automatically handles port allocation and canvas layout.

**Manual Setup Pattern (if needed):**
1. \`get_available_port()\` → Get \`PORT\`
2. \`run_command("mkdir -p <path>")\`
3. \`write_file\` — create files
4. \`add_home_node("terminal", ...)\`
5. \`add_home_node("codeBlock", ...)\`
6. \`add_home_node("embed", { url: "http://localhost:PORT" })\`
7. \`create_home_group([...])\`
8. \`write_to_terminal(termId, "npm start -- --port PORT")\` (inject the PORT)

## Guided Visual Tour (Canvas Focus Pattern)
Use \`focus_home_node\` to guide the user's eye through canvas nodes while you work:
- **Before editing a file** → focus the codeBlock node so the user sees what's changing
- **After editing** → focus the same node to show the update
- **After \`verify_dev_project\` passes** → the tool auto-focuses the preview; no extra call needed
- **After \`setup_dev_workspace\`** → focus the returned \`groupId\` first (overview), then \`focus_home_node(nodeType: "embed")\` (preview)

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
After completing ANY work, always provide:
1. **What was done** — concise list of changes
2. **How to use it** — controls, shortcuts, game mechanics, key features (specific — e.g., "Arrow keys to move, Space to shoot")
3. **Suggested next steps** — 2-3 concrete ideas
4. **Ask** — what would you like to do next?

Never skip this. Even a one-line fix deserves a quick summary and follow-up question.

If \`setup_dev_workspace\` is not available, follow this manual pattern:
1. \`run_command("mkdir -p <path>")\` — create the project directory
2. \`write_file\` — create each project file
3. \`add_home_node("terminal", ...)\` — add a terminal with \`{cwd: "<path>"}\`
4. \`add_home_node("codeBlock", ...)\` — code editors with \`{filePath, language}\`
5. \`add_home_node("embed", ...)\` — web preview with \`{url: "http://localhost:PORT"}\`
6. \`create_home_group([...nodeIds], "Project Name")\` — group all nodes

## Vault Structure

The vault root is \`~/.filegraph\` by default. Core directories (prefixed with @):

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| \`@entities/\` | People, orgs, projects, tasks, milestones | \`people.data\`, \`organizations.data\`, \`projects.data\`, \`tasks.data\`, \`milestones.data\` |
| \`@finance/\` | Financial data | \`accounts.data\`, \`bills.data\`, \`subscriptions.data\`, \`transactions.data\` |
| \`@calendar/\` | Events and reminders | \`events.data\`, \`reminders.data\` |
| \`@notes/\` | Prose notes (.note files) | Any \`.note\` file |
| \`@system/\` | Vault config and global graph | \`config.data\`, \`_graph_.data\` |

**When opening workspaces for namespaces, use the full path:**
- Finance: \`~/.filegraph/@finance\`
- Entities: \`~/.filegraph/@entities\`
- Notes: \`~/.filegraph/@notes\`
- Calendar: \`~/.filegraph/@calendar\`

## Namespaces & Entity IDs

Entity IDs follow \`namespace:slug:index\` format (e.g., \`person:sarah:001\`, \`acc:checking:001\`).

| Namespace | File Location | Examples |
|-----------|---------------|----------|
| \`person\` | \`@entities/people.data\` | \`person:sarah:001\` |
| \`org\` | \`@entities/organizations.data\` | \`org:acme:001\` |
| \`proj\` | \`@entities/projects.data\` | \`proj:filegraph:001\` |
| \`task\` | \`@entities/tasks.data\` | \`task:review:001\` |
| \`ms\` | \`@entities/milestones.data\` | \`ms:launch:001\` |
| \`acc\` | \`@finance/accounts.data\` | \`acc:checking:001\` |
| \`bill\` | \`@finance/bills.data\` | \`bill:rent:001\` |
| \`sub\` | \`@finance/subscriptions.data\` | \`sub:netflix:001\` |
| \`tx\` | \`@finance/transactions.data\` | \`tx:grocery:001\` |
| \`event\` | \`@calendar/events.data\` | \`event:meeting:001\` |
| \`note\` | \`@notes/*.note\` | \`note:welcome\` |

## Key Attributes by Namespace

- **proj**: client (person/org reference), team (array of person references), status
- **person**: email, role, organization, phone, website, bio, skills, rate, capacity, avatar
- **email**: subject, from, fromEmail, to, cc, bcc, snippet, body, date, isUnread, isStarred, labels, gmailId, threadId, attachments
- **tx**: amount, category, account, date

**Remember: Projects store references to people in 'client' and 'team' fields. Search for a person's name to find their projects.**

## Proactive Entity Creation from Emails

When asked to create entities from emails (e.g., "Create a person entity for Jolene"), follow these steps:

1. **Check if entity exists**: Use \`resolve_entity({ name: "Jolene", namespace: "person" })\` first
2. **Read the people.data file**: Use \`read_file({ path: "@entities/people.data" })\` to see the structure
3. **Create the entity**: Use \`edit_file\` to add the new person to the items array, or \`write_file\` if the file doesn't exist
4. **Entity structure for people**:
   - \`id\`: \`person:slug:001\` format (slug from name, index from highest existing + 1)
   - \`slug\`: lowercase, hyphenated version of name
   - \`name\`: Full name
   - \`email\`: Email address if available
   - \`role\`: Job title or role if mentioned
   - \`organization\`: Reference to org entity (e.g., \`org:hbc-law:001\`) if identifiable
   - \`bio\`: Brief context about how you know them (e.g., "Email sender about payroll at HBC Law")
5. **Extract from email context**:
   - Parse "From" field: "Jolene Maiden <jmaiden@hbc.law>" → name: "Jolene Maiden", email: "jmaiden@hbc.law"
   - Infer organization from email domain: "hbc.law" → likely "HBC Law" organization
   - Extract dates, deadlines, or important information from subject/snippet
6. **Create relationships**: If an organization is mentioned, create or link to org entity
7. **Be eager**: Don't wait to be asked - if you see a person mentioned, proactively check and create if needed

**Example workflow for "Create a person entity for Jolene from email":**
1. \`resolve_entity({ name: "Jolene", namespace: "person" })\` → Check if exists
2. \`read_file({ path: "@entities/people.data" })\` → Get file structure
3. \`edit_file({ path: "@entities/people.data", old_string: '"items": [', new_string: '"items": [\n    {\n      "id": "person:jolene-maiden:001",\n      "slug": "jolene-maiden",\n      "name": "Jolene Maiden",\n      "email": "jmaiden@hbc.law",\n      "organization": "org:hbc-law:001",\n      "bio": "Email sender about payroll at HBC Law"\n    },' })\`
4. Confirm creation: "Created person entity for Jolene Maiden (jmaiden@hbc.law) from HBC Law"
`

    // Add real-time system context
    const systemContext = getSystemContext()
    prompt += `\n\n${formatSystemContextForPrompt(systemContext)}`

    const workingCtx = formatWorkingContextForPrompt()
    if (workingCtx) {
      prompt += `\n\n${workingCtx}`
    }

    if (context) {
      prompt += `\n\n## Current File Context (from selection)
Path: ${context.path}
${context.selection ? `\nSelected text:\n\`\`\`\n${context.selection.text}\n\`\`\`` : ''}
${!context.selection && context.content ? `\nFile content (first 2000 chars):\n\`\`\`\n${context.content.slice(0, 2000)}\n\`\`\`` : ''}
`
    }

    return prompt
  }, [])

  /**
   * Send a message and get a response using the provider adapter
   */
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: Array<{ id: string; name: string; type: string; size: number; data: string; previewUrl?: string }>,
    ) => {
      const { provider, model, apiKey: storedApiKey } = modelConfig

      // Get API key based on provider
      let apiKey = storedApiKey
      if (!apiKey) {
        if (provider === 'gemini') {
          apiKey = import.meta.env.VITE_GEMINI_API_KEY
        } else if (provider === 'openai' || provider === 'groq') {
          apiKey = import.meta.env.VITE_OPENAI_API_KEY
        }
      }

      // Check if API key is required
      const providerDef = PROVIDERS[provider]
      if (providerDef?.requiresApiKey && !apiKey) {
        setError(`${providerDef.name} API key not configured. Add it in Settings.`)
        return
      }

      // Add user message with attachments if present
      const attachmentNames = attachments?.map((a) => a.name).join(', ')
      addMessage({
        role: 'user',
        content: content || (attachments?.length ? `[Attached: ${attachmentNames}]` : ''),
        attachments: attachments,
      })

      // Create assistant message placeholder with thinking state
      const thinkingStartTime = Date.now()
      const reasoningSteps: ReasoningStep[] = []

      const assistantMsgId = addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
        reasoning: { steps: [], durationMs: 0, isThinking: true },
      })

      setStreaming(true)
      abortControllerRef.current = new AbortController()

      // Initialize telemetry tracking
      const activeConversationId = useChatStore.getState().activeConversationId || 'unknown'
      const telemetry = createRequestBuilder(activeConversationId, content, provider, model)

      try {
        const history = getConversationHistory()
        const systemPrompt = buildSystemPrompt(fileContext)
        const adapter = getAdapter(provider)
        const config = { provider, model, apiKey }
        // Track whether we actually received any text chunks (some providers can stop with only tool calls)
        let receivedAnyText = false
        let lastNonEmptyStreamContent: string | null = null

        // === PHASE 1: Planning/Reasoning ===
        const planningMessages: ChatMessage[] = [
          { role: 'system', content: PLANNING_PROMPT },
          { role: 'user', content: `User query: "${content}"\n\nCreate a plan to answer this.` },
        ]

        let plan: { assessment?: string; goal?: string; steps?: string[]; tools_needed?: string[] } = {}
        try {
          const planResponse = await adapter.chat({ messages: planningMessages, stream: false }, config)
          const jsonMatch = planResponse.content?.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0])
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
          // Planning failed, continue without it
          reasoningSteps.push({
            type: 'assess',
            content: 'Processing query directly...',
            timestamp: Date.now(),
          })
        }

        // Update message with reasoning so far
        updateMessage(assistantMsgId, {
          reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: true },
        })

        // Build messages for the adapter with temperature-tiered history (hot/warm/cool/cold)
        const MAX_MESSAGES_WITH_IMAGES = 2 // Only recent messages get image attachments

        const historyWithoutCurrent = history.slice(0, -1)
        const prunedHistory = buildWeightedHistory(historyWithoutCurrent)

        // Track user messages from end for image inclusion decisions
        const reversedHistory = [...prunedHistory].reverse()

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...prunedHistory.map((m, idx) => {
            const msg: ChatMessage = { role: m.role as 'user' | 'assistant', content: m.content }

            // Include attachments only for recent user messages (token optimization)
            if (m.role === 'user' && m.attachments?.length) {
              // Count from end to determine if this is a recent message
              const distanceFromEnd = prunedHistory.length - 1 - idx
              const userMessagesFromEnd = reversedHistory
                .slice(0, distanceFromEnd + 1)
                .filter((x) => x.role === 'user').length

              if (userMessagesFromEnd <= MAX_MESSAGES_WITH_IMAGES) {
                // Only include attachments that have data (not stripped by persistence)
                const attachmentsWithData = m.attachments.filter(
                  (att: { type: string; data?: string; name?: string }) => att.data,
                )
                if (attachmentsWithData.length > 0) {
                  msg.attachments = attachmentsWithData.map((att: { type: string; data: string; name?: string }) => ({
                    type: att.type,
                    data: att.data,
                    name: att.name,
                  }))
                }
              } else {
                // For older messages, just note that images were attached
                const imageNames = m.attachments.map((a: { name?: string }) => a.name).join(', ')
                msg.content = `${msg.content}\n[Previously attached: ${imageNames}]`
              }
            }
            return msg
          }),
        ]

        // Format tools for the adapter (context-aware reordering)
        const contextualTools = getContextualTools(AGENT_TOOLS as unknown as Array<{ name: string; description: string; parameters?: any }>)
        const tools: ToolDefinition[] = contextualTools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }))

        // === PHASE 2: Execute with tools ===
        // Stream the response
        let collectedToolCalls: ToolCall[] = []
        let collectedGroundingMetadata: import('@/lib/providers/types').GroundingMetadata | undefined
        const evalToolCalls: EvalToolCall[] = []
        const evalErrors: EvalError[] = []
        let toolCallRounds = 0

        const response = await adapter.chatStream(
          { messages, tools, stream: true },
          config,
          (chunk) => {
            if (chunk.content) {
              receivedAnyText = true
              appendToMessage(assistantMsgId, chunk.content)
            }
            if (chunk.toolCalls) {
              collectedToolCalls = chunk.toolCalls
            }
            if (chunk.groundingMetadata) {
              collectedGroundingMetadata = chunk.groundingMetadata
            }
          },
          abortControllerRef.current.signal,
        )
        if (response.content && response.content.trim().length > 0) {
          lastNonEmptyStreamContent = response.content
        }

        // Capture error finish reasons for eval logging
        if (response.finishReason === 'error') {
          const errorContent = response.content || ''
          const isMalformed = errorContent.includes('MALFORMED_FUNCTION_CALL')
          evalErrors.push({
            type: isMalformed ? 'MALFORMED_FUNCTION_CALL' : 'PROVIDER_ERROR',
            detail: errorContent || 'Provider returned error finish reason',
          })
        }

        // Execute any tool calls
        if (response.toolCalls.length > 0) {
          const toolMessages: ChatMessage[] = []

          // Track tool execution in reasoning
          reasoningSteps.push({
            type: 'execute',
            content: `Calling: ${response.toolCalls.map((tc) => tc.function.name).join(', ')}`,
            timestamp: Date.now(),
          })
          updateMessage(assistantMsgId, {
            reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: true },
          })

          // Track any card data and sources from tool results to attach to the message
          let pendingCard: any = null
          let pendingSources: Array<{ url?: string; title?: string }> = []

          for (const tc of response.toolCalls) {
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

              const args = parsed.args
              const result = await executeToolCall(tc.function.name, args)
              useWorkingContext.getState().recordToolCall(tc.function.name, args)

              // Extract sources from web_search/deep_research results
              if (
                (tc.function.name === 'web_search' || tc.function.name === 'deep_research') &&
                result &&
                typeof result === 'object' &&
                'sources' in result &&
                Array.isArray(result.sources)
              ) {
                pendingSources.push(...result.sources.filter((s: any) => s.url || s.title))
              }

              // Check if result has card data to attach to message
              const capToolResult = (s: string) => s.length > 4000 ? s.slice(0, 4000) + '\u2026(truncated)' : s
              if (result && typeof result === 'object' && '__card__' in result) {
                pendingCard = result.__card__
                // Remove __card__ from result before sending to model
                const { __card__, ...cleanResult } = result
                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: capToolResult(JSON.stringify(cleanResult)),
                })
              } else {
                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: capToolResult(JSON.stringify(result)),
                })
              }

              // Track tool call for telemetry + eval
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
              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: String(err) }),
              })
              // Track failed tool call
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

          // If we have pending card data or sources, attach them to the assistant message
          if (pendingCard || pendingSources.length > 0) {
            updateMessage(assistantMsgId, {
              ...(pendingCard && { card: pendingCard }),
              ...(pendingSources.length > 0 && { sources: pendingSources }),
            })
          }

          // Make follow-up request with tool results - support multi-round tool calling
          // Nudge the model to respond with text after tool calls (Gemini can silently stop otherwise)
          const totalToolResultSize = toolMessages.reduce((s, m) => s + (m.content?.length ?? 0), 0)
          const nudgeMessages: ChatMessage[] = totalToolResultSize > 2000
            ? [{ role: 'user', content: '(System: Tool results collected. Please now provide your complete response to the user.)' }]
            : []

          let currentMessages: ChatMessage[] = [
            ...messages,
            { role: 'assistant', content: null, tool_calls: response.toolCalls },
            ...toolMessages,
            ...nudgeMessages,
          ]

          // Loop to handle multiple rounds of tool calls (max 8 to support verify→fix→re-verify flows)
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
                  appendToMessage(assistantMsgId, chunk.content)
                }
              },
              abortControllerRef.current?.signal,
            )
            if (followUpResponse.content && followUpResponse.content.trim().length > 0) {
              lastNonEmptyStreamContent = followUpResponse.content
            }

            // If no more tool calls, we're done
            if (!followUpResponse.toolCalls.length) break

            // Execute the new tool calls
            const newToolMessages: ChatMessage[] = []
            for (const tc of followUpResponse.toolCalls) {
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
                useWorkingContext.getState().recordToolCall(tc.function.name, args)

                // Check if result has card data to attach to message
                if (result && typeof result === 'object' && '__card__' in result) {
                  pendingCard = result.__card__
                  const { __card__, ...cleanResult } = result
                  newToolMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(cleanResult),
                  })
                  // Attach card immediately
                  updateMessage(assistantMsgId, { card: pendingCard })
                } else {
                  newToolMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                  })
                }

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

            // Append to conversation for next round
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: null, tool_calls: followUpResponse.toolCalls },
              ...newToolMessages,
            ]
          }
        }

        // Finalize reasoning and mark message as complete
        reasoningSteps.push({
          type: 'synthesize',
          content: 'Composing response...',
          timestamp: Date.now(),
        })

        // Get final message content for telemetry
        const finalMessage = useChatStore
          .getState()
          .conversations.find((c) => c.id === activeConversationId)
          ?.messages.find((m) => m.id === assistantMsgId)

        // Record telemetry (estimate tokens from content length)
        const inputTokens = Math.ceil((systemPrompt.length + content.length) / 4)
        const outputTokens = Math.ceil((finalMessage?.content?.length || 0) / 4)
        telemetry.setReasoning(reasoningSteps)
        const cost = telemetry.complete({
          assistantMessage: finalMessage?.content || '',
          finishReason: 'stop',
          tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        })

        // Write eval log (best-effort, non-blocking)
        const latencyMs = Date.now() - telemetry.startTime
        void writeEvalLog({
          conversationId: activeConversationId,
          provider,
          model,
          userMessage: content,
          assistantMessage: finalMessage?.content || '',
          systemPrompt,
          toolCount: tools.length,
          historyLength: prunedHistory.length,
          finishReason: 'stop',
          toolCalls: evalToolCalls,
          toolCallRounds,
          latencyMs,
          thinkingMs: reasoningSteps.length > 0 ? reasoningSteps[reasoningSteps.length - 1].timestamp - telemetry.startTime : undefined,
          inputTokens,
          outputTokens,
          cost: 0,
          errors: evalErrors.length > 0 ? evalErrors : undefined,
        })

        // If we somehow received no text at all, avoid leaving an empty assistant bubble.
        // This can happen when a provider/tool-call flow returns stop with no content, or if the stream fails silently.
        const finalContent = (finalMessage?.content ?? '').trim()
        const hasToolCalls = (response?.toolCalls?.length ?? 0) > 0 || (collectedToolCalls?.length ?? 0) > 0

        if (!finalContent) {
          // Prefer any content returned by the adapter (even if chunks were missed).
          if (lastNonEmptyStreamContent) {
            updateMessage(assistantMsgId, { content: lastNonEmptyStreamContent })
          } else if (hasToolCalls) {
            // Tool calls completed but no text response - provide helpful fallback
            const toolNames = [...(response?.toolCalls || []), ...(collectedToolCalls || [])]
              .map((tc) => tc.function?.name)
              .filter(Boolean)
              .join(', ')
            updateMessage(assistantMsgId, {
              content: `I executed the following tools: ${toolNames || 'unknown'}. However, I couldn't generate a text response. Please try asking again.`,
            })
          } else {
            // Only warn if truly empty (no text AND no tool calls)
            const fallback = receivedAnyText
              ? 'No response text was finalized. Please try again.'
              : 'LLM returned an empty response (no text chunks received). Please try again.'
            console.warn('[Agent] Empty assistant response', {
              provider,
              model,
              receivedAnyText,
              toolCalls: response?.toolCalls?.length,
              collectedToolCalls: collectedToolCalls?.length,
            })
            updateMessage(assistantMsgId, { content: fallback })
          }
        }

        // Process grounding metadata (Gemini web search citations) if present
        const groundingMeta = collectedGroundingMetadata || response.groundingMetadata
        if (groundingMeta && (groundingMeta.groundingChunks?.length || groundingMeta.groundingSupports?.length)) {
          const currentContent =
            useChatStore
              .getState()
              .conversations.find((c) => c.id === activeConversationId)
              ?.messages.find((m) => m.id === assistantMsgId)?.content || ''

          const { textWithCitations, sources } = processGroundingMetadata(currentContent, groundingMeta)

          updateMessage(assistantMsgId, {
            content: textWithCitations,
            sources: sources.map((s) => ({ url: s.url, title: s.title })),
          })
        }

        updateMessage(assistantMsgId, {
          isStreaming: false,
          reasoning: { steps: reasoningSteps, durationMs: Date.now() - thinkingStartTime, isThinking: false },
        })

        // Detect quick-reply options in the final message
        const finalMsg = useChatStore.getState().conversations
          .find((c) => c.id === useChatStore.getState().activeConversationId)
          ?.messages.find((m) => m.id === assistantMsgId)
        if (finalMsg && !finalMsg.card) {
          const detected = detectQuickReplyOptions(finalMsg.content)
          if (detected) {
            updateMessage(assistantMsgId, {
              card: {
                type: 'quick-reply' as const,
                question: detected.question,
                options: detected.options,
              },
            })
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Record abort in telemetry
          telemetry.complete({
            assistantMessage: 'Message cancelled.',
            finishReason: 'error',
            tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            error: 'Request aborted by user',
            errorType: 'abort',
          })
          updateMessage(assistantMsgId, {
            content: 'Message cancelled.',
            isStreaming: false,
          })
        } else {
          console.error('[Agent] Error during chat:', err)
          const errorMsg = err instanceof Error ? err.message : 'An error occurred'
          // Record error in telemetry
          telemetry.complete({
            assistantMessage: 'Sorry, an error occurred. Please try again.',
            finishReason: 'error',
            tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            error: errorMsg,
            errorType: 'api',
          })
          setError(errorMsg)
          updateMessage(assistantMsgId, {
            content: 'Sorry, an error occurred. Please try again.',
            isStreaming: false,
          })
        }
      } finally {
        setStreaming(false)
        abortControllerRef.current = null
      }
    },
    [
      modelConfig,
      fileContext,
      addMessage,
      updateMessage,
      appendToMessage,
      setStreaming,
      setError,
      getConversationHistory,
      buildSystemPrompt,
    ],
  )

  /**
   * Cancel the current request
   */
  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return {
    sendMessage,
    cancelRequest,
  }
}
