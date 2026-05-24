/**
 * Terminal Panel Component
 * A toggleable panel that contains the integrated terminal
 * Supports split view for side-by-side terminals
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Terminal as TerminalIcon, ChevronUp, GripHorizontal } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Terminal, TerminalHandle } from './Terminal'
import { useFileStore } from '@/stores/useFileStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

interface TerminalPanelProps {
  isOpen: boolean
  onToggle: () => void
  height?: number
  onHeightChange?: (height: number) => void
}

const MIN_HEIGHT = 150
const MAX_HEIGHT = 600

export function TerminalPanel({ isOpen, onToggle, height = 300, onHeightChange }: TerminalPanelProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [panelHeight, setPanelHeight] = useState(height)
  const [isResizing, setIsResizing] = useState(false)
  const [isSplit, setIsSplit] = useState(false)
  const [activeSplit, setActiveSplit] = useState<'left' | 'right'>('left')
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const leftTerminalRef = useRef<TerminalHandle>(null)
  const rightTerminalRef = useRef<TerminalHandle>(null)
  const currentPath = useFileStore((state) => state.currentPath)

  // Use project root for terminal, not vault path
  const [terminalCwd, setTerminalCwd] = useState('~/TURTLE/Projects/Apps/filegraph')

  // Get the actual project root dynamically
  useEffect(() => {
    const getProjectRoot = async () => {
      try {
        const projectRoot = await invoke<string>('get_project_root')
        setTerminalCwd(projectRoot)
      } catch (error) {
        console.error('Failed to get project root:', error)
        // Fallback to hardcoded path
        setTerminalCwd('~/TURTLE/Projects/Apps/filegraph')
      }
    }

    getProjectRoot()
  }, [])

  // Handle maximize toggle
  const handleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startYRef.current = e.clientY
      startHeightRef.current = panelHeight
    },
    [panelHeight],
  )

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return

      const deltaY = startYRef.current - e.clientY
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + deltaY))
      setPanelHeight(newHeight)
    },
    [isResizing],
  )

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      onHeightChange?.(panelHeight)
    }
  }, [isResizing, panelHeight, onHeightChange])

  // Add/remove global mouse listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Listen for toggle-terminal events
  useEffect(() => {
    const handleToggle = () => {
      if (isOpen) {
        onToggle()
      }
    }

    window.addEventListener('close-terminal', handleToggle)
    return () => window.removeEventListener('close-terminal', handleToggle)
  }, [isOpen, onToggle])

  // Handle split terminal
  const handleSplit = useCallback(() => {
    if (!isSplit) {
      setIsSplit(true)
      setActiveSplit('right')
    }
  }, [isSplit])

  // Handle closing a split pane
  const handleCloseSplit = useCallback(
    (side: 'left' | 'right') => {
      if (isSplit) {
        setIsSplit(false)
        setActiveSplit('left')
      } else {
        // If not split, close the entire terminal
        onToggle()
      }
    },
    [isSplit, onToggle],
  )

  // Listen for split-terminal events
  useEffect(() => {
    const handleSplitEvent = () => {
      if (isOpen) {
        handleSplit()
      }
    }

    window.addEventListener('split-terminal', handleSplitEvent)
    return () => window.removeEventListener('split-terminal', handleSplitEvent)
  }, [isOpen, handleSplit])

  // Focus the active split when it changes
  useEffect(() => {
    if (!isOpen) return
    const ref = activeSplit === 'left' ? leftTerminalRef : rightTerminalRef
    ref.current?.focus()
  }, [activeSplit, isOpen])

  // Always render both states - keep Terminal mounted to preserve PTY session
  return (
    <>
      {/* Collapsed bar */}
      {!isOpen && (
        <div className="px-3 pb-3">
          <div className="h-10 border border-border bg-secondary rounded-xl flex items-center pl-3 pr-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">Debug Mode</div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-7 px-2 gap-1.5 text-xs opacity-50 hover:opacity-100">
                <TerminalIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Terminal</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal panel - always mounted but hidden when collapsed */}
      <div
        className={cn('px-3 pb-4', isMaximized ? 'fixed inset-0 z-50 p-0' : '', !isOpen && 'hidden')}
        style={{ height: isMaximized ? '100vh' : panelHeight + 12 }}>
        {/* Resize handle */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              'h-2 flex items-center justify-center cursor-ns-resize group',
              'hover:bg-accent/50 rounded-t-2xl -mb-1',
              isResizing && 'bg-accent/50',
            )}>
            <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
          </div>
        )}
        <div
          className={cn(
            'h-full border border-border rounded-xl overflow-hidden ',
            isMaximized && 'rounded-none border-0',
            !isMaximized && 'rounded-t-lg',
          )}>
          {isSplit ? (
            <ResizablePanelGroup direction="horizontal" className="h-full !p-0">
              <ResizablePanel defaultSize={50} minSize={20}>
                <Terminal
                  ref={leftTerminalRef}
                  initialCwd={terminalCwd}
                  onClose={() => handleCloseSplit('left')}
                  onMaximize={handleMaximize}
                  onSplitHorizontal={handleSplit}
                  onFocus={() => setActiveSplit('left')}
                  isMaximized={isMaximized}
                  isSplit={true}
                  isActive={activeSplit === 'left'}
                />
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-border hover:bg-accent transition-colors" />
              <ResizablePanel defaultSize={50} minSize={20}>
                <Terminal
                  ref={rightTerminalRef}
                  initialCwd={terminalCwd}
                  onClose={() => handleCloseSplit('right')}
                  onMaximize={handleMaximize}
                  onSplitHorizontal={handleSplit}
                  onFocus={() => setActiveSplit('right')}
                  isMaximized={isMaximized}
                  isSplit={true}
                  isActive={activeSplit === 'right'}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <Terminal
              ref={leftTerminalRef}
              initialCwd={terminalCwd}
              onClose={onToggle}
              onMaximize={handleMaximize}
              onSplitHorizontal={handleSplit}
              isMaximized={isMaximized}
              isSplit={false}
            />
          )}
        </div>
      </div>
    </>
  )
}
