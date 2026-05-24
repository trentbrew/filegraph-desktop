import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { FileItem } from '@/components/app/fileStructure'

export interface DragData {
  type: 'file-item'
  items: FileItem[]
}

// Drag state enum for clear visual feedback
export type DragState = 'idle' | 'dragging' | 'over-valid' | 'over-invalid'

interface UseFileDragDropOptions {
  onMoveComplete?: () => void
}

export function useFileDragDrop(options: UseFileDragDropOptions = {}) {
  const { onMoveComplete } = options
  const [draggedItems, setDraggedItems] = React.useState<FileItem[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [dropTargetPath, setDropTargetPath] = React.useState<string | null>(null)
  const [dragState, setDragState] = React.useState<DragState>('idle')
  const [invalidDropReason, setInvalidDropReason] = React.useState<string | null>(null)
  const lastLogRef = React.useRef<number>(0)

  const handleDragStart = React.useCallback((e: React.DragEvent, items: FileItem[]) => {
    // Don't allow dragging if no items
    if (items.length === 0) {
      e.preventDefault()
      return
    }

    console.log(
      '[DragDrop] Drag started with items:',
      items.map((i) => i.name),
    )

    setDraggedItems(items)
    setIsDragging(true)
    setDragState('dragging')

    // Set drag data
    const dragData: DragData = {
      type: 'file-item',
      items,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))

    try {
      const filegraphItems = items.map((item) => ({
        path: item.path,
        name: item.name,
        file_type: item.file_type,
      }))

      if (filegraphItems.length > 0) {
        e.dataTransfer.setData('application/x-filegraph-file', JSON.stringify(filegraphItems[0]))
      }

      e.dataTransfer.setData('application/x-filegraph-files', JSON.stringify({ items: filegraphItems }))

      e.dataTransfer.setData(
        'text/plain',
        filegraphItems.length === 1 ? filegraphItems[0].path : filegraphItems.map((i) => i.path).join('\n'),
      )
    } catch {}

    e.dataTransfer.effectAllowed = 'copyMove'

    // Create a custom drag image with better styling
    const dragPreview = document.createElement('div')
    dragPreview.id = 'drag-preview'
    dragPreview.className =
      'fixed pointer-events-none bg-card border-2 border-primary rounded-lg px-3 py-2 shadow-xl z-[9999] flex items-center gap-2'

    const icon = items.length === 1 && items[0].file_type === 'folder' ? '📁' : items.length === 1 ? '📄' : '📦'

    dragPreview.innerHTML = `
        <span class="text-base">${icon}</span>
        <span class="text-sm font-medium">${items.length === 1 ? items[0].name : `${items.length} items`}</span>
      `
    dragPreview.style.position = 'absolute'
    dragPreview.style.top = '-1000px'
    dragPreview.style.left = '-1000px'
    document.body.appendChild(dragPreview)
    e.dataTransfer.setDragImage(dragPreview, 16, 16)

    // Clean up drag preview after a short delay
    requestAnimationFrame(() => {
      if (document.getElementById('drag-preview')) {
        document.body.removeChild(dragPreview)
      }
    })
  }, [])

  const handleDragEnd = React.useCallback(() => {
    console.log('[DragDrop] Drag ended')
    setDraggedItems([])
    setIsDragging(false)
    setDropTargetPath(null)
    setDragState('idle')
    setInvalidDropReason(null)
  }, [])

  const handleDragOver = React.useCallback(
    (e: React.DragEvent, targetItem: FileItem | null) => {
      e.preventDefault()
      e.stopPropagation()

      // Log occasionally to avoid spam (every 500ms)
      const now = Date.now()
      if (now - lastLogRef.current > 500) {
        console.log('[DragDrop] DragOver:', targetItem?.name || 'null', 'isFolder:', targetItem?.file_type === 'folder')
        lastLogRef.current = now
      }

      // Try to get items from dataTransfer if draggedItems is empty
      let itemsToCheck = draggedItems
      if (itemsToCheck.length === 0) {
        try {
          const data = e.dataTransfer.getData('application/json')
          if (data) {
            const dragData: DragData = JSON.parse(data)
            if (dragData.type === 'file-item') {
              itemsToCheck = dragData.items
            }
          }
        } catch {
          // getData may not work during dragover in some browsers
        }
      }

      // Only allow dropping on folders
      if (!targetItem || targetItem.file_type !== 'folder') {
        e.dataTransfer.dropEffect = 'none'
        setDragState('over-invalid')
        setInvalidDropReason('Can only drop into folders')
        setDropTargetPath(null)
        return
      }

      // Don't allow dropping on self or children of dragged items
      const isDroppingOnSelf = itemsToCheck.some(
        (item) => item.path === targetItem.path || targetItem.path.startsWith(item.path + '/'),
      )

      if (isDroppingOnSelf) {
        e.dataTransfer.dropEffect = 'none'
        setDragState('over-invalid')
        setInvalidDropReason('Cannot move item into itself')
        setDropTargetPath(null)
        return
      }

      // Check if already in target
      const alreadyInTarget = itemsToCheck.some((item) => {
        const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
        return parentPath === targetItem.path
      })

      if (alreadyInTarget) {
        e.dataTransfer.dropEffect = 'none'
        setDragState('over-invalid')
        setInvalidDropReason('Already in this folder')
        setDropTargetPath(null)
        return
      }

      e.dataTransfer.dropEffect = 'move'
      setDragState('over-valid')
      setInvalidDropReason(null)
      setDropTargetPath(targetItem.path)
    },
    [draggedItems],
  )

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Only clear if we're leaving the actual element, not entering a child
      const relatedTarget = e.relatedTarget as HTMLElement
      const currentTarget = e.currentTarget as HTMLElement

      if (!currentTarget.contains(relatedTarget)) {
        setDropTargetPath(null)
        setDragState(isDragging ? 'dragging' : 'idle')
        setInvalidDropReason(null)
      }
    },
    [isDragging],
  )

  const handleDrop = React.useCallback(
    async (e: React.DragEvent, targetFolder: FileItem) => {
      e.preventDefault()
      e.stopPropagation()

      console.log('[DragDrop] Drop event on:', targetFolder.name, 'type:', targetFolder.file_type)

      setDropTargetPath(null)

      // Only allow dropping on folders
      if (targetFolder.file_type !== 'folder') {
        console.log('[DragDrop] Drop rejected: target is not a folder')
        return
      }

      // Get drag data
      let items: FileItem[] = []
      try {
        const data = e.dataTransfer.getData('application/json')
        console.log('[DragDrop] Raw drag data:', data)
        if (data) {
          const dragData: DragData = JSON.parse(data)
          if (dragData.type === 'file-item') {
            items = dragData.items
          }
        }
      } catch (err) {
        console.log('[DragDrop] Failed to parse drag data, using state:', err)
        // Fall back to current dragged items
        items = draggedItems
      }

      console.log(
        '[DragDrop] Items to move:',
        items.map((i) => i.name),
      )

      if (items.length === 0) {
        console.log('[DragDrop] No items to move')
        return
      }

      // Don't allow dropping on self or children
      const isDroppingOnSelf = items.some(
        (item) => item.path === targetFolder.path || targetFolder.path.startsWith(item.path + '/'),
      )

      if (isDroppingOnSelf) {
        toast.error('Cannot move item into itself')
        return
      }

      // Check if any item is already in the target folder
      const alreadyInTarget = items.some((item) => {
        const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
        return parentPath === targetFolder.path
      })

      if (alreadyInTarget) {
        toast.info('Items are already in this folder')
        return
      }

      // Perform the move
      try {
        const sourcePaths = items.map((item) => item.path)
        await invoke('move_items', {
          sourcePaths,
          destinationPath: targetFolder.path,
        })

        toast.success(
          items.length === 1
            ? `Moved "${items[0].name}" to "${targetFolder.name}"`
            : `Moved ${items.length} items to "${targetFolder.name}"`,
        )

        onMoveComplete?.()
      } catch (err) {
        console.error('Failed to move items:', err)
        toast.error(`Failed to move items: ${err}`)
      }

      handleDragEnd()
    },
    [draggedItems, onMoveComplete, handleDragEnd],
  )

  return {
    draggedItems,
    isDragging,
    dropTargetPath,
    dragState,
    invalidDropReason,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}

// Context for sharing drag state across components
interface FileDragDropContextValue {
  draggedItems: FileItem[]
  isDragging: boolean
  dropTargetPath: string | null
  handleDragStart: (e: React.DragEvent, items: FileItem[]) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, targetItem: FileItem | null) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent, targetFolder: FileItem) => Promise<void>
}

const FileDragDropContext = React.createContext<FileDragDropContextValue | null>(null)

export function FileDragDropProvider({
  children,
  onMoveComplete,
}: {
  children: React.ReactNode
  onMoveComplete?: () => void
}) {
  const dragDrop = useFileDragDrop({ onMoveComplete })

  return <FileDragDropContext.Provider value={dragDrop}>{children}</FileDragDropContext.Provider>
}

export function useFileDragDropContext() {
  const context = React.useContext(FileDragDropContext)
  if (!context) {
    throw new Error('useFileDragDropContext must be used within a FileDragDropProvider')
  }
  return context
}
