/**
 * Integrated Terminal Component
 * Uses xterm.js with Tauri PTY backend
 * Supports multiple tabs with independent PTY sessions
 *
 * Key design constraint:
 * - PTY sessions must be a persistent, global process (independent of view/app).
 *   This component is a *view* into those sessions; unmounting must NOT close them.
 */

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { useTheme } from 'next-themes'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { ChevronDown, Plus, Maximize2, Minimize2, X, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePreviewStore } from '@/stores/usePreviewStore'
import { usePtyTerminalTabsStore } from '@/stores/usePtyTerminalTabsStore'
import {
  getTerminalSessionBuffer,
  registerTerminalView,
  resizeTerminalSessions,
  setTerminalViewActiveSession,
  unregisterTerminalView,
  writeTerminalSession,
} from '@/features/terminal/terminalRegistry'
import { TERMINAL_FONT_FAMILY, TERMINAL_FONT_SIZE, TERMINAL_LINE_HEIGHT } from '@/features/terminal/terminalUtils'

import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  className?: string
  initialCwd?: string
  viewId?: string
  onClose?: () => void
  onMaximize?: () => void
  onSplitHorizontal?: () => void
  onSplitVertical?: () => void
  onFocus?: () => void
  isMaximized?: boolean
  isSplit?: boolean
  isActive?: boolean
  showTabs?: boolean // Whether to show built-in tab bar (false when using external TabBar)
}

export interface TerminalHandle {
  focus: () => void
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  {
    className,
    initialCwd,
    viewId = 'main',
    onClose,
    onMaximize,
    onSplitHorizontal,
    onSplitVertical,
    onFocus,
    isMaximized = false,
    isSplit = false,
    isActive = true,
    showTabs = true,
  },
  ref,
) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const activeSessionIdRef = useRef<string | null>(null)

  const { tabs, activeTabByView, ensureView, ensureInitialized, addTab, closeTab, setActiveTab } =
    usePtyTerminalTabsStore()

  const activeTabId = activeTabByView[viewId] ?? null
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? null, [tabs, activeTabId])
  const activeSessionId = activeTab?.sessionId ?? null

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  // Initialize xterm (view only)
  const initXterm = useCallback(() => {
    if (!containerRef.current || terminalRef.current) return null

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const isDark =
      document.documentElement.classList.contains('dark') ||
      resolvedTheme === 'dark' ||
      (resolvedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const terminalTheme = isDark
      ? {
          background: '#0a0a0a',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#0a0a0a',
          selectionBackground: '#264f78',
          selectionForeground: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        }
      : {
          background: '#fafafa',
          foreground: '#383a42',
          cursor: '#383a42',
          cursorAccent: '#fafafa',
          selectionBackground: '#bfceff',
          selectionForeground: '#383a42',
          black: '#383a42',
          red: '#e45649',
          green: '#50a14f',
          yellow: '#c18401',
          blue: '#4078f2',
          magenta: '#a626a4',
          cyan: '#0184bc',
          white: '#fafafa',
          brightBlack: '#4f525e',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#e5c07b',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff',
        }

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: TERMINAL_FONT_FAMILY,
      fontSize: TERMINAL_FONT_SIZE,
      lineHeight: TERMINAL_LINE_HEIGHT,
      theme: terminalTheme,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      event.preventDefault()
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(uri)
      if (isLocalhost) {
        const normalizedUrl = uri.replace(/^https:/i, 'http:')
        usePreviewStore
          .getState()
          .openPreview(normalizedUrl, `Preview: ${normalizedUrl}`)
          .catch((err) => {
            console.error('Failed to open preview:', err)
            window.open(normalizedUrl, '_blank', 'noopener,noreferrer')
          })
      } else {
        window.open(uri, '_blank', 'noopener,noreferrer')
      }
    })
    const unicode11Addon = new Unicode11Addon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)
    terminal.loadAddon(unicode11Addon)
    terminal.unicode.activeVersion = '11'

    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.onData((data) => {
      const sessionId = activeSessionIdRef.current
      if (sessionId) void writeTerminalSession(sessionId, data)
    })

    return terminal
  }, [resolvedTheme])

  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    try {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      void resizeTerminalSessions(cols, rows)
    } catch (e) {
      console.debug('[Terminal] Resize skipped:', e)
    }
  }, [])

  // Mount/unmount: register this view and ensure global sessions exist.
  useEffect(() => {
    ensureView(viewId)

    const terminal = initXterm()
    if (!terminal) return

    registerTerminalView(viewId, {
      write: (data) => terminalRef.current?.write(data),
      onClosed: () => terminalRef.current?.writeln('\r\n\x1b[33mTerminal session ended\x1b[0m'),
    })

    // Ensure there is at least one persistent PTY session.
    void ensureInitialized({ cwd: initialCwd, cols: terminal.cols, rows: terminal.rows })

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (!terminalRef.current) {
            initXterm()
          } else {
            handleResize()
          }
        }
      }
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      unregisterTerminalView(viewId)

      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
    }
  }, [ensureInitialized, ensureView, handleResize, initXterm, initialCwd, viewId])

  // Keep this view's active session wired to the global data stream.
  useEffect(() => {
    setTerminalViewActiveSession(viewId, activeSessionId)
  }, [activeSessionId, viewId])

  // If a view is created after tabs exist (split), default it to the first tab.
  useEffect(() => {
    if (tabs.length === 0) return
    if (activeTabId) return
    setActiveTab(viewId, tabs[0].id)
  }, [activeTabId, setActiveTab, tabs, viewId])

  // Replay buffer when switching tabs (new view attaches to existing sessions).
  useEffect(() => {
    if (!terminalRef.current) return
    if (!activeTab) return
    terminalRef.current.clear()
    for (const chunk of getTerminalSessionBuffer(activeTab.sessionId)) {
      terminalRef.current.write(chunk)
    }
  }, [activeTab])

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (!terminalRef.current) return

    const isDark =
      document.documentElement.classList.contains('dark') ||
      resolvedTheme === 'dark' ||
      (resolvedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const newTheme = isDark
      ? {
          background: '#0a0a0a',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#0a0a0a',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        }
      : {
          background: '#fafafa',
          foreground: '#383a42',
          cursor: '#383a42',
          cursorAccent: '#fafafa',
          selectionBackground: '#bfceff',
          black: '#383a42',
          red: '#e45649',
          green: '#50a14f',
          yellow: '#c18401',
          blue: '#4078f2',
          magenta: '#a626a4',
          cyan: '#0184bc',
          white: '#fafafa',
          brightBlack: '#4f525e',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#e5c07b',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff',
        }

    terminalRef.current.options.theme = newTheme
  }, [resolvedTheme])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => terminalRef.current?.focus(),
    }),
    [],
  )

  const handleContainerClick = useCallback(() => {
    terminalRef.current?.focus()
    onFocus?.()
  }, [onFocus])

  const handleAddTab = useCallback(() => {
    if (!terminalRef.current) return
    void addTab({ cwd: initialCwd, cols: terminalRef.current.cols, rows: terminalRef.current.rows })
  }, [addTab, initialCwd])

  const handleCloseTab = useCallback(
    (tabId: string) => {
      void closeTab(tabId)
      // If user closes last tab, leave the terminal app open; sessions list will be empty.
      // If callers want to exit, they should invoke onClose.
    },
    [closeTab],
  )

  return (
    <div
      className={cn(
        'group relative flex flex-col h-full overflow-hidden !rounded-2xl border border-border bg-card',
        !showTabs && 'rounded-lg',
        isSplit && isActive && 'ring-1 ring-accent',
        className,
      )}
      onClick={onFocus}>
      {showTabs && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'group flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors cursor-pointer',
                  activeTabId === tab.id
                    ? 'bg-secondary  text-foreground border-t-2 border-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}>
                <span
                  onClick={() => {
                    setActiveTab(viewId, tab.id)
                    if (!terminalRef.current) return
                    terminalRef.current.clear()
                    for (const chunk of getTerminalSessionBuffer(tab.sessionId)) {
                      terminalRef.current.write(chunk)
                    }
                  }}>
                  {tab.title}
                </span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCloseTab(tab.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-1">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleAddTab}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', tabs.length > 0 ? 'bg-green-500' : 'bg-red-500')} />
            {onSplitVertical && !isSplit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onSplitVertical}
                title="Split vertically">
                <SplitSquareHorizontal className="h-3 w-3" />
              </Button>
            )}
            {onSplitHorizontal && !isSplit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onSplitHorizontal}
                title="Split horizontally">
                <SplitSquareVertical className="h-3 w-3" />
              </Button>
            )}
            {onMaximize && !isSplit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onMaximize}>
                {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                title={isSplit ? 'Close split' : 'Collapse terminal'}>
                {isSplit ? <X className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating close button for split panes when external tabs are used */}
      {!showTabs && isSplit && onClose && (
        <div className="absolute top-1 right-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onClose}
            title="Close pane">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="flex-1 w-full h-full min-h-0 min-w-0 p-2 overflow-hidden"
      />
    </div>
  )
})
