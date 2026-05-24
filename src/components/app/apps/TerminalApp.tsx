import * as React from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { Split, X } from 'lucide-react'

import { TerminalPaneView } from '@/features/terminal/TerminalPaneView'
import { useAppStore } from '@/stores/useAppStore'
import { useTerminalPanesStore } from '@/stores/useTerminalPanesStore'
import { setPathChangeCallback } from '@/features/terminal/terminalRegistry'
import { estimateInitialDimensions } from '@/features/terminal/terminalUtils'

export function TerminalApp() {
  const appWindow = React.useMemo(() => {
    try {
      return getCurrentWindow()
    } catch {
      return null
    }
  }, [])

  const { setActiveApp } = useAppStore()
  const {
    panes,
    activePaneId,
    mainSessionId,
    ensureInitialized,
    setActivePaneId,
    splitActivePane,
    closePane,
    resetToSinglePane,
    updatePanePath,
    updateMainPath,
    getPaneBySessionId,
    getPaneCount,
  } = useTerminalPanesStore()

  const [terminalCwd, setTerminalCwd] = React.useState<string | undefined>(undefined)

  // Get the project root on mount
  React.useEffect(() => {
    const getProjectRoot = async () => {
      try {
        const projectRoot = await invoke<string>('get_project_root')
        setTerminalCwd(projectRoot)
      } catch (error) {
        console.error('Failed to get project root:', error)
      }
    }
    getProjectRoot()
  }, [])

  // Initialize terminal session with calculated dimensions based on window size
  React.useEffect(() => {
    if (terminalCwd !== undefined) {
      // Calculate initial dimensions based on window size and font metrics
      const { cols, rows } = estimateInitialDimensions()
      ensureInitialized({ cwd: terminalCwd, cols, rows })
    }
  }, [terminalCwd, ensureInitialized])

  // Set up path change callback to update pane labels in realtime
  React.useEffect(() => {
    setPathChangeCallback((sessionId, newPath) => {
      const pane = getPaneBySessionId(sessionId)
      if (pane) {
        updatePanePath(pane.id, newPath)
      } else if (mainSessionId === sessionId) {
        updateMainPath(newPath)
      }
    })

    return () => {
      setPathChangeCallback(null)
    }
  }, [getPaneBySessionId, updatePanePath, updateMainPath, mainSessionId])

  // Split the active pane using Fibonacci/golden ratio
  const handleSplit = React.useCallback(async () => {
    // Calculate dimensions for the new split pane (roughly half the current size)
    const { cols, rows } = estimateInitialDimensions()
    await splitActivePane({ cwd: terminalCwd, cols: Math.floor(cols / 2), rows })
  }, [splitActivePane, terminalCwd])

  // Listen for split-terminal events (from keybinding cmd+/)
  React.useEffect(() => {
    const handleSplitEvent = () => {
      handleSplit()
    }
    window.addEventListener('split-terminal', handleSplitEvent)
    return () => window.removeEventListener('split-terminal', handleSplitEvent)
  }, [handleSplit])

  // Close a specific pane
  const handleClosePane = React.useCallback(
    async (paneId: string) => {
      await closePane(paneId)
      // If no panes left, return to files app
      if (getPaneCount() <= 1) {
        // Check if we're back to single mode or no terminals
        const state = useTerminalPanesStore.getState()
        if (!state.mainSessionId && (!state.panes || state.panes.length === 0)) {
          setActiveApp('files')
        }
      }
    },
    [closePane, getPaneCount, setActiveApp],
  )

  // Reset to single pane (close all splits)
  const handleResetSplits = React.useCallback(async () => {
    await resetToSinglePane()
  }, [resetToSinglePane])

  const handleFullscreen = async () => {
    if (!appWindow) return
    const isFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!isFullscreen)
  }

  const isSplitMode = panes !== null && panes.length > 0

  return (
    <div className="flex flex-col h-full bg-background p-0 gap-0">
      {/* <div
        data-tauri-drag-region
        className="flex flex-row items-center justify-between bg-transparent backdrop-blur-xl shrink-0 p-3 pt-1">
        <div data-tauri-drag-region className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => appWindow.close()}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Close">
              <span className="hidden group-hover:inline text-[10px] text-red-900 font-bold leading-none">×</span>
            </button>
            <button
              onClick={() => appWindow.minimize()}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Minimize">
              <span className="hidden group-hover:inline text-[10px] text-yellow-900 font-bold leading-none">−</span>
            </button>
            <button
              onClick={handleFullscreen}
              className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#34C759] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Fullscreen">
              <span className="hidden group-hover:inline text-[8px] text-green-900 font-bold leading-none">⤢</span>
            </button>
          </div>
          <Separator orientation="vertical" className="h-4" />
        </div>

        <div data-tauri-drag-region className="flex-1 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono">
            {isSplitMode ? `${panes.length} panes` : 'Terminal'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleSplit}
            title="Split (φ = 1.618...)">
            <Split className="h-4 w-4" />
          </Button>
        </div>
      </div> */}

      {/* Terminal Content - Fibonacci Layout */}
      <div className="flex-1 relative min-h-0">
        {isSplitMode ? (
          panes.map((pane) => (
            <div
              key={pane.id}
              className="absolute transition-all duration-300 ease-out"
              style={{
                left: `${pane.x}%`,
                top: `${pane.y}%`,
                width: `${pane.width}%`,
                height: `${pane.height}%`,
                padding: '6px',
              }}>
              <TerminalPaneView
                viewId={`terminal:${pane.id}`}
                sessionId={pane.sessionId}
                isActive={activePaneId === pane.id}
                onFocus={() => setActivePaneId(pane.id)}
                onClose={panes.length > 1 ? () => handleClosePane(pane.id) : undefined}
              />
            </div>
          ))
        ) : mainSessionId ? (
          <TerminalPaneView
            viewId="terminal:main"
            sessionId={mainSessionId}
            isActive={true}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">Initializing terminal...</div>
        )}
      </div>
    </div>
  )
}
