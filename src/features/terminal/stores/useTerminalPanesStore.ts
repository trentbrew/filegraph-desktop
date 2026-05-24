import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  closeTerminalSession,
  hasTerminalSession,
  spawnTerminalSession,
} from '@/features/terminal/terminalRegistry'

// Golden ratio for Fibonacci splitting
export const PHI = 1.618033988749895

// Configurable depth for path-based pane labels
export const PANE_LABEL_PATH_DEPTH = 3

/**
 * Generate a label from a path, showing the last N directories.
 */
function generateLabelFromPath(path: string | undefined, depth: number = PANE_LABEL_PATH_DEPTH): string {
  if (!path) return 'Terminal'
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  const lastParts = parts.slice(-depth)
  return '/' + lastParts.join('/')
}

// Terminal pane with embedded session
export interface TerminalPane {
  id: string
  sessionId: string
  path?: string
  label: string
  // Position and size as percentages (0-100)
  x: number
  y: number
  width: number
  height: number
  generation: number
}

interface TerminalPanesStore {
  // All panes (null means single terminal mode, no splits)
  panes: TerminalPane[] | null
  // Active pane ID (for split mode)
  activePaneId: string | null
  // Main session ID (for single terminal mode)
  mainSessionId: string | null
  mainPath?: string

  // Initialize the main terminal
  ensureInitialized: (opts: { cwd?: string; cols: number; rows: number }) => Promise<void>
  rehydrateSessions: (opts: { cols: number; rows: number }) => Promise<void>

  // Pane management
  setActivePaneId: (paneId: string | null) => void
  splitActivePane: (opts: { cwd?: string; cols: number; rows: number }) => Promise<void>
  closePane: (paneId: string) => Promise<void>
  resetToSinglePane: () => Promise<void>

  // Path updates (for directory change detection)
  updatePanePath: (paneId: string, newPath: string) => void
  updateMainPath: (newPath: string) => void
  getPaneBySessionId: (sessionId: string) => TerminalPane | undefined

  // Getters
  getPaneCount: () => number
  getMainSessionId: () => string | null
}

function nextPaneId() {
  return `pane_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

// Tolerance for floating point comparisons (in percentage points)
const EDGE_TOLERANCE = 0.5

/**
 * Find the best sibling pane to absorb the closed pane's space.
 * Looks for panes that share a full edge with the closed pane.
 */
function findAbsorbingPane(
  closedPane: TerminalPane,
  remainingPanes: TerminalPane[],
): TerminalPane | null {
  const closedRight = closedPane.x + closedPane.width
  const closedBottom = closedPane.y + closedPane.height

  for (const candidate of remainingPanes) {
    const candidateRight = candidate.x + candidate.width
    const candidateBottom = candidate.y + candidate.height

    // Check if candidate is directly to the LEFT of closed pane (shares right edge)
    if (
      Math.abs(candidateRight - closedPane.x) < EDGE_TOLERANCE &&
      Math.abs(candidate.y - closedPane.y) < EDGE_TOLERANCE &&
      Math.abs(candidate.height - closedPane.height) < EDGE_TOLERANCE
    ) {
      return candidate
    }

    // Check if candidate is directly to the RIGHT of closed pane (shares left edge)
    if (
      Math.abs(candidate.x - closedRight) < EDGE_TOLERANCE &&
      Math.abs(candidate.y - closedPane.y) < EDGE_TOLERANCE &&
      Math.abs(candidate.height - closedPane.height) < EDGE_TOLERANCE
    ) {
      return candidate
    }

    // Check if candidate is directly ABOVE closed pane (shares bottom edge)
    if (
      Math.abs(candidateBottom - closedPane.y) < EDGE_TOLERANCE &&
      Math.abs(candidate.x - closedPane.x) < EDGE_TOLERANCE &&
      Math.abs(candidate.width - closedPane.width) < EDGE_TOLERANCE
    ) {
      return candidate
    }

    // Check if candidate is directly BELOW closed pane (shares top edge)
    if (
      Math.abs(candidate.y - closedBottom) < EDGE_TOLERANCE &&
      Math.abs(candidate.x - closedPane.x) < EDGE_TOLERANCE &&
      Math.abs(candidate.width - closedPane.width) < EDGE_TOLERANCE
    ) {
      return candidate
    }
  }

  // Fallback: find closest pane by generation (most recently split together)
  const sameGenPanes = remainingPanes.filter((p) => p.generation === closedPane.generation)
  if (sameGenPanes.length > 0) {
    return sameGenPanes[0]
  }

  // Last resort: return first remaining pane
  return remainingPanes[0] || null
}

/**
 * Calculate the combined bounding box of two panes.
 */
function calculateCombinedBounds(
  pane1: TerminalPane,
  pane2: TerminalPane,
): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(pane1.x, pane2.x)
  const minY = Math.min(pane1.y, pane2.y)
  const maxX = Math.max(pane1.x + pane1.width, pane2.x + pane2.width)
  const maxY = Math.max(pane1.y + pane1.height, pane2.y + pane2.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export const useTerminalPanesStore = create<TerminalPanesStore>()(
  persist(
    (set, get) => ({
      panes: null,
      activePaneId: null,
      mainSessionId: null,
      mainPath: undefined,

      ensureInitialized: async ({ cwd, cols, rows }) => {
        const { mainSessionId, panes, rehydrateSessions } = get()

        // If we have persisted state, rehydrate sessions
        if (mainSessionId || (panes && panes.length > 0)) {
          await rehydrateSessions({ cols, rows })
          return
        }

        // Otherwise create a fresh main session
        const sessionId = await spawnTerminalSession({ cwd, cols, rows })
        set({ mainSessionId: sessionId, mainPath: cwd })
      },

      rehydrateSessions: async ({ cols, rows }) => {
        const { mainSessionId, mainPath, panes } = get()

        // Rehydrate main session if needed
        if (mainSessionId && !hasTerminalSession(mainSessionId)) {
          const newSessionId = await spawnTerminalSession({ cwd: mainPath, cols, rows })
          set({ mainSessionId: newSessionId })
        }

        // Rehydrate pane sessions if in split mode
        if (panes && panes.length > 0) {
          const updatedPanes: TerminalPane[] = []
          for (const pane of panes) {
            if (!hasTerminalSession(pane.sessionId)) {
              const newSessionId = await spawnTerminalSession({ cwd: pane.path, cols, rows })
              updatedPanes.push({ ...pane, sessionId: newSessionId })
            } else {
              updatedPanes.push(pane)
            }
          }
          set({ panes: updatedPanes })
        }
      },

      setActivePaneId: (activePaneId) => {
        set({ activePaneId })
      },

      splitActivePane: async ({ cwd, cols, rows }) => {
        const { panes, activePaneId, mainSessionId, mainPath } = get()

        // Spawn new session for the new pane
        const newSessionId = await spawnTerminalSession({ cwd, cols, rows })
        const newPaneId = nextPaneId()

        if (!panes) {
          // First split: transition from single terminal to split mode
          const firstPaneId = nextPaneId()

          // Create two panes - first one inherits the main session
          const firstPane: TerminalPane = {
            id: firstPaneId,
            sessionId: mainSessionId!,
            path: mainPath,
            label: generateLabelFromPath(mainPath),
            x: 0,
            y: 0,
            width: (100 / (1 + PHI)) * PHI, // ~61.8%
            height: 100,
            generation: 1,
          }

          const newPane: TerminalPane = {
            id: newPaneId,
            sessionId: newSessionId,
            path: cwd,
            label: generateLabelFromPath(cwd),
            x: firstPane.width,
            y: 0,
            width: 100 / (1 + PHI), // ~38.2%
            height: 100,
            generation: 1,
          }

          set({
            panes: [firstPane, newPane],
            activePaneId: newPaneId,
            // Clear main session since it's now in a pane
            mainSessionId: null,
            mainPath: undefined,
          })
          return
        }

        // Find the active pane to split
        const activePaneIndex = panes.findIndex((p) => p.id === activePaneId)
        if (activePaneIndex === -1) return

        const pane = panes[activePaneIndex]

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
            sessionId: newSessionId,
            path: cwd,
            label: generateLabelFromPath(cwd),
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
            sessionId: newSessionId,
            path: cwd,
            label: generateLabelFromPath(cwd),
            x: pane.x,
            y: pane.y + topHeight,
            width: pane.width,
            height: bottomHeight,
            generation: pane.generation + 1,
          }
        }

        const newPanes = [...panes]
        newPanes.splice(activePaneIndex, 1, updatedPane, newPane)

        set({
          panes: newPanes,
          activePaneId: newPaneId,
        })
      },

      closePane: async (paneId) => {
        const { panes } = get()
        if (!panes) return

        const paneIndex = panes.findIndex((p) => p.id === paneId)
        if (paneIndex === -1) return

        const pane = panes[paneIndex]

        // Close the PTY session
        await closeTerminalSession(pane.sessionId)

        const newPanes = panes.filter((p) => p.id !== paneId)

        // If only one pane left, transition back to single terminal mode
        if (newPanes.length === 1) {
          const remainingPane = newPanes[0]
          set({
            panes: null,
            activePaneId: null,
            mainSessionId: remainingPane.sessionId,
            mainPath: remainingPane.path,
          })
          return
        }

        // Find the best sibling pane to absorb the closed pane's space
        // Look for a pane that shares an edge with the closed pane
        const absorbingPane = findAbsorbingPane(pane, newPanes)

        if (absorbingPane) {
          // Calculate the combined bounds
          const combinedBounds = calculateCombinedBounds(pane, absorbingPane)

          // Update the absorbing pane to fill the combined space
          const updatedPanes = newPanes.map((p) =>
            p.id === absorbingPane.id
              ? {
                  ...p,
                  x: combinedBounds.x,
                  y: combinedBounds.y,
                  width: combinedBounds.width,
                  height: combinedBounds.height,
                }
              : p,
          )

          set((state) => ({
            panes: updatedPanes,
            activePaneId: state.activePaneId === paneId ? absorbingPane.id : state.activePaneId,
          }))
        } else {
          // Fallback: just remove the pane (shouldn't happen with proper sibling detection)
          set((state) => ({
            panes: newPanes,
            activePaneId: state.activePaneId === paneId ? newPanes[0].id : state.activePaneId,
          }))
        }
      },

      resetToSinglePane: async () => {
        const { panes, mainSessionId } = get()

        // Close all pane sessions except one
        if (panes && panes.length > 0) {
          const keepPane = panes[0]
          for (let i = 1; i < panes.length; i++) {
            await closeTerminalSession(panes[i].sessionId)
          }
          set({
            panes: null,
            activePaneId: null,
            mainSessionId: keepPane.sessionId,
            mainPath: keepPane.path,
          })
        }
      },

      updatePanePath: (paneId, newPath) => {
        set((state) => {
          if (!state.panes) return state
          return {
            ...state,
            panes: state.panes.map((p) =>
              p.id === paneId
                ? { ...p, path: newPath, label: generateLabelFromPath(newPath) }
                : p,
            ),
          }
        })
      },

      updateMainPath: (newPath) => {
        set({ mainPath: newPath })
      },

      getPaneBySessionId: (sessionId) => {
        const { panes, mainSessionId, mainPath } = get()
        
        // Check if it's the main session
        if (mainSessionId === sessionId) {
          return undefined // Main session doesn't have a pane structure
        }
        
        // Check panes
        return panes?.find((p) => p.sessionId === sessionId)
      },

      getPaneCount: () => {
        const { panes } = get()
        return panes ? panes.length : 1
      },

      getMainSessionId: () => get().mainSessionId,
    }),
    {
      name: 'filegraph-terminal-panes',
      partialize: (state) => ({
        panes: state.panes,
        activePaneId: state.activePaneId,
        mainSessionId: state.mainSessionId,
        mainPath: state.mainPath,
      }),
    },
  ),
)
