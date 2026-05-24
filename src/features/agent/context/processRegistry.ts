/**
 * Process Registry
 *
 * Tracks active dev server processes and their ports so the agent
 * can avoid port conflicts when scaffolding new projects.
 * Each project gets a random port in the 4000–9999 range.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DevServerProcess {
  projectName: string
  projectPath: string
  port: number
  command: string
  terminalNodeId: string
  startedAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PORT_RANGE_MIN = 4000
const PORT_RANGE_MAX = 9999
const MAX_ALLOCATION_ATTEMPTS = 50

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface ProcessRegistryState {
  processes: DevServerProcess[]

  // Actions
  registerProcess: (entry: DevServerProcess) => void
  unregisterProcess: (port: number) => void
  unregisterByTerminalNode: (terminalNodeId: string) => void
  getUsedPorts: () => number[]
  getProcessByPort: (port: number) => DevServerProcess | undefined
  getProcessByProject: (projectPath: string) => DevServerProcess | undefined
  clearAll: () => void
}

export const useProcessRegistry = create<ProcessRegistryState>()(
  persist(
    (set, get) => ({
      processes: [],

      registerProcess: (entry) => {
        set((state) => {
          // Replace existing entry for the same project or port
          const filtered = state.processes.filter(
            (p) => p.port !== entry.port && p.projectPath !== entry.projectPath,
          )
          return { processes: [...filtered, entry] }
        })
      },

      unregisterProcess: (port) => {
        set((state) => ({
          processes: state.processes.filter((p) => p.port !== port),
        }))
      },

      unregisterByTerminalNode: (terminalNodeId) => {
        set((state) => ({
          processes: state.processes.filter((p) => p.terminalNodeId !== terminalNodeId),
        }))
      },

      getUsedPorts: () => get().processes.map((p) => p.port),

      getProcessByPort: (port) => get().processes.find((p) => p.port === port),

      getProcessByProject: (projectPath) => get().processes.find((p) => p.projectPath === projectPath),

      clearAll: () => set({ processes: [] }),
    }),
    {
      name: 'filegraph-process-registry',
      partialize: (state) => ({ processes: state.processes }),
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// Port allocation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a port is in use on the system via `lsof`.
 * Returns true if the port is occupied.
 */
async function isPortInUseOnSystem(port: number): Promise<boolean> {
  try {
    const result = await invoke<{
      stdout: string
      stderr: string
      exit_code: number
      timed_out: boolean
      truncated: boolean
      duration_ms: number
    }>('shell_exec', {
      cmd: `lsof -i :${port} -t 2>/dev/null`,
      cwd: null,
      timeoutMs: 3_000,
      maxOutput: 1_000,
    })
    // If lsof returns any PIDs, the port is in use
    return result.stdout.trim().length > 0
  } catch {
    // If the command fails, assume port is free (conservative fallback)
    return false
  }
}

/**
 * Allocate a random port in the 4000–9999 range that is not already
 * tracked in the registry and not in use on the system.
 */
export async function allocateRandomPort(): Promise<number> {
  const usedPorts = new Set(useProcessRegistry.getState().getUsedPorts())

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
    const port = PORT_RANGE_MIN + Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1))

    if (usedPorts.has(port)) continue

    // Verify the port is actually free on the system
    const inUse = await isPortInUseOnSystem(port)
    if (!inUse) return port
  }

  // Fallback: return a random port without system check
  const fallback = PORT_RANGE_MIN + Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1))
  console.warn(`[ProcessRegistry] Could not verify a free port after ${MAX_ALLOCATION_ATTEMPTS} attempts, using ${fallback}`)
  return fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format active dev server processes for injection into the agent's system prompt.
 * Returns empty string if no processes are running.
 */
export function formatProcessesForPrompt(): string {
  const { processes } = useProcessRegistry.getState()
  if (processes.length === 0) return ''

  const lines: string[] = ['## Running Dev Servers', '']

  for (const p of processes) {
    const age = Math.round((Date.now() - p.startedAt) / 60_000)
    lines.push(`- **${p.projectName}** → \`localhost:${p.port}\` (started ${age}m ago)`)
    lines.push(`  - Path: \`${p.projectPath}\``)
    lines.push(`  - Command: \`${p.command}\``)
  }

  lines.push('')
  lines.push('⚠ Ports listed above are in use. New projects will be assigned a random available port automatically.')

  return lines.join('\n')
}
