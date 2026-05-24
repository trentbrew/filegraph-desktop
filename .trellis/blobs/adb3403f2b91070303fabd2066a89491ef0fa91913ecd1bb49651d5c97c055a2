import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { ScrollArea } from '@/components/ui/scroll-area'

import { FileContextMenu } from './FileContextMenu'
import { ChevronRight, ChevronDown, FolderOpen, Loader2 } from 'lucide-react'
import { FileItem } from './fileStructure'
import { getFileIcon } from '@/lib/fileIcons'
import { FaFolder } from 'react-icons/fa'
import { buildSelectionState } from '@/lib/utils/selection'
import { cn } from '@/lib/utils'
import { useFileDragDrop, type DragData } from '@/hooks/useFileDragDrop'

interface TreeViewProps {
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
  onOpenInNewTab?: (item: FileItem) => void
  selection?: Record<string, boolean>
  onSelectionChange?: (selection: Record<string, boolean>) => void
  onRefresh?: () => void
  enableInternalMoves?: boolean
  onPinToSidebar?: (item: FileItem) => void
  isPinned?: (path: string) => boolean
}

interface TreeNode extends FileItem {
  children?: TreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
  level: number
}

// Storage key for expanded paths
const EXPANDED_PATHS_KEY = 'filegraph-expanded-paths'

export function TreeView({
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
  onOpenInNewTab,
  selection = {},
  onSelectionChange = () => {},
  onRefresh,
  enableInternalMoves = true,
  onPinToSidebar,
  isPinned,
}: TreeViewProps) {
  const [treeData, setTreeData] = React.useState<TreeNode[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => {
    // Restore expanded paths from localStorage on mount
    try {
      const saved = localStorage.getItem(EXPANDED_PATHS_KEY)
      if (saved) {
        return new Set(JSON.parse(saved))
      }
    } catch {
      // Ignore parse errors
    }
    return new Set()
  })

  // Persist expanded paths to localStorage
  React.useEffect(() => {
    localStorage.setItem(EXPANDED_PATHS_KEY, JSON.stringify([...expandedPaths]))
  }, [expandedPaths])

  // Drag & drop state
  const {
    draggedItems,
    isDragging,
    dropTargetPath,
    dragState,
    invalidDropReason,
    handleDragStart,
    handleDragEnd: originalHandleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop: originalHandleDrop,
  } = useFileDragDrop({ onMoveComplete: onRefresh })

  // Track if we just completed a drop to prevent click from firing
  const justDroppedRef = React.useRef(false)

  const handleDragEnd = React.useCallback(() => {
    originalHandleDragEnd()
  }, [originalHandleDragEnd])

  const handleDrop = React.useCallback(
    async (e: React.DragEvent, node: FileItem) => {
      // Set flag to prevent click handler from firing
      justDroppedRef.current = true
      await originalHandleDrop(e, node)
      // Reset flag after a short delay
      setTimeout(() => {
        justDroppedRef.current = false
      }, 100)
    },
    [originalHandleDrop],
  )

  // Get selected items for drag operations
  const getSelectedItems = React.useCallback((): FileItem[] => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length > 0) {
      return selectedRows.map((row) => row.original)
    }
    return []
  }, [table])

  // Create a virtual root folder item for dropping files into the current directory
  const rootFolderItem: FileItem = React.useMemo(
    () => ({
      id: '__root__',
      name: currentPath.split('/').pop() || 'Root',
      file_type: 'folder' as const,
      size: null,
      date_modified: '',
      extension: null,
      path: currentPath,
    }),
    [currentPath],
  )

  const isRootDropTarget = dropTargetPath === currentPath

  // Recursive function to auto-expand folders that were previously expanded
  const autoExpandFolders = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
    const result: TreeNode[] = []
    for (const node of nodes) {
      if (node.file_type === 'folder' && expandedPaths.has(node.path)) {
        try {
          const children = await loadFolderChildrenDirect(node)
          const expandedChildren = await autoExpandFolders(children)
          result.push({ ...node, children: expandedChildren, isExpanded: true })
        } catch {
          result.push(node)
        }
      } else {
        result.push(node)
      }
    }
    return result
  }

  // Direct version that doesn't depend on state (for initial load)
  const loadFolderChildrenDirect = async (target: TreeNode): Promise<TreeNode[]> => {
    const items = await invoke<FileItem[]>('list_directory', { path: target.path })
    let filteredItems = showDotfiles ? items : items.filter((item) => !item.name.startsWith('.'))

    if (searchValue) {
      filteredItems = filteredItems.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()))
    }

    filteredItems.sort((a, b) => {
      if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
      if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })

    return filteredItems.map((item) => ({
      ...item,
      children: item.file_type === 'folder' ? [] : undefined,
      isExpanded: false,
      isLoading: false,
      level: target.level + 1,
    }))
  }

  // Load initial directory
  React.useEffect(() => {
    const loadInitialTree = async () => {
      setLoading(true)
      try {
        const items = await invoke<FileItem[]>('list_directory', {
          path: currentPath,
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

        let nodes: TreeNode[] = filteredItems.map((item) => ({
          ...item,
          children: item.file_type === 'folder' ? [] : undefined,
          isExpanded: false,
          isLoading: false,
          level: 0,
        }))

        // Auto-expand previously expanded folders
        if (expandedPaths.size > 0) {
          nodes = await autoExpandFolders(nodes)
        }

        setTreeData(nodes)
      } catch (error) {
        console.error('Failed to load tree:', error)
      } finally {
        setLoading(false)
      }
    }

    if (currentPath) {
      loadInitialTree()
    }
  }, [currentPath, showDotfiles, searchValue])

  // Helper to load children for a folder node
  const loadFolderChildren = async (target: TreeNode): Promise<TreeNode[]> => {
    const items = await invoke<FileItem[]>('list_directory', { path: target.path })
    let filteredItems = showDotfiles ? items : items.filter((item) => !item.name.startsWith('.'))

    if (searchValue) {
      filteredItems = filteredItems.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()))
    }

    filteredItems.sort((a, b) => {
      if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
      if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })

    return filteredItems.map((item) => ({
      ...item,
      children: item.file_type === 'folder' ? [] : undefined,
      isExpanded: expandedPaths.has(item.path), // Restore expanded state
      isLoading: false,
      level: target.level + 1,
    }))
  }

  const toggleFolder = async (path: number[]) => {
    const newTreeData = [...treeData]
    let current: TreeNode[] = newTreeData
    let target: TreeNode = newTreeData[path[0]]

    // Navigate to the node
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        target = current[path[i]]
      } else {
        target = current[path[i]]
        current = target.children || []
      }
    }

    if (!target.isExpanded && target.file_type === 'folder') {
      // Expand: load children
      target.isLoading = true
      setTreeData([...newTreeData])

      try {
        target.children = await loadFolderChildren(target)
        target.isExpanded = true
        target.isLoading = false

        // Add to expanded paths
        setExpandedPaths((prev) => new Set([...prev, target.path]))
      } catch (error) {
        console.error('Failed to load folder:', error)
        target.isLoading = false
      }
    } else {
      // Collapse
      target.isExpanded = false
      // Remove from expanded paths
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        next.delete(target.path)
        return next
      })
    }

    setTreeData([...newTreeData])
  }

  const handleItemClick = (node: TreeNode, path: number[]) => {
    // Don't handle click if we just completed a drop
    if (justDroppedRef.current) {
      console.log('[TreeView] Ignoring click after drop')
      return
    }
    if (node.file_type === 'folder') {
      toggleFolder(path)
    } else {
      onFileSelect(node)
    }
  }

  const handleItemDoubleClick = (node: TreeNode) => {
    onItemDoubleClick(node)
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

  const handleSelectionChange = (node: TreeNode, checked: boolean, event?: React.MouseEvent) => {
    const row = getRowByPath(node.path)
    if (!row) return

    const newSelection = buildSelectionState(selection, row.index.toString(), checked, event)
    onSelectionChange(newSelection)
  }

  const renderNode = (node: TreeNode, path: number[]): React.ReactNode => {
    const isActive = activeItem?.path === node.path
    const isDotfile = node.name.startsWith('.')
    const indent = node.level * 16
    const isSelected = isNodeSelected(node.path)
    const isFolder = node.file_type === 'folder'
    const isDropTarget = enableInternalMoves && dropTargetPath === node.path && isFolder
    const isBeingDragged = isDragging && draggedItems.some((item) => item.path === node.path)

    return (
      <div
        key={node.path}
        draggable
        onDragStart={(e) => {
          e.stopPropagation() // Prevent parent nodes from also triggering drag
          const selected = getSelectedItems()
          const items = selected.length > 0 && selected.some((s) => s.path === node.path) ? selected : [node]
          handleDragStart(e, items)
        }}
        onDragEnd={(e) => {
          e.stopPropagation()
          handleDragEnd()
        }}
        onDragOver={
          enableInternalMoves
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragOver(e, isFolder ? node : null)
              }
            : undefined
        }
        onDragLeave={enableInternalMoves ? handleDragLeave : undefined}
        onDrop={
          enableInternalMoves && isFolder
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDrop(e, node)
              }
            : undefined
        }>
        <FileContextMenu
          fileItem={node}
          isSelected={isSelected}
          onOpen={() => handleItemDoubleClick(node)}
          onCopy={() => onCopyItem(node)}
          onCut={() => onCutItem(node)}
          onDelete={() => onDeleteItem(node)}
          onOpenInNewTab={isFolder ? () => onOpenInNewTab?.(node) : undefined}
          onPinToSidebar={isFolder && onPinToSidebar ? () => onPinToSidebar(node) : undefined}
          isPinned={isFolder && isPinned ? isPinned(node.path) : false}>
          <div
            className={cn(
              'group flex items-center gap-1 px-2 py-1 cursor-pointer rounded-lg transition-all duration-150',
              // Base states
              isSelected ? 'bg-primary/10' : isActive ? 'bg-secondary/25' : 'hover:bg-accent/20',
              isDotfile && 'opacity-50',
              // Dragging state - item being dragged
              isBeingDragged && 'opacity-50 scale-95',
              // Drop target states with clear visual feedback
              isDropTarget && 'ring-2 ring-primary bg-primary/20 scale-[1.02] shadow-md',
              // When dragging, highlight all valid drop targets (folders)
              enableInternalMoves &&
                isDragging &&
                isFolder &&
                !isDropTarget &&
                !isBeingDragged &&
                'ring-1 ring-primary/30 bg-primary/5',
            )}
            style={{ paddingLeft: `${8 + indent}px` }}
            onClick={(e) => {
              e.stopPropagation()
              handleSelectionChange(node, !isSelected, e)
            }}>
            <div
              onClick={(e) => {
                // Allow bubbling to handle selection
                handleItemClick(node, path)
              }}
              onDoubleClick={() => handleItemDoubleClick(node)}
              className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              {isFolder && (
                <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                  {node.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : node.isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </div>
              )}
              {!isFolder && <div className="w-4" />}

              <div className={cn('shrink-0 transition-transform', isDropTarget && 'scale-110')}>
                {isFolder ? (
                  node.isExpanded ? (
                    <FolderOpen className={cn('h-4 w-4', isDropTarget ? 'text-primary' : 'text-blue-500')} />
                  ) : (
                    <FaFolder className={cn('h-4 w-4', isDropTarget ? 'text-primary' : 'text-blue-500')} />
                  )
                ) : (
                  getFileIcon(node.file_type, node.extension)
                )}
              </div>

              <span className={cn('text-xs truncate', isDropTarget && 'font-medium')}>{node.name}</span>

              {/* Drop indicator */}
              {isDropTarget && (
                <span className="ml-auto text-[10px] text-primary font-medium animate-pulse">Drop here</span>
              )}
            </div>
          </div>
        </FileContextMenu>

        {node.isExpanded && node.children && (
          <div>{node.children.map((child, index) => renderNode(child, [...path, index]))}</div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex-1 overflow-hidden transition-all duration-150',
        // Highlight entire container when dragging (as fallback drop target)
        enableInternalMoves && isDragging && !dropTargetPath && 'bg-primary/5',
        enableInternalMoves && isRootDropTarget && 'bg-primary/10',
      )}
      onDragOver={
        enableInternalMoves
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              // Set root as drop target when hovering over empty space
              handleDragOver(e, rootFolderItem)
            }
          : undefined
      }
      onDragLeave={
        enableInternalMoves
          ? (e) => {
              // Only clear if leaving the container entirely
              const relatedTarget = e.relatedTarget as HTMLElement
              const currentTarget = e.currentTarget as HTMLElement
              if (!currentTarget.contains(relatedTarget)) {
                handleDragLeave(e)
              }
            }
          : undefined
      }
      onDrop={
        enableInternalMoves
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDrop(e, rootFolderItem)
            }
          : undefined
      }>
      {/* FILE VIEW WRAPPER */}
      <ScrollArea className="h-full">
        <div className="p-1">
          {/* Root folder indicator */}
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg transition-all duration-150 text-muted-foreground',
              enableInternalMoves && isRootDropTarget && 'ring-2 ring-primary bg-primary/20 text-foreground',
            )}>
            <FolderOpen className={cn('h-4 w-4', isRootDropTarget ? 'text-primary' : 'text-blue-500')} />
            <span className="text-xs font-medium">
              {currentPath === '/' ? '/' : currentPath.split('/').pop() || 'Root'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">(current folder)</span>
            {enableInternalMoves && isRootDropTarget && (
              <span className="text-[10px] text-primary font-medium animate-pulse">Drop here</span>
            )}
          </div>

          {treeData.map((node, index) => renderNode(node, [index]))}
          {treeData.length === 0 && (
            <div className="text-center text-muted-foreground p-8">
              <p className="text-sm">No files found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
