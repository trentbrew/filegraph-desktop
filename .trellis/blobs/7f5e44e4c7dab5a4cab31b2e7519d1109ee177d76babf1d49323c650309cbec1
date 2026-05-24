/**
 * useHighlightStore - Track highlighted entity for navigation animations
 *
 * When navigating from agent to an entity, this store tracks which entity
 * should be highlighted with a pulse animation.
 */

import { create } from 'zustand'

interface HighlightStore {
  // The entity ID to highlight (e.g., "task:task-03:001")
  highlightedEntityId: string | null

  // Set the highlighted entity (auto-clears after timeout)
  setHighlightedEntity: (entityId: string | null, autoClearMs?: number) => void

  // Clear the highlight
  clearHighlight: () => void
}

let clearTimeoutId: ReturnType<typeof setTimeout> | null = null

export const useHighlightStore = create<HighlightStore>((set) => ({
  highlightedEntityId: null,

  setHighlightedEntity: (entityId, autoClearMs = 3000) => {
    // Clear any existing timeout
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId)
      clearTimeoutId = null
    }

    set({ highlightedEntityId: entityId })

    // Auto-clear after timeout
    if (entityId && autoClearMs > 0) {
      clearTimeoutId = setTimeout(() => {
        set({ highlightedEntityId: null })
        clearTimeoutId = null
      }, autoClearMs)
    }
  },

  clearHighlight: () => {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId)
      clearTimeoutId = null
    }
    set({ highlightedEntityId: null })
  },
}))
