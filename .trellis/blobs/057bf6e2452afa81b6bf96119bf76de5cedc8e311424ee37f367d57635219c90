'use client'

import { create } from 'zustand'

export type TerminalMode = 'bash' | 'tql'

export interface TerminalSession {
  id: string
  mode: TerminalMode
  title: string
  cwd: string
  buffer: string[]
  history: string[]
  status: 'idle' | 'running' | 'error'
  lastRunAt?: number
}

interface TerminalStore {
  isVisible: boolean
  activeMode: TerminalMode
  hasFocus: boolean
  sessions: Record<TerminalMode, TerminalSession>
  setVisibility: (visible: boolean) => void
  toggleVisibility: () => void
  setActiveMode: (mode: TerminalMode) => void
  setFocus: (hasFocus: boolean) => void
  appendOutput: (mode: TerminalMode, output: string) => void
  clearSession: (mode: TerminalMode) => void
  overwriteSession: (mode: TerminalMode, updates: Partial<TerminalSession>) => void
}

const createDefaultSession = (mode: TerminalMode): TerminalSession => ({
  id: `${mode}-${Date.now()}`,
  mode,
  title: mode === 'bash' ? 'Bash' : 'TQL',
  cwd: '~',
  buffer: [],
  history: [],
  status: 'idle',
})

export const useTerminalStore = create<TerminalStore>((set) => ({
  isVisible: false,
  activeMode: 'bash',
  hasFocus: false,
  sessions: {
    bash: createDefaultSession('bash'),
    tql: createDefaultSession('tql'),
  },
  setVisibility: (visible) => set({ isVisible: visible }),
  toggleVisibility: () =>
    set((state) => ({
      isVisible: !state.isVisible,
    })),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setFocus: (hasFocus) => set({ hasFocus }),
  appendOutput: (mode, output) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: {
          ...state.sessions[mode],
          buffer: [...state.sessions[mode].buffer, output],
        },
      },
    })),
  clearSession: (mode) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: {
          ...state.sessions[mode],
          buffer: [],
          history: [],
          status: 'idle',
        },
      },
    })),
  overwriteSession: (mode, updates) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: {
          ...state.sessions[mode],
          ...updates,
        },
      },
    })),
}))
