/**
 * Working Context Store
 *
 * Tracks the agent's current focus (project, files, recent tools) with
 * heat-based decay so that ambiguous requests are resolved against the
 * most immediate working context rather than app-level capabilities.
 *
 * Heat formula: heat = e^(-λ * minutesSinceLastActivity)
 * λ = 0.05 → ~50% at 14 min, ~10% at 46 min
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { formatProcessesForPrompt } from './processRegistry'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FocusType = 'project' | 'file' | 'entity' | 'conversation' | null

export interface FocusState {
  type: FocusType
  projectPath?: string
  projectName?: string
  files?: string[]
  entityIds?: string[]
}

export interface RecentToolCall {
  name: string
  args: Record<string, any>
  timestamp: number
}

// Tools that update focus when called
const FOCUS_TOOLS: Record<string, (args: Record<string, any>) => Partial<FocusState> | null> = {
  setup_dev_workspace: (args) => ({
    type: 'project',
    projectPath: args.projectPath,
    projectName: args.name,
    files: args.files?.map((f: { path: string }) => f.path) || [],
  }),
  write_file: (args) => {
    if (!args.path) return null
    return { type: 'file', files: [args.path] }
  },
  edit_file: (args) => {
    if (!args.path) return null
    return { type: 'file', files: [args.path] }
  },
  read_file: (args) => {
    if (!args.path) return null
    return { type: 'file', files: [args.path] }
  },
  run_command: (args) => {
    if (!args.cwd) return null
    return { type: 'project', projectPath: args.cwd }
  },
  write_to_terminal: () => null, // Doesn't change focus
}

// Tools that should NOT update focus (app-level tools)
const APP_LEVEL_TOOLS = new Set([
  'set_theme',
  'set_layout',
  'set_zoom',
  'toggle_preview',
  'toggle_dotfiles',
  'toggle_file_explorer',
  'toggle_terminal',
  'toggle_graph',
  'navigate_to',
  'open_app',
])

// Decay constant: 0.05 → ~50% heat after 14 min
const DECAY_LAMBDA = 0.05

// Max recent tool calls to keep
const MAX_RECENT_TOOLS = 15

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface WorkingContextState {
  focus: FocusState
  recentTools: RecentToolCall[]
  lastActivityAt: number

  // Actions
  updateFocus: (partial: Partial<FocusState>) => void
  recordToolCall: (name: string, args: Record<string, any>) => void
  clearFocus: () => void
}

export const useWorkingContext = create<WorkingContextState>()(
  persist(
    (set, get) => ({
      focus: { type: null },
      recentTools: [],
      lastActivityAt: 0,

      updateFocus: (partial) => {
        set((state) => {
          const merged: FocusState = { ...state.focus, ...partial }

          // Merge files (dedupe, keep last 20)
          if (partial.files && state.focus.files) {
            const allFiles = [...new Set([...state.focus.files, ...partial.files])]
            merged.files = allFiles.slice(-20)
          }

          // Merge entity IDs
          if (partial.entityIds && state.focus.entityIds) {
            merged.entityIds = [...new Set([...state.focus.entityIds, ...partial.entityIds])].slice(-10)
          }

          return { focus: merged, lastActivityAt: Date.now() }
        })
      },

      recordToolCall: (name, args) => {
        const entry: RecentToolCall = { name, args, timestamp: Date.now() }

        set((state) => {
          const recentTools = [...state.recentTools, entry].slice(-MAX_RECENT_TOOLS)
          const updates: Partial<WorkingContextState> = { recentTools, lastActivityAt: Date.now() }
          return updates
        })

        // Auto-update focus based on tool type
        if (APP_LEVEL_TOOLS.has(name)) return // Skip app-level tools

        const focusUpdater = FOCUS_TOOLS[name]
        if (focusUpdater) {
          const focusUpdate = focusUpdater(args)
          if (focusUpdate) {
            get().updateFocus(focusUpdate)
          }
        }
      },

      clearFocus: () => {
        set({ focus: { type: null }, recentTools: [], lastActivityAt: 0 })
      },
    }),
    {
      name: 'filegraph-working-context',
      partialize: (state) => ({
        focus: state.focus,
        recentTools: state.recentTools.slice(-5), // Persist only last 5
        lastActivityAt: state.lastActivityAt,
      }),
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// Computed helpers (pure functions, not in store to avoid stale closures)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current heat score (0–1) based on exponential decay from last activity.
 */
export function getHeat(): number {
  const { lastActivityAt } = useWorkingContext.getState()
  if (!lastActivityAt) return 0
  const minutesElapsed = (Date.now() - lastActivityAt) / 60_000
  return Math.exp(-DECAY_LAMBDA * minutesElapsed)
}

/**
 * Format the working context as a system prompt section.
 * Returns empty string if focus is cold (heat < 0.2) or no focus set.
 */
export function formatWorkingContextForPrompt(): string {
  const { focus, recentTools } = useWorkingContext.getState()
  const heat = getHeat()

  if (heat < 0.2 || !focus.type) return ''

  const lines: string[] = ['## Current Working Context']

  // Heat indicator
  const heatIcon = heat > 0.7 ? '🔥' : heat > 0.4 ? '🟡' : '🔵'
  lines.push('')

  // Project/file focus
  if (focus.type === 'project' && focus.projectName) {
    lines.push(`${heatIcon} **Active Project:** ${focus.projectName}${focus.projectPath ? ` (\`${focus.projectPath}\`)` : ''}`)
  } else if (focus.type === 'file') {
    lines.push(`${heatIcon} **Working on files**`)
  } else if (focus.type === 'entity') {
    lines.push(`${heatIcon} **Working with entities**`)
  }

  // Recent files
  if (focus.files?.length) {
    const displayFiles = focus.files.slice(-8)
    lines.push(`**Recent files:** ${displayFiles.map((f) => f.split('/').pop() || f).join(', ')}`)
  }

  // Recent tools (deduplicated, last 5 unique)
  if (recentTools.length > 0) {
    const uniqueNames = [...new Set(recentTools.slice(-8).map((t) => t.name))]
    lines.push(`**Recent tools:** ${uniqueNames.join(', ')}`)
  }

  // Running dev servers
  const processesSection = formatProcessesForPrompt()
  if (processesSection) {
    lines.push('')
    lines.push(processesSection)
  }

  // Disambiguation directive
  lines.push('')
  lines.push(
    '⚠ **IMPORTANT:** When the user makes ambiguous requests like "make it light mode", "change the colors", ' +
      '"add a button", "fix the layout", etc., they are referring to THIS PROJECT\'s files — ' +
      'not the Filegraph app settings. Only use app-level tools (`set_theme`, `set_layout`, `set_zoom`, etc.) ' +
      'if the user *explicitly* mentions "Filegraph", "the app", "this app", or "the UI".',
  )

  return lines.join('\n')
}

/**
 * Check if a tool name is an app-level tool (not project-related).
 */
export function isAppLevelTool(name: string): boolean {
  return APP_LEVEL_TOOLS.has(name)
}

/**
 * Get the list of app-level tool names (for tool reordering).
 */
export function getAppLevelToolNames(): ReadonlySet<string> {
  return APP_LEVEL_TOOLS
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Temperature-tiered message history
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal message shape expected by buildWeightedHistory */
export interface HistoryMessage {
  role: string
  content: string
  attachments?: any[]
  toolCalls?: any[]
}

/**
 * Tier boundaries (from the end of the array):
 *   Hot  = last 4 messages  → sent as-is
 *   Warm = 5–10             → full content, attachments stripped
 *   Cool = 11–20            → summarised to one line each
 *   Cold = 21+              → dropped
 */
const HOT_COUNT = 4
const WARM_END = 10
const COOL_END = 20

/**
 * Build a temperature-weighted message history.
 *
 * Returns a new array where:
 *  - Cold (oldest) messages are dropped
 *  - Cool messages are collapsed into a single context-setting message
 *  - Warm messages keep content but lose heavy attachments
 *  - Hot (most recent) messages are returned unchanged
 */
export function buildWeightedHistory<T extends HistoryMessage>(
  messages: T[],
): T[] {
  if (messages.length <= HOT_COUNT) return messages

  const total = messages.length

  // Split into tiers (indices relative to start of array)
  const coldEnd = Math.max(0, total - COOL_END) // 0..coldEnd = cold (dropped)
  const coolStart = coldEnd
  const coolEnd = Math.max(coolStart, total - WARM_END) // coolStart..coolEnd = cool
  const warmStart = coolEnd
  const warmEnd = Math.max(warmStart, total - HOT_COUNT) // warmStart..warmEnd = warm
  const hotStart = warmEnd // hotStart..total = hot

  const result: T[] = []

  // Cool tier → summarise into one compact message
  const coolMessages = messages.slice(coolStart, coolEnd)
  if (coolMessages.length > 0) {
    const summaryLines = coolMessages.map((m) => {
      const role = m.role === 'user' ? 'User' : 'Assistant'
      const preview = (m.content || '').slice(0, 120).replace(/\n+/g, ' ').trim()
      if (!preview) return `${role}: [tool interaction]`
      return `${role}: ${preview}${(m.content || '').length > 120 ? '...' : ''}`
    })

    const contextMsg = {
      role: 'system',
      content: `[Earlier conversation summary]\n${summaryLines.join('\n')}`,
    } as unknown as T

    result.push(contextMsg)
  }

  // Warm tier → keep content, strip attachments
  const warmMessages = messages.slice(warmStart, warmEnd)
  for (const m of warmMessages) {
    // Shallow clone, drop heavy fields
    const warm = { ...m }
    delete warm.attachments
    result.push(warm)
  }

  // Hot tier → pass through unchanged
  const hotMessages = messages.slice(hotStart)
  result.push(...hotMessages)

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Context-aware tool reordering
// ─────────────────────────────────────────────────────────────────────────────

// Tools closely related to project/file work
const PROJECT_TOOLS = new Set([
  'write_file',
  'edit_file',
  'read_file',
  'run_command',
  'write_to_terminal',
  'read_terminal_output',
  'setup_dev_workspace',
  'add_home_node',
  'update_home_node',
  'update_home_node_content',
  'remove_home_node',
  'create_home_group',
])

export interface ToolDefinitionLike {
  name: string
  description: string
  [key: string]: unknown
}

/**
 * Reorder and annotate tools based on the current working context focus.
 *
 * When the agent has an active project focus:
 *  1. Project tools come first (most relevant)
 *  2. Neutral tools in the middle
 *  3. App-level tools last, with disambiguation notes appended to descriptions
 *
 * When there is no focus, tools are returned unchanged.
 */
export function getContextualTools<T extends ToolDefinitionLike>(allTools: T[]): T[] {
  const heat = getHeat()
  const { focus } = useWorkingContext.getState()

  // No focus or cold → return as-is
  if (heat < 0.2 || !focus.type) return allTools

  const projectTools: T[] = []
  const neutralTools: T[] = []
  const appTools: T[] = []

  for (const tool of allTools) {
    const name = tool.name
    if (PROJECT_TOOLS.has(name)) {
      projectTools.push(tool)
    } else if (APP_LEVEL_TOOLS.has(name)) {
      // Append disambiguation note
      appTools.push({
        ...tool,
        description:
          tool.description +
          ' (NOTE: This modifies the Filegraph application UI, NOT the user\'s project files. Only use if the user explicitly asks to change the app.)',
      })
    } else {
      neutralTools.push(tool)
    }
  }

  return [...projectTools, ...neutralTools, ...appTools]
}
