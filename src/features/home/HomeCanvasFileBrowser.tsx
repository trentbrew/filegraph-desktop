import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import { useHomeCanvasStore } from './useHomeCanvasStore'
import { useTabStore } from '@/stores/useTabStore'
import type { FileItem } from '@/components/app/fileStructure'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TreeView } from '@/components/app/treeView'
import { ColumnView } from '@/components/app/columnView'
import { GridItem } from '@/components/app/gridItem'
import { NAMESPACES, NAMESPACE_LABELS } from '@/lib/namespaces'
import { getFileIcon } from '@/lib/fileIcons'
import { buildSelectionState } from '@/lib/utils/selection'
import { useFileDragDrop } from '@/hooks/useFileDragDrop'
import { useFileStore } from '@/stores/useFileStore'
import { getCoreRowModel, type ColumnDef, type RowSelectionState, useReactTable } from '@tanstack/react-table'
import {
  ArrowLeft,
  Columns3,
  Download,
  FileText,
  Folder,
  FolderTree,
  Home,
  Image,
  LayoutGrid,
  List,
  Music,
  Pin,
  RefreshCw,
  Search,
  Video,
  X as XIcon,
} from 'lucide-react'

type HomeCanvasBrowserView = 'tree' | 'grid' | 'columns' | 'namespaces'

interface NamespacesViewProps {
  vaultPath: string
  searchValue: string
}

function NamespacesView({ vaultPath, searchValue }: NamespacesViewProps) {
  const { homeCanvasNamespaceTileClickBehavior } = useUIStore()
  const { addFileNode } = useHomeCanvasStore()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)
  const { handleDragStart, handleDragEnd, isDragging, draggedItems } = useFileDragDrop()

  const ensuredNamespacesRef = React.useRef(false)

  React.useEffect(() => {
    if (!vaultPath) return
    if (ensuredNamespacesRef.current) return
    ensuredNamespacesRef.current = true

    const ensureNamespaces = async () => {
      const ensureDir = async (absoluteDirPath: string) => {
        try {
          await invoke('create_directory', { path: absoluteDirPath })
        } catch {
          // ignore
        }
      }

      const ensureDataFile = async (absoluteFilePath: string) => {
        const parts = absoluteFilePath.split('/').filter(Boolean)
        if (parts.length === 0) return

        const fileName = parts[parts.length - 1]
        const parentPath = '/' + parts.slice(0, -1).join('/')

        await ensureDir(parentPath)

        try {
          await invoke('create_file', { path: parentPath, name: fileName })
          await invoke('write_text_file', { filePath: absoluteFilePath, content: '[]\n' })
        } catch {
          // ignore if already exists
        }
      }

      for (const config of Object.values(NAMESPACES)) {
        const relPath = config.file
        const absolutePath = `${vaultPath}/${relPath}`

        if (relPath.endsWith('.data')) {
          await ensureDataFile(absolutePath)
        } else {
          await ensureDir(absolutePath)
        }
      }
    }

    void ensureNamespaces()
  }, [vaultPath])

  const groupedNamespaces = React.useMemo(() => {
    const groups: Record<string, Array<{ key: string; config: { file: string; label: string } }>> = {}
    for (const [key, config] of Object.entries(NAMESPACES)) {
      if (searchValue && !config.label.toLowerCase().includes(searchValue.toLowerCase())) {
        continue
      }
      const dir = config.file.split('/')[0]
      if (!groups[dir]) groups[dir] = []
      groups[dir].push({ key, config })
    }

    for (const dir of Object.keys(groups)) {
      groups[dir].sort((a, b) => a.config.label.localeCompare(b.config.label))
    }
    return groups
  }, [])

  const dirs = React.useMemo(() => Object.keys(groupedNamespaces).sort(), [groupedNamespaces])

  const handleTileClick = React.useCallback(
    async (namespace: string, file: string) => {
      const fullPath = `${vaultPath}/${file}`
      const fileName = file.split('/').pop() || file
      const extension = fileName.includes('.') ? fileName.split('.').pop() : null

      const fileItem: FileItem = {
        id: fullPath,
        name: fileName,
        file_type: 'file',
        size: null,
        date_modified: new Date().toISOString(),
        extension: extension || null,
        path: fullPath,
      }

      if (homeCanvasNamespaceTileClickBehavior === 'add_to_canvas') {
        const position = { x: 0, y: 0 }
        addFileNode(fullPath, position)
        toast.success(`Added ${NAMESPACE_LABELS[namespace]} to canvas`)
      } else {
        openEditorPinned(fileItem)
        toast.success(`Opened ${NAMESPACE_LABELS[namespace]}`)
      }
    },
    [vaultPath, homeCanvasNamespaceTileClickBehavior, addFileNode, openEditorPinned],
  )

  const handleTileDragStart = React.useCallback(
    (e: React.DragEvent, namespace: string, file: string) => {
      const fullPath = `${vaultPath}/${file}`
      const fileName = file.split('/').pop() || file
      const extension = fileName.includes('.') ? fileName.split('.').pop() : null

      const fileItem: FileItem = {
        id: fullPath,
        name: fileName,
        file_type: 'file',
        size: null,
        date_modified: new Date().toISOString(),
        extension: extension || null,
        path: fullPath,
      }

      handleDragStart(e, [fileItem])
    },
    [vaultPath, handleDragStart],
  )

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        <Accordion type="multiple" className="w-full">
          {dirs.map((dir) => {
            const items = groupedNamespaces[dir] ?? []
            return (
              <AccordionItem key={dir} value={dir} className="border rounded-md mb-2 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">{dir}</AccordionTrigger>
                <AccordionContent className="px-2">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                    {items.map(({ key, config }) => {
                      const fileName = config.file.split('/').pop() || config.file
                      const extension = fileName.includes('.') ? (fileName.split('.').pop() ?? null) : null
                      const isBeingDragged =
                        isDragging && draggedItems.some((item) => item.path === `${vaultPath}/${config.file}`)

                      return (
                        <button
                          key={key}
                          type="button"
                          draggable
                          onDragStart={(e) => handleTileDragStart(e, key, config.file)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleTileClick(key, config.file)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-150',
                            'bg-accent/25 hover:bg-accent/50 border-border/50',
                            isBeingDragged ? 'opacity-50 scale-95' : '',
                          )}
                          title={config.label}>
                          <div className="w-10 h-10 flex items-center justify-center bg-muted-foreground/15 rounded-md">
                            {getFileIcon('file', extension, 'md')}
                          </div>
                          <span className="text-[10px] text-center truncate w-full">{config.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </ScrollArea>
  )
}

function normalizeFileItems(files: FileItem[]): FileItem[] {
  return files.map((f) => {
    if (f.file_type === 'folder') return f

    const name = f.name || ''
    const dotIndex = name.lastIndexOf('.')
    const extension = dotIndex > -1 ? name.slice(dotIndex + 1).toLowerCase() : null

    return {
      ...f,
      extension,
    }
  })
}

interface UserPin {
  path: string
  label: string
}

function HomeCanvasFileBrowser({ initialRootPath }: { initialRootPath: string | null }) {
  const showDotfiles = useUIStore((s) => s.showDotfiles)
  const setFileBrowserPath = useUIStore((s) => s.setFileBrowserPath)

  const [rootPath, setRootPath] = React.useState<string>('')
  const [pathInput, setPathInput] = React.useState('')
  const [currentPath, setCurrentPath] = React.useState<string>('')
  const [view, setView] = React.useState<HomeCanvasBrowserView>('tree')
  const [searchValue, setSearchValue] = React.useState('')

  const [userHomeDir, setUserHomeDir] = React.useState<string | null>(null)
  const [userPins, setUserPins] = React.useState<UserPin[]>([])

  const [loading, setLoading] = React.useState(false)
  const [items, setItems] = React.useState<FileItem[]>([])

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const { draggedItems, isDragging, handleDragStart, handleDragEnd } = useFileDragDrop()

  React.useEffect(() => {
    setFileBrowserPath(currentPath)
  }, [currentPath, setFileBrowserPath])

  React.useEffect(() => {
    invoke<string>('get_user_home_directory')
      .then(setUserHomeDir)
      .catch(() => {
        setUserHomeDir(null)
      })
  }, [])

  // Load user pins from @system/pinned-locations.data
  React.useEffect(() => {
    if (!initialRootPath) return
    const pinsFile = `${initialRootPath}/@system/pinned-locations.data`
    invoke<{ content: string }>('read_text_file', { path: pinsFile })
      .then((res) => {
        try {
          const data = JSON.parse(res.content)
          if (Array.isArray(data.pins)) {
            setUserPins(data.pins)
          }
        } catch {
          // Invalid JSON or missing pins array
        }
      })
      .catch(() => {
        // File doesn't exist yet, that's fine
      })
  }, [initialRootPath])

  // Save user pins to @system/pinned-locations.data
  const savePins = React.useCallback(
    async (pins: UserPin[]) => {
      if (!initialRootPath) return
      const pinsFile = `${initialRootPath}/@system/pinned-locations.data`
      const data = {
        '@context': { fg: 'https://filegraph.local/' },
        '@id': 'fg:system:pinned-locations',
        '@type': 'PinnedLocations',
        description: 'User-pinned folder shortcuts for the Home canvas sidebar',
        pins,
      }
      try {
        await invoke('write_text_file', { filePath: pinsFile, content: JSON.stringify(data, null, 2) })
      } catch (err) {
        console.error('[HomeCanvasFileBrowser] Failed to save pins:', err)
      }
    },
    [initialRootPath],
  )

  const handlePinFolder = React.useCallback(
    (item: FileItem) => {
      const alreadyPinned = userPins.some((p) => p.path === item.path)
      let nextPins: UserPin[]
      if (alreadyPinned) {
        nextPins = userPins.filter((p) => p.path !== item.path)
        toast.success(`Unpinned ${item.name}`)
      } else {
        nextPins = [...userPins, { path: item.path, label: item.name }]
        toast.success(`Pinned ${item.name} to sidebar`)
      }
      setUserPins(nextPins)
      savePins(nextPins)
    },
    [userPins, savePins],
  )

  const isPinned = React.useCallback((path: string) => userPins.some((p) => p.path === path), [userPins])

  React.useEffect(() => {
    if (!initialRootPath) return
    if (rootPath) return
    setRootPath(initialRootPath)
    setCurrentPath(initialRootPath)
    setPathInput(initialRootPath)
  }, [initialRootPath, rootPath])

  // Listen for space-changed events (from switchSpace in store)
  React.useEffect(() => {
    const handleSpaceChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ spacePath: string }>).detail
      if (detail?.spacePath) {
        setRootPath(detail.spacePath)
        setCurrentPath(detail.spacePath)
        setPathInput(detail.spacePath)
        setRowSelection({})
      }
    }
    window.addEventListener('space-changed', handleSpaceChanged)
    return () => window.removeEventListener('space-changed', handleSpaceChanged)
  }, [])

  // Also react when initialRootPath changes (e.g. from prop update)
  React.useEffect(() => {
    if (!initialRootPath) return
    // Only update if the root actually changed (space switch via prop)
    if (rootPath && rootPath !== initialRootPath) {
      setRootPath(initialRootPath)
      setCurrentPath(initialRootPath)
      setPathInput(initialRootPath)
      setRowSelection({})
    }
  }, [initialRootPath])

  const places = React.useMemo(() => {
    const vault = initialRootPath
    const home = userHomeDir

    return [
      { key: 'space', label: 'Space', icon: Home, path: vault },
      { key: 'documents', label: 'Documents', icon: FileText, path: home ? `${home}/Documents` : null },
      { key: 'pictures', label: 'Pictures', icon: Image, path: home ? `${home}/Pictures` : null },
      { key: 'movies', label: 'Movies', icon: Video, path: home ? `${home}/Movies` : null },
      { key: 'music', label: 'Music', icon: Music, path: home ? `${home}/Music` : null },
      { key: 'downloads', label: 'Downloads', icon: Download, path: home ? `${home}/Downloads` : null },
    ]
  }, [initialRootPath, userHomeDir])

  const activePlaceKey = React.useMemo(() => {
    for (const place of places) {
      if (!place.path) continue
      if (currentPath === place.path || currentPath.startsWith(`${place.path}/`)) return place.key
    }
    return null
  }, [currentPath, places])

  const navigateToPlace = React.useCallback(
    (path: string | null) => {
      if (!path) return
      setView('tree')
      setRootPath(path)
      setCurrentPath(path)
      setPathInput(path)
      setRowSelection({})
    },
    [setRowSelection],
  )

  const refresh = React.useCallback(async () => {
    if (!currentPath) return
    setLoading(true)
    try {
      const files = await invoke<FileItem[]>('list_directory', { path: currentPath })
      const normalized = normalizeFileItems(files)
      const filtered = showDotfiles ? normalized : normalized.filter((f) => !f.name.startsWith('.'))
      filtered.sort((a, b) => {
        if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
        if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
        return a.name.localeCompare(b.name)
      })
      setItems(filtered)
    } catch (err) {
      console.error('[HomeCanvasFileBrowser] Failed to list directory:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPath, showDotfiles])

  React.useEffect(() => {
    if (view === 'namespaces') return
    void refresh()
  }, [refresh, view])

  // Filesystem watcher — auto-refresh sidebar when files are created/modified/removed
  React.useEffect(() => {
    if (!currentPath) return

    let unlisten: (() => void) | undefined

    const setup = async () => {
      try {
        await invoke('start_watch', { path: currentPath })

        unlisten = await listen<{ kind: string; paths: string[] }>('fs-change', (event) => {
          const kind = event.payload.kind.toLowerCase()
          const paths = event.payload.paths

          if (kind.includes('modify') || kind.includes('write')) {
            const { notifyFileChanged } = useFileStore.getState()
            paths.forEach((p) => notifyFileChanged(p))
          } else {
            void refresh()
          }
        })
      } catch (err) {
        console.error('[HomeCanvasFileBrowser] Failed to setup FS watcher:', err)
      }
    }

    void setup()

    return () => {
      unlisten?.()
      invoke('stop_watch').catch(() => {})
    }
  }, [currentPath, refresh])

  const handleGoUp = React.useCallback(() => {
    if (!currentPath) return
    if (currentPath === '/' || currentPath === rootPath) return
    const parts = currentPath.split('/').filter(Boolean)
    const next = '/' + parts.slice(0, -1).join('/')
    const nextPath = next === '/' ? '/' : next
    setCurrentPath(nextPath)
    setPathInput(nextPath)
    setRowSelection({})
  }, [currentPath, rootPath])

  const columns = React.useMemo<ColumnDef<FileItem>[]>(() => [{ accessorKey: 'name' }], [])

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  })

  const getSelectedItems = React.useCallback((): FileItem[] => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length > 0) {
      return selectedRows.map((row) => row.original)
    }
    return []
  }, [table])

  const handleFileClick = React.useCallback(
    (item: FileItem) => {
      if (item.file_type === 'folder') return
      window.dispatchEvent(
        new CustomEvent('canvas-sidebar-file-click', {
          detail: { path: item.path, name: item.name, fileType: item.file_type, extension: item.extension },
        }),
      )
    },
    [],
  )

  const handleOpen = React.useCallback(
    (item: FileItem) => {
      if (item.file_type === 'folder') {
        setCurrentPath(item.path)
        setPathInput(item.path)
        setRowSelection({})
      }
    },
    [setRowSelection],
  )

  const activePinPath = React.useMemo(() => {
    for (const pin of userPins) {
      if (currentPath === pin.path || currentPath.startsWith(`${pin.path}/`)) return pin.path
    }
    return null
  }, [currentPath, userPins])

  const filteredItems = React.useMemo(() => {
    if (!searchValue) return items
    const search = searchValue.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(search))
  }, [items, searchValue])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Search + view switcher */}
        <div className="px-2 py-1.5 border-b flex items-center gap-1">
            <div className="relative flex-1 group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 group-focus-within:text-muted-foreground transition-colors pointer-events-none" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="h-7 text-xs pl-8 pr-7 bg-muted/40 border-muted-foreground/0 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/30 transition-all rounded-lg"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          <Button
            variant={view === 'tree' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setView('tree')}
            title="List view">
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setView('grid')}
            title="Grid view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === 'columns' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setView('columns')}
            title="Columns view">
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === 'namespaces' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setView('namespaces')}
            title="Namespaces view">
            <FolderTree className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {view === 'tree' ? (
            <TreeView
              currentPath={currentPath}
              onNavigate={(path) => {
                setCurrentPath(path)
                setPathInput(path)
                setRowSelection({})
              }}
              onFileSelect={handleFileClick}
              onItemDoubleClick={handleOpen}
              activeItem={null}
              showDotfiles={showDotfiles}
              searchValue={searchValue}
              table={table}
              onCopyItem={() => {}}
              onCutItem={() => {}}
              onDeleteItem={() => {}}
              onOpenInNewTab={undefined}
              selection={rowSelection as unknown as Record<string, boolean>}
              onSelectionChange={(next) => setRowSelection(next as unknown as RowSelectionState)}
              onRefresh={refresh}
              enableInternalMoves={false}
              onPinToSidebar={handlePinFolder}
              isPinned={isPinned}
            />
          ) : view === 'grid' ? (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-2">
                {filteredItems.map((fileItem: FileItem) => {
                  const row = table.getRowModel().rows.find((r) => r.original.path === fileItem.path)
                  if (!row) return null
                  const isSelected = !!rowSelection[row.id]
                  return (
                    <GridItem
                      key={row.id}
                      fileItem={fileItem}
                      isActive={false}
                      isSelected={isSelected}
                      onClick={(e) => {
                        if (fileItem.file_type !== 'folder') {
                          handleFileClick(fileItem)
                        }
                        const nextSelection = buildSelectionState(rowSelection, row.id, !isSelected, e)
                        setRowSelection(nextSelection)
                      }}
                      onDoubleClick={() => handleOpen(fileItem)}
                      onSelectionChange={(checked) => {
                        const nextSelection = buildSelectionState(rowSelection, row.id, checked)
                        setRowSelection(nextSelection)
                      }}
                      onCopy={() => {}}
                      onCut={() => {}}
                      onDelete={() => {}}
                      draggable
                      onDragStart={(e) => {
                        const selected = getSelectedItems()
                        const itemsToDrag =
                          selected.length > 0 && selected.some((s) => s.path === fileItem.path) ? selected : [fileItem]
                        handleDragStart(e, itemsToDrag)
                      }}
                      onDragEnd={(e) => {
                        handleDragEnd()
                      }}
                      isBeingDragged={isDragging && draggedItems.some((item) => item.path === fileItem.path)}
                      isDragging={isDragging}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          ) : view === 'columns' ? (
            <ColumnView
              currentPath={currentPath}
              onNavigate={(path) => {
                setCurrentPath(path)
                setPathInput(path)
                setRowSelection({})
              }}
              onFileSelect={handleFileClick}
              onItemDoubleClick={handleOpen}
              activeItem={null}
              showDotfiles={showDotfiles}
              searchValue={searchValue}
              table={table}
              onCopyItem={() => {}}
              onCutItem={() => {}}
              onDeleteItem={() => {}}
              rootPath={rootPath}
              selection={rowSelection as unknown as Record<string, boolean>}
              onSelectionChange={(next) => setRowSelection(next as unknown as RowSelectionState)}
              onOpenInNewTab={undefined}
              onRefresh={refresh}
            />
          ) : (
            <NamespacesView vaultPath={initialRootPath ?? ''} searchValue={searchValue} />
          )}
        </div>
      </div>

      {/* Horizontal shortcut rail at bottom */}
      <div className="shrink-0 border-t bg-muted/20 flex items-center px-2 py-1.5 gap-1">
        {/* Home — left side */}
        {places.slice(0, 1).map((place) => {
          const isActive = activePlaceKey === place.key
          const IconComponent = place.icon
          return (
            <Button
              key={place.key}
              type="button"
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7 shrink-0 relative', isActive && 'text-primary')}
              onClick={() => navigateToPlace(place.path)}
              disabled={!place.path}
              title={place.label}>
              <IconComponent className="h-3.5 w-3.5" />
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Button>
          )
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Other places — right side */}
        <div className="flex items-center gap-1">
          {places.slice(1).map((place) => {
            const isActive = activePlaceKey === place.key
            const IconComponent = place.icon
            return (
              <Button
                key={place.key}
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 shrink-0 relative', isActive && 'text-primary')}
                onClick={() => navigateToPlace(place.path)}
                disabled={!place.path}
                title={place.label}>
                <IconComponent className="h-3.5 w-3.5" />
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Button>
            )
          })}

          {userPins.length > 0 && (
            <>
              <div className="h-4 w-[1.2px] bg-foreground/15 mx-0.5 shrink-0" />
              {userPins.map((pin) => {
                const isActive = activePinPath === pin.path
                return (
                  <ContextMenu key={pin.path}>
                    <ContextMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn('h-7 w-7 shrink-0 relative', isActive && 'text-primary')}
                        onClick={() => navigateToPlace(pin.path)}
                        title={pin.label}>
                        <Folder className="h-3.5 w-3.5" />
                        <Pin className="h-2 w-2 absolute top-0.5 right-0.5 text-muted-foreground" />
                        {isActive && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                        )}
                      </Button>
                    </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem
                      onClick={() => {
                        const nextPins = userPins.filter((p) => p.path !== pin.path)
                        setUserPins(nextPins)
                        savePins(nextPins)
                        toast.success(`Unpinned ${pin.label}`)
                      }}>
                      <Pin className="h-4 w-4 mr-2" />
                      Unpin
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const MemoHomeCanvasFileBrowser = React.memo(HomeCanvasFileBrowser)
