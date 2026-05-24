/**
 * Home Canvas History Store
 *
 * Tracks all changes to the canvas for undo/redo functionality.
 * Works with both user and agent actions.
 */

import { create } from 'zustand'
import type { Node, Edge } from 'reactflow'

export type CanvasActionType =
  | 'add_node'
  | 'remove_node'
  | 'update_node'
  | 'update_node_position'
  | 'update_node_dimensions'
  | 'update_node_content'
  | 'add_edge'
  | 'remove_edge'
  | 'batch'

export type ActionActor = 'user' | 'agent'

export interface CanvasAction {
  id: string
  type: CanvasActionType
  timestamp: number
  actor: ActionActor
  description: string
  nodeId?: string
  edgeId?: string
  // Snapshots for undo/redo
  before: {
    nodes?: Node[]
    edges?: Edge[]
    nodeData?: any
    fileContent?: string
  }
  after: {
    nodes?: Node[]
    edges?: Edge[]
    nodeData?: any
    fileContent?: string
  }
}

interface HomeCanvasHistoryStore {
  // History stacks
  undoStack: CanvasAction[]
  redoStack: CanvasAction[]

  // Max history size
  maxHistorySize: number

  // Currently recording? (prevents nested recordings)
  isRecording: boolean

  // Actions
  pushAction: (action: Omit<CanvasAction, 'id' | 'timestamp'>) => void
  undo: () => CanvasAction | null
  redo: () => CanvasAction | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
  getHistory: (limit?: number) => CanvasAction[]
  getNodeHistory: (nodeId: string, limit?: number) => CanvasAction[]

  // For batch operations
  startBatch: (actor: ActionActor, description: string) => void
  endBatch: () => void
  batchActions: CanvasAction[]
}

export const useHomeCanvasHistory = create<HomeCanvasHistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistorySize: 100,
  isRecording: false,
  batchActions: [],

  pushAction: (actionData) => {
    const action: CanvasAction = {
      ...actionData,
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }

    set((state) => {
      const newUndoStack = [...state.undoStack, action]

      // Trim to max size
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack.shift()
      }

      return {
        undoStack: newUndoStack,
        redoStack: [], // Clear redo stack on new action
      }
    })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return null

    const action = state.undoStack[state.undoStack.length - 1]

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
    }))

    return action
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return null

    const action = state.redoStack[state.redoStack.length - 1]

    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, action],
    }))

    return action
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  getHistory: (limit = 50) => {
    const { undoStack } = get()
    return undoStack.slice(-limit).reverse()
  },

  getNodeHistory: (nodeId, limit = 20) => {
    const { undoStack } = get()
    return undoStack
      .filter((a) => a.nodeId === nodeId)
      .slice(-limit)
      .reverse()
  },

  startBatch: (actor, description) => {
    set({ isRecording: true, batchActions: [] })
  },

  endBatch: () => {
    const { batchActions } = get()
    if (batchActions.length > 0) {
      // Combine batch actions into one
      const batchAction: CanvasAction = {
        id: `batch-${Date.now()}`,
        type: 'batch',
        timestamp: Date.now(),
        actor: batchActions[0]?.actor || 'user',
        description: `Batch: ${batchActions.length} actions`,
        before: {
          nodes: batchActions[0]?.before.nodes,
          edges: batchActions[0]?.before.edges,
        },
        after: {
          nodes: batchActions[batchActions.length - 1]?.after.nodes,
          edges: batchActions[batchActions.length - 1]?.after.edges,
        },
      }

      set((state) => ({
        isRecording: false,
        batchActions: [],
        undoStack: [...state.undoStack, batchAction],
        redoStack: [],
      }))
    } else {
      set({ isRecording: false, batchActions: [] })
    }
  },
}))

/**
 * Helper to format action for display
 */
export function formatActionDescription(action: CanvasAction): string {
  const actorLabel = action.actor === 'agent' ? '🤖 Agent' : '👤 You'
  const timeAgo = getTimeAgo(action.timestamp)

  return `${actorLabel} • ${action.description} • ${timeAgo}`
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
