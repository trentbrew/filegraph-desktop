import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

type SessionData = {
  unlisten: UnlistenFn | null
  unlistenClosed: UnlistenFn | null
  buffer: string[]
  currentPath?: string
}

type ViewSink = {
  activeSessionId: string | null
  write: (data: string) => void
  onClosed: () => void
}

// Callback for path change notifications
type PathChangeCallback = (sessionId: string, newPath: string) => void
let pathChangeCallback: PathChangeCallback | null = null

export function setPathChangeCallback(callback: PathChangeCallback | null) {
  pathChangeCallback = callback
}

const MAX_BUFFER_CHUNKS = 5000

const sessions = new Map<string, SessionData>()
const viewSinks = new Map<string, ViewSink>()

/**
 * Parse OSC 7 escape sequences to extract the working directory.
 * OSC 7 format: \x1b]7;file://hostname/path\x07 or \x1b]7;file://hostname/path\x1b\\
 * Also handles: \x1b]7;/path\x07
 */
function parseOsc7Path(data: string): string | null {
  // Match OSC 7 sequences with various terminators
  const osc7Regex = /\x1b\]7;(?:file:\/\/[^\/]*)?([^\x07\x1b]*?)(?:\x07|\x1b\\)/g
  let match: RegExpExecArray | null
  let lastPath: string | null = null

  while ((match = osc7Regex.exec(data)) !== null) {
    const path = match[1]
    if (path && path.startsWith('/')) {
      // Decode URL-encoded characters (e.g., %20 -> space)
      try {
        lastPath = decodeURIComponent(path)
      } catch {
        lastPath = path
      }
    }
  }

  return lastPath
}

function appendToBuffer(sessionId: string, data: string) {
  const session = sessions.get(sessionId)
  if (!session) return
  session.buffer.push(data)
  if (session.buffer.length > MAX_BUFFER_CHUNKS) {
    session.buffer.splice(0, session.buffer.length - MAX_BUFFER_CHUNKS)
  }
}

export function registerTerminalView(viewId: string, sink: Omit<ViewSink, 'activeSessionId'>) {
  const existing = viewSinks.get(viewId)
  viewSinks.set(viewId, {
    activeSessionId: existing?.activeSessionId ?? null,
    write: sink.write,
    onClosed: sink.onClosed,
  })
}

export function unregisterTerminalView(viewId: string) {
  viewSinks.delete(viewId)
}

export function setTerminalViewActiveSession(viewId: string, sessionId: string | null) {
  const sink = viewSinks.get(viewId)
  if (!sink) return
  sink.activeSessionId = sessionId
}

export function getTerminalSessionBuffer(sessionId: string): readonly string[] {
  return sessions.get(sessionId)?.buffer ?? []
}

export function hasTerminalSession(sessionId: string): boolean {
  return sessions.has(sessionId)
}

export async function spawnTerminalSession(opts: { cwd?: string; cols: number; rows: number }): Promise<string> {
  const result = await invoke<{ id: string; success: boolean }>('terminal_spawn', {
    cwd: opts.cwd,
    cols: opts.cols,
    rows: opts.rows,
  })

  if (!result.success) {
    throw new Error('terminal_spawn failed')
  }

  if (sessions.has(result.id)) return result.id

  const unlisten = await listen<{ id: string; data: string }>('terminal-data', (event) => {
    if (event.payload.id !== result.id) return
    if (!event.payload.data) return

    appendToBuffer(result.id, event.payload.data)

    // Check for OSC 7 path change sequences
    const newPath = parseOsc7Path(event.payload.data)
    if (newPath) {
      const session = sessions.get(result.id)
      if (session && session.currentPath !== newPath) {
        session.currentPath = newPath
        pathChangeCallback?.(result.id, newPath)
      }
    }

    for (const sink of viewSinks.values()) {
      if (sink.activeSessionId === result.id) {
        sink.write(event.payload.data)
      }
    }
  })

  const unlistenClosed = await listen<{ id: string }>('terminal-closed', (event) => {
    if (event.payload.id !== result.id) return

    for (const sink of viewSinks.values()) {
      if (sink.activeSessionId === result.id) {
        sink.onClosed()
      }
    }
  })

  sessions.set(result.id, {
    unlisten,
    unlistenClosed,
    buffer: [],
  })

  return result.id
}

export async function closeTerminalSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId)
  session?.unlisten?.()
  session?.unlistenClosed?.()
  sessions.delete(sessionId)

  await invoke('terminal_close', { id: sessionId }).catch(console.error)
}

export async function writeTerminalSession(sessionId: string, data: string): Promise<void> {
  await invoke('terminal_write', { id: sessionId, data }).catch(console.error)
}

export async function resizeTerminalSession(sessionId: string, cols: number, rows: number): Promise<void> {
  await invoke('terminal_resize', { id: sessionId, cols, rows }).catch(console.error)
}

export async function resizeTerminalSessions(cols: number, rows: number): Promise<void> {
  const ids = Array.from(sessions.keys())
  await Promise.all(ids.map((id) => invoke('terminal_resize', { id, cols, rows }).catch(console.error)))
}
