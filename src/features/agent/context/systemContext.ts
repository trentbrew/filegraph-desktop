/**
 * System Context Provider
 * Gathers comprehensive system state for agent awareness.
 * This provides the agent with real-time knowledge of the application state.
 */

import { useFileStore } from '@/stores/useFileStore'
import { formatProcessesForPrompt } from './processRegistry'
import { useUIStore } from '@/stores/useUIStore'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore, APP_REGISTRY, type AppId } from '@/stores/useAppStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import type { FileItem } from '@/components/app/fileStructure'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveFileContext {
  path: string
  name: string
  extension: string
  fileType: string
  size?: number
  isDirectory: boolean
}

export interface WorkspaceTabContext {
  id: string
  title: string
  path: string
  isActive: boolean
  editorTabCount: number
  activeEditorFile?: string
}

export interface EditorTabContext {
  id: string
  fileName: string
  filePath: string
  isPinned: boolean
  isDirty: boolean
  isActive: boolean
}

export interface UIContext {
  layoutMode: string
  previewEnabled: boolean
  showDotfiles: boolean
  showFileExplorer: boolean
  zoomLevel: number
  terminalOpen: boolean
  graphOpen: boolean
  agentOpen: boolean
  searchValue: string
}

export interface ThemeContext {
  mode: 'light' | 'dark' | 'system'
  effectiveMode: 'light' | 'dark'
  themeId: string
  availableThemes: string[]
}

export interface TerminalContext {
  isVisible: boolean
  activeMode: 'bash' | 'tql'
  sessions: {
    mode: string
    status: 'idle' | 'running' | 'error'
    cwd: string
  }[]
}

export interface SystemContext {
  timestamp: string

  // Vault root path
  vaultPath: string

  // Active file being previewed
  activeFile: ActiveFileContext | null

  // Current directory
  currentDirectory: string

  // File selection
  selectedFiles: string[]
  fileCount: number

  // Workspace tabs
  workspaceTabs: WorkspaceTabContext[]
  activeWorkspaceId: string

  // Editor tabs (in active workspace)
  editorTabs: EditorTabContext[]

  // Active app
  activeApp: {
    id: AppId
    name: string
    description?: string
  }

  // UI state
  ui: UIContext

  // Theme
  theme: ThemeContext

  // Terminal
  terminal: TerminalContext

  // Available apps
  availableApps: {
    id: AppId
    name: string
    status: string
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Gathering Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current theme context from DOM and localStorage
 */
function getThemeContext(): ThemeContext {
  const storageKey = 'vite-ui-theme'
  const mode = (localStorage.getItem(`${storageKey}-mode`) || 'system') as ThemeContext['mode']
  const themeId = localStorage.getItem(`${storageKey}-id`) || 'default'

  // Determine effective mode
  const isDark = document.documentElement.classList.contains('dark')
  const effectiveMode: 'light' | 'dark' = isDark ? 'dark' : 'light'

  // Get available themes from registry (built-in themes)
  const availableThemes = [
    'default',
    'modern-minimal',
    'violet-bloom',
    'catppuccin',
    'solar-dusk',
    'neo-brutalism',
    'nature',
    't3-chat',
  ]

  return {
    mode,
    effectiveMode,
    themeId,
    availableThemes,
  }
}

/**
 * Convert FileItem to ActiveFileContext
 */
function fileItemToContext(item: FileItem): ActiveFileContext {
  const name = item.name || item.path.split('/').pop() || item.path
  const extension = item.extension || ''

  return {
    path: item.path,
    name,
    extension,
    fileType: item.file_type,
    size: item.size ?? undefined,
    isDirectory: item.file_type === 'folder',
  }
}

/**
 * Gather complete system context from all stores
 */
export function getSystemContext(): SystemContext {
  // Get store states
  const fileState = useFileStore.getState()
  const uiState = useUIStore.getState()
  const tabState = useTabStore.getState()
  const appState = useAppStore.getState()
  const terminalState = useTerminalStore.getState()

  // Active file
  const activeFile = fileState.activeItem ? fileItemToContext(fileState.activeItem) : null

  // Workspace tabs
  const workspaceTabs: WorkspaceTabContext[] = tabState.tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    path: tab.path,
    isActive: tab.id === tabState.activeTabId,
    editorTabCount: (tab.editorTabs || []).length,
    activeEditorFile: tab.activeEditorTabId
      ? (tab.editorTabs || []).find((et) => et.id === tab.activeEditorTabId)?.file.path
      : undefined,
  }))

  // Editor tabs from active workspace
  const activeWorkspace = tabState.tabs.find((t) => t.id === tabState.activeTabId)
  const editorTabs: EditorTabContext[] = (activeWorkspace?.editorTabs || []).map((et) => ({
    id: et.id,
    fileName: et.file.path.split('/').pop() || et.file.path,
    filePath: et.file.path,
    isPinned: et.isPinned,
    isDirty: et.isDirty,
    isActive: et.id === activeWorkspace?.activeEditorTabId,
  }))

  // Active app info
  const activeAppDef = APP_REGISTRY[appState.activeApp]
  const activeApp = {
    id: appState.activeApp,
    name: activeAppDef?.name || appState.activeApp,
    description: activeAppDef?.description,
  }

  // UI context
  const ui: UIContext = {
    layoutMode: uiState.layoutMode,
    previewEnabled: uiState.previewEnabled,
    showDotfiles: uiState.showDotfiles,
    showFileExplorer: uiState.showFileExplorer,
    zoomLevel: uiState.zoomLevel,
    terminalOpen: uiState.terminalOpen,
    graphOpen: uiState.graphOpen,
    agentOpen: uiState.agentOpen,
    searchValue: uiState.searchValue,
  }

  // Terminal context
  const terminal: TerminalContext = {
    isVisible: terminalState.isVisible,
    activeMode: terminalState.activeMode,
    sessions: Object.values(terminalState.sessions).map((s) => ({
      mode: s.mode,
      status: s.status,
      cwd: s.cwd,
    })),
  }

  // Available apps (non-hidden)
  const availableApps = Object.values(APP_REGISTRY)
    .filter((app) => app.status !== 'hidden')
    .map((app) => ({
      id: app.id,
      name: app.name,
      status: app.status,
    }))

  // Get vault path from localStorage or use default
  const storedVaultPath = localStorage.getItem('filegraph_vault_path')
  const legacyStoredVaultPath = localStorage.getItem('filegraph-vault-path')

  let vaultPath = '~/.filegraph'
  if (storedVaultPath && storedVaultPath.trim()) {
    vaultPath = storedVaultPath
  } else if (legacyStoredVaultPath) {
    try {
      const parsed = JSON.parse(legacyStoredVaultPath)
      if (typeof parsed === 'string' && parsed.trim()) {
        vaultPath = parsed
      } else if (legacyStoredVaultPath.trim()) {
        vaultPath = legacyStoredVaultPath
      }
    } catch {
      if (legacyStoredVaultPath.trim()) {
        vaultPath = legacyStoredVaultPath
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    vaultPath,
    activeFile,
    currentDirectory: fileState.currentPath,
    selectedFiles: Array.from(fileState.selectedItems),
    fileCount: fileState.data.length,
    workspaceTabs,
    activeWorkspaceId: tabState.activeTabId,
    editorTabs,
    activeApp,
    ui,
    theme: getThemeContext(),
    terminal,
    availableApps,
  }
}

/**
 * Format system context as a string for the agent's system prompt
 */
export function formatSystemContextForPrompt(context: SystemContext): string {
  const lines: string[] = ['## Current System State', '']

  // Vault path
  lines.push(`**Vault Path:** \`${context.vaultPath}\``)
  lines.push(`  - Core directories: \`@entities/\`, \`@finance/\`, \`@calendar/\`, \`@notes/\`, \`@system/\``)
  lines.push('')

  // Active file
  if (context.activeFile) {
    lines.push(`**Active File:** \`${context.activeFile.path}\``)
    lines.push(`  - Name: ${context.activeFile.name}`)
    lines.push(
      `  - Type: ${context.activeFile.fileType}${context.activeFile.extension ? ` (.${context.activeFile.extension})` : ''}`,
    )
    if (context.activeFile.size !== undefined) {
      lines.push(`  - Size: ${formatBytes(context.activeFile.size)}`)
    }
  } else {
    lines.push('**Active File:** None')
  }
  lines.push('')

  // Current directory
  lines.push(`**Current Directory:** \`${context.currentDirectory || 'Not set'}\``)
  lines.push(`  - Files in view: ${context.fileCount}`)
  if (context.selectedFiles.length > 0) {
    lines.push(`  - Selected: ${context.selectedFiles.length} file(s)`)
  }
  lines.push('')

  // Active app
  lines.push(`**Active App:** ${context.activeApp.name}`)
  if (context.activeApp.description) {
    lines.push(`  - ${context.activeApp.description}`)
  }
  lines.push('')

  // Workspace tabs
  lines.push(`**Workspace Tabs:** ${context.workspaceTabs.length}`)
  context.workspaceTabs.forEach((tab) => {
    const marker = tab.isActive ? '→' : ' '
    lines.push(`  ${marker} ${tab.title} (${tab.path})`)
    if (tab.editorTabCount > 0) {
      lines.push(`    - ${tab.editorTabCount} editor tab(s)`)
    }
  })
  lines.push('')

  // Editor tabs (if any)
  if (context.editorTabs.length > 0) {
    lines.push(`**Editor Tabs:** ${context.editorTabs.length}`)
    context.editorTabs.forEach((tab) => {
      const marker = tab.isActive ? '→' : ' '
      const flags = [tab.isPinned ? 'pinned' : 'preview', tab.isDirty ? 'unsaved' : null].filter(Boolean).join(', ')
      lines.push(`  ${marker} ${tab.fileName} (${flags})`)
    })
    lines.push('')
  }

  // UI State
  lines.push('**UI State:**')
  lines.push(`  - Layout: ${context.ui.layoutMode}`)
  lines.push(`  - Preview: ${context.ui.previewEnabled ? 'enabled' : 'disabled'}`)
  lines.push(`  - Zoom: ${context.ui.zoomLevel}%`)
  lines.push(`  - Terminal: ${context.ui.terminalOpen ? 'open' : 'closed'}`)
  lines.push(`  - Graph: ${context.ui.graphOpen ? 'open' : 'closed'}`)
  if (context.ui.searchValue) {
    lines.push(`  - Search: "${context.ui.searchValue}"`)
  }
  lines.push('')

  // Theme
  lines.push('**Theme:**')
  lines.push(`  - Mode: ${context.theme.mode} (effective: ${context.theme.effectiveMode})`)
  lines.push(`  - Preset: ${context.theme.themeId}`)
  lines.push(`  - Available: ${context.theme.availableThemes.join(', ')}`)
  lines.push('')

  // Terminal
  if (context.terminal.isVisible) {
    lines.push('**Terminal:**')
    lines.push(`  - Active mode: ${context.terminal.activeMode}`)
    context.terminal.sessions.forEach((s) => {
      lines.push(`  - ${s.mode}: ${s.status} (cwd: ${s.cwd})`)
    })
    lines.push('')
  }

  // Running dev servers (from process registry)
  const processesSection = formatProcessesForPrompt()
  if (processesSection) {
    lines.push(processesSection)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Compact JSON representation for tool calls
 */
export function getSystemContextJSON(): string {
  return JSON.stringify(getSystemContext(), null, 2)
}
