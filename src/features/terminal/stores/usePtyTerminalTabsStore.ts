import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  closeTerminalSession,
  hasTerminalSession,
  spawnTerminalSession,
} from '@/features/terminal/terminalRegistry'

// Default icon for terminal tabs (lucide icon name)
export const DEFAULT_TERMINAL_ICON = 'Terminal'

// Configurable depth for path-based tab labels
export const TAB_LABEL_PATH_DEPTH = 3

/**
 * Generate a tab label from a path, showing the last N directories.
 * e.g., ~/turtle/projects/apps/lila/v1/client-react -> /lila/v1/client-react
 */
function generateTabLabelFromPath(path: string | undefined, depth: number = TAB_LABEL_PATH_DEPTH): string {
  if (!path) return 'Terminal'
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  const lastParts = parts.slice(-depth)
  return '/' + lastParts.join('/')
}

export interface PtyTerminalTab {
  id: string
  title: string
  sessionId: string
  icon?: string // Emoji or icon name for tab customization
  path?: string // Working directory path (optional)
}

// Golden ratio for Fibonacci splitting
export const PHI = 1.618033988749895

// Split pane configuration with position/size for Fibonacci layout
export interface TerminalPane {
  id: string
  viewId: string
  // Position and size as percentages (0-100)
  x: number
  y: number
  width: number
  height: number
  generation: number
}

export type SplitDirection = 'horizontal' | 'vertical'

export interface TerminalSplitState {
  panes: TerminalPane[]
}

interface PtyTerminalTabsStore {
  tabs: PtyTerminalTab[]
  // Per-view active tab selection (enables split views).
  activeTabByView: Record<string, string | null>
  // Split state for persistence
  splitState: TerminalSplitState | null
  // Active pane ID
  activePaneId: string | null

  ensureView: (viewId: string) => void
  ensureInitialized: (opts: { cwd?: string; cols: number; rows: number }) => Promise<void>
  rehydrateSessions: (opts: { cols: number; rows: number }) => Promise<void>

  addTab: (opts: { cwd?: string; cols: number; rows: number }) => Promise<string>
  addTabForView: (viewId: string, opts: { cwd?: string; cols: number; rows: number }) => Promise<void>
  closeTab: (tabId: string) => Promise<void>
  setActiveTab: (viewId: string, tabId: string | null) => void
  getTabCount: () => number

  // Tab management (for TabBar compatibility)
  renameTab: (tabId: string, newTitle: string) => void
  setTabIcon: (tabId: string, icon: string) => void
  reorderTabs: (newTabs: PtyTerminalTab[]) => void
  updateTabPath: (tabId: string, newPath: string) => void
  getTabBySessionId: (sessionId: string) => PtyTerminalTab | undefined

  // Split management
  setSplitState: (state: TerminalSplitState | null) => void
  setActivePaneId: (paneId: string | null) => void
  splitActivePane: (opts: { cwd?: string; cols: number; rows: number }) => Promise<void>
  removePane: (paneId: string) => void
}

function nextTabId() {
  return `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function nextPaneId() {
  return `pane_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const usePtyTerminalTabsStore = create<PtyTerminalTabsStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabByView: { main: null },
      splitState: null,
      activePaneId: null,

      ensureView: (viewId) => {
        set((state) => {
          if (viewId in state.activeTabByView) return state
          return { ...state, activeTabByView: { ...state.activeTabByView, [viewId]: null } }
        })
      },

      // Rehydrate sessions after app reload - spawns new PTY sessions for persisted tabs
      rehydrateSessions: async ({ cols, rows }) => {
        const { tabs } = get()
        if (tabs.length === 0) return

        const updatedTabs: PtyTerminalTab[] = []

        for (const tab of tabs) {
          // Check if session is still alive (it won't be after reload)
          if (!hasTerminalSession(tab.sessionId)) {
            // Spawn a new session with the same path
            const newSessionId = await spawnTerminalSession({ cwd: tab.path, cols, rows })
            updatedTabs.push({ ...tab, sessionId: newSessionId })
          } else {
            updatedTabs.push(tab)
          }
        }

        set((state) => ({ ...state, tabs: updatedTabs }))
      },

      ensureInitialized: async ({ cwd, cols, rows }) => {
        const { tabs, rehydrateSessions } = get()
        
        // If we have persisted tabs, rehydrate them
        if (tabs.length > 0) {
          await rehydrateSessions({ cols, rows })
          return
        }

        // Otherwise create a fresh first tab
        const sessionId = await spawnTerminalSession({ cwd, cols, rows })
        const tabId = nextTabId()

        set((state) => {
          const title = generateTabLabelFromPath(cwd)
          const nextTabs: PtyTerminalTab[] = [{ id: tabId, title, sessionId, icon: DEFAULT_TERMINAL_ICON, path: cwd }]

          const nextActive: Record<string, string | null> = { ...state.activeTabByView }
          const viewIds = Object.keys(nextActive)
          if (viewIds.length === 0) nextActive.main = tabId
          for (const viewId of viewIds) {
            nextActive[viewId] = tabId
          }

          return { ...state, tabs: nextTabs, activeTabByView: nextActive }
        })
      },

  addTab: async ({ cwd, cols, rows }) => {
    const sessionId = await spawnTerminalSession({ cwd, cols, rows })
    const tabId = nextTabId()

    set((state) => {
      const title = generateTabLabelFromPath(cwd)
      const newTab: PtyTerminalTab = { id: tabId, title, sessionId, icon: DEFAULT_TERMINAL_ICON, path: cwd }

      // Make the new tab active in 'terminal:main' and the active pane (if split)
      const nextActive: Record<string, string | null> = { ...state.activeTabByView, ['terminal:main']: tabId }
      
      // Also update the active pane if we're in split mode
      if (state.splitState && state.activePaneId) {
        const activePane = state.splitState.panes.find((p) => p.id === state.activePaneId)
        if (activePane) {
          nextActive[activePane.viewId] = tabId
        }
      }

      return { ...state, tabs: [...state.tabs, newTab], activeTabByView: nextActive }
    })

    return tabId
  },

  addTabForView: async (viewId, { cwd, cols, rows }) => {
    const sessionId = await spawnTerminalSession({ cwd, cols, rows })
    const tabId = nextTabId()

    set((state) => {
      const title = generateTabLabelFromPath(cwd)
      const newTab: PtyTerminalTab = { id: tabId, title, sessionId, icon: DEFAULT_TERMINAL_ICON, path: cwd }

      // Make this tab active only for the specified view.
      const nextActive = { ...state.activeTabByView, [viewId]: tabId }

      return { ...state, tabs: [...state.tabs, newTab], activeTabByView: nextActive }
    })
  },

  closeTab: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab) return

    await closeTerminalSession(tab.sessionId)

    set((state) => {
      const nextTabs = state.tabs.filter((t) => t.id !== tabId)

      const nextActive: Record<string, string | null> = { ...state.activeTabByView }
      for (const viewId of Object.keys(nextActive)) {
        if (nextActive[viewId] === tabId) {
          nextActive[viewId] = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null
        }
      }

      return { ...state, tabs: nextTabs, activeTabByView: nextActive }
    })
  },

  setActiveTab: (viewId, tabId) => {
    set((state) => ({
      ...state,
      activeTabByView: { ...state.activeTabByView, [viewId]: tabId },
    }))
  },

  getTabCount: () => get().tabs.length,

  renameTab: (tabId, newTitle) => {
    set((state) => ({
      ...state,
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t)),
    }))
  },

  setTabIcon: (tabId, icon) => {
    set((state) => ({
      ...state,
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, icon } : t)),
    }))
  },

  reorderTabs: (newTabs) => {
    set((state) => ({ ...state, tabs: newTabs }))
  },

  updateTabPath: (tabId, newPath) => {
    set((state) => ({
      ...state,
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? { ...t, path: newPath, title: generateTabLabelFromPath(newPath) }
          : t,
      ),
    }))
  },

  getTabBySessionId: (sessionId) => {
    return get().tabs.find((t) => t.sessionId === sessionId)
  },

  // Split management
  setSplitState: (splitState) => {
    set((state) => ({ ...state, splitState }))
  },

  setActivePaneId: (activePaneId) => {
    set((state) => ({ ...state, activePaneId }))
  },

  splitActivePane: async ({ cwd, cols, rows }) => {
    const sessionId = await spawnTerminalSession({ cwd, cols, rows })
    const tabId = nextTabId()
    const newPaneId = nextPaneId()
    const newViewId = `terminal:${newPaneId}`

    set((state) => {
      const title = generateTabLabelFromPath(cwd)
      const newTab: PtyTerminalTab = { id: tabId, title, sessionId, icon: DEFAULT_TERMINAL_ICON, path: cwd }

      if (!state.splitState) {
        // First split: create two panes from the single terminal
        const firstPaneId = nextPaneId()
        const firstViewId = `terminal:${firstPaneId}`

        // Determine split direction based on typical terminal aspect ratio (wider than tall)
        // For first split, always split horizontally (side by side)
        const firstPane: TerminalPane = {
          id: firstPaneId,
          viewId: firstViewId,
          x: 0,
          y: 0,
          width: (100 / (1 + PHI)) * PHI, // ~61.8%
          height: 100,
          generation: 1,
        }
        const newPane: TerminalPane = {
          id: newPaneId,
          viewId: newViewId,
          x: firstPane.width,
          y: 0,
          width: 100 / (1 + PHI), // ~38.2%
          height: 100,
          generation: 1,
        }

        const mainActiveTab = state.activeTabByView['terminal:main']
        return {
          ...state,
          tabs: [...state.tabs, newTab],
          activeTabByView: {
            ...state.activeTabByView,
            [firstViewId]: mainActiveTab,
            [newViewId]: tabId,
          },
          splitState: { panes: [firstPane, newPane] },
          activePaneId: newPaneId,
        }
      }

      // Find the active pane to split
      const activePaneIndex = state.splitState.panes.findIndex((p) => p.id === state.activePaneId)
      if (activePaneIndex === -1) return state

      const pane = state.splitState.panes[activePaneIndex]

      // Determine split direction based on aspect ratio
      const isHorizontalSplit = pane.width >= pane.height

      let updatedPane: TerminalPane
      let newPane: TerminalPane

      if (isHorizontalSplit) {
        // Split horizontally (side by side) using golden ratio
        const leftWidth = (pane.width / (1 + PHI)) * PHI
        const rightWidth = pane.width / (1 + PHI)

        updatedPane = {
          ...pane,
          width: leftWidth,
          generation: pane.generation + 1,
        }
        newPane = {
          id: newPaneId,
          viewId: newViewId,
          x: pane.x + leftWidth,
          y: pane.y,
          width: rightWidth,
          height: pane.height,
          generation: pane.generation + 1,
        }
      } else {
        // Split vertically (top/bottom) using golden ratio
        const topHeight = (pane.height / (1 + PHI)) * PHI
        const bottomHeight = pane.height / (1 + PHI)

        updatedPane = {
          ...pane,
          height: topHeight,
          generation: pane.generation + 1,
        }
        newPane = {
          id: newPaneId,
          viewId: newViewId,
          x: pane.x,
          y: pane.y + topHeight,
          width: pane.width,
          height: bottomHeight,
          generation: pane.generation + 1,
        }
      }

      const newPanes = [...state.splitState.panes]
      newPanes.splice(activePaneIndex, 1, updatedPane, newPane)

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabByView: { ...state.activeTabByView, [newViewId]: tabId },
        splitState: { panes: newPanes },
        activePaneId: newPaneId,
      }
    })
  },

  removePane: (paneId) => {
    set((state) => {
      if (!state.splitState) return state

      const newPanes = state.splitState.panes.filter((p) => p.id !== paneId)

      // If only one pane left, exit split mode
      if (newPanes.length <= 1) {
        return {
          ...state,
          splitState: null,
          activePaneId: null,
        }
      }

      return {
        ...state,
        splitState: { ...state.splitState, panes: newPanes },
        activePaneId: state.activePaneId === paneId ? newPanes[0].id : state.activePaneId,
      }
    })
  },
    }),
    {
      name: 'filegraph-terminal-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map((t) => ({ ...t })), // Persist tab metadata
        activeTabByView: state.activeTabByView,
        splitState: state.splitState,
        activePaneId: state.activePaneId,
      }),
    },
  ),
)
