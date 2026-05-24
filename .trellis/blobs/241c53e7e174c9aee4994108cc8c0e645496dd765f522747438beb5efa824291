/**
 * UI Actions for Agent
 * Provides functions for the agent to interact with the UI.
 */

import { useFileStore } from '@/stores/useFileStore'
import { useUIStore } from '@/stores/useUIStore'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore, APP_REGISTRY, type AppId } from '@/stores/useAppStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { invoke } from '@tauri-apps/api/core'
import { homeDir, join } from '@tauri-apps/api/path'
import type { FileItem } from '@/components/app/fileStructure'
import type { LayoutMode } from '@/components/app/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Path Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expand tilde (~) in paths to the actual home directory
 */
async function expandTildePath(path: string): Promise<string> {
  if (path.startsWith('~/') || path === '~') {
    const home = await homeDir()
    return path === '~' ? home : await join(home, path.slice(2))
  }
  return path
}

// ─────────────────────────────────────────────────────────────────────────────
// App Navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Switch to a different app
 */
export function switchApp(appId: string): { success: boolean; error?: string; app?: string } {
  const validAppIds = Object.keys(APP_REGISTRY)

  if (!validAppIds.includes(appId)) {
    return {
      success: false,
      error: `Unknown app: ${appId}. Valid apps: ${validAppIds.join(', ')}`,
    }
  }

  const appDef = APP_REGISTRY[appId as AppId]
  if (appDef.status === 'hidden') {
    return {
      success: false,
      error: `App "${appId}" is not available yet`,
    }
  }

  useAppStore.getState().setActiveApp(appId as AppId)

  return {
    success: true,
    app: appDef.name,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// File Preview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preview a file in the active workspace
 */
export async function previewFile(filePath: string): Promise<{ success: boolean; error?: string; file?: string }> {
  try {
    // Expand tilde paths
    const expandedPath = await expandTildePath(filePath)

    // Get file info from Tauri
    const fileInfo = await invoke<{
      name: string
      file_type: 'file' | 'folder' | 'web'
      size: number | null
      date_modified: string
      extension: string | null
      path: string
    }>('get_file_info', { filePath: expandedPath })

    const fileItem: FileItem = {
      id: expandedPath,
      name: fileInfo.name,
      file_type: fileInfo.file_type,
      size: fileInfo.size,
      date_modified: fileInfo.date_modified,
      extension: fileInfo.extension,
      path: expandedPath,
    }

    // Set as active item in file store
    useFileStore.getState().setActiveItem(fileItem)

    // Open as pinned editor tab in current workspace
    useTabStore.getState().openEditorPinned(fileItem)

    return {
      success: true,
      file: fileInfo.name,
    }
  } catch (err) {
    return {
      success: false,
      error: `Could not preview file: ${err}`,
    }
  }
}

/**
 * Open a file as a pinned editor tab
 */
export async function openFile(filePath: string): Promise<{ success: boolean; error?: string; file?: string }> {
  try {
    // Expand tilde paths
    const expandedPath = await expandTildePath(filePath)

    const fileInfo = await invoke<{
      name: string
      file_type: 'file' | 'folder' | 'web'
      size: number | null
      date_modified: string
      extension: string | null
      path: string
    }>('get_file_info', { filePath: expandedPath })

    const fileItem: FileItem = {
      id: expandedPath,
      name: fileInfo.name,
      file_type: fileInfo.file_type,
      size: fileInfo.size,
      date_modified: fileInfo.date_modified,
      extension: fileInfo.extension,
      path: expandedPath,
    }

    useFileStore.getState().setActiveItem(fileItem)
    useTabStore.getState().openEditorPinned(fileItem)

    return {
      success: true,
      file: fileInfo.name,
    }
  } catch (err) {
    return {
      success: false,
      error: `Could not open file: ${err}`,
    }
  }
}

/**
 * Navigate to a directory in the file browser
 */
export async function navigateToDirectory(directoryPath: string): Promise<{ success: boolean; error?: string }> {
  const state = useTabStore.getState()
  if (!state.activeTabId) {
    return { success: false, error: 'No active workspace' }
  }

  // Expand tilde paths
  const expandedPath = await expandTildePath(directoryPath)

  state.navigateInTab(state.activeTabId, expandedPath)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI State Controls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set the file view layout mode
 */
export function setLayoutMode(mode: string): { success: boolean; error?: string; mode?: string } {
  const validModes = ['table', 'grid', 'columns', 'tree', 'canvas']

  if (!validModes.includes(mode)) {
    return {
      success: false,
      error: `Invalid layout mode: ${mode}. Valid modes: ${validModes.join(', ')}`,
    }
  }

  useUIStore.getState().setLayoutMode(mode as LayoutMode)

  return { success: true, mode }
}

/**
 * Toggle or set panel visibility
 */
export function togglePanel(
  panel: string,
  state?: boolean,
): { success: boolean; error?: string; panel?: string; isOpen?: boolean } {
  const uiStore = useUIStore.getState()

  switch (panel) {
    case 'terminal':
      if (state !== undefined) {
        uiStore.setTerminalOpen(state)
      } else {
        uiStore.toggleTerminal()
      }
      return { success: true, panel: 'terminal', isOpen: useUIStore.getState().terminalOpen }

    case 'graph':
      if (state !== undefined) {
        uiStore.setGraphOpen(state)
      } else {
        uiStore.toggleGraph()
      }
      return { success: true, panel: 'graph', isOpen: useUIStore.getState().graphOpen }

    case 'agent':
      if (state !== undefined) {
        uiStore.setAgentOpen(state)
      } else {
        uiStore.toggleAgent()
      }
      return { success: true, panel: 'agent', isOpen: useUIStore.getState().agentOpen }

    case 'preview':
      if (state !== undefined) {
        uiStore.setPreviewEnabled(state)
      } else {
        uiStore.setPreviewEnabled(!uiStore.previewEnabled)
      }
      return { success: true, panel: 'preview', isOpen: useUIStore.getState().previewEnabled }

    case 'file-explorer':
      if (state !== undefined) {
        uiStore.setGlobalSidebarOpen(state)
      } else {
        uiStore.toggleGlobalSidebar()
      }
      return { success: true, panel: 'file-explorer', isOpen: useUIStore.getState().globalSidebarOpen }

    default:
      return { success: false, error: `Unknown panel: ${panel}. Valid: terminal, graph, agent, preview, file-explorer` }
  }
}

/**
 * Adjust zoom level
 */
export function setZoom(level: number | 'in' | 'out' | 'reset'): { success: boolean; zoomLevel?: number } {
  const uiStore = useUIStore.getState()

  if (level === 'in') {
    uiStore.zoomIn()
  } else if (level === 'out') {
    uiStore.zoomOut()
  } else if (level === 'reset') {
    uiStore.resetZoom()
  } else if (typeof level === 'number') {
    uiStore.setZoomLevel(level)
  }

  return { success: true, zoomLevel: useUIStore.getState().zoomLevel }
}

/**
 * Toggle showing hidden files (dotfiles)
 */
export function toggleDotfiles(show?: boolean): { success: boolean; showDotfiles: boolean } {
  const uiStore = useUIStore.getState()

  if (show !== undefined) {
    uiStore.setShowDotfiles(show)
  } else {
    uiStore.setShowDotfiles(!uiStore.showDotfiles)
  }

  return { success: true, showDotfiles: useUIStore.getState().showDotfiles }
}

/**
 * Set search/filter value
 */
export function setSearch(query: string): { success: boolean; query: string } {
  if (query) {
    useUIStore.getState().setSearchValue(query)
  } else {
    useUIStore.getState().clearSearch()
  }

  return { success: true, query }
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Controls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set theme mode or preset
 */
export function setTheme(options: { mode?: 'light' | 'dark' | 'system'; preset?: string }): {
  success: boolean
  error?: string
  mode?: string
  preset?: string
} {
  // Dispatch custom event that ThemeProvider listens to
  window.dispatchEvent(
    new CustomEvent('theme-change', {
      detail: {
        mode: options.mode,
        preset: options.preset,
      },
    }),
  )

  return {
    success: true,
    mode: options.mode,
    preset: options.preset,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Controls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open terminal with optional mode
 */
export function openTerminal(mode?: 'bash' | 'tql'): { success: boolean; mode: string } {
  const termStore = useTerminalStore.getState()
  const uiStore = useUIStore.getState()

  uiStore.setTerminalOpen(true)

  if (mode) {
    termStore.setActiveMode(mode)
  }

  return { success: true, mode: termStore.activeMode }
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor Tab Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Close an editor tab
 */
export function closeEditorTab(tabIdOrIndex?: string | number): { success: boolean; error?: string } {
  const state = useTabStore.getState()
  const activeWorkspace = state.tabs.find((t) => t.id === state.activeTabId)

  if (!activeWorkspace) {
    return { success: false, error: 'No active workspace' }
  }

  const editorTabs = activeWorkspace.editorTabs || []

  if (editorTabs.length === 0) {
    return { success: false, error: 'No editor tabs open' }
  }

  let targetId: string
  if (tabIdOrIndex === undefined) {
    targetId = activeWorkspace.activeEditorTabId || editorTabs[0].id
  } else if (typeof tabIdOrIndex === 'number') {
    const tab = editorTabs[tabIdOrIndex]
    if (!tab) {
      return { success: false, error: `No editor tab at index ${tabIdOrIndex}` }
    }
    targetId = tab.id
  } else {
    const tab = editorTabs.find((t) => t.id === tabIdOrIndex || t.file.name === tabIdOrIndex)
    if (!tab) {
      return { success: false, error: `Editor tab not found: ${tabIdOrIndex}` }
    }
    targetId = tab.id
  }

  state.closeEditorTab(targetId)
  return { success: true }
}

/**
 * Close all editor tabs in current workspace
 */
export function closeAllEditorTabs(): { success: boolean } {
  useTabStore.getState().closeAllEditorTabs()
  return { success: true }
}

/**
 * Pin an editor tab
 */
export function pinEditorTab(tabIdOrIndex?: string | number): { success: boolean; error?: string } {
  const state = useTabStore.getState()
  const activeWorkspace = state.tabs.find((t) => t.id === state.activeTabId)

  if (!activeWorkspace) {
    return { success: false, error: 'No active workspace' }
  }

  const editorTabs = activeWorkspace.editorTabs || []

  let targetId: string
  if (tabIdOrIndex === undefined) {
    targetId = activeWorkspace.activeEditorTabId || ''
  } else if (typeof tabIdOrIndex === 'number') {
    const tab = editorTabs[tabIdOrIndex]
    if (!tab) {
      return { success: false, error: `No editor tab at index ${tabIdOrIndex}` }
    }
    targetId = tab.id
  } else {
    const tab = editorTabs.find((t) => t.id === tabIdOrIndex || t.file.name === tabIdOrIndex)
    if (!tab) {
      return { success: false, error: `Editor tab not found: ${tabIdOrIndex}` }
    }
    targetId = tab.id
  }

  if (!targetId) {
    return { success: false, error: 'No editor tab to pin' }
  }

  state.pinEditorTab(targetId)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open the new event dialog with pre-populated data
 * The user can review, modify, and confirm before saving
 */
export function openNewEventDialog(data: {
  name?: string
  label?: string
  date?: string
  startTime?: string
  endTime?: string
  description?: string
  location?: string
  urgency?: number
  isAllDay?: boolean
  participants?: string[]
  syncToGoogle?: boolean
}): { success: boolean; message: string } {
  // First, switch to calendar app
  const appStore = useAppStore.getState()
  appStore.setActiveApp('calendar')

  // Dispatch custom event to open the dialog with data
  // The CalendarApp listens for this event
  window.dispatchEvent(
    new CustomEvent('agent:open-new-event-dialog', {
      detail: data,
    }),
  )

  return {
    success: true,
    message: `Opening new event dialog with pre-filled data. Please review and save the event.`,
  }
}
