'use client'

import * as React from 'react'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useTQL } from '@/hooks/useTQL'
import { useVault } from '@/contexts/VaultContext'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  ColumnSizingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, MoreHorizontal, Terminal, PanelsTopLeft, X } from 'lucide-react'
import { getFileIcon } from '@/lib/fileIcons'
import { buildSelectionState, isMultiSelectEvent } from '@/lib/utils/selection'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'

import { CommandBar } from './CommandBar'
import { MiniCalendar } from './MiniCalendar'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useAppStore } from '@/stores/useAppStore'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { PreviewPane } from '@/features/preview'
import { formatFileSize } from '@/features/preview/utils'
import { toast } from 'sonner'
import TitleBar from './titleBar'
import { loadAppState, saveAppState, type AppState } from '@/lib/appState'
import { NavigationBar } from './navigation'
import { Toolbar, type ToolbarHandle } from './Toolbar'
import { FileViewContainer } from './FileViewContainer'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTabStore, useUIStore, useFileStore } from '@/stores'
import { useClipboardStore } from '@/stores/clipboardStore'
import { useFileDragDrop } from '@/hooks/useFileDragDrop'
// TerminalPanel replaced by CommandBar

const CanvasViewer = React.lazy(() =>
  import('@/features/preview/viewers/canvasViewer').then((module) => ({
    default: module.CanvasViewer,
  })),
)

const HomeCanvasLazy = React.lazy(() =>
  import('@/features/home').then((module) => ({
    default: module.HomeCanvas,
  })),
)

// Extensions that can be previewed in-app (don't open with default app)
const PREVIEWABLE_EXTENSIONS = new Set([
  // Text/Code
  'txt',
  'md',
  'note',
  'json',
  'yaml',
  'yml',
  'toml',
  'xml',
  'csv',
  'js',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'svelte',
  'astro',
  'html',
  'css',
  'scss',
  'less',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  'sql',
  'graphql',
  'gql',
  // Data
  'data',
  'person',
  'org',
  'proj',
  'task',
  'ms',
  'cycle',
  'collection',
  'acc',
  'tx',
  'bill',
  'goal',
  'inc',
  'ins',
  'exp',
  'tax',
  'sub',
  'cat',
  'annual',
  'agent',
  'persona',
  'prompt',
  'skill',
  'tool',
  'event',
  'reminder',
  'email',
  'dm',
  'channel',
  'thread',
  'env',
  'ini',
  'conf',
  'config',
  'gitignore',
  'dockerignore',
  // Canvas/Whiteboard/Sketch
  'canvas',
  'whiteboard',
  // Images (for preview)
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'ico',
  'bmp',
  // Documents
  'pdf',
  'docx',
  'xlsx',
])

function normalizeFileItems(files: FileItem[]): FileItem[] {
  return files.map((f) => {
    if (f.file_type === 'folder') return f

    return {
      ...f,
      extension: getEffectiveExtension(f.name),
    }
  })
}

export type FileItem = {
  id: string
  name: string
  file_type: 'file' | 'folder' | 'web' // Changed from 'type' to match Rust struct
  size: number | null // in bytes, null for folders
  date_modified: string // Changed to string to match Rust DateTime serialization
  extension: string | null
  path: string // Added path field
}

// Import app components and registry
import { AppShell, CalendarApp, GraphApp, InboxApp, SettingsApp, TerminalApp, SchemaBrowser } from './apps'
import { AppRouter, registerAppView, type AppId } from '@/lib/apps'
import { AgentApp } from '@/features/agent/components/AgentApp'

// Transition config for app switching (simple fade/scale)
const appTransition = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1] as const,
}

type HomeBackgroundKind = 'color' | 'gradient' | 'image'

type HomeBackgroundConfig = {
  kind: HomeBackgroundKind
  value: string
  dim?: number
}

type TextFileContent = {
  content: string
  truncated?: boolean
  encoding?: string
  size?: number
}

function HomeCanvasView() {
  const { vaultPath, isLoading } = useVault()

  const [background, setBackground] = React.useState<HomeBackgroundConfig | null>(null)
  const [backgroundDialogOpen, setBackgroundDialogOpen] = React.useState(false)
  const [draftKind, setDraftKind] = React.useState<HomeBackgroundKind>('color')
  const [draftValue, setDraftValue] = React.useState('#0b0f14')
  const [draftDim, setDraftDim] = React.useState(0.25)

  const backgroundConfigPath = vaultPath ? `${vaultPath}/@system/home.background.json` : null

  React.useEffect(() => {
    if (!backgroundConfigPath) return

    let cancelled = false

    const load = async () => {
      try {
        const file = await invoke<TextFileContent>('read_text_file', {
          filePath: backgroundConfigPath,
          maxBytes: 64 * 1024,
        })
        if (cancelled) return
        if (file?.content?.trim()) {
          const parsed = JSON.parse(file.content) as HomeBackgroundConfig
          setBackground(parsed)
          setDraftKind(parsed.kind)
          setDraftValue(parsed.value)
          setDraftDim(typeof parsed.dim === 'number' ? parsed.dim : 0.25)
          return
        }
      } catch {
        // ignore, will seed below
      }

      const seeded: HomeBackgroundConfig = { kind: 'color', value: '#0b0f14', dim: 0.25 }
      try {
        await invoke('write_text_file', {
          filePath: backgroundConfigPath,
          content: JSON.stringify(seeded, null, 2),
        })
      } catch {
        // ignore
      }
      if (!cancelled) {
        setBackground(seeded)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [backgroundConfigPath])

  const resolvedImageUrl = React.useMemo(() => {
    if (!background || background.kind !== 'image' || !background.value) return null
    try {
      return convertFileSrc(background.value)
    } catch {
      return null
    }
  }, [background])

  const backgroundStyle = React.useMemo<React.CSSProperties>(() => {
    if (!background) return {}
    if (background.kind === 'color') {
      return { backgroundColor: background.value }
    }
    if (background.kind === 'gradient') {
      return { backgroundImage: background.value }
    }
    if (background.kind === 'image' && resolvedImageUrl) {
      return {
        backgroundImage: `url(${resolvedImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }
    return {}
  }, [background, resolvedImageUrl])

  const dim = background?.kind === 'image' ? Math.max(0, Math.min(0.85, background?.dim ?? 0.25)) : 0

  const handleChooseImage = React.useCallback(async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif', 'avif'],
          },
        ],
      })

      if (!selected) return
      if (typeof selected === 'string') {
        setDraftKind('image')
        setDraftValue(selected)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSaveBackground = React.useCallback(async () => {
    if (!backgroundConfigPath) return
    const next: HomeBackgroundConfig = {
      kind: draftKind,
      value: draftValue,
      dim: draftKind === 'image' ? draftDim : undefined,
    }
    setBackground(next)
    setBackgroundDialogOpen(false)

    try {
      await invoke('write_text_file', {
        filePath: backgroundConfigPath,
        content: JSON.stringify(next, null, 2),
      })
    } catch {
      // ignore
    }
  }, [backgroundConfigPath, draftDim, draftKind, draftValue])

  if (isLoading || !vaultPath) {
    return <div className="h-full w-full" />
  }

  return (
    <div className="h-full w-full relative home-canvas bg-transparent flex flex-col">
      <div className="flex-1 min-h-0 p-2.5 pt-0">
        <div
          className="h-full w-full relative overflow-hidden rounded-xl border border-border/40"
          style={backgroundStyle}>
          {dim > 0 && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />}

          <div className="relative h-full w-full">
            <React.Suspense fallback={<div className="h-full w-full" />}>
              <HomeCanvasLazy
                className="h-full w-full"
                onOpenBackgroundSettings={() => setBackgroundDialogOpen(true)}
              />
            </React.Suspense>
          </div>
        </div>
      </div>

      <Dialog open={backgroundDialogOpen} onOpenChange={setBackgroundDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Home Background</DialogTitle>
            <DialogDescription>Set a background for your Home canvas.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={draftKind === 'color' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDraftKind('color')}>
                Color
              </Button>
              <Button
                type="button"
                variant={draftKind === 'gradient' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDraftKind('gradient')}>
                Gradient
              </Button>
              <Button
                type="button"
                variant={draftKind === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDraftKind('image')}>
                Image
              </Button>
            </div>

            {draftKind === 'color' && (
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    className="h-9 w-14 rounded border border-border bg-transparent"
                  />
                  <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} placeholder="#0b0f14" />
                </div>
              </div>
            )}

            {draftKind === 'gradient' && (
              <div className="grid gap-2">
                <Label>CSS Gradient</Label>
                <Input
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder="linear-gradient(135deg, #0b0f14 0%, #111827 100%)"
                />
                <div className="h-14 rounded border border-border" style={{ backgroundImage: draftValue }} />
              </div>
            )}

            {draftKind === 'image' && (
              <div className="grid gap-2">
                <Label>Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder="/path/to/image.jpg"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleChooseImage}>
                    Choose
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Dim</Label>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.01}
                    value={draftDim}
                    onChange={(e) => setDraftDim(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBackgroundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBackground}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Register implemented app views with the router
// Apps not registered here will automatically use PlaceholderView
registerAppView('home', {
  component: () => <HomeCanvasView />,
  useShell: false,
})
registerAppView('graph', {
  component: () => <GraphApp />,
  useShell: false,
})
registerAppView('calendar', {
  component: () => <CalendarApp />,
  useShell: true,
})
registerAppView('terminal', {
  component: () => <TerminalApp />,
  useShell: false,
})
registerAppView('settings', {
  component: () => <SettingsApp />,
  useShell: false,
})
registerAppView('inbox', {
  component: () => <InboxApp />,
  useShell: true,
})
registerAppView('schema', {
  component: () => <SchemaBrowser />,
  useShell: false,
})
registerAppView('agent', {
  component: () => <AgentApp />,
  useShell: false,
})

// App content renderer - now uses registry-based AppRouter
function AppContent({ app }: { app: string }) {
  return <AppRouter appId={app as AppId} Shell={AppShell} />
}

// Mini calendar panel content for calendar mode (replaces file tree)
function CalendarSidebarContent() {
  const { selectedDate, setSelectedDate, getEventDates } = useCalendarStore()
  const eventDates = getEventDates()

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border w-full">
      {/* Mini Calendar */}
      <div className="border-b">
        <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} eventDates={eventDates} />
      </div>
      {/* Selected Day Events */}
      <div className="flex-1 overflow-auto p-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h4>
        <SelectedDayEvents />
      </div>
    </div>
  )
}

// Selected day events for calendar sidebar
function SelectedDayEvents() {
  const { selectedDate, getEventsForDate } = useCalendarStore()
  const events = getEventsForDate(selectedDate)

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No events</p>
  }

  return (
    <div className="space-y-1.5">
      {events.slice(0, 5).map((event) => (
        <div
          key={event.id}
          className="rounded px-2 py-1.5 text-xs"
          style={{
            backgroundColor: event.color ? `${event.color}15` : 'hsl(var(--muted))',
            borderLeft: `2px solid ${event.color || 'hsl(var(--primary))'}`,
          }}>
          <p className="font-medium truncate">{event.name}</p>
          {event.time && <p className="text-[10px] text-muted-foreground">{event.time}</p>}
        </div>
      ))}
      {events.length > 5 && <p className="text-[10px] text-muted-foreground">+{events.length - 5} more</p>}
    </div>
  )
}

const normalizeUrlInput = (value: string): string | null => {
  if (!value) return null
  const trimmed = value.trim()

  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    // Not a fully-qualified URL yet
  }

  const looksLikeDomain = /^[\w-]+(\.[\w-]+)+.*$/i.test(trimmed)
  if (looksLikeDomain) {
    try {
      const url = new URL(`https://${trimmed}`)
      return url.toString()
    } catch {
      return null
    }
  }

  return null
}

function FileStructureComponent() {
  // Track if tab initialization is in progress (prevents race condition with Strict Mode)
  const tabInitInProgress = React.useRef(false)

  // TQL Runtime
  const [tqlState, tqlActions] = useTQL()
  const { vaultPath } = useVault()

  // Zustand Stores
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTab,
    reorderTabs,
    navigateInTab,
    navigateBack: navigateBackInTab,
    navigateForward: navigateForwardInTab,
    canNavigateBack,
    canNavigateForward,
    setTabViewMode,
    setTabSelectedFile,
    setTabTerminalOpen,
    initializeHomeTab,
  } = useTabStore()
  const activeTab = React.useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId])

  const {
    layoutMode,
    previewEnabled,
    showDotfiles,
    showFileExplorer,
    searchValue,
    terminalOpen,
    terminalHeight,
    setLayoutMode,
    setSearchValue,
    setShowFileExplorer,
    clearSearch,
    setTerminalOpen,
    toggleTerminal,
    setTerminalHeight,
  } = useUIStore()

  const { isCalendarMode } = useCalendarStore()
  const { activeApp, setActiveApp } = useAppStore()

  const {
    currentPath,
    pathInput,
    data,
    loading,
    activeItem,
    webPreviewUrl,
    lastSelectedIndex,
    setCurrentPath,
    setPathInput,
    setData,
    setLoading,
    setActiveItem,
    setWebPreviewUrl,
    addItem,
    removeItem,
    updateItem,
    setLastSelectedIndex,
  } = useFileStore()

  // Editor tab management (workspace-scoped) - from useTabStore
  const { openEditorPinned: openEditorTab } = useTabStore()

  const effectiveLayoutMode = activeTab?.viewMode ?? layoutMode
  const hasPreviewTarget = Boolean(activeItem || webPreviewUrl || effectiveLayoutMode === 'tree')
  const explorerDefaultSize = React.useMemo(() => {
    if (previewEnabled && hasPreviewTarget) {
      return effectiveLayoutMode === 'tree' ? 25 : 65
    }
    return 100
  }, [effectiveLayoutMode, hasPreviewTarget, previewEnabled])

  // UI State
  const [isDragging, setIsDragging] = React.useState(false)
  const shouldShowPreviewPanel = previewEnabled && hasPreviewTarget
  const shouldShowEmptyState = !showFileExplorer && !shouldShowPreviewPanel
  const shouldRenderSecondaryPanel = shouldShowPreviewPanel || shouldShowEmptyState

  const fileExplorerPanelRef = React.useRef<ImperativePanelHandle | null>(null)
  const explorerSizeRef = React.useRef<number | null>(null)
  const toolbarRef = React.useRef<ToolbarHandle | null>(null)
  if (explorerSizeRef.current === null) {
    explorerSizeRef.current = explorerDefaultSize
  }

  React.useEffect(() => {
    const panel = fileExplorerPanelRef.current
    if (!panel) return

    if (showFileExplorer) {
      const targetSize = explorerSizeRef.current ?? explorerDefaultSize
      panel.expand()
      panel.resize(targetSize)
    } else {
      const currentSize = panel.getSize()
      if (currentSize > 0) {
        explorerSizeRef.current = currentSize
      }
      panel.collapse()
    }
  }, [explorerDefaultSize, showFileExplorer])

  // Clipboard store (copy/cut operations across app)
  const { setClipboard } = useClipboardStore()

  // Table state (not in store - component-specific)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({
    name: 300,
    date_modified: 120,
    file_type: 80,
    size: 100,
    actions: 50,
  })
  // Force remount for view components when data changes unexpectedly
  const [viewRefreshKey, setViewRefreshKey] = React.useState(0)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [pathsToDelete, setPathsToDelete] = React.useState<string[]>([])

  // Fetch home directory for column view root fallback
  const [homeDir, setHomeDir] = React.useState<string | null>(null)

  React.useEffect(() => {
    invoke<string>('get_home_directory').then(setHomeDir).catch(console.error)
  }, [])

  // Clear search filter when navigating to new directory
  React.useEffect(() => {
    clearSearch()
    // Sync path input with actual current path
    setPathInput(currentPath)
  }, [currentPath, clearSearch, setPathInput])

  const openNewFolderDialog = React.useCallback(() => {
    toolbarRef.current?.openNewFolderDialog()
  }, [])

  const openNewFileDialog = React.useCallback(() => {
    toolbarRef.current?.openNewFileDialog()
  }, [])

  // Navigate to a new path (memoized to stabilize table columns)
  // Defined before handleRefresh since handleRefresh depends on it
  const navigateToPath = React.useCallback(
    async (path: string) => {
      console.log('[navigateToPath] Called with path:', path)

      const normalizedUrl = normalizeUrlInput(path)
      if (normalizedUrl) {
        setWebPreviewUrl(normalizedUrl)
        setActiveItem(null)
        setPathInput(normalizedUrl)
        setLoading(false)
        return
      }

      setWebPreviewUrl(null)
      setLoading(true)
      try {
        const files = await invoke<FileItem[]>('navigate_to_path', { path })
        console.log('[navigateToPath] Loaded files:', files.length)
        setData(normalizeFileItems(files))
        setCurrentPath(path)
        setPathInput(path)
        if (activeTabId) {
          navigateInTab(activeTabId, path)
        }

        // Save current path to persistent state
        saveAppState({ currentPath: path }).catch(console.error)
      } catch (error) {
        console.error('Failed to navigate to path:', error)
        toast.error(`Failed to navigate to: ${path}`)
      } finally {
        setLoading(false)
      }
    },
    [activeTabId, navigateInTab, setWebPreviewUrl, setLoading, setData, setCurrentPath, setPathInput],
  )

  // Drag & drop for table view
  const {
    draggedItems: tableDraggedItems,
    isDragging: tableIsDragging,
    dropTargetPath: tableDropTargetPath,
    handleDragStart: tableHandleDragStart,
    handleDragEnd: tableHandleDragEnd,
    handleDragOver: tableHandleDragOver,
    handleDragLeave: tableHandleDragLeave,
    handleDrop: tableHandleDrop,
  } = useFileDragDrop({ onMoveComplete: () => handleRefresh() })

  // Refresh current directory (memoized to prevent stale closures in file watcher)
  // Defined here before file watcher useEffect so it can be used in dependencies
  const handleRefresh = React.useCallback(
    async (fileToSelect?: string) => {
      const refreshPath = useFileStore.getState().currentPath
      console.log('[handleRefresh] Called, currentPath:', refreshPath, 'fileToSelect:', fileToSelect)
      if (!refreshPath) return

      setLoading(true)
      try {
        const files = await invoke<FileItem[]>('list_directory', { path: refreshPath })
        setData(normalizeFileItems(files))
        setCurrentPath(refreshPath)
        setPathInput(refreshPath)

        // Save current path to persistent state
        saveAppState({ currentPath: refreshPath }).catch(console.error)

        if (fileToSelect) {
          // Wait briefly for data hydration before selecting
          setTimeout(() => {
            const fileStore = useFileStore.getState()
            const newFile = fileStore.data.find((f) => f.name === fileToSelect)
            if (newFile) {
              console.log('[handleRefresh] Auto-selecting file:', newFile.name)
              setActiveItem(newFile)
            }
          }, 100)
        }
        setViewRefreshKey((key) => key + 1)
      } catch (error) {
        console.error('Failed to refresh directory:', error)
        toast.error('Failed to refresh directory')
      } finally {
        setLoading(false)
      }
    },
    [setActiveItem, setCurrentPath, setData, setLoading, setPathInput],
  )

  // Listen for refresh-directory events (from keyboard shortcuts)
  React.useEffect(() => {
    const handleRefreshEvent = () => {
      handleRefresh()
      toast.success('Refreshed')
    }
    window.addEventListener('refresh-directory', handleRefreshEvent)
    return () => window.removeEventListener('refresh-directory', handleRefreshEvent)
  }, [handleRefresh])

  // Listen for open-file events (from commands like settings.openGlobal)
  React.useEffect(() => {
    const handleOpenFile = async (e: Event) => {
      const { path } = (e as CustomEvent).detail
      if (!path) return

      try {
        // Get file metadata
        const files = await invoke<FileItem[]>('list_directory', {
          path: path.split('/').slice(0, -1).join('/'),
        })
        const fileName = path.split('/').pop()
        const fileItem = files.find((f) => f.name === fileName)

        if (fileItem) {
          setActiveItem(fileItem)
        } else {
          // Create a synthetic FileItem for the file
          setActiveItem({
            id: path,
            name: fileName || 'unknown',
            file_type: 'file',
            size: null,
            date_modified: new Date().toISOString(),
            extension: getEffectiveExtension(fileName || ''),
            path: path,
          })
        }
      } catch (error) {
        console.error('Failed to open file:', error)
        toast.error('Failed to open file')
      }
    }
    window.addEventListener('open-file', handleOpenFile)
    return () => window.removeEventListener('open-file', handleOpenFile)
  }, [setActiveItem])

  // Terminal is a first-class App (no bottom pane)
  React.useEffect(() => {
    const handleToggle = () => {
      setActiveApp(activeApp === 'terminal' ? 'files' : 'terminal')
    }
    const handleFocus = () => {
      setActiveApp('terminal')
    }

    window.addEventListener('toggle-terminal', handleToggle)
    window.addEventListener('focus-terminal', handleFocus)
    return () => {
      window.removeEventListener('toggle-terminal', handleToggle)
      window.removeEventListener('focus-terminal', handleFocus)
    }
  }, [activeApp, setActiveApp])

  // Listen for ephemeral web preview requests (from terminal localhost links)
  React.useEffect(() => {
    const handleEphemeralPreview = (event: CustomEvent<{ url: string }>) => {
      const { url } = event.detail
      console.log('[FileStructure] Opening ephemeral preview:', url)

      // Clear any selected file and set the web preview URL
      setActiveItem(null)
      setWebPreviewUrl(url)

      toast.success('Opening preview', {
        description: url.replace(/^https?:\/\//, ''),
        duration: 2000,
      })
    }

    window.addEventListener('open-ephemeral-preview', handleEphemeralPreview as EventListener)
    return () => {
      window.removeEventListener('open-ephemeral-preview', handleEphemeralPreview as EventListener)
    }
  }, [setActiveItem, setWebPreviewUrl])

  // Filesystem watching - start/stop watcher and listen for changes
  React.useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupWatcher = async () => {
      if (!currentPath) return

      try {
        // Start watching the current directory
        await invoke('start_watch', { path: currentPath })

        // Listen for filesystem change events
        unlisten = await listen<{ kind: string; paths: string[] }>('fs-change', (event) => {
          const payload = event.payload
          const kind = payload.kind.toLowerCase()
          const paths = payload.paths

          console.log('[FileWatcher] Event received:', { kind, paths })

          // Parse event kind
          let eventKind: 'create' | 'modify' | 'remove' | 'rename' | 'unknown' = 'unknown'
          if (kind.includes('create')) eventKind = 'create'
          else if (kind.includes('modify') || kind.includes('write')) eventKind = 'modify'
          else if (kind.includes('remove') || kind.includes('delete')) eventKind = 'remove'
          else if (kind.includes('rename')) eventKind = 'rename'

          console.log('[FileWatcher] Parsed event kind:', eventKind)

          // Push events to TQL runtime
          for (const path of paths) {
            tqlActions.pushFSEvent({
              kind: eventKind,
              path,
              timestamp: Date.now(),
            })
          }

          // Incremental UI updates
          // Note: For 'create' and 'modify', we ideally need metadata (size, date).
          // Since we don't have it in the event, we still need to fetch or refresh.
          // But for 'remove', we can update instantly.

          if (eventKind === 'remove') {
            console.log('[FileWatcher] Removing items:', paths)
            paths.forEach((p) => removeItem(p))
          } else if (eventKind === 'rename' && paths.length === 2) {
            // Assuming [from, to] for rename
            // But notify sometimes sends separate events.
            // If we have both, we can try to update.
            // For safety, we'll refresh for rename/create/modify for now,
            // but we've optimized 'remove' which is the most jarring (disappearing items).

            // TODO: Implement single-file metadata fetch to handle create/modify incrementally
            console.log('[FileWatcher] Rename event, calling handleRefresh')
            const newName = paths[1]?.split(/[\\/]/).pop()
            void handleRefresh(newName)
          } else {
            // Debounced refresh for other events to avoid spamming
            console.log('[FileWatcher] Create/modify event, calling handleRefresh')
            const createdName = paths[0]?.split(/[\\/]/).pop()
            void handleRefresh(createdName)
          }

          // Auto-refresh preview if any file was modified - notify the store
          if (eventKind === 'modify' || eventKind === 'create') {
            const { notifyFileChanged } = useFileStore.getState()
            paths.forEach((p) => {
              console.log('[FileWatcher] Notifying file changed:', p)
              notifyFileChanged(p)
            })
          }
        })
      } catch (error) {
        console.error('Failed to setup filesystem watcher:', error)
      }
    }

    setupWatcher()

    // Cleanup: stop watching and unlisten
    return () => {
      if (unlisten) {
        unlisten()
      }
      invoke('stop_watch').catch(console.error)
    }
  }, [currentPath, handleRefresh, removeItem, tqlActions])

  // Watch for file version changes (agent file operations)
  // Use store.subscribe (not a reactive selector) to avoid re-render loops:
  // notifyFileChanged always produces a new Map reference, so a reactive selector
  // would cause this effect to re-fire on every unrelated file change.
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  React.useEffect(() => {
    const unsubscribe = useFileStore.subscribe((state, prevState) => {
      if (!currentPath) return

      const hasRelevantChange = Array.from(state.fileVersions.keys()).some((path) => {
        const isInCurrentPath = path.startsWith(currentPath) || path === currentPath
        const isGraphFile = path.includes('_graph_.data')
        if (!isInCurrentPath || isGraphFile) return false
        const prevVersion = prevState.fileVersions.get(path) || 0
        const newVersion = state.fileVersions.get(path) || 0
        return newVersion > prevVersion
      })

      if (hasRelevantChange) {
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = setTimeout(() => {
          handleRefresh()
        }, 300)
      }
    })

    return () => {
      unsubscribe()
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [currentPath, handleRefresh])

  // Initialize with first tab or restore from saved state
  // CRITICAL: Wait for Zustand persist to hydrate before creating tabs
  const hasHydrated = useTabStore((state: any) => state._hasHydrated)

  React.useEffect(() => {
    if (!hasHydrated) {
      // Wait for hydration to complete
      console.log('[FileStructure] Waiting for tab store hydration...')
      return
    }

    if (tabs.length === 0 && !tabInitInProgress.current) {
      console.log('[FileStructure] No tabs after hydration, creating initial tab')
      tabInitInProgress.current = true

      // Initialize the persistent home tab first
      initializeHomeTab()
        .then(() => {
          // Then load app state and create initial tab if needed
          return loadAppState()
        })
        .then((savedState: AppState) => {
          const pathToLoad = savedState.currentPath || vaultPath || undefined
          return addTab(pathToLoad)
        })
        .finally(() => {
          tabInitInProgress.current = false
        })
    }
  }, [tabs.length, hasHydrated]) // Depend on reactive hasHydrated

  // Load files when active tab changes
  React.useEffect(() => {
    if (!activeTab) return

    const loadTabFiles = async () => {
      setLoading(true)
      try {
        const files = await invoke<FileItem[]>('list_directory', {
          path: activeTab.path,
        })
        setData(normalizeFileItems(files))
        setCurrentPath(activeTab.path)
        setPathInput(activeTab.path)

        // Restore the selected file for this tab
        setActiveItem(activeTab.selectedFile ?? null)
      } catch (error) {
        console.error('Failed to load directory:', error)
        toast.error(`Failed to load directory: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadTabFiles()
  }, [activeTab?.id, activeTab?.path])

  // Removed auto-captioning on directory navigation - now using lazy loading when images are viewed

  React.useEffect(() => {
    if (!activeItem || activeItem.file_type !== 'web') {
      return
    }

    let isCancelled = false
    setWebPreviewUrl(null)

    const loadWebBookmark = async () => {
      try {
        const url = await invoke<string>('read_web_file', {
          path: activeItem.path,
        })

        if (!isCancelled) {
          setWebPreviewUrl(url)
        }
      } catch (error) {
        if (isCancelled) return

        // If file is empty, keep it selected so we can show the input
        if (typeof error === 'string' && error.includes('Web file is empty')) {
          setWebPreviewUrl(null)
          return
        }

        toast.error(`Failed to load web bookmark: ${error}`)
        setActiveItem(null)
        setWebPreviewUrl(null)
      }
    }

    loadWebBookmark()

    return () => {
      isCancelled = true
    }
  }, [activeItem?.path, activeItem?.file_type, setActiveItem, setWebPreviewUrl])

  // Sync activeItem to the current tab's selectedFile
  React.useEffect(() => {
    if (!activeTabId) return
    setTabSelectedFile(activeTabId, activeItem)
  }, [activeItem, activeTabId, setTabSelectedFile])

  // Navigate back in history
  const navigateBack = async () => {
    if (!activeTabId || !activeTab || !canNavigateBack(activeTabId)) return

    navigateBackInTab(activeTabId)
    const updatedTab = useTabStore.getState().tabs.find((tab) => tab.id === activeTabId)
    const previousPath = updatedTab?.path
    if (!previousPath) return

    setWebPreviewUrl(null)
    setLoading(true)
    try {
      const files = await invoke<FileItem[]>('navigate_to_path', {
        path: previousPath,
      })
      setData(normalizeFileItems(files))
      setCurrentPath(previousPath)
      setPathInput(previousPath)
    } catch (error) {
      console.error('Failed to navigate back:', error)
      toast.error(`Failed to navigate back`)
    } finally {
      setLoading(false)
    }
  }

  // Navigate forward in history
  const navigateForward = async () => {
    if (!activeTabId || !activeTab || !canNavigateForward(activeTabId)) return

    navigateForwardInTab(activeTabId)
    const updatedTab = useTabStore.getState().tabs.find((tab) => tab.id === activeTabId)
    const nextPath = updatedTab?.path
    if (!nextPath) return

    setWebPreviewUrl(null)
    setLoading(true)
    try {
      const files = await invoke<FileItem[]>('navigate_to_path', {
        path: nextPath,
      })
      setData(normalizeFileItems(files))
      setCurrentPath(nextPath)
      setPathInput(nextPath)
    } catch (error) {
      console.error('Failed to navigate forward:', error)
      toast.error(`Failed to navigate forward`)
    } finally {
      setLoading(false)
    }
  }

  // Navigate to vault root (or home if no vault)
  const navigateHome = async () => {
    try {
      // Use vault path if available, otherwise user's home directory
      const homePath = vaultPath || (await invoke<string>('get_home_directory'))
      setWebPreviewUrl(null)
      await navigateToPath(homePath)
    } catch (error) {
      console.error('Failed to navigate to home:', error)
    }
  }

  // Memoize callback to prevent recreation on every render
  const openFolderInNewTab = React.useCallback((path: string) => addTab(path), [addTab])

  const handleItemOpen = React.useCallback(
    async (item: FileItem, options: { openInNewTab?: boolean } = {}) => {
      setWebPreviewUrl(null)

      if (item.file_type === 'web') {
        setActiveItem(item)
        return
      }

      if (item.file_type === 'folder') {
        if (options.openInNewTab) {
          await openFolderInNewTab(item.path)
        } else {
          await navigateToPath(item.path)
        }
        return
      }

      // Check if file can be previewed in-app
      const extension = item.extension?.toLowerCase()
      const isPreviewable = extension && PREVIEWABLE_EXTENSIONS.has(extension)

      if (isPreviewable) {
        // Pin as editor tab (VS Code-style double-click behavior)
        openEditorTab(item)
        setActiveItem(item)
        return
      }

      // For non-previewable files, open with default application
      try {
        const result = await invoke<string>('open_file_with_default_app', {
          filePath: item.path,
        })
        toast.success(result)
      } catch (error) {
        toast.error(`Failed to open file: ${error}`)
      }
    },
    [setWebPreviewUrl, setActiveItem, openFolderInNewTab, navigateToPath, openEditorTab],
  )

  const handleItemDoubleClick = (item: FileItem, options: { openInNewTab?: boolean } = {}) => {
    void handleItemOpen(item, options)
  }

  // Get selected item paths from table (excluding parent directory entry)
  const getTableSelectedPaths = (): string[] => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    return selectedRows.filter((row) => row.original.id !== '__parent__').map((row) => row.original.path)
  }

  // Helpers & handlers for item operations (memoized for table stability)
  const trashPaths = React.useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return

      setLoading(true)
      try {
        await invoke('trash_items', { paths })
        toast.success(`Moved ${paths.length} item(s) to trash`)
        handleItemsDeleted()
        await handleRefresh()
      } catch (error) {
        toast.error(`Failed to move to trash: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [setLoading, handleRefresh],
  )

  // Context menu handlers for individual items
  const handleCopyItem = (item: FileItem) => {
    const selectedPaths = getTableSelectedPaths()
    const paths = selectedPaths.includes(item.path) && selectedPaths.length > 0 ? selectedPaths : [item.path]
    // Update app clipboard and system clipboard
    setClipboard(paths, 'copy')
    navigator.clipboard.writeText(paths.join('\n'))
    toast.success(`Copied ${paths.length} item(s)`)
  }

  const handleCutItem = (item: FileItem) => {
    const selectedPaths = getTableSelectedPaths()
    const paths = selectedPaths.includes(item.path) && selectedPaths.length > 0 ? selectedPaths : [item.path]
    setClipboard(paths, 'cut')
    toast.success(`Cut ${paths.length} item(s)`)
  }

  const handleDeleteItem = (item: FileItem) => {
    const selectedPaths = getTableSelectedPaths()
    const paths = selectedPaths.includes(item.path) && selectedPaths.length > 0 ? selectedPaths : [item.path]
    void trashPaths(paths)
  }

  // Define columns inside the component so they have access to functions
  // Memoize to prevent table re-initialization on every render
  const columns = React.useMemo<ColumnDef<FileItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className="px-0 justify-start gap-2 text-xs font-medium text-muted-foreground hover:bg-transparent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Name
              <ArrowUpDown className="opacity-50" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const fileItem = row.original
          const isDotfile = fileItem.name.startsWith('.')
          const isWebFile = fileItem.file_type === 'web'
          return (
            <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
              <div className="shrink-0">{getFileIcon(fileItem.file_type, fileItem.extension)}</div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`truncate font-medium text-sm ${
                    isDotfile ? 'opacity-50' : ''
                  } ${isWebFile ? 'text-sky-900 dark:text-sky-200' : ''}`}>
                  {fileItem.name}
                </span>
                {isWebFile && (
                  <span className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/30 rounded-full px-2 py-0.5 w-fit">
                    Web Bookmark
                  </span>
                )}
              </div>
            </div>
          )
        },
        size: 400,
        minSize: 250,
        maxSize: 600,
      },
      {
        accessorKey: 'date_modified',
        header: ({ column }) => {
          return (
            <div className="pl-4">
              <Button
                variant="ghost"
                className="px-0 justify-start gap-2 text-xs font-medium text-muted-foreground hover:bg-transparent"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Date Modified
                <ArrowUpDown className="opacity-50" />
              </Button>
            </div>
          )
        },
        cell: ({ row }) => {
          const dateString = row.getValue('date_modified') as string
          const date = new Date(dateString)
          return <div className="pl-4">{date.toLocaleDateString()}</div>
        },
        size: 180,
        minSize: 150,
        maxSize: 250,
      },
      {
        accessorKey: 'file_type',
        header: ({ column }) => {
          return (
            <div className="pl-4">
              <Button
                variant="ghost"
                className="px-0 justify-start gap-2 text-xs font-medium text-muted-foreground hover:bg-transparent"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Type
                <ArrowUpDown className="opacity-50" />
              </Button>
            </div>
          )
        },
        cell: ({ row }) => {
          const fileItem = row.original
          if (fileItem.file_type === 'folder') return <div className="pl-4">Folder</div>
          if (fileItem.file_type === 'web') {
            return <div className="text-sky-700 dark:text-sky-300 pl-4">Web Bookmark</div>
          }
          return <div className="capitalize pl-4">{fileItem.extension || 'File'}</div>
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original
          const b = rowB.original
          // Sort folders first, then by extension
          if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
          if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
          const extA = a.extension || ''
          const extB = b.extension || ''
          return extA.localeCompare(extB)
        },
        size: 120,
        minSize: 100,
        maxSize: 150,
      },
      {
        accessorKey: 'size',
        header: ({ column }) => {
          return (
            <div className="text-right pr-8">
              <Button
                variant="ghost"
                className="px-0 justify-end gap-2 text-xs font-medium text-muted-foreground hover:bg-transparent"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Size
                <ArrowUpDown className="opacity-50" />
              </Button>
            </div>
          )
        },
        cell: ({ row }) => {
          const size = row.getValue('size') as number | null
          return <div className="text-right pr-8">{size === null ? '' : formatFileSize(size)}</div>
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.size ?? -1
          const b = rowB.original.size ?? -1
          return a - b
        },
        size: 140,
        minSize: 120,
        maxSize: 180,
      },
      {
        id: 'actions',
        enableHiding: false,
        size: 60,
        minSize: 60,
        maxSize: 60,
        cell: ({ row }) => {
          const fileItem = row.original

          const handleOpen = async () => {
            if (fileItem.file_type === 'folder') {
              navigateToPath(fileItem.path)
            } else {
              // Open file with default application
              try {
                const result = await invoke<string>('open_file_with_default_app', { filePath: fileItem.path })
                toast.success(result)
              } catch (error) {
                toast.error(`Failed to open file: ${error}`)
              }
            }
          }

          const handleRename = async () => {
            const newName = prompt('Enter new name:', fileItem.name)
            if (!newName || newName.trim() === '' || newName === fileItem.name) return

            try {
              await invoke('rename_item', {
                oldPath: fileItem.path,
                newName: newName.trim(),
              })
              await handleRefresh()
            } catch (error) {
              toast.error(`Failed to rename: ${error}`)
            }
          }

          const handleDelete = async () => {
            try {
              await invoke('trash_items', { paths: [fileItem.path] })
              toast.success(`Moved "${fileItem.name}" to trash`)
              await handleRefresh()
            } catch (error) {
              toast.error(`Failed to move to trash: ${error}`)
            }
          }

          const handleCopyPath = () => {
            navigator.clipboard
              .writeText(fileItem.path)
              .then(() => toast.success('Path copied to clipboard'))
              .catch(() => toast.error('Failed to copy path'))
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleOpen}>
                  {fileItem.file_type === 'folder' ? 'Open Folder' : 'Open File'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyPath}>Copy Path</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(fileItem.name)}>
                  Copy Name
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
                <DropdownMenuItem>Properties</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [
      // Dependencies: only recreate columns if these change
      navigateToPath,
      handleRefresh,
      setLastSelectedIndex,
      lastSelectedIndex,
      rowSelection,
      setRowSelection,
    ],
  )

  // Compute parent path for ".." entry
  const parentPath = React.useMemo(() => {
    if (!currentPath || currentPath === '/') return null
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length <= 1) return '/'
    return '/' + parts.slice(0, -1).join('/')
  }, [currentPath])

  // Create parent directory entry for navigation
  const parentDirEntry: FileItem | null = React.useMemo(() => {
    if (!parentPath) return null
    return {
      id: '__parent__',
      name: '..',
      file_type: 'folder' as const,
      size: null,
      date_modified: '',
      extension: null,
      path: parentPath,
    }
  }, [parentPath])

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = React.useMemo(() => {
    const filtered = showDotfiles ? data : data.filter((item) => !item.name.startsWith('.'))
    // Add parent directory entry at the beginning if not at root
    if (parentDirEntry) {
      return [parentDirEntry, ...filtered]
    }
    return filtered
  }, [data, showDotfiles, parentDirEntry])

  // Separate selection states for each view mode
  const [tableSelection, setTableSelection] = React.useState<RowSelectionState>({})
  // Handle items deleted (clear selection in all views)
  const handleItemsDeleted = () => {
    setTableSelection({})
    setGridSelection({})
    setTreeSelection({})
    setColumnSelection({})
  }
  const [gridSelection, setGridSelection] = React.useState<RowSelectionState>({})
  const [treeSelection, setTreeSelection] = React.useState<RowSelectionState>({})
  const [columnSelection, setColumnSelection] = React.useState<RowSelectionState>({})

  // Determine which selection state to use for the table instance
  // Note: Tree and Column views will manage their own selection state manually,
  // but Table and Grid views rely on the table instance.
  const currentSelection = React.useMemo(() => {
    switch (effectiveLayoutMode) {
      case 'table':
        return tableSelection
      case 'grid':
        return gridSelection
      default:
        return {}
    }
  }, [effectiveLayoutMode, tableSelection, gridSelection])

  const onSelectionChange = React.useCallback(
    (updaterOrValue: any) => {
      const newSelection = typeof updaterOrValue === 'function' ? updaterOrValue(currentSelection) : updaterOrValue

      switch (effectiveLayoutMode) {
        case 'table':
          setTableSelection(newSelection)
          break
        case 'grid':
          setGridSelection(newSelection)
          break
        // Tree and Column views handle their own selection via props
      }
    },
    [effectiveLayoutMode, currentSelection],
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: onSelectionChange,
    state: {
      sorting,
      rowSelection: currentSelection,
    },
    enableRowSelection: true,
  })

  // Keyboard shortcuts (macOS Finder-style)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      const rows = table.getRowModel().rows
      const selectedRows = table.getSelectedRowModel().rows
      const firstSelectedIndex = selectedRows.length > 0 ? selectedRows[0].index : -1

      // Cmd+Ctrl+ArrowLeft - Previous Tab
      if (((isMac && e.metaKey && e.ctrlKey) || (!isMac && e.ctrlKey && e.altKey)) && e.key === 'ArrowLeft') {
        e.preventDefault()
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].id)
        }
        return
      }

      // Cmd+Ctrl+ArrowRight - Next Tab
      if (((isMac && e.metaKey && e.ctrlKey) || (!isMac && e.ctrlKey && e.altKey)) && e.key === 'ArrowRight') {
        e.preventDefault()
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].id)
        }
        return
      }

      // Cmd+ArrowLeft - Back in history
      if (cmdOrCtrl && !e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        if (canNavigateBack(activeTabId)) {
          navigateBack()
        }
        return
      }

      // Cmd+ArrowRight - Forward in history
      if (cmdOrCtrl && !e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault()
        if (canNavigateForward(activeTabId)) {
          navigateForward()
        }
        return
      }

      // Arrow Up - Navigate to previous item
      if (e.key === 'ArrowUp' && !e.shiftKey && !cmdOrCtrl) {
        e.preventDefault()
        if (rows.length === 0) return

        const currentIndex = firstSelectedIndex >= 0 ? firstSelectedIndex : 0
        const prevIndex = Math.max(0, currentIndex - 1)

        setRowSelection({ [prevIndex]: true })
        setLastSelectedIndex(prevIndex)

        const item = rows[prevIndex].original
        if (previewEnabled && item.file_type !== 'folder') {
          setActiveItem(item)
        }
      }

      // Arrow Down - Navigate to next item
      else if (e.key === 'ArrowDown' && !e.shiftKey) {
        e.preventDefault()
        if (rows.length === 0) return

        const currentIndex = firstSelectedIndex >= 0 ? firstSelectedIndex : -1
        const nextIndex = Math.min(rows.length - 1, currentIndex + 1)

        setRowSelection({ [nextIndex]: true })
        setLastSelectedIndex(nextIndex)

        const item = rows[nextIndex].original
        if (previewEnabled && item.file_type !== 'folder') {
          setActiveItem(item)
        }
      }

      // Arrow Right - Enter folder
      else if (e.key === 'ArrowRight' && !cmdOrCtrl) {
        e.preventDefault()
        if (selectedRows.length === 1) {
          const item = selectedRows[0].original
          if (item.file_type === 'folder') {
            navigateToPath(item.path)
          }
        }
      }

      // Arrow Left - Go to parent folder
      else if (e.key === 'ArrowLeft' && !cmdOrCtrl) {
        e.preventDefault()
        if (currentPath) {
          const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
          navigateToPath(parentPath)
        }
      }

      // Space - Toggle preview
      else if (e.key === ' ' && !cmdOrCtrl) {
        e.preventDefault()
        if (selectedRows.length === 1) {
          const item = selectedRows[0].original
          if (item.file_type !== 'folder') {
            setActiveItem(activeItem?.path === item.path ? null : item)
          }
        }
      }

      // Enter - Open file/folder
      else if (e.key === 'Enter' && !cmdOrCtrl) {
        e.preventDefault()
        if (selectedRows.length === 1) {
          handleItemDoubleClick(selectedRows[0].original)
        }
      }

      // Cmd+O or Cmd+Down - Open file
      else if (cmdOrCtrl && (e.key === 'o' || e.key === 'ArrowDown')) {
        e.preventDefault()
        if (selectedRows.length === 1) {
          handleItemDoubleClick(selectedRows[0].original)
        }
      }

      // Cmd+Up - Go to parent folder
      else if (cmdOrCtrl && e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentPath) {
          const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
          navigateToPath(parentPath)
        }
      }

      // Cmd+[ - Back
      else if (cmdOrCtrl && e.key === '[') {
        e.preventDefault()
        if (canNavigateBack(activeTabId)) {
          navigateBack()
        }
      }

      // Cmd+] - Forward
      else if (cmdOrCtrl && e.key === ']') {
        e.preventDefault()
        if (canNavigateForward(activeTabId)) {
          navigateForward()
        }
      }

      // Cmd+A - Select all
      else if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault()
        table.toggleAllRowsSelected(true)
      }

      // Cmd+Delete - Move selected items to trash immediately (no confirmation)
      else if (cmdOrCtrl && e.key === 'Backspace') {
        e.preventDefault()
        const selectedPaths = getTableSelectedPaths()
        if (selectedPaths.length > 0) {
          void trashPaths(selectedPaths)
        }
      }

      // Delete alone - Show confirmation dialog before moving to trash
      else if (e.key === 'Backspace' && !cmdOrCtrl) {
        e.preventDefault()
        const selectedPaths = getTableSelectedPaths()
        if (selectedPaths.length > 0) {
          setPathsToDelete(selectedPaths)
          setDeleteDialogOpen(true)
        }
      }

      // Escape - Deselect all
      else if (e.key === 'Escape') {
        e.preventDefault()
        setTableSelection({})
        setGridSelection({})
        setTreeSelection({})
        setColumnSelection({})
        setActiveItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    table,
    activeItem,
    previewEnabled,
    currentPath,
    activeTabId,
    canNavigateBack,
    canNavigateForward,
    navigateBack,
    navigateForward,
    navigateToPath,
    handleItemDoubleClick,
    getTableSelectedPaths,
    tabs,
    setActiveTab,
  ])

  // Virtual scrolling setup
  const parentRef = React.useRef<HTMLDivElement>(null)

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Increased row height for better spacing
    overscan: 10,
  })

  // Render table view with context menus
  const renderTableView = () => (
    <div className="flex-1 overflow-hidden flex flex-col select-none">
      <div className="w-full border-b border-border">
        <div className="w-full">
          <table className="w-full table-fixed caption-bottom text-sm">
            <colgroup>
              {table.getVisibleFlatColumns().map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan} className="bg-card">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </table>
        </div>
      </div>
      {/* Plain div required here — TanStack Virtual needs the actual scrollable element (overflow:auto).
          Radix ScrollArea's Root has overflow:hidden; attaching parentRef to it caused the virtualizer
          and Radix's internal ResizeObserver to fight each other, hitting React's 50-update limit (#185). */}
      <div className="flex-1 w-full h-0 overflow-auto" ref={parentRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}>
          <table className="w-full table-fixed caption-bottom text-sm">
            <colgroup>
              {table.getVisibleFlatColumns().map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
            <TableBody>
              {rows.length ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  const fileItem = row.original
                  const isParentEntry = fileItem.id === '__parent__'

                  return (
                    <ContextMenu key={row.id}>
                      <ContextMenuTrigger asChild disabled={isParentEntry}>
                        <TableRow
                          data-state={!isParentEntry && row.getIsSelected() && 'selected'}
                          draggable={!isParentEntry}
                          onDragStart={(e) => {
                            if (isParentEntry) {
                              e.preventDefault()
                              return
                            }
                            const selectedRows = table.getSelectedRowModel().rows
                            const items =
                              selectedRows.length > 0 && selectedRows.some((r) => r.original.path === fileItem.path)
                                ? selectedRows.map((r) => r.original)
                                : [fileItem]
                            tableHandleDragStart(e, items)
                          }}
                          onDragEnd={tableHandleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            tableHandleDragOver(e, fileItem.file_type === 'folder' ? fileItem : null)
                          }}
                          onDragLeave={tableHandleDragLeave}
                          onDrop={
                            fileItem.file_type === 'folder'
                              ? (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  tableHandleDrop(e, fileItem)
                                }
                              : undefined
                          }
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                          }}
                          onClick={(e) => {
                            // Parent entry: just navigate on click
                            if (isParentEntry) {
                              navigateToPath(fileItem.path)
                              return
                            }

                            if (previewEnabled && fileItem.file_type !== 'folder') {
                              setActiveItem(fileItem)
                            }

                            // Handle shift+click for range selection
                            if (e.shiftKey && lastSelectedIndex !== null) {
                              // Prevent text selection
                              window.getSelection()?.removeAllRanges()

                              const currentIndex = row.index
                              const start = Math.min(lastSelectedIndex, currentIndex)
                              const end = Math.max(lastSelectedIndex, currentIndex)

                              // Get current selection and merge with range
                              const newSelection: Record<string, boolean> = {
                                ...tableSelection,
                              }
                              for (let i = start; i <= end; i++) {
                                newSelection[i.toString()] = true
                              }
                              setTableSelection(newSelection)
                              setLastSelectedIndex(currentIndex)
                            } else {
                              const allowMultiSelect = e.metaKey || e.ctrlKey

                              if (!allowMultiSelect) {
                                table.resetRowSelection()
                                row.toggleSelected(true)
                              } else {
                                row.toggleSelected()
                              }
                            }

                            setLastSelectedIndex(row.index)
                          }}
                          onDoubleClick={() => handleItemDoubleClick(fileItem)}
                          className={cn(
                            'cursor-pointer transition-all! duration-150!',
                            // Parent entry styling
                            isParentEntry && 'text-muted-foreground',
                            // Drop target highlight
                            tableDropTargetPath === fileItem.path &&
                              fileItem.file_type === 'folder' &&
                              'ring-2 ring-primary bg-primary/20',
                            // Being dragged (not applicable to parent entry)
                            !isParentEntry &&
                              tableDraggedItems.some((item) => item.path === fileItem.path) &&
                              'opacity-50',
                            // Valid drop targets (folders) when dragging
                            tableIsDragging &&
                              fileItem.file_type === 'folder' &&
                              tableDropTargetPath !== fileItem.path &&
                              !tableDraggedItems.some((item) => item.path === fileItem.path) &&
                              'ring-1 ring-primary/30 bg-primary/5',
                          )}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="hover:bg-transparent">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      </ContextMenuTrigger>
                      {!isParentEntry && (
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleItemDoubleClick(fileItem)}>
                            {fileItem.file_type === 'folder' ? 'Open' : 'Open'}
                          </ContextMenuItem>
                          {fileItem.file_type === 'folder' && (
                            <ContextMenuItem onClick={() => openFolderInNewTab(fileItem.path)}>
                              <PanelsTopLeft className="h-4 w-4 mr-2" />
                              Open in New Tab
                            </ContextMenuItem>
                          )}
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() =>
                              invoke('reveal_in_finder', { path: fileItem.path })
                                .then(() => toast.success('Revealed in Finder'))
                                .catch((error) => toast.error(`Failed to reveal: ${error}`))
                            }>
                            Reveal in Finder
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => {
                              navigator.clipboard
                                .writeText(fileItem.path)
                                .then(() => toast.success('Path copied'))
                                .catch(() => toast.error('Failed to copy path'))
                            }}>
                            Copy Path
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => {
                              invoke('trash_items', {
                                paths: [fileItem.path],
                              })
                                .then(async () => {
                                  toast.success(`Moved "${fileItem.name}" to trash`)
                                  await handleRefresh()
                                })
                                .catch((error) => toast.error(`Failed to move to trash: ${error}`))
                            }}>
                            Move to Trash
                          </ContextMenuItem>
                        </ContextMenuContent>
                      )}
                    </ContextMenu>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center hover:bg-transparent">
                    {loading ? 'Loading...' : 'No files found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  )

  const handlePreviewRename = async (newName: string) => {
    if (!activeItem) return

    try {
      await invoke('rename_item', {
        oldPath: activeItem.path,
        newName: newName,
      })

      // Optimistic update
      const separator = activeItem.path.includes('\\') ? '\\' : '/'
      const lastIndex = activeItem.path.lastIndexOf(separator)
      const newPath = activeItem.path.substring(0, lastIndex + 1) + newName
      const newExtension = getEffectiveExtension(newName)

      //
      const updatedItem = {
        ...activeItem,
        name: newName,
        path: newPath,
        extension: newExtension,
      }

      setActiveItem(updatedItem)
      toast.success(`Renamed to ${newName}`)
      await handleRefresh()
    } catch (error) {
      toast.error(`Failed to rename: ${error}`)
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title Bar with Tabs - Only show in Files app */}
      {activeApp === 'files' && (
        <TitleBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTab}
          onTabClose={removeTab}
          onNewTab={() => addTab(undefined, { position: 'end' })}
          onReorderTabs={reorderTabs}
          onTabRename={(tabId, newTitle) => updateTab(tabId, { title: newTitle })}
          onTabIconChange={(tabId, newIcon) => updateTab(tabId, { icon: newIcon })}
        />
      )}

      {/* Navigation controls - Only show in Files app */}
      {activeApp === 'files' && (
        <div className="bg-red-500/0 px-3">
          {/* Navigation Bar */}
          <NavigationBar
            currentPath={pathInput}
            onPathChange={setPathInput}
            onNavigate={navigateToPath}
            onNavigateBack={navigateBack}
            onNavigateForward={navigateForward}
            onNavigateHome={navigateHome}
            canNavigateBack={canNavigateBack(activeTabId)}
            canNavigateForward={canNavigateForward(activeTabId)}
            loading={loading}
            selectedItems={getTableSelectedPaths()}
            onRefresh={handleRefresh}
            onItemsDeleted={handleItemsDeleted}
            fileExplorerVisible={showFileExplorer}
            onToggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
          />
        </div>
      )}

      {/* Main Content Area - with app transitions */}
      <AnimatePresence mode="wait">
        {activeApp === 'files' ? (
          /* Files App: Resizable Split Layout */
          <motion.div
            key="files-app"
            className="flex-1 overflow-hidden"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={appTransition}>
            <ResizablePanelGroup
              key={`panel-${effectiveLayoutMode}-${showFileExplorer ? 'with-explorer' : 'no-explorer'}`}
              direction="horizontal"
              className="flex px-3 h-full">
              {/* File Explorer Panel */}
              {showFileExplorer && (
                <ResizablePanel
                  ref={fileExplorerPanelRef}
                  defaultSize={effectiveLayoutMode === 'tree' ? 25 : 50}
                  minSize={5}
                  maxSize={95}
                  collapsible
                  collapsedSize={0}
                  className={cn(
                    'flex flex-col pr-0 overflow-hidden',
                    !isDragging && 'transition-all duration-300 ease-in-out',
                  )}
                  onResize={(size) => {
                    if (size > 0) {
                      explorerSizeRef.current = size
                    }
                  }}>
                  {/* Toolbar */}
                  <Toolbar
                    ref={toolbarRef}
                    className=""
                    layoutMode={effectiveLayoutMode}
                    onLayoutModeChange={(mode) => {
                      setLayoutMode(mode)
                      if (activeTabId) {
                        setTabViewMode(activeTabId, mode)
                      }
                    }}
                    searchValue={searchValue}
                    onSearchChange={(value: string) => {
                      setSearchValue(value)
                      table.getColumn('name')?.setFilterValue(value)
                    }}
                    currentPath={currentPath || ''}
                    onRefresh={handleRefresh}
                  />

                  <div className="h-full flex justify-between bg-red-500/0 gap-3">
                    {/* Show mini calendar in calendar mode, otherwise show file views */}
                    {isCalendarMode ? (
                      <CalendarSidebarContent />
                    ) : (
                      <FileViewContainer
                        key={viewRefreshKey}
                        layoutMode={effectiveLayoutMode}
                        table={table}
                        currentPath={currentPath}
                        activeItem={activeItem}
                        previewEnabled={previewEnabled}
                        showDotfiles={showDotfiles}
                        searchValue={searchValue}
                        onNavigate={navigateToPath}
                        onFileSelect={setActiveItem}
                        onItemDoubleClick={handleItemDoubleClick}
                        onOpenInNewTab={(item) => {
                          if (item.file_type === 'folder') {
                            openFolderInNewTab(item.path)
                          }
                        }}
                        onCopyItem={handleCopyItem}
                        onCutItem={handleCutItem}
                        onDeleteItem={handleDeleteItem}
                        onCreateFile={openNewFileDialog}
                        onCreateFolder={openNewFolderDialog}
                        renderTableView={renderTableView}
                        className={previewEnabled ? 'border-b border-border/50' : ''}
                        rootPath={vaultPath || homeDir}
                        gridSelection={gridSelection}
                        onGridSelectionChange={setGridSelection}
                        treeSelection={treeSelection}
                        onTreeSelectionChange={setTreeSelection}
                        columnSelection={columnSelection}
                        onColumnSelectionChange={setColumnSelection}
                      />
                    )}
                  </div>
                </ResizablePanel>
              )}

              {/* Preview / Empty Panel */}
              {showFileExplorer && shouldRenderSecondaryPanel && (
                <ResizableHandle className="mx-[5px]" onDragging={setIsDragging} />
              )}

              {shouldRenderSecondaryPanel && (
                <ResizablePanel
                  defaultSize={showFileExplorer ? (effectiveLayoutMode === 'tree' ? 75 : 50) : 100}
                  minSize={5}
                  maxSize={95}
                  className={cn(!isDragging && 'transition-all duration-300 ease-in-out')}>
                  {shouldShowPreviewPanel ? (
                    <PreviewPane
                      activeItem={activeItem}
                      webPreviewUrl={webPreviewUrl}
                      onRename={handlePreviewRename}
                      onClose={() => {
                        setActiveItem(null)
                        setWebPreviewUrl(null)
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3 text-sm text-muted-foreground">
                        <p>File explorer is hidden.</p>
                        <Button variant="outline" size="sm" onClick={() => setShowFileExplorer(true)}>
                          Show file explorer
                        </Button>
                      </div>
                    </div>
                  )}
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          </motion.div>
        ) : (
          /* Other Apps: Full-screen app view */
          <motion.div
            key={activeApp}
            className={cn('flex-1 overflow-hidden', activeApp === 'home' ? '' : 'p-3')}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={appTransition}>
            <AppContent app={activeApp} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Bar removed - app switching now in AppRail, canvas tools in HomeCanvas */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Move to Trash?</DialogTitle>
            <DialogDescription>
              {pathsToDelete.length === 1
                ? `Are you sure you want to move "${pathsToDelete[0]?.split('/').pop()}" to trash?`
                : `Are you sure you want to move ${pathsToDelete.length} items to trash?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                void trashPaths(pathsToDelete)
                setPathsToDelete([])
              }}>
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrap in React.memo to prevent unnecessary re-renders
// Component has no props, so comparison function not needed
export const FileStructure = React.memo(FileStructureComponent)
