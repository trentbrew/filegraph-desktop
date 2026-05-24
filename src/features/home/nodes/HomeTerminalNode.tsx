import * as React from 'react'
import type { NodeProps } from 'reactflow'
import { Terminal as TerminalIcon } from 'lucide-react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useTheme } from 'next-themes'
import { invoke } from '@tauri-apps/api/core'

import { cn } from '@/lib/utils'
import { usePreviewStore } from '@/stores/usePreviewStore'
import {
  closeTerminalSession,
  getTerminalSessionBuffer,
  hasTerminalSession,
  registerTerminalView,
  resizeTerminalSession,
  setTerminalViewActiveSession,
  spawnTerminalSession,
  unregisterTerminalView,
  writeTerminalSession,
} from '@/features/terminal/terminalRegistry'
import { TERMINAL_FONT_FAMILY, TERMINAL_FONT_SIZE, TERMINAL_LINE_HEIGHT } from '@/features/terminal/terminalUtils'
import { CanvasNodeWrapper } from './CanvasNodeWrapper'

import '@xterm/xterm/css/xterm.css'

export interface HomeTerminalNodeData {
  label?: string
  cwd?: string
  sessionId?: string
  isMaximized?: boolean
}

export function HomeTerminalNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<HomeTerminalNodeData> & { groupColor?: string }) {
  const { resolvedTheme } = useTheme()

  const viewId = React.useMemo(() => `home-terminal:${id}`, [id])
  const containerRef = React.useRef<HTMLDivElement>(null)
  const terminalRef = React.useRef<XTerm | null>(null)
  const fitAddonRef = React.useRef<FitAddon | null>(null)
  const resizeRafRef = React.useRef<number | null>(null)
  const lastDimsRef = React.useRef<{ cols: number; rows: number } | null>(null)

  const [sessionId, setSessionId] = React.useState<string | null>(data?.sessionId ?? null)
  const sessionIdRef = React.useRef<string | null>(sessionId)

  React.useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const label = data?.label || 'Terminal'
  const isMaximized = data?.isMaximized || false
  const [isEditing, setIsEditing] = React.useState(false)
  const canInteract = isMaximized || isEditing

  React.useEffect(() => {
    if (!selected) setIsEditing(false)
  }, [selected])

  const initXterm = React.useCallback(() => {
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

    terminal.onData((input) => {
      const activeSessionId = sessionIdRef.current
      if (!activeSessionId) return
      void writeTerminalSession(activeSessionId, input)
    })

    return terminal
  }, [resolvedTheme])

  const handleResize = React.useCallback(() => {
    if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    if (resizeRafRef.current != null) {
      cancelAnimationFrame(resizeRafRef.current)
    }

    resizeRafRef.current = requestAnimationFrame(() => {
      try {
        const fitAddon = fitAddonRef.current
        const terminal = terminalRef.current
        if (!fitAddon || !terminal) return

        // Prefer explicit dimension proposal to avoid occasional fit() races.
        const proposed = fitAddon.proposeDimensions()
        if (proposed?.cols && proposed?.rows) {
          terminal.resize(proposed.cols, proposed.rows)
        } else {
          fitAddon.fit()
        }

        const activeSessionId = sessionIdRef.current
        if (!activeSessionId) return

        const nextCols = terminal.cols
        const nextRows = terminal.rows
        const last = lastDimsRef.current
        if (!last || last.cols !== nextCols || last.rows !== nextRows) {
          lastDimsRef.current = { cols: nextCols, rows: nextRows }
          void resizeTerminalSession(activeSessionId, nextCols, nextRows)
        }
      } catch (err) {
        console.debug('[HomeTerminalNode] Resize skipped:', err)
      }
    })
  }, [])

  React.useEffect(() => {
    const terminal = initXterm()
    if (!terminal) return

    registerTerminalView(viewId, {
      write: (chunk) => terminalRef.current?.write(chunk),
      onClosed: () => terminalRef.current?.writeln('\r\n\x1b[33mTerminal session ended\x1b[0m'),
    })

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)

    const t1 = setTimeout(() => handleResize(), 50)
    const t2 = setTimeout(() => handleResize(), 150)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (resizeRafRef.current != null) {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
      resizeObserver.disconnect()
      unregisterTerminalView(viewId)

      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
    }
  }, [initXterm, viewId, handleResize])

  React.useEffect(() => {
    let cancelled = false

    const ensureSession = async () => {
      if (!terminalRef.current) return

      const existing = data?.sessionId
      if (existing && hasTerminalSession(existing)) {
        setSessionId(existing)
        return
      }

      const cwd = data?.cwd || (await invoke<string>('get_project_root').catch(() => ''))
      const next = await spawnTerminalSession({
        cwd: cwd || undefined,
        cols: terminalRef.current.cols,
        rows: terminalRef.current.rows,
      })
      if (cancelled) return

      setSessionId(next)
      window.dispatchEvent(new CustomEvent('canvas-node-update', { detail: { id, data: { sessionId: next, cwd } } }))
    }

    void ensureSession().catch((err) => console.error('[HomeTerminalNode] Failed to spawn terminal session:', err))

    return () => {
      cancelled = true
    }
  }, [data?.cwd, data?.sessionId, id])

  React.useEffect(() => {
    if (!sessionId) return

    setTerminalViewActiveSession(viewId, sessionId)

    if (terminalRef.current) {
      terminalRef.current.clear()
      for (const chunk of getTerminalSessionBuffer(sessionId)) {
        terminalRef.current.write(chunk)
      }
    }

    handleResize()
  }, [sessionId, viewId, handleResize])

  React.useEffect(() => {
    return () => {
      const current = sessionIdRef.current
      if (current) {
        void closeTerminalSession(current)
      }
    }
  }, [])

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!isEditing) return
    if (!terminalRef.current) return
    try {
      terminalRef.current.focus()
    } catch {
      // ignore
    }
    handleResize()
  }, [isEditing])

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<TerminalIcon className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      minWidth={500}
      minHeight={300}>
      <div className={cn('flex-1 min-h-0', canInteract ? 'nodrag nowheel' : 'pointer-events-none')}>
        <div className="h-full w-full min-h-0 min-w-0 p-2 overflow-hidden">
          <div ref={containerRef} className="h-full w-full min-h-0 min-w-0 overflow-hidden" />
        </div>
      </div>
    </CanvasNodeWrapper>
  )
}
