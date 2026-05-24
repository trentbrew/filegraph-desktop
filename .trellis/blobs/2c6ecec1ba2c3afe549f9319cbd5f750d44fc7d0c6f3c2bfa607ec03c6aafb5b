import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { ScrollArea } from '@/components/ui/scroll-area'

import { ChevronRight } from 'lucide-react'
import { FileItem } from './fileStructure'
import { getFileIcon } from '@/lib/fileIcons'
import { FileContextMenu } from './FileContextMenu'
import { cn } from '@/lib/utils'
import { useFileDragDrop } from '@/hooks/useFileDragDrop'

interface ColumnViewProps {
  currentPath: string
  onNavigate: (path: string) => void
  onFileSelect: (file: FileItem) => void
  onItemDoubleClick: (item: FileItem) => void
  activeItem: FileItem | null
  showDotfiles: boolean
  searchValue?: string
  table: TanstackTable<FileItem>
  onCopyItem: (item: FileItem) => void
  onCutItem: (item: FileItem) => void
  onDeleteItem: (item: FileItem) => void
  rootPath?: string | null
  selection?: Record<string, boolean>
  onSelectionChange?: (selection: Record<string, boolean>) => void
  onOpenInNewTab?: (item: FileItem) => void
  onRefresh?: () => void
}

interface Column {
  path: string
  items: FileItem[]
  selectedItem: FileItem | null
}

export function ColumnView({
  currentPath,
  onNavigate,
  onFileSelect,
  onItemDoubleClick,
  activeItem,
  showDotfiles,
  searchValue = '',
  table,
  onCopyItem,
  onCutItem,
  onDeleteItem,
  rootPath,
  selection = {},
  onSelectionChange = () => {},
  onOpenInNewTab,
  onRefresh,
}: ColumnViewProps) {
  const [columns, setColumns] = React.useState<Column[]>([])
  const [loading, setLoading] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [columnWidths, setColumnWidths] = React.useState<number[]>([])
  const [resizingIndex, setResizingIndex] = React.useState<number | null>(null)

  // Drag & drop state
  const {
    draggedItems,
    isDragging,
    dropTargetPath,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileDragDrop({ onMoveComplete: onRefresh })

  // Get selected items for drag operations
  const getSelectedItems = React.useCallback((): FileItem[] => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length > 0) {
      return selectedRows.map((row) => row.original)
    }
    return []
  }, [table])

  // Build column hierarchy from current path
  React.useEffect(() => {
    const buildColumns = async () => {
      setLoading(true)
      try {
        // Determine the starting path (root of the column view)
        let basePath = '/'
        // If rootPath is provided and currentPath is inside it, start from rootPath
        if (rootPath && currentPath.startsWith(rootPath)) {
          basePath = rootPath
        }

        // Calculate relative path parts from basePath
        let relativePath = currentPath
        if (basePath !== '/') {
          // Remove basePath from start of currentPath
          // e.g. /Users/me/Project/src -> /src (if base is /Users/me/Project)
          relativePath = currentPath.slice(basePath.length)
        }

        const pathParts = relativePath.split('/').filter(Boolean)
        const newColumns: Column[] = []

        // Start building from basePath
        let currentLevelPath = basePath

        // Iterate once for the base path itself, plus for each relative part
        for (let i = 0; i <= pathParts.length; i++) {
          const items = await invoke<FileItem[]>('list_directory', {
            path: currentLevelPath,
          })

          let filteredItems = showDotfiles ? items : items.filter((item) => !item.name.startsWith('.'))

          // Apply search filter
          if (searchValue) {
            filteredItems = filteredItems.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()))
          }

          // Sort: folders first, then files
          filteredItems.sort((a, b) => {
            if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
            if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
            return a.name.localeCompare(b.name)
          })

          const selectedName = i < pathParts.length ? pathParts[i] : null
          const selectedItem = selectedName ? filteredItems.find((item) => item.name === selectedName) || null : null

          newColumns.push({
            path: currentLevelPath,
            items: filteredItems,
            selectedItem,
          })

          if (i < pathParts.length) {
            currentLevelPath = currentLevelPath === '/' ? `/${pathParts[i]}` : `${currentLevelPath}/${pathParts[i]}`
          }
        }

        setColumns(newColumns)
        // Initialize widths for new columns, preserve existing where possible
        setColumnWidths((prev) => newColumns.map((_, i) => (typeof prev[i] === 'number' ? prev[i] : 256)))
      } catch (error) {
        console.error('Failed to build columns:', error)
      } finally {
        setLoading(false)
      }
    }

    if (currentPath) {
      buildColumns()
    }
  }, [currentPath, showDotfiles, searchValue, rootPath])

  // Auto-scroll to the right when columns change
  React.useEffect(() => {
    if (scrollContainerRef.current && columns.length > 0) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth',
      })
    }
  }, [columns])

  const startResize = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths[index] ?? 256
    setResizingIndex(index)

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const next = Math.max(180, Math.min(600, startWidth + delta))
      setColumnWidths((prev) => {
        const arr = [...prev]
        arr[index] = next
        return arr
      })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setResizingIndex(null)
      // Avoid text selection issues after resize
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    // Improve UX during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleItemClick = (item: FileItem) => {
    if (item.file_type === 'folder') {
      // Navigate to the folder
      onNavigate(item.path)
    } else {
      // Select the file for preview
      onFileSelect(item)
    }
  }

  const handleItemDoubleClick = (item: FileItem) => {
    onItemDoubleClick(item)
  }

  // Helper to find row for a given file path
  const getRowByPath = (filePath: string) => {
    return table.getRowModel().rows.find((row) => row.original.path === filePath)
  }

  // Helper to check if a node is selected
  const isNodeSelected = (path: string) => {
    // Find the row index for this path if possible, or just use path string matching
    // Since we're using path-based selection in the parent now (via rowSelection state which keys by index usually)
    // Wait, rowSelection in tanstack table is usually by row index.
    // But our parent component is managing it.
    // Let's see how we set it.
    // In fileStructure.tsx we set it using row.index.toString().
    // Here we don't easily have the row index without the table.
    // But we DO have the table prop still.
    // So we can find the row by path and check if its index is in the selection object.

    const row = getRowByPath(path)
    if (!row) return false
    return !!selection[row.index.toString()]
  }

  const handleSelectionChange = (item: FileItem, checked: boolean) => {
    const row = getRowByPath(item.path)
    if (row) {
      const newSelection = { ...selection }
      if (checked) {
        newSelection[row.index.toString()] = true
      } else {
        delete newSelection[row.index.toString()]
      }
      onSelectionChange(newSelection)
    }
  }

  if (loading && columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 flex overflow-x-auto overflow-y-hidden">
      {columns.map((column, columnIndex) => (
        <React.Fragment key={columnIndex}>
          <div
            className="shrink-0 border-r border-border/50 flex flex-col min-w-[180px]"
            style={{ width: `${columnWidths[columnIndex] ?? 256}px` }}>
            {/* Column Header */}
            <div className="shrink-0 border-b border-border/50 px-3 py-2 bg-muted/30">
              <p className="text-xs font-medium truncate" title={column.path}>
                {column.path === '/' ? 'Root' : column.path.split('/').pop()}
              </p>
            </div>

            {/* Column Items */}
            <ScrollArea className="flex-1 h-0 max-w-full ">
              <div className="p-1">
                {column.items.map((item, itemIndex) => {
                  const isSelected = column.selectedItem?.path === item.path
                  const isActive = activeItem?.path === item.path
                  const isDotfile = item.name.startsWith('.')
                  const isRowSelected = isNodeSelected(item.path)
                  const isFolder = item.file_type === 'folder'
                  const isDropTarget = dropTargetPath === item.path && isFolder
                  const isBeingDragged = isDragging && draggedItems.some((d) => d.path === item.path)

                  return (
                    <FileContextMenu
                      key={itemIndex}
                      fileItem={item}
                      isSelected={isRowSelected}
                      onOpen={() => handleItemDoubleClick(item)}
                      onCopy={() => onCopyItem(item)}
                      onCut={() => onCutItem(item)}
                      onDelete={() => onDeleteItem(item)}
                      onOpenInNewTab={isFolder ? () => onOpenInNewTab?.(item) : undefined}>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer min-w-0 transition-all duration-150 group',
                          // Base states
                          isRowSelected
                            ? 'bg-primary/10'
                            : isActive
                              ? 'bg-primary/15'
                              : isSelected
                                ? 'bg-accent/40'
                                : 'hover:bg-accent/20',
                          isDotfile && 'opacity-50',
                          // Dragging state
                          isBeingDragged && 'opacity-50 scale-95',
                          // Drop target states
                          isDropTarget && 'ring-2 ring-primary bg-primary/20 scale-[1.02] shadow-md',
                          // Highlight all valid drop targets when dragging
                          isDragging &&
                            isFolder &&
                            !isDropTarget &&
                            !isBeingDragged &&
                            'ring-1 ring-primary/30 bg-primary/5',
                        )}
                        draggable
                        onDragStart={(e) => {
                          const selected = getSelectedItems()
                          const items =
                            selected.length > 0 && selected.some((s) => s.path === item.path) ? selected : [item]
                          handleDragStart(e, items)
                        }}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, isFolder ? item : null)}
                        onDragLeave={handleDragLeave}
                        onDrop={isFolder ? (e) => handleDrop(e, item) : undefined}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectionChange(item, !isRowSelected)
                        }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleItemClick(item)
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            handleItemDoubleClick(item)
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={cn('shrink-0 transition-transform', isDropTarget && 'scale-110')}>
                            {getFileIcon(item.file_type, item.extension)}
                          </div>
                          <span
                            className={cn(
                              'text-xs truncate flex-1 min-w-0',
                              isDropTarget && 'font-medium text-primary',
                            )}
                            title={item.name}>
                            {item.name}
                          </span>
                          {isDropTarget ? (
                            <span className="text-[10px] text-primary font-medium animate-pulse shrink-0">Drop</span>
                          ) : isFolder ? (
                            <ChevronRight
                              className={cn(
                                'h-3 w-3 shrink-0',
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
                              )}
                            />
                          ) : null}
                        </div>
                      </div>
                    </FileContextMenu>
                  )
                })}
                {column.items.length === 0 && (
                  <div className="text-center text-muted-foreground p-4">
                    <p className="text-xs">Empty folder</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Resize handle - not shown after last column */}
          {columnIndex < columns.length - 1 && (
            <div
              onMouseDown={(e) => startResize(columnIndex, e)}
              className={`w-[3px] cursor-col-resize hover:bg-primary/40 active:bg-primary/60 ${
                resizingIndex === columnIndex ? 'bg-primary/60' : 'bg-transparent'
              }`}
              style={{ userSelect: 'none' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
