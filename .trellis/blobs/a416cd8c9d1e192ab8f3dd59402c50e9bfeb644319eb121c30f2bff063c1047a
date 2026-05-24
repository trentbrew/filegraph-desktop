import { invoke } from '@tauri-apps/api/core'

export interface AppState {
  currentPath: string
  navigationHistory: string[]
  historyIndex: number
  layoutMode: 'table' | 'grid' | 'columns' | 'tree' | 'graph' | 'whiteboard'
  showDotfiles: boolean
  previewEnabled: boolean
  previewWidth: number
  activeItemPath: string | null
  columnSizing: Record<string, number>
  lastUpdated: number
}

const DEFAULT_STATE: AppState = {
  currentPath: '',
  navigationHistory: [],
  historyIndex: -1,
  layoutMode: 'table',
  showDotfiles: false,
  previewEnabled: true,
  previewWidth: 400,
  activeItemPath: null,
  columnSizing: {
    name: 300,
    date_modified: 120,
    file_type: 80,
    size: 100,
    actions: 50,
  },
  lastUpdated: Date.now(),
}

const STATE_FILE = '.filegraph-state.json'

/**
 * Load app state from Tauri store
 */
export async function loadAppState(): Promise<AppState> {
  try {
    const stateJson = await invoke<string>('read_app_state', {
      filename: STATE_FILE,
    })

    if (!stateJson) {
      return DEFAULT_STATE
    }

    const state = JSON.parse(stateJson) as AppState
    console.log('[AppState] Loaded state:', state)
    return state
  } catch (error) {
    console.warn('[AppState] Failed to load state, using defaults:', error)
    return DEFAULT_STATE
  }
}

/**
 * Save app state to Tauri store
 */
export async function saveAppState(state: Partial<AppState>): Promise<void> {
  try {
    const currentState = await loadAppState()
    const newState: AppState = {
      ...currentState,
      ...state,
      lastUpdated: Date.now(),
    }

    await invoke('write_app_state', {
      filename: STATE_FILE,
      content: JSON.stringify(newState, null, 2),
    })

    console.log('[AppState] Saved state:', newState)
  } catch (error) {
    console.error('[AppState] Failed to save state:', error)
  }
}

/**
 * Update specific state properties
 */
export async function updateAppState(updates: Partial<AppState>): Promise<void> {
  await saveAppState(updates)
}

/**
 * Clear all saved state
 */
export async function clearAppState(): Promise<void> {
  try {
    await invoke('write_app_state', {
      filename: STATE_FILE,
      content: JSON.stringify(DEFAULT_STATE, null, 2),
    })
    console.log('[AppState] Cleared state')
  } catch (error) {
    console.error('[AppState] Failed to clear state:', error)
  }
}
