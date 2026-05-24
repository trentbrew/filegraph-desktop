import { create } from 'zustand'
import type { FileItem } from '@/components/app/fileStructure'

interface FileStore {
  // Current state
  currentPath: string
  pathInput: string
  data: FileItem[]
  loading: boolean

  // Selection & Preview
  activeItem: FileItem | null
  webPreviewUrl: string | null
  selectedItems: Set<string>
  lastSelectedIndex: number | null

  // File change tracking for real-time preview updates
  fileVersions: Map<string, number>

  // Actions
  setCurrentPath: (path: string) => void
  setPathInput: (path: string) => void
  setData: (data: FileItem[]) => void
  setLoading: (loading: boolean) => void
  setActiveItem: (item: FileItem | null) => void
  setWebPreviewUrl: (url: string | null) => void
  notifyFileChanged: (path: string) => void
  getFileVersion: (path: string) => number
  toggleItemSelection: (path: string) => void
  selectRange: (startIndex: number, endIndex: number, items: FileItem[]) => void
  clearSelection: () => void
  setLastSelectedIndex: (index: number | null) => void
  getSelectedItemPaths: () => string[]

  // Granular updates
  addItem: (item: FileItem) => void
  removeItem: (path: string) => void
  updateItem: (path: string, updates: Partial<FileItem>) => void
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPath: '',
  pathInput: '',
  data: [],
  loading: true,
  activeItem: null,
  webPreviewUrl: null,
  selectedItems: new Set(),
  lastSelectedIndex: null,
  fileVersions: new Map(),

  setCurrentPath: (path) => set({ currentPath: path, pathInput: path }),
  setPathInput: (path) => set({ pathInput: path }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setActiveItem: (item) =>
    set((state) => {
      if (!item) {
        return { activeItem: null, webPreviewUrl: null }
      }

      return {
        activeItem: item,
        webPreviewUrl: item.file_type === 'web' ? state.webPreviewUrl : null,
      }
    }),
  setWebPreviewUrl: (url) => set({ webPreviewUrl: url }),

  notifyFileChanged: (path) =>
    set((state) => {
      const newVersions = new Map(state.fileVersions)
      const currentVersion = newVersions.get(path) || 0
      newVersions.set(path, currentVersion + 1)
      return { fileVersions: newVersions }
    }),

  getFileVersion: (path) => get().fileVersions.get(path) || 0,

  toggleItemSelection: (path) => {
    set((state) => {
      const newSelection = new Set(state.selectedItems)
      if (newSelection.has(path)) {
        newSelection.delete(path)
      } else {
        newSelection.add(path)
      }
      return { selectedItems: newSelection }
    })
  },

  selectRange: (startIndex, endIndex, items) => {
    const start = Math.min(startIndex, endIndex)
    const end = Math.max(startIndex, endIndex)
    const newSelection = new Set<string>()

    for (let i = start; i <= end; i++) {
      if (items[i]) {
        newSelection.add(items[i].path)
      }
    }

    set({ selectedItems: newSelection })
  },

  clearSelection: () => set({ selectedItems: new Set() }),

  setLastSelectedIndex: (index) => set({ lastSelectedIndex: index }),

  getSelectedItemPaths: () => Array.from(get().selectedItems),

  addItem: (item) =>
    set((state) => {
      // Check if item already exists
      if (state.data.some((i) => i.path === item.path)) return {}

      const newData = [...state.data, item]
      // Simple sort by name for now (ideal would be to respect current sort)
      // But since we have client-side sorting in the table, just appending is often enough
      // or we can let the table handle the sort.
      return { data: newData }
    }),

  removeItem: (path) =>
    set((state) => ({
      data: state.data.filter((i) => i.path !== path),
      selectedItems: new Set([...state.selectedItems].filter((p) => p !== path)),
    })),

  updateItem: (path, updates) =>
    set((state) => ({
      data: state.data.map((i) => (i.path === path ? { ...i, ...updates } : i)),
    })),
}))
