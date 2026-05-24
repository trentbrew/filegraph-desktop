/**
 * Agent Tools — UI Interaction Domain
 *
 * Tools for controlling the Filegraph UI: switching apps, opening files,
 * navigating directories, adjusting layout, toggling panels, etc.
 */

import { join } from '@tauri-apps/api/path'
import { getVaultPath } from './helpers'
import * as uiActions from '../actions/uiActions'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const UI_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'switch_app',
    description: `Switch to a different app in Filegraph. Available apps: home, calendar, graph, terminal, settings, database, inbox, messages, browser, gallery, music, places, contacts, posts, camera, projects, clock, workflows.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'The app to switch to (e.g., "calendar", "files", "graph", "settings")' },
      },
      required: ['appId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'preview_file',
    description: `Preview a file in the editor. Opens the file as a temporary preview tab. The file path can be absolute or relative to the vault.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to preview' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'open_file',
    description: `Open a file as a pinned editor tab. Unlike preview, the tab stays open until explicitly closed.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to open' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'navigate_to_directory',
    description: `Navigate to a different directory in the file browser.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        directoryPath: { type: 'string', description: 'Path to navigate to' },
      },
      required: ['directoryPath'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'set_layout_mode',
    description: `Change the file view layout mode. Options: table, grid, columns, tree, canvas.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'Layout mode: table, grid, columns, tree, or canvas' },
      },
      required: ['mode'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'toggle_panel',
    description: `Toggle visibility of a UI panel. Panels: terminal, graph, agent, preview, file-explorer.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        panel: { type: 'string', description: 'Panel name: terminal, graph, agent, preview, or file-explorer' },
        state: { type: ['boolean', 'null'], description: 'true to open, false to close, null to toggle' },
      },
      required: ['panel', 'state'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'set_zoom',
    description: `Adjust the UI zoom level. Use a number (50-200), or "in", "out", "reset".`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'string', description: 'Zoom level: number (50-200), "in", "out", or "reset"' },
      },
      required: ['level'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'open_terminal',
    description: `Open the terminal panel, optionally in a specific mode.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        mode: { type: ['string', 'null'], description: 'Terminal mode: bash or tql (null keeps current mode)' },
      },
      required: ['mode'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'close_editor_tab',
    description: `Close an editor tab in the current workspace. Can specify by name, ID, or index.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        tab: { type: ['string', 'null'], description: 'Tab name, ID, or index. Null closes the active tab.' },
      },
      required: ['tab'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'set_search',
    description: `Set the file search/filter query. Empty string clears the search.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'toggle_dotfiles',
    description: `Toggle visibility of hidden files (dotfiles).`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        show: { type: ['boolean', 'null'], description: 'true to show, false to hide, null to toggle' },
      },
      required: ['show'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function handle_switch_app(args: { appId: string }) {
  return uiActions.switchApp(args.appId)
}

export async function handle_preview_file(args: { filePath: string }) {
  const filePath = args.filePath.startsWith('/') ? args.filePath : await join(await getVaultPath(), args.filePath)
  return await uiActions.previewFile(filePath)
}

export async function handle_open_file(args: { filePath: string }) {
  const filePath = args.filePath.startsWith('/') ? args.filePath : await join(await getVaultPath(), args.filePath)
  return await uiActions.openFile(filePath)
}

export async function handle_navigate_to_directory(args: { directoryPath: string }) {
  return await uiActions.navigateToDirectory(args.directoryPath)
}

export async function handle_set_layout_mode(args: { mode: string }) {
  return uiActions.setLayoutMode(args.mode)
}

export async function handle_toggle_panel(args: { panel: string; state: boolean | null }) {
  return uiActions.togglePanel(args.panel, args.state ?? undefined)
}

export async function handle_set_zoom(args: { level: string }) {
  const level =
    args.level === 'in' || args.level === 'out' || args.level === 'reset' ? args.level : parseInt(args.level)
  return uiActions.setZoom(level)
}

export async function handle_open_terminal(args: { mode: string | null }) {
  return uiActions.openTerminal((args.mode ?? undefined) as 'bash' | 'tql' | undefined)
}

export async function handle_close_editor_tab(args: { tab: string | null }) {
  const tab = args.tab === null ? undefined : /^\d+$/.test(args.tab) ? parseInt(args.tab) : args.tab
  return uiActions.closeEditorTab(tab)
}

export async function handle_set_search(args: { query: string }) {
  return uiActions.setSearch(args.query)
}

export async function handle_toggle_dotfiles(args: { show: boolean | null }) {
  return uiActions.toggleDotfiles(args.show ?? undefined)
}
