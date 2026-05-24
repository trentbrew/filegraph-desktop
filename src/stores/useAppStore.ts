/**
 * App Store
 * Manages which "app" is currently active in the dock
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type AppId, APP_REGISTRY, getApp } from '@/lib/apps'

// Re-export types from registry for backward compatibility
export type { AppId, AppDefinition } from '@/lib/apps'

// Re-export registry utilities
export { APP_REGISTRY, getApp }

interface AppStore {
  // Current active app
  activeApp: AppId

  // Actions
  setActiveApp: (app: AppId) => void

  // Helpers
  isFilesApp: () => boolean
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      activeApp: 'home',

      setActiveApp: (app) => set({ activeApp: app }),

      isFilesApp: () => get().activeApp === 'files',
    }),
    {
      name: 'filegraph-app-store',
      partialize: (state) => ({ activeApp: state.activeApp }),
    },
  ),
)
