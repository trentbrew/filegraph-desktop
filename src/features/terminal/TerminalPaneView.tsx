/**
 * Simple Terminal Pane Component
 * A lightweight terminal view that connects directly to a session ID.
 * Used for the Fibonacci split layout.
 */

import { useCallback, useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { useTheme } from 'next-themes'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePreviewStore } from '@/stores/usePreviewStore'
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

interface TerminalPaneProps {
  viewId: string
  sessionId: string
  className?: string
  isActive?: boolean
  onFocus?: () => void
  onClose?: () => void
}

export function TerminalPaneView({
  viewId,
  sessionId,
  className,
  isActive = true,
  onFocus,
  onClose,
}: TerminalPaneProps) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string>(sessionId)

  // Update ref when sessionId changes
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  // Initialize xterm
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

    // Send user input to the PTY session
    terminal.onData((data) => {
      void writeTerminalSession(sessionIdRef.current, data)
    })

    return terminal
  }, [resolvedTheme])

  // Handle resize - debounced to avoid excessive fitting
  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    try {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      void resizeTerminalSessions(cols, rows)
    } catch (e) {
      console.debug('[TerminalPane] Resize skipped:', e)
    }
  }, [])

  // Debounced resize handler
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }
    resizeTimeoutRef.current = setTimeout(() => {
      handleResize()
    }, 50)
  }, [handleResize])

  // Mount/unmount
  useEffect(() => {
    const terminal = initXterm()
    if (!terminal) return

    // Register this view with the terminal registry
    registerTerminalView(viewId, {
      write: (data) => terminalRef.current?.write(data),
      onClosed: () => terminalRef.current?.writeln('\r\n\x1b[33mTerminal session ended\x1b[0m'),
    })

    // Wire this view to its session
    setTerminalViewActiveSession(viewId, sessionId)

    // Replay buffer to show existing output
    for (const chunk of getTerminalSessionBuffer(sessionId)) {
      terminal.write(chunk)
    }

    // Aggressive initial fit sequence to ensure PTY gets correct dimensions
    // First fit immediately
    handleResize()
    // Then fit again after layout settles
    const t1 = setTimeout(() => handleResize(), 50)
    // And once more after a short delay to catch any late layout changes
    const t2 = setTimeout(() => handleResize(), 150)

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize()
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeObserver.disconnect()
      unregisterTerminalView(viewId)

      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
    }
  }, [viewId, sessionId, initXterm, handleResize, debouncedResize])

  // Update session wiring when sessionId changes
  useEffect(() => {
    setTerminalViewActiveSession(viewId, sessionId)

    // Replay buffer when session changes
    if (terminalRef.current) {
      terminalRef.current.clear()
      for (const chunk of getTerminalSessionBuffer(sessionId)) {
        terminalRef.current.write(chunk)
      }
    }
  }, [viewId, sessionId])

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
        }
      : {
          background: '#fafafa',
          foreground: '#383a42',
          cursor: '#383a42',
          cursorAccent: '#fafafa',
          selectionBackground: '#bfceff',
        }

    terminalRef.current.options.theme = newTheme
  }, [resolvedTheme])

  // Focus terminal when pane becomes active
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus()
    }
  }, [isActive])

  return (
    <div
      className={cn(
        'group relative flex flex-col h-full w-full overflow-hidden rounded-xl bg-card',
        isActive ? 'ring-1 ring-primary/50' : 'ring-1 ring-border',
        className,
      )}
      onClick={() => {
        onFocus?.()
        terminalRef.current?.focus()
      }}>
      {/* Close button (visible on hover when closeable) */}
      {onClose && (
        <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Close pane">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Terminal container */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-0 min-w-0 p-2 overflow-hidden" />
    </div>
  )
}
