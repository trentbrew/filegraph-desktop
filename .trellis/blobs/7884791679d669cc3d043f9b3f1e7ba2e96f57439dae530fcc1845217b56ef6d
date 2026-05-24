import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

// Types for preview data
export interface PreviewLogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  args: string[]
  timestamp: number
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
}

export interface PreviewNetworkEntry {
  method: string
  url: string
  status?: number
  duration?: number
  timestamp: number
  error?: string
}

export interface PreviewSessionData {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

export interface PreviewWindowInfo {
  id: string
  url: string
  title: string
}

// Enhanced .web file format
export interface WebFileData {
  version: number
  url: string
  metadata?: {
    title?: string
    created?: string
    lastAccessed?: string
    viewport?: { width: number; height: number }
    favicon?: string
  }
  session?: PreviewSessionData
  logs?: PreviewLogEntry[]
  network?: PreviewNetworkEntry[]
  aiContext?: {
    summary?: string
    suggestedFixes?: string[]
    tags?: string[]
  }
}

interface PreviewState {
  // Active preview windows
  windows: PreviewWindowInfo[]
  activePreviewId: string | null

  // Captured data per preview
  logs: Record<string, PreviewLogEntry[]>
  network: Record<string, PreviewNetworkEntry[]>
  session: Record<string, PreviewSessionData>

  // Event listeners
  unlisteners: UnlistenFn[]

  // Actions
  openPreview: (url: string, title?: string) => Promise<PreviewWindowInfo>
  closePreview: (previewId: string) => Promise<void>
  focusPreview: (previewId: string) => Promise<void>
  toggleDevTools: (previewId: string) => Promise<void>

  // Data management
  addLog: (previewId: string, log: PreviewLogEntry) => void
  addNetworkEntry: (previewId: string, entry: PreviewNetworkEntry) => void
  setSession: (previewId: string, session: PreviewSessionData) => void
  clearLogs: (previewId: string) => void
  getLogs: (previewId: string) => PreviewLogEntry[]
  getErrors: (previewId: string) => PreviewLogEntry[]

  // Export for .web file
  exportWebFileData: (previewId: string) => WebFileData | null

  // Lifecycle
  setupEventListeners: () => Promise<void>
  cleanup: () => void
}

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  windows: [],
  activePreviewId: null,
  logs: {},
  network: {},
  session: {},
  unlisteners: [],

  openPreview: async (url: string, title?: string) => {
    try {
      const info = await invoke<PreviewWindowInfo>('preview_open', { url, title })

      set((state) => ({
        windows: [...state.windows, info],
        activePreviewId: info.id,
        logs: { ...state.logs, [info.id]: [] },
        network: { ...state.network, [info.id]: [] },
        session: { ...state.session, [info.id]: { localStorage: {}, sessionStorage: {} } },
      }))

      return info
    } catch (error) {
      console.error('Failed to open preview:', error)
      throw error
    }
  },

  closePreview: async (previewId: string) => {
    try {
      await invoke('preview_close', { previewId })

      set((state) => {
        const { [previewId]: _logs, ...remainingLogs } = state.logs
        const { [previewId]: _network, ...remainingNetwork } = state.network
        const { [previewId]: _session, ...remainingSession } = state.session

        return {
          windows: state.windows.filter((w) => w.id !== previewId),
          activePreviewId: state.activePreviewId === previewId ? null : state.activePreviewId,
          logs: remainingLogs,
          network: remainingNetwork,
          session: remainingSession,
        }
      })
    } catch (error) {
      console.error('Failed to close preview:', error)
    }
  },

  focusPreview: async (previewId: string) => {
    try {
      await invoke('preview_focus', { previewId })
      set({ activePreviewId: previewId })
    } catch (error) {
      console.error('Failed to focus preview:', error)
    }
  },

  toggleDevTools: async (previewId: string) => {
    try {
      await invoke('preview_toggle_devtools', { previewId })
    } catch (error) {
      console.error('Failed to toggle devtools:', error)
    }
  },

  addLog: (previewId: string, log: PreviewLogEntry) => {
    set((state) => {
      const currentLogs = state.logs[previewId] || []
      // Keep last 1000 logs to prevent memory issues
      const newLogs = [...currentLogs, log].slice(-1000)
      return { logs: { ...state.logs, [previewId]: newLogs } }
    })
  },

  addNetworkEntry: (previewId: string, entry: PreviewNetworkEntry) => {
    set((state) => {
      const currentNetwork = state.network[previewId] || []
      const newNetwork = [...currentNetwork, entry].slice(-500)
      return { network: { ...state.network, [previewId]: newNetwork } }
    })
  },

  setSession: (previewId: string, session: PreviewSessionData) => {
    set((state) => ({
      session: { ...state.session, [previewId]: session },
    }))
  },

  clearLogs: (previewId: string) => {
    set((state) => ({
      logs: { ...state.logs, [previewId]: [] },
    }))
  },

  getLogs: (previewId: string) => {
    return get().logs[previewId] || []
  },

  getErrors: (previewId: string) => {
    const logs = get().logs[previewId] || []
    return logs.filter((log) => log.level === 'error')
  },

  exportWebFileData: (previewId: string) => {
    const state = get()
    const window = state.windows.find((w) => w.id === previewId)

    if (!window) return null

    return {
      version: 1,
      url: window.url,
      metadata: {
        title: window.title,
        lastAccessed: new Date().toISOString(),
      },
      session: state.session[previewId],
      logs: state.logs[previewId],
      network: state.network[previewId],
    }
  },

  setupEventListeners: async () => {
    const unlisteners: UnlistenFn[] = []

    // Listen for preview logs
    unlisteners.push(
      await listen<PreviewLogEntry>('preview-log', (event) => {
        const state = get()
        // Find which preview this came from (we'll need to enhance this)
        if (state.activePreviewId) {
          get().addLog(state.activePreviewId, event.payload)
        }
      }),
    )

    // Listen for preview errors
    unlisteners.push(
      await listen<PreviewLogEntry>('preview-error', (event) => {
        const state = get()
        if (state.activePreviewId) {
          get().addLog(state.activePreviewId, event.payload)
        }
      }),
    )

    // Listen for network requests
    unlisteners.push(
      await listen<PreviewNetworkEntry>('preview-network', (event) => {
        const state = get()
        if (state.activePreviewId) {
          get().addNetworkEntry(state.activePreviewId, event.payload)
        }
      }),
    )

    // Listen for preview window opened
    unlisteners.push(
      await listen<PreviewWindowInfo>('preview-opened', (event) => {
        console.log('[Preview] Window opened:', event.payload)
      }),
    )

    // Listen for preview window closed
    unlisteners.push(
      await listen<string>('preview-closed', (event) => {
        console.log('[Preview] Window closed:', event.payload)
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== event.payload),
        }))
      }),
    )

    // Listen for preview ready (injection complete)
    unlisteners.push(
      await listen<{ timestamp: number }>('preview-ready', (event) => {
        console.log('[Preview] Capture initialized:', event.payload)
      }),
    )

    set({ unlisteners })
  },

  cleanup: () => {
    const { unlisteners } = get()
    unlisteners.forEach((unlisten) => unlisten())
    set({ unlisteners: [] })
  },
}))

// Helper to parse .web files (supports both old URL-only and new JSON format)
export function parseWebFile(content: string): WebFileData {
  const trimmed = content.trim()

  // Try to parse as JSON first
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as WebFileData
      return {
        version: parsed.version || 1,
        url: parsed.url,
        metadata: parsed.metadata,
        session: parsed.session,
        logs: parsed.logs,
        network: parsed.network,
        aiContext: parsed.aiContext,
      }
    } catch {
      // Fall through to URL parsing
    }
  }

  // Legacy: plain URL format
  return {
    version: 1,
    url: trimmed,
  }
}

// Helper to serialize .web files
export function serializeWebFile(data: WebFileData): string {
  // If no extra data, just save the URL for simplicity
  if (!data.metadata && !data.session && !data.logs && !data.network && !data.aiContext) {
    return data.url
  }

  return JSON.stringify(data, null, 2)
}
