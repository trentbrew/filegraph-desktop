/**
 * Agent Tools — Shell / Terminal Domain
 *
 * Tools for executing shell commands, reading terminal output,
 * and setting up development workspaces.
 */

import { invoke } from '@tauri-apps/api/core'
import { join, homeDir } from '@tauri-apps/api/path'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const SHELL_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'run_command',
    description: `Run a shell command and return captured stdout/stderr. The command runs as a subprocess (not in a PTY), so interactive programs won't work.

**Requires user approval before execution.** The user will see the command and can approve or deny it.

**Good for:**
- Installing dependencies (pnpm install, pip install, cargo build)
- Running scripts (pnpm build, python script.py, node index.js)
- Checking status (git status, ls, cat, which, echo)
- Running tests (pnpm test, pytest, cargo test)
- File operations (mkdir, cp, mv — but prefer vault tools for vault files)

**Not good for:**
- Interactive programs (vim, top, htop)
- Long-running servers (use a terminal node instead)
- Commands needing TTY input

**Output:** Returns { stdout, stderr, exit_code, timed_out, truncated, duration_ms }
Timeout default: 30s. Output capped at ~100KB.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute (e.g., "pnpm install express", "git status")' },
        cwd: { type: ['string', 'null'], description: 'Working directory for the command. Null defaults to user home.' },
        timeout: { type: ['number', 'null'], description: 'Timeout in seconds (default: 30, max: 300)' },
      },
      required: ['command', 'cwd', 'timeout'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_terminal_output',
    description: `Read recent output from a terminal node on the Home canvas. Returns plain text (ANSI escape codes stripped).

Use get_home_canvas first to find terminal node IDs.

**When to use:**
- To see what happened in a terminal the user is working in
- To check if a server started successfully
- To read build output or error messages`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the terminal node on the canvas' },
        lastNLines: { type: ['number', 'null'], description: 'Number of recent lines to return (default: 50, max: 500)' },
      },
      required: ['nodeId', 'lastNLines'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'write_to_terminal',
    description: `Type a command into an existing terminal node on the Home canvas. The command will be sent as keystrokes to the PTY session, as if the user typed it.

Use get_home_canvas first to find terminal node IDs.

**When to use:**
- To start a long-running server in a visible terminal node
- When the user wants to see the command running interactively
- For interactive programs that need a TTY

**Note:** Unlike run_command, this does NOT return output. Use read_terminal_output afterwards to check results.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the terminal node on the canvas' },
        command: { type: 'string', description: 'Command to type into the terminal' },
        pressEnter: { type: ['boolean', 'null'], description: 'Whether to press Enter after typing (default: true)' },
      },
      required: ['nodeId', 'command', 'pressEnter'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_available_port',
    description: `Find and reserve an available network port in the 4000–9999 range.

**When to use:** Use this when you are setting up a project manually (without setup_dev_workspace) and need a port for a dev server.

**Returns:** { port }`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'setup_dev_workspace',
    description: `Create a full development workspace by automatically creating a **new Space** for the project. This tool:
1. Creates a new Space (dedicated directory at ~/.filegraph/@spaces/<project-slug>/)
2. Switches to the new Space (sidebar and canvas update)
3. Writes all specified files into the Space directory
4. Adds canvas nodes: terminal (with cwd), file-backed code editors, optional web preview, and notes
5. Groups everything together on the canvas
6. Optionally starts a dev server command in the terminal

**Port handling:** The system automatically assigns a random available port (4000–9999) for each project's dev server. You do NOT need to choose a port — just provide the command and set port to null.

**Use this when the user asks to:** build a website, scaffold a project, set up a dev environment, create files with a workspace, etc.
**Do NOT use this for:** incremental edits, fixing bugs, or modifying existing files — use edit_file or write_file instead.

Returns: { groupId, nodeIds, projectPath, filesCreated, port (if devServer was specified) }

**IMPORTANT:** After this tool completes, you MUST call \`verify_dev_project\` to check for errors and fix them before telling the user the project is ready.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the project (used as Space name and group label)' },
        projectPath: { type: ['string', 'null'], description: 'Optional override path. Usually omit this (set to null) — the tool auto-creates a Space directory. Only set this if the user explicitly wants files at a custom location.' },
        files: {
          type: 'array',
          description: 'Files to create in the project',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path within the project (e.g., "index.html", "src/app.js")' },
              content: { type: 'string', description: 'File content' },
              language: { type: ['string', 'null'], description: 'Language for syntax highlighting (html, css, javascript, typescript, python, rust, etc.)' },
            },
            required: ['path', 'content', 'language'],
            additionalProperties: false,
          },
        },
        devServer: {
          type: ['object', 'null'],
          description: 'Optional dev server configuration. If provided, starts the command in the terminal and adds a web preview embed.',
          properties: {
            command: { type: 'string', description: 'Command to start the dev server (e.g., "npx serve .", "pnpm dev")' },
            port: { type: ['number', 'null'], description: 'Ignored — the system auto-assigns a random available port. Set to null.' },
          },
          required: ['command', 'port'],
          additionalProperties: false,
        },
        notes: { type: ['string', 'null'], description: 'Optional documentation/notes to add as a sticky note on the canvas' },
      },
      required: ['name', 'files', 'devServer', 'notes'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'verify_dev_project',
    description: `Verify that a generated project is working correctly. Run this AFTER setup_dev_workspace or after writing code files.

**What it checks:**
1. **File syntax** — Runs \`node --check\` on .js/.mjs files to catch SyntaxErrors
2. **Server health** — If a port is provided, checks that the process is listening and the HTTP response is 200
3. **Terminal errors** — If a terminalNodeId is provided, scans recent output for error patterns (SyntaxError, ReferenceError, ENOENT, etc.)

**Returns:** { healthy, fileErrors, serverStatus, terminalErrors }

**IMPORTANT:** Always call this after scaffolding a project. If errors are found, fix them with edit_file and re-verify.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        projectPath: { type: 'string', description: 'Absolute path to the project directory. Use the projectPath from setup_dev_workspace result.' },
        port: { type: ['number', 'null'], description: 'Port the dev server is running on. If provided, checks HTTP health.' },
        terminalNodeId: { type: ['string', 'null'], description: 'Canvas terminal node ID to scan for errors. Use nodeIds.terminal from setup_dev_workspace result.' },
      },
      required: ['projectPath', 'port', 'terminalNodeId'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\]7;[^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][0-9A-B]/g, '')
    .replace(/\r/g, '')
}

// Global map of pending approval resolve callbacks keyed by resolveId
const pendingApprovals = new Map<string, (approved: boolean) => void>()

export function resolveCommandApproval(resolveId: string, approved: boolean) {
  const resolve = pendingApprovals.get(resolveId)
  if (resolve) {
    resolve(approved)
    pendingApprovals.delete(resolveId)
  }
}

function requestCommandApproval(command: string, cwd: string | null): Promise<boolean> {
  // Check "always allow" setting
  const { useUIStore } = require('@/stores/useUIStore') as typeof import('@/stores/useUIStore')
  if (useUIStore.getState().agentAlwaysAllowCommands) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const resolveId = crypto.randomUUID()
    pendingApprovals.set(resolveId, resolve)

    // Inject an inline approval card into the chat thread
    const { useChatStore } = require('../hooks/useChatStore') as typeof import('../hooks/useChatStore')
    useChatStore.getState().addMessage({
      role: 'assistant',
      content: '',
      card: {
        type: 'command-approval' as const,
        command,
        cwd,
        status: 'pending' as const,
        resolveId,
      },
    })
  })
}

const SAFE_COMMAND_PREFIXES = [
  'echo ', 'printf ', 'cat ', 'head ', 'tail ', 'wc ',
  'ls', 'pwd', 'which ', 'whereis ', 'type ',
  'date', 'whoami', 'hostname', 'uname',
  'git status', 'git log', 'git diff', 'git branch', 'git remote',
  'node --version', 'pnpm --version', 'npm --version', 'python --version',
  'cargo --version', 'rustc --version',
]

function isAutoApproved(command: string): boolean {
  const trimmed = command.trim()
  return SAFE_COMMAND_PREFIXES.some((prefix) => trimmed === prefix.trim() || trimmed.startsWith(prefix))
}

function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rs: 'rust', go: 'go', html: 'html', htm: 'html',
    css: 'css', scss: 'css', json: 'json', md: 'markdown',
    yaml: 'markdown', yml: 'markdown', toml: 'markdown', sh: 'javascript', bash: 'javascript',
  }
  return map[ext || ''] || 'javascript'
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function runCommand(command: string, cwd?: string | null, timeoutSecs?: number | null): Promise<any> {
  if (!command || !command.trim()) return { error: 'Command cannot be empty' }

  const timeoutMs = Math.min((timeoutSecs ?? 30) * 1000, 300_000)

  if (!isAutoApproved(command)) {
    const approved = await requestCommandApproval(command, cwd ?? null)
    if (!approved) return { error: 'Command denied by user', command, approved: false }
  }

  try {
    const result = await invoke<{ stdout: string; stderr: string; exit_code: number; timed_out: boolean; truncated: boolean; duration_ms: number }>('shell_exec', {
      cmd: command, cwd: cwd ?? null, timeoutMs, maxOutput: 100_000,
    })
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exit_code, timedOut: result.timed_out, truncated: result.truncated, durationMs: result.duration_ms, success: result.exit_code === 0 && !result.timed_out }
  } catch (err) {
    return { error: `Command execution failed: ${err}` }
  }
}

export async function readTerminalOutput(nodeId: string, lastNLines?: number | null): Promise<any> {
  const { getTerminalSessionBuffer } = await import('@/features/terminal/terminalRegistry')
  const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
  const store = useHomeCanvasStore.getState()
  const node = store.nodes.find((n) => n.id === nodeId)

  if (!node) return { error: `Node not found: ${nodeId}` }
  if (node.type !== 'terminal') return { error: `Node ${nodeId} is not a terminal node (type: ${node.type})` }

  const sessionId = node.data?.sessionId
  if (!sessionId) return { error: `Terminal node ${nodeId} has no active session` }

  const buffer = getTerminalSessionBuffer(sessionId)
  if (!buffer || buffer.length === 0) return { output: '', lines: 0, message: 'Terminal buffer is empty' }

  const rawText = buffer.join('')
  const cleanText = stripAnsi(rawText)
  const allLines = cleanText.split('\n')
  const maxLines = Math.min(lastNLines ?? 50, 500)
  const lines = allLines.slice(-maxLines)

  return { output: lines.join('\n'), lineCount: lines.length, totalLines: allLines.length, sessionId }
}

export async function writeToTerminal(nodeId: string, command: string, pressEnter?: boolean | null): Promise<any> {
  const { writeTerminalSession } = await import('@/features/terminal/terminalRegistry')
  const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
  const store = useHomeCanvasStore.getState()
  const node = store.nodes.find((n) => n.id === nodeId)

  if (!node) return { error: `Node not found: ${nodeId}` }
  if (node.type !== 'terminal') return { error: `Node ${nodeId} is not a terminal node (type: ${node.type})` }

  const sessionId = node.data?.sessionId
  if (!sessionId) return { error: `Terminal node ${nodeId} has no active session` }

  const shouldPressEnter = pressEnter !== false
  const data = shouldPressEnter ? `${command}\n` : command

  try {
    await writeTerminalSession(sessionId, data)
    return { success: true, nodeId, sessionId, command, pressedEnter: shouldPressEnter, message: `Typed "${command}" into terminal${shouldPressEnter ? ' and pressed Enter' : ''}` }
  } catch (err) {
    return { error: `Failed to write to terminal: ${err}` }
  }
}

export async function getAvailablePort(): Promise<any> {
  try {
    const { allocateRandomPort } = await import('@/features/agent/context/processRegistry')
    const port = await allocateRandomPort()
    return { port }
  } catch (err) {
    return { error: `Failed to allocate port: ${err}` }
  }
}

export async function setupDevWorkspace(args: {
  name: string
  projectPath?: string | null
  files: Array<{ path: string; content: string; language?: string | null }>
  devServer?: { command: string; port?: number | null } | null
  notes?: string | null
}): Promise<any> {
  const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
  const { writeTerminalSession } = await import('@/features/terminal/terminalRegistry')

  const errors: string[] = []
  const nodeIds: Record<string, string> = {}
  const allNodeIds: string[] = []
  const filesCreated: string[] = []

  let projectPath: string
  try {
    await useHomeCanvasStore.getState().createNewSpace(args.name)
    const updatedState = useHomeCanvasStore.getState()
    projectPath = updatedState.currentSpacePath!
    if (!projectPath) return { error: 'Failed to get space path after creating new space' }
  } catch (err) {
    if (args.projectPath) {
      projectPath = args.projectPath
      if (projectPath.startsWith('~/') || projectPath === '~') {
        const home = await homeDir()
        projectPath = projectPath.replace(/^~/, home.replace(/\/$/, ''))
      }
    } else {
      const home = await homeDir()
      const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'project'
      projectPath = await join(home, '.filegraph', '@spaces', slug)
    }
    errors.push(`Failed to create space (using fallback path): ${err}`)
    try {
      await invoke('shell_exec', { cmd: `mkdir -p "${projectPath}"`, cwd: null, timeoutMs: 10_000, maxOutput: 10_000 })
    } catch (mkdirErr) {
      return { error: `Failed to create project directory: ${mkdirErr}` }
    }
  }

  for (const file of args.files) {
    try {
      const fullPath = await join(projectPath, file.path)
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      if (parentDir && parentDir !== projectPath) {
        await invoke('shell_exec', { cmd: `mkdir -p "${parentDir}"`, cwd: null, timeoutMs: 5_000, maxOutput: 1_000 })
      }
      await invoke('write_text_file', { filePath: fullPath, content: file.content })
      filesCreated.push(file.path)
      if (typeof window !== 'undefined') {
        const { useFileStore } = await import('@/stores/useFileStore')
        useFileStore.getState().notifyFileChanged(fullPath)
      }
    } catch (err) {
      errors.push(`Failed to write ${file.path}: ${err}`)
    }
  }

  const latestStore = useHomeCanvasStore.getState()
  const { findNonOverlappingRegion } = await import('@/features/home/canvasUtils')

  const BASE_TERMINAL = { x: 0, y: 0, width: 600, height: 350 }
  const BASE_CODE_START_X = 650
  const BASE_CODE_START_Y = 0
  const CODE_GAP_Y = 450
  const BASE_PREVIEW = { x: 1300, y: 0, width: 1200, height: 900 }
  const BASE_NOTES = { x: 0, y: 400, width: 200, height: 150 }

  const plannedRects = [
    BASE_TERMINAL, BASE_PREVIEW, BASE_NOTES,
    ...args.files.map((_, i) => ({ x: BASE_CODE_START_X, y: BASE_CODE_START_Y + i * CODE_GAP_Y, width: 600, height: 400 })),
  ]

  const offset = findNonOverlappingRegion(latestStore.nodes, plannedRects)
  const TERMINAL_POS = { x: BASE_TERMINAL.x + offset.x, y: BASE_TERMINAL.y + offset.y }
  const CODE_START_X = BASE_CODE_START_X + offset.x
  const CODE_START_Y = BASE_CODE_START_Y + offset.y
  const PREVIEW_POS = { x: BASE_PREVIEW.x + offset.x, y: BASE_PREVIEW.y + offset.y }
  const NOTES_POS = { x: BASE_NOTES.x + offset.x, y: BASE_NOTES.y + offset.y }

  try {
    const termId = await latestStore.addNode('terminal', TERMINAL_POS, `${args.name} Terminal`, {
      cwd: projectPath,
      runtime: 'shell',
    })
    nodeIds.terminal = termId
    allNodeIds.push(termId)
  } catch (err) {
    errors.push(`Failed to create terminal node: ${err}`)
  }

  const fileNodeIds: string[] = []
  for (let i = 0; i < args.files.length; i++) {
    const file = args.files[i]
    try {
      const fullPath = await join(projectPath, file.path)
      const fileName = file.path.split('/').pop() || file.path
      const pos = { x: CODE_START_X, y: CODE_START_Y + i * CODE_GAP_Y }
      const nodeId = await latestStore.addNode('codeBlock', pos, fileName, { filePath: fullPath, language: file.language || inferLanguage(file.path) })
      fileNodeIds.push(nodeId)
      allNodeIds.push(nodeId)
    } catch (err) {
      errors.push(`Failed to create code node for ${file.path}: ${err}`)
    }
  }
  nodeIds.files = fileNodeIds as any

  let allocatedPort: number | null = null
  if (args.devServer) {
    try {
      const { allocateRandomPort } = await import('@/features/agent/context/processRegistry')
      allocatedPort = await allocateRandomPort()
      const previewId = await latestStore.addNode('embed', PREVIEW_POS, `${args.name} Preview`, { url: `http://localhost:${allocatedPort}`, title: `${args.name} Preview` })
      nodeIds.preview = previewId
      allNodeIds.push(previewId)
    } catch (err) {
      errors.push(`Failed to create preview node: ${err}`)
    }
  }

  if (args.notes) {
    try {
      const notesId = await latestStore.addNode('stickyNote', NOTES_POS, `${args.name} Notes`, { text: args.notes, color: 'blue' })
      nodeIds.notes = notesId
      allNodeIds.push(notesId)
    } catch (err) {
      errors.push(`Failed to create notes node: ${err}`)
    }
  }

  if (args.devServer && nodeIds.terminal) {
    let devCmd = args.devServer.command
    if (allocatedPort) {
      // Improved port injection: handle --port, -p, and generic PORT environment variables
      if (/--port\s+\d+/.test(devCmd)) devCmd = devCmd.replace(/--port\s+\d+/, `--port ${allocatedPort}`)
      else if (/-p\s+\d+/.test(devCmd)) devCmd = devCmd.replace(/-p\s+\d+/, `-p ${allocatedPort}`)
      else if (/PORT=\d+/.test(devCmd)) devCmd = devCmd.replace(/PORT=\d+/, `PORT=${allocatedPort}`)
      else {
        // If no port flag is found, append it based on common command patterns
        const isServe = /\bserve\b/.test(devCmd)
        const isVite = /\bvite\b/.test(devCmd)
        const isNext = /\bnext\b/.test(devCmd)

        if (isServe) devCmd = `${devCmd} -p ${allocatedPort}`
        else if (isVite || isNext) devCmd = `${devCmd} --port ${allocatedPort}`
        else devCmd = `PORT=${allocatedPort} ${devCmd}` // Fallback to env var
      }
    }

    const finalPort = allocatedPort
    const terminalNodeId = nodeIds.terminal
      ; (async () => {
        const MAX_POLLS = 15
        const POLL_INTERVAL = 500
        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL))
          try {
            const termStore = useHomeCanvasStore.getState()
            const termNode = termStore.nodes.find((n) => n.id === terminalNodeId)
            const sessionId = termNode?.data?.sessionId
            if (sessionId) {
              await writeTerminalSession(sessionId, `${devCmd}\n`)
              if (finalPort) {
                const { useProcessRegistry } = await import('@/features/agent/context/processRegistry')
                useProcessRegistry.getState().registerProcess({ projectName: args.name, projectPath, port: finalPort, command: devCmd, terminalNodeId, startedAt: Date.now() })
              }
              return
            }
          } catch { /* Session not ready yet, keep polling */ }
        }
        console.warn('[setupDevWorkspace] Terminal session not ready after polling — dev server not started')
      })()
  }

  if (errors.length > 0) console.warn('[setupDevWorkspace] Errors during setup:', errors)

  return {
    success: errors.length === 0,
    projectPath,
    port: allocatedPort,
    filesCreated,
    nodeIds,
    errors: errors.length > 0 ? errors : undefined,
    message: `Created Space "${args.name}" with ${filesCreated.length} files and ${allNodeIds.length} canvas nodes`,
  }
}

export async function verifyDevProject(projectPath: string, port?: number | null, terminalNodeId?: string | null): Promise<any> {
  let resolvedPath = projectPath
  if (resolvedPath.startsWith('~/') || resolvedPath === '~') {
    const home = await homeDir()
    resolvedPath = resolvedPath.replace(/^~/, home.replace(/\/$/, ''))
  }

  const fileErrors: Array<{ file: string; error: string }> = []
  let serverStatus: { processRunning: boolean; httpStatus: number | null; error?: string } | null = null
  const terminalErrors: string[] = []

  try {
    const findResult = await invoke<{ stdout: string; stderr: string; exit_code: number; timed_out: boolean; truncated: boolean; duration_ms: number }>('shell_exec', {
      cmd: `find "${resolvedPath}" -maxdepth 3 -type f \\( -name "*.js" -o -name "*.mjs" \\) 2>/dev/null`,
      cwd: null, timeoutMs: 10_000, maxOutput: 50_000,
    })
    const jsFiles = findResult.stdout.trim().split('\n').filter((f) => f.trim())
    for (const filePath of jsFiles) {
      try {
        const checkResult = await invoke<{ stdout: string; stderr: string; exit_code: number; timed_out: boolean; truncated: boolean; duration_ms: number }>('shell_exec', {
          cmd: `node --check "${filePath}" 2>&1`, cwd: null, timeoutMs: 5_000, maxOutput: 5_000,
        })
        if (checkResult.exit_code !== 0) {
          const relativePath = filePath.replace(resolvedPath + '/', '')
          fileErrors.push({ file: relativePath, error: checkResult.stderr.trim() || checkResult.stdout.trim() || 'Syntax error' })
        }
      } catch { /* Skip files that can't be checked */ }
    }
  } catch { /* find command failed — not critical */ }

  if (port) {
    try {
      const lsofResult = await invoke<{ stdout: string; exit_code: number }>('shell_exec', {
        cmd: `lsof -i :${port} -t 2>/dev/null`, cwd: null, timeoutMs: 3_000, maxOutput: 1_000,
      })
      const processRunning = lsofResult.stdout.trim().length > 0
      let httpStatus: number | null = null
      let httpError: string | undefined

      if (processRunning) {
        try {
          const curlResult = await invoke<{ stdout: string; stderr: string; exit_code: number; timed_out: boolean; truncated: boolean; duration_ms: number }>('shell_exec', {
            cmd: `curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:${port}/`,
            cwd: null, timeoutMs: 8_000, maxOutput: 1_000,
          })
          httpStatus = parseInt(curlResult.stdout.trim(), 10) || null
          if (httpStatus && httpStatus >= 400) httpError = `HTTP ${httpStatus}`
        } catch {
          httpError = 'Failed to connect via curl'
        }
      }

      serverStatus = { processRunning, httpStatus, ...(httpError && { error: httpError }) }
    } catch {
      serverStatus = { processRunning: false, httpStatus: null, error: 'Failed to check port' }
    }
  }

  if (terminalNodeId) {
    try {
      const termOutput = await readTerminalOutput(terminalNodeId, 100)
      if (termOutput.output) {
        const errorPatterns = [
          /SyntaxError:.+/g, /ReferenceError:.+/g, /TypeError:.+/g,
          /Error:\s+Cannot find module.+/g, /ENOENT:.+/g, /ERR!.+/g,
          /ArgError:.+/g, /Error:\s+EACCES.+/g, /fatal error:.+/gi,
          /Uncaught.+Error.+/g, /Failed to compile.+/g, /Module not found.+/g,
          /Unexpected token.+/g, /Unexpected EOF.*/g,
        ]
        const lines = termOutput.output.split('\n')
        for (const line of lines) {
          for (const pattern of errorPatterns) {
            pattern.lastIndex = 0
            const match = pattern.exec(line)
            if (match) {
              const errorText = match[0].trim()
              if (errorText && !terminalErrors.includes(errorText)) terminalErrors.push(errorText)
            }
          }
        }
      }
    } catch { /* Terminal read failed — not critical */ }
  }

  const healthy = fileErrors.length === 0 && terminalErrors.length === 0 &&
    (!serverStatus || (serverStatus.processRunning && (serverStatus.httpStatus === 200 || serverStatus.httpStatus === null)))

  return {
    healthy,
    projectPath: resolvedPath,
    fileErrors: fileErrors.length > 0 ? fileErrors : undefined,
    serverStatus,
    terminalErrors: terminalErrors.length > 0 ? terminalErrors : undefined,
    summary: healthy ? 'All checks passed — project appears healthy.'
      : `Found ${fileErrors.length} file error(s), ${terminalErrors.length} terminal error(s)${serverStatus && !serverStatus.processRunning ? ', server not running' : serverStatus?.error ? `, server: ${serverStatus.error}` : ''}.`,
  }
}
