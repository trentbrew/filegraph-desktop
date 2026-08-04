import { create } from 'zustand'

import type { LayoutMode } from '@/components/app/navigation'

// Zoom constants
const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10
const WEB_ZOOM_MIN = 25
const WEB_ZOOM_MAX = 400

interface UIStore {
  // Layout & Display
  layoutMode: LayoutMode
  previewEnabled: boolean
  showDotfiles: boolean
  showFileExplorer: boolean

  // Dock time
  dockShowSeconds: boolean
  dockUse24Hour: boolean

  // Zoom
  zoomLevel: number
  webPreviewZoom: number

  // Search
  searchValue: string

  // Terminal
  terminalOpen: boolean
  terminalHeight: number

  // Graph panel
  graphOpen: boolean

  // Agent panel
  agentOpen: boolean
  agentFullscreen: boolean
  agentPanelWidth: number
  agentSendOnEnter: boolean // true = Enter sends, Shift+Enter for newline; false = Cmd+Enter sends
  agentAlwaysAllowCommands: boolean // true = auto-approve all agent shell commands

  // Global sidebar (file explorer)
  globalSidebarOpen: boolean
  globalSidebarWidth: number

  // Bottom app icon rail
  appRailOpen: boolean

  // Home canvas
  homeCanvasNamespaceTileClickBehavior: 'add_to_canvas' | 'open_file'
  fileBrowserPath: string

  // Camera/Import dialog
  cameraOpen: boolean

  // Actions
  setLayoutMode: (mode: LayoutMode) => void
  setPreviewEnabled: (enabled: boolean) => void
  setShowDotfiles: (show: boolean) => void
  setShowFileExplorer: (visible: boolean) => void
  setSearchValue: (value: string) => void
  clearSearch: () => void
  setTerminalOpen: (open: boolean) => void
  toggleTerminal: () => void
  setTerminalHeight: (height: number) => void

  setGraphOpen: (open: boolean) => void
  toggleGraph: () => void
  setAgentOpen: (open: boolean) => void
  toggleAgent: () => void
  setAgentFullscreen: (fullscreen: boolean) => void
  toggleAgentFullscreen: () => void
  setAgentPanelWidth: (width: number) => void
  setAgentSendOnEnter: (sendOnEnter: boolean) => void
  setAgentAlwaysAllowCommands: (allow: boolean) => void
  setCameraOpen: (open: boolean) => void

  setGlobalSidebarOpen: (open: boolean) => void
  toggleGlobalSidebar: () => void
  setGlobalSidebarWidth: (width: number) => void

  setAppRailOpen: (open: boolean) => void
  toggleAppRail: () => void

  setHomeCanvasNamespaceTileClickBehavior: (behavior: UIStore['homeCanvasNamespaceTileClickBehavior']) => void
  setFileBrowserPath: (path: string) => void

  setDockShowSeconds: (show: boolean) => void
  setDockUse24Hour: (use24Hour: boolean) => void

  // Zoom Actions
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setWebPreviewZoom: (level: number) => void
  resetWebPreviewZoom: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  layoutMode: 'tree',
  previewEnabled: true,
  showDotfiles: true,
  showFileExplorer: true,
  dockShowSeconds: true,
  dockUse24Hour: false,
  zoomLevel: 100,
  webPreviewZoom: 100,
  searchValue: '',
  terminalOpen: false,
  terminalHeight: 300,
  graphOpen: false,
  agentOpen: true,
  agentFullscreen: false,
  agentPanelWidth: 380,
  agentSendOnEnter: true, // Default: Enter sends, Shift+Enter for newline
  agentAlwaysAllowCommands: false,
  cameraOpen: false,

  globalSidebarOpen: true,
  globalSidebarWidth: 400,

  appRailOpen: true,

  homeCanvasNamespaceTileClickBehavior: 'add_to_canvas',
  fileBrowserPath: '',

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setPreviewEnabled: (enabled) => set({ previewEnabled: enabled }),
  setShowDotfiles: (show) => set({ showDotfiles: show }),
  setShowFileExplorer: (visible) => set({ showFileExplorer: visible }),
  setSearchValue: (value) => set({ searchValue: value }),
  clearSearch: () => set({ searchValue: '' }),
  setTerminalOpen: (open) => set({ terminalOpen: open }),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  setTerminalHeight: (height) => set({ terminalHeight: height }),

  setGraphOpen: (open) => set({ graphOpen: open }),
  toggleGraph: () => set((state) => ({ graphOpen: !state.graphOpen })),
  setAgentOpen: (open) => set({ agentOpen: open }),
  toggleAgent: () => set((state) => ({ agentOpen: !state.agentOpen })),
  setAgentFullscreen: (fullscreen) => set({ agentFullscreen: fullscreen }),
  toggleAgentFullscreen: () => set((state) => ({ agentFullscreen: !state.agentFullscreen })),
  setAgentPanelWidth: (width) => set({ agentPanelWidth: Math.max(300, Math.min(600, width)) }),
  setAgentSendOnEnter: (sendOnEnter) => set({ agentSendOnEnter: sendOnEnter }),
  setAgentAlwaysAllowCommands: (agentAlwaysAllowCommands) => set({ agentAlwaysAllowCommands }),
  setCameraOpen: (open) => set({ cameraOpen: open }),

  setGlobalSidebarOpen: (open) => set({ globalSidebarOpen: open }),
  toggleGlobalSidebar: () => set((state) => ({ globalSidebarOpen: !state.globalSidebarOpen })),
  setGlobalSidebarWidth: (width) => set({ globalSidebarWidth: Math.max(200, Math.min(500, width)) }),

  setAppRailOpen: (open) => set({ appRailOpen: open }),
  toggleAppRail: () => set((state) => ({ appRailOpen: !state.appRailOpen })),

  setHomeCanvasNamespaceTileClickBehavior: (behavior) => set({ homeCanvasNamespaceTileClickBehavior: behavior }),
  setFileBrowserPath: (path) => set({ fileBrowserPath: path }),

  setDockShowSeconds: (dockShowSeconds) => set({ dockShowSeconds }),
  setDockUse24Hour: (dockUse24Hour) => set({ dockUse24Hour }),

  // Zoom Actions
  setZoomLevel: (level) => set({ zoomLevel: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level)) }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(ZOOM_MAX, state.zoomLevel + ZOOM_STEP) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(ZOOM_MIN, state.zoomLevel - ZOOM_STEP) })),
  resetZoom: () => set({ zoomLevel: 100 }),
  setWebPreviewZoom: (level) => set({ webPreviewZoom: Math.max(WEB_ZOOM_MIN, Math.min(WEB_ZOOM_MAX, level)) }),
  resetWebPreviewZoom: () => set({ webPreviewZoom: 100 }),
}))
