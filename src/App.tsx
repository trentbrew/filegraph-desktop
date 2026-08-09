import './App.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { FileStructure } from './components/app/fileStructure'
import { VaultSelector } from './components/app/vaultSelector'
import { OnboardingDialog } from './components/app/OnboardingDialog'
import { GlobalCommandPalette } from './components/app/GlobalCommandPalette'
import { Toaster } from '@/components/ui/sonner'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { ChordIndicator } from './components/app/ChordIndicator'
import { KeybindingsDialog } from './components/app/KeybindingsDialog'
import { KeybindingManager } from './lib/keybindings/manager'
import { CommandRegistry } from './lib/keybindings/commands'
import { registerAllCommands } from './lib/commands'
import { DEFAULT_KEYBINDINGS } from './lib/keybindings/defaults'
import type { KeybindingContext } from './lib/keybindings/types'
import { useTabStore } from './stores/useTabStore'
import { useUIStore } from './stores/useUIStore'
import { useAppStore } from './stores/useAppStore'
import { useFileStore } from './stores/useFileStore'
import { useClipboardStore } from './stores/clipboardStore'
import { usePreviewStore } from './stores/usePreviewStore'
import { useTabPersistence } from './hooks/useTabPersistence'
import { useUIPersistence } from './hooks/useUIPersistence'
import { toast } from 'sonner'
import { Camera } from './features/gallery'
import { AgentSidebar } from './features/agent'
import { MemoHomeCanvasFileBrowser } from './features/home/HomeCanvasFileBrowser'
import { HomeCanvasHeader } from './features/home/HomeCanvasHeader'
import { useHomeCanvasStore } from './features/home/useHomeCanvasStore'
import { AppRail } from './components/app/AppRail'
import { motion, AnimatePresence } from 'motion/react'
import { GripVertical } from 'lucide-react'

function AppContent() {
  const [showVaultSelector, setShowVaultSelector] = useState(false)
  const [showKeybindings, setShowKeybindings] = useState(false)
  const keybindingManagerRef = useRef<KeybindingManager | null>(null)
  const { needsOnboarding, isLoading, completeOnboarding } = useVault()
  const activeApp = useAppStore((state) => state.activeApp)
  const {
    agentOpen,
    agentFullscreen,
    agentPanelWidth,
    setAgentPanelWidth,
    globalSidebarOpen,
    globalSidebarWidth,
    setGlobalSidebarWidth,
    appRailOpen,
  } = useUIStore()
  const { vaultPath } = useVault()
  const currentSpacePath = useHomeCanvasStore((s) => s.currentSpacePath)
  const [isResizing, setIsResizing] = useState(false)
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)

  // Listen for keybindings dialog event
  useEffect(() => {
    const handleOpenKeybindings = () => setShowKeybindings(true)
    window.addEventListener('open-keybindings', handleOpenKeybindings)
    return () => window.removeEventListener('open-keybindings', handleOpenKeybindings)
  }, [])

  // Listen for app switching from command palette
  const setActiveApp = useAppStore((state) => state.setActiveApp)
  useEffect(() => {
    const handleSwitchApp = (event: Event) => {
      const customEvent = event as CustomEvent<{ appId?: string }>
      const appId = customEvent.detail?.appId
      if (appId) {
        setActiveApp(appId as any)
      }
    }
    window.addEventListener('switch-app', handleSwitchApp)
    return () => window.removeEventListener('switch-app', handleSwitchApp)
  }, [setActiveApp])

  // Enable persistence
  useTabPersistence()
  useUIPersistence()

  // Initialize preview store event listeners
  useEffect(() => {
    usePreviewStore.getState().setupEventListeners()
    return () => {
      usePreviewStore.getState().cleanup()
    }
  }, [])

  // Debug: Track global drag events
  useEffect(() => {
    return () => { }
  }, [])

  useEffect(() => {
    // Update title based on current path
    const unsubscribe = useFileStore.subscribe((state) => {
      if (state.currentPath.endsWith('.filegraph')) {
        document.title = 'home'
      } else {
        // Optional: Reset or set to something else if needed
        // document.title = 'Tauri + React + Typescript'
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Initialize command registry
    const commands = new CommandRegistry()
    // Get context provider function
    const getContext = (): KeybindingContext => {
      const tabStore = useTabStore.getState()
      const uiStore = useUIStore.getState()
      const fileStore = useFileStore.getState()
      const clipboardStore = useClipboardStore.getState()

      return {
        editorFocus:
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.getAttribute('contenteditable') === 'true',
        fileExplorerFocus:
          !document.activeElement ||
          (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'),
        previewFocus: false,
        layoutMode: uiStore.layoutMode,
        hasSelection: fileStore.selectedItems.size > 0,
        isEditing: false,
        canNavigateBack: tabStore.activeTabId ? tabStore.canNavigateBack(tabStore.activeTabId) : false,
        canNavigateForward: tabStore.activeTabId ? tabStore.canNavigateForward(tabStore.activeTabId) : false,
        isMarkdownEditor: false, // Will be updated based on active editor
        hasClipboard: clipboardStore.items.length > 0,
        isFullscreenMode: !!document.querySelector('.canvas-maximized-mode'),
      }
    }

    // Register all commands
    registerAllCommands(commands)

    // Initialize keybinding manager
    const manager = new KeybindingManager(commands, getContext)

    // Register default keybindings
    manager.registerMany(DEFAULT_KEYBINDINGS)

    // Global keyup handler for command execution
    const handleKeyUp = (e: KeyboardEvent) => {
      manager.handleKeyUp(e)
    }

    window.addEventListener('keyup', handleKeyUp)
    keybindingManagerRef.current = manager

    return () => {
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Apply zoom level to CSS variable
  useEffect(() => {
    // Set initial zoom level
    const zoomLevel = useUIStore.getState().zoomLevel
    document.documentElement.style.setProperty('--app-zoom', String(zoomLevel / 100))

    // Subscribe to zoom changes
    const unsubscribe = useUIStore.subscribe((state) => {
      document.documentElement.style.setProperty('--app-zoom', String(state.zoomLevel / 100))
    })
    return () => unsubscribe()
  }, [])

  // Show loading state while checking first-run
  if (isLoading) {
    return (
      <div className="h-full w-full m-0 overflow-hidden bg-background rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  // Show onboarding for first-run users
  if (needsOnboarding) {
    return (
      <div className="h-full w-full m-0 overflow-hidden bg-background rounded-xl">
        <OnboardingDialog isOpen={true} onComplete={completeOnboarding} />
        <Toaster />
      </div>
    )
  }

  return (
    <div className="h-full w-full m-0 overflow-hidden rounded-xl app-zoom-container">
      <div className="h-full flex flex-col overflow-hidden rounded-[12px] bg-[#111]">
        {/* Global header - spans full width, all apps */}
        <HomeCanvasHeader />

        <div className="flex-1 flex overflow-hidden py-0 min-h-0">
          {/* Global Sidebar - File Explorer */}
          <AnimatePresence mode="wait">
            {globalSidebarOpen && (
              <motion.div
                key="global-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: globalSidebarWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={isSidebarResizing ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full shrink-0 overflow-hidden relative">
                <div className="h-full w-full min-w-0 box-border p-3 pr-1 pt-0!">
                  <div className="h-full w-full overflow-hidden rounded-xl bg-card border flex flex-col">
                    <MemoHomeCanvasFileBrowser initialRootPath={currentSpacePath || vaultPath} />
                  </div>
                </div>
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group hover:bg-primary/20 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setIsSidebarResizing(true)
                    const startX = e.clientX
                    const startWidth = globalSidebarWidth

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const delta = moveEvent.clientX - startX
                      const newWidth = Math.min(500, Math.max(200, startWidth + delta))
                      setGlobalSidebarWidth(newWidth)
                    }

                    const handleMouseUp = () => {
                      setIsSidebarResizing(false)
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }

                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            <div className="flex-1 overflow-hidden">
              <FileStructure />
            </div>
          </div>

          {/* Agent Panel - Resizable sidebar */}
          <AnimatePresence mode="wait">
            {agentOpen && activeApp !== 'agent' && (
              <motion.div
                key="agent-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: agentPanelWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={isResizing ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full shrink-0 overflow-hidden relative">
                {/* Resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group hover:bg-primary/20 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setIsResizing(true)
                    const startX = e.clientX
                    const startWidth = agentPanelWidth

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const delta = startX - moveEvent.clientX
                      const newWidth = Math.min(600, Math.max(300, startWidth + delta))
                      setAgentPanelWidth(newWidth)
                    }

                    const handleMouseUp = () => {
                      setIsResizing(false)
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }

                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="h-full w-full min-w-0 box-border p-3 pl-1 pt-0!">
                  <div className="h-full w-full overflow-hidden rounded-xl bg-card border">
                    <AgentSidebar />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* App Rail - horizontal icon dock at bottom */}
        {appRailOpen && <AppRail />}

        {/* Dialogs & Overlays */}
        <VaultSelector
          isOpen={showVaultSelector}
          onClose={() => setShowVaultSelector(false)}
          onVaultSelected={() => { }}
        />
        <GlobalCommandPalette />
        <KeybindingsDialog isOpen={showKeybindings} onClose={() => setShowKeybindings(false)} />
        <ChordIndicator />
        <Camera />
        <Toaster />

        {/* Fullscreen Agent Overlay */}
        <AnimatePresence>
          {agentOpen && agentFullscreen && activeApp !== 'agent' && (
            <motion.div
              key="agent-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-background">
              <div className="h-full w-full max-w-4xl mx-auto">
                <AgentSidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Register all command handlers
// Moved to src/lib/commands/index.ts

function App() {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  )
}

export default App
