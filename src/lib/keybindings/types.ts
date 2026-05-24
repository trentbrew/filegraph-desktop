/**
 * Keyboard shortcuts type definitions
 */

export interface Keybinding {
  key: string // e.g., "cmd+p", "cmd+k cmd+s"
  command: string // e.g., "workbench.action.quickOpen"
  when?: string // Context expression, e.g., "editorFocus && !editorReadonly"
  args?: Record<string, any> // Optional command arguments
  priority?: number // For conflict resolution (higher wins)
}

export interface KeybindingOverride extends Keybinding {
  key: string
  command: `-${string}` // Prefixed with "-" to disable default
}

export interface KeybindingContext {
  editorFocus: boolean
  fileExplorerFocus: boolean
  previewFocus: boolean
  layoutMode: 'table' | 'grid' | 'columns' | 'tree' | 'graph' | 'whiteboard'
  hasSelection: boolean
  isEditing: boolean
  canNavigateBack: boolean
  canNavigateForward: boolean
  isMarkdownEditor: boolean
  hasClipboard: boolean
  isFullscreenMode: boolean
  // Extensible context properties
}

export enum KeyCategory {
  Navigation = 'navigation',
  FileOperations = 'file-operations',
  Editing = 'editing',
  View = 'view',
  Search = 'search',
  Terminal = 'terminal',
  Debug = 'debug',
  Custom = 'custom',
}

export interface KeybindingMetadata {
  /** precise description of the action for AI understanding */
  action: string
  /** what part of the system is affected (e.g., 'navigation', 'filesystem', 'ui') */
  domain: string
  /** specific state being modified */
  target: string
}

export interface KeybindingDefinition extends Keybinding {
  id: string
  category: KeyCategory
  description: string
  metadata?: KeybindingMetadata
  default: string // Default keybinding
  mac?: string // Platform-specific override
  windows?: string
  linux?: string
}

export type CommandHandler = (args?: any) => void | Promise<void>
