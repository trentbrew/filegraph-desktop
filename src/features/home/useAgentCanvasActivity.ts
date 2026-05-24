/**
 * Store to track agent activity on the Home canvas
 * Used to show visual feedback when agent is interacting with nodes
 */

import { create } from 'zustand'

interface AgentCanvasActivity {
  // Is the agent currently working on the canvas?
  isActive: boolean
  // Which node IDs are being affected?
  activeNodeIds: string[]
  // What action is being performed?
  currentAction: string | null
  // Timestamp when activity started
  startedAt: number | null

  // Actions
  startActivity: (action: string, nodeIds?: string[]) => void
  endActivity: () => void
  addAffectedNode: (nodeId: string) => void
}

export const useAgentCanvasActivity = create<AgentCanvasActivity>((set) => ({
  isActive: false,
  activeNodeIds: [],
  currentAction: null,
  startedAt: null,

  startActivity: (action, nodeIds = []) =>
    set({
      isActive: true,
      currentAction: action,
      activeNodeIds: nodeIds,
      startedAt: Date.now(),
    }),

  endActivity: () =>
    set({
      isActive: false,
      activeNodeIds: [],
      currentAction: null,
      startedAt: null,
    }),

  addAffectedNode: (nodeId) =>
    set((state) => ({
      activeNodeIds: state.activeNodeIds.includes(nodeId) ? state.activeNodeIds : [...state.activeNodeIds, nodeId],
    })),
}))
