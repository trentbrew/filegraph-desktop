import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { homeDir, join } from '@tauri-apps/api/path'
import { useUIStore } from './useUIStore'
import type { LayoutMode } from '@/components/app/navigation'
import type { FileItem } from '@/components/app/fileStructure'

/**
 * Editor Tab - An open file within a workspace's preview pane
 */
export interface EditorTab {
  id: string
  file: FileItem
  isPinned: boolean // false = preview (temporary, italic), true = pinned (permanent)
  isDirty: boolean // Has unsaved changes
  scrollPosition?: number
  previewMode?: 'code' | 'preview'
}

/**
 * Workspace Tab - A folder context in the TitleBar
 * Each workspace maintains its own independent state
 */
export interface TabData {
  id: string
  title: string
  path: string
  icon?: string // Emoji or icon name
  navigationHistory: string[]
  historyIndex: number
  viewMode?: LayoutMode
  selectedFile?: FileItem | null // The file being previewed in this tab
  terminalOpen?: boolean // Whether the terminal panel is open in this tab
  closable?: boolean // Whether this tab can be closed (home tab is not closable)

  // Editor tabs (workspace-scoped)
  editorTabs: EditorTab[]
  activeEditorTabId: string | null
}

type TabInsertPosition = 'after-active' | 'end'

interface TabStore {
  tabs: TabData[]
  activeTabId: string

  // Computed
  activeTab: TabData | undefined

  // Workspace Tab Actions
  addTab: (path?: string, options?: { position?: TabInsertPosition }) => Promise<void>
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabData>) => void
  reorderTabs: (newTabs: TabData[]) => void
  navigateInTab: (tabId: string, path: string) => void
  navigateBack: (tabId: string) => void
  navigateForward: (tabId: string) => void
  canNavigateBack: (tabId: string) => boolean
  canNavigateForward: (tabId: string) => boolean
  setTabViewMode: (tabId: string, mode: LayoutMode) => void
  setTabSelectedFile: (tabId: string, file: FileItem | null) => void
  setTabTerminalOpen: (tabId: string, open: boolean) => void
  initializeHomeTab: () => Promise<void>

  // Editor Tab Actions (workspace-scoped)
  openEditorPreview: (file: FileItem) => void
  openEditorPinned: (file: FileItem) => void
  pinEditorTab: (editorTabId: string) => void
  closeEditorTab: (editorTabId: string) => void
  setActiveEditorTab: (editorTabId: string) => void
  updateEditorTab: (editorTabId: string, updates: Partial<EditorTab>) => void
  reorderEditorTabs: (newTabs: EditorTab[]) => void
  closeAllEditorTabs: () => void
  closeOtherEditorTabs: (editorTabId: string) => void
}

export const useTabStore = create<TabStore>()((set, get) => ({
  tabs: [],
  activeTabId: '',
  _hasHydrated: false,

  get activeTab() {
    const state = get()
    return state.tabs.find((tab) => tab.id === state.activeTabId)
  },

  addTab: async (path?: string, options?: { position?: TabInsertPosition }) => {
    const position = options?.position ?? 'after-active'
    let homePath = path || (await invoke<string>('get_home_directory'))

    // Expand tilde paths
    if (homePath.startsWith('~/') || homePath === '~') {
      const home = await homeDir()
      homePath = homePath === '~' ? home : await join(home, homePath.slice(2))
    }

    // Get current global layout mode to initialize the tab
    const globalLayoutMode = useUIStore.getState().layoutMode

    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: homePath.split('/').pop() || 'Home',
      path: homePath,
      navigationHistory: [homePath],
      historyIndex: 0,
      viewMode: globalLayoutMode,
      editorTabs: [],
      activeEditorTabId: null,
    }

    const state = get()
    const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId)
    const insertIndex =
      position === 'end' ? state.tabs.length : activeIndex !== -1 ? activeIndex + 1 : state.tabs.length

    const newTabs = [...state.tabs]
    newTabs.splice(insertIndex, 0, newTab)

    set((state) => ({
      tabs: newTabs,
      activeTabId: newTab.id,
    }))
  },

  removeTab: (tabId: string) => {
    set((state) => {
      const tabToRemove = state.tabs.find((tab) => tab.id === tabId)

      // Prevent closing the home tab
      if (tabToRemove?.closable === false) {
        return state
      }

      const filteredTabs = state.tabs.filter((tab) => tab.id !== tabId)

      // If removing active tab, switch to another
      let newActiveId = state.activeTabId
      if (state.activeTabId === tabId) {
        const removedIndex = state.tabs.findIndex((tab) => tab.id === tabId)
        const newIndex = removedIndex > 0 ? removedIndex - 1 : 0
        newActiveId = filteredTabs[newIndex]?.id || ''
      }

      return {
        tabs: filteredTabs,
        activeTabId: newActiveId,
      }
    })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  updateTab: (tabId: string, updates: Partial<TabData>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
    }))
  },

  reorderTabs: (newTabs: TabData[]) => {
    set({ tabs: newTabs })
  },

  navigateInTab: (tabId: string, path: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab

        // Add to history
        const newHistory = [...tab.navigationHistory.slice(0, tab.historyIndex + 1), path]

        // Extract folder name for title
        const folderName = path.split('/').filter(Boolean).pop() || 'Root'

        return {
          ...tab,
          path,
          title: folderName,
          navigationHistory: newHistory,
          historyIndex: newHistory.length - 1,
        }
      }),
    }))
  },

  navigateBack: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.historyIndex <= 0) return tab

        const newIndex = tab.historyIndex - 1
        const newPath = tab.navigationHistory[newIndex]
        const folderName = newPath.split('/').filter(Boolean).pop() || 'Root'

        return {
          ...tab,
          path: newPath,
          title: folderName,
          historyIndex: newIndex,
        }
      }),
    }))
  },

  navigateForward: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.historyIndex >= tab.navigationHistory.length - 1) {
          return tab
        }

        const newIndex = tab.historyIndex + 1
        const newPath = tab.navigationHistory[newIndex]
        const folderName = newPath.split('/').filter(Boolean).pop() || 'Root'

        return {
          ...tab,
          path: newPath,
          title: folderName,
          historyIndex: newIndex,
        }
      }),
    }))
  },

  canNavigateBack: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    return (tab?.historyIndex ?? 0) > 0
  },

  canNavigateForward: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab) return false
    return tab.historyIndex < tab.navigationHistory.length - 1
  },

  setTabViewMode: (tabId: string, mode: LayoutMode) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, viewMode: mode } : tab)),
    }))
  },

  setTabSelectedFile: (tabId: string, file: FileItem | null) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, selectedFile: file } : tab)),
    }))
  },

  setTabTerminalOpen: (tabId: string, open: boolean) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, terminalOpen: open } : tab)),
    }))
  },

  // ===== Editor Tab Actions (workspace-scoped) =====
  // Note: All actions use `|| []` fallback to handle persisted tabs without editorTabs field

  // Open a file in preview mode (temporary, replaced on next click)
  openEditorPreview: (file: FileItem) => {
    const state = get()
    const workspaceTab = state.tabs.find((t) => t.id === state.activeTabId)
    if (!workspaceTab) return

    const editorTabId = `editor_${file.path}`
    const editorTabs = workspaceTab.editorTabs || []

    // Check if file is already open as a pinned tab
    const existingPinned = editorTabs.find((t) => t.file.path === file.path && t.isPinned)
    if (existingPinned) {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId ? { ...tab, activeEditorTabId: existingPinned.id } : tab,
        ),
      }))
      return
    }

    // Replace any existing preview tab (non-pinned)
    const pinnedTabs = editorTabs.filter((t) => t.isPinned)
    const previewTab: EditorTab = {
      id: editorTabId,
      file,
      isPinned: false,
      isDirty: false,
    }

    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId
          ? { ...tab, editorTabs: [...pinnedTabs, previewTab], activeEditorTabId: editorTabId }
          : tab,
      ),
    }))
  },

  // Open a file directly as a pinned tab (double-click behavior)
  openEditorPinned: (file: FileItem) => {
    const state = get()
    const workspaceTab = state.tabs.find((t) => t.id === state.activeTabId)
    if (!workspaceTab) return

    const editorTabId = `editor_${file.path}`
    const editorTabs = workspaceTab.editorTabs || []

    // Check if already open
    const existing = editorTabs.find((t) => t.file.path === file.path)
    if (existing) {
      // If it's a preview, pin it
      if (!existing.isPinned) {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId
              ? {
                  ...tab,
                  editorTabs: (tab.editorTabs || []).map((et) =>
                    et.id === existing.id ? { ...et, isPinned: true } : et,
                  ),
                  activeEditorTabId: existing.id,
                }
              : tab,
          ),
        }))
      } else {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId ? { ...tab, activeEditorTabId: existing.id } : tab,
          ),
        }))
      }
      return
    }

    // Remove any existing preview tab and add new pinned tab
    const pinnedTabs = editorTabs.filter((t) => t.isPinned)
    const pinnedTab: EditorTab = {
      id: editorTabId,
      file,
      isPinned: true,
      isDirty: false,
    }

    const newEditorTabs: EditorTab[] = [...pinnedTabs, pinnedTab]

    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId ? { ...tab, editorTabs: newEditorTabs, activeEditorTabId: editorTabId } : tab,
      ),
    }))
  },

  // Pin a specific editor tab
  pinEditorTab: (editorTabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId
          ? {
              ...tab,
              editorTabs: (tab.editorTabs || []).map((et) => (et.id === editorTabId ? { ...et, isPinned: true } : et)),
            }
          : tab,
      ),
    }))
  },

  // Close an editor tab
  closeEditorTab: (editorTabId: string) => {
    set((state) => {
      const workspaceTab = state.tabs.find((t) => t.id === state.activeTabId)
      if (!workspaceTab) return state

      const editorTabs = workspaceTab.editorTabs || []
      const tabIndex = editorTabs.findIndex((t) => t.id === editorTabId)
      const newEditorTabs = editorTabs.filter((t) => t.id !== editorTabId)

      // If closing active tab, switch to adjacent tab
      let newActiveEditorId = workspaceTab.activeEditorTabId || null
      if (workspaceTab.activeEditorTabId === editorTabId) {
        if (newEditorTabs.length === 0) {
          newActiveEditorId = null
        } else if (tabIndex >= newEditorTabs.length) {
          newActiveEditorId = newEditorTabs[newEditorTabs.length - 1].id
        } else {
          newActiveEditorId = newEditorTabs[tabIndex].id
        }
      }

      return {
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? { ...tab, editorTabs: newEditorTabs, activeEditorTabId: newActiveEditorId }
            : tab,
        ),
      }
    })
  },

  // Set active editor tab
  setActiveEditorTab: (editorTabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, activeEditorTabId: editorTabId } : tab)),
    }))
  },

  // Update editor tab properties
  updateEditorTab: (editorTabId: string, updates: Partial<EditorTab>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId
          ? {
              ...tab,
              editorTabs: (tab.editorTabs || []).map((et) => (et.id === editorTabId ? { ...et, ...updates } : et)),
            }
          : tab,
      ),
    }))
  },

  // Reorder editor tabs (for drag and drop)
  reorderEditorTabs: (newTabs: EditorTab[]) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, editorTabs: newTabs } : tab)),
    }))
  },

  // Close all editor tabs in current workspace
  closeAllEditorTabs: () => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId ? { ...tab, editorTabs: [], activeEditorTabId: null } : tab,
      ),
    }))
  },

  // Close all editor tabs except specified
  closeOtherEditorTabs: (editorTabId: string) => {
    set((state) => {
      const workspaceTab = state.tabs.find((t) => t.id === state.activeTabId)
      if (!workspaceTab) return state

      const editorTabs = workspaceTab.editorTabs || []
      const tabToKeep = editorTabs.find((t) => t.id === editorTabId)

      return {
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? {
                ...tab,
                editorTabs: tabToKeep ? [tabToKeep] : [],
                activeEditorTabId: tabToKeep?.id || null,
              }
            : tab,
        ),
      }
    })
  },

  // Initialize the persistent home tab
  initializeHomeTab: async () => {
    const state = get()

    // Check if home tab already exists
    if (state.tabs.find((tab) => tab.id === 'home')) {
      return
    }

    // Get home directory path
    const home = await homeDir()
    const homePath = await join(home, '.filegraph')

    // Get current global layout mode
    const globalLayoutMode = useUIStore.getState().layoutMode

    const homeTab: TabData = {
      id: 'home',
      title: '', // No label, just icon
      path: homePath,
      icon: 'Home',
      navigationHistory: [homePath],
      historyIndex: 0,
      viewMode: globalLayoutMode,
      closable: false, // Home tab cannot be closed
      editorTabs: [],
      activeEditorTabId: null,
    }

    set((state) => ({
      tabs: [homeTab, ...state.tabs],
      activeTabId: state.activeTabId || homeTab.id,
    }))
  },
}))
