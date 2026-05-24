import * as React from 'react'
import { FileItem } from './fileStructure'
import { convertFileSrc } from '@tauri-apps/api/core'
import { getFileIcon } from '@/lib/fileIcons'
import { FaFolder } from 'react-icons/fa'
import { FileContextMenu } from './FileContextMenu'
import { cn } from '@/lib/utils'

interface GridItemProps {
  fileItem: FileItem
  isActive: boolean
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onSelectionChange: (checked: boolean) => void
  onCopy?: () => void
  onCut?: () => void
  onDelete?: () => void
  onOpenInNewTab?: () => void
  // Drag & drop props
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDropTarget?: boolean
  isBeingDragged?: boolean
  isDragging?: boolean // Global drag state
}

export function GridItem({
  fileItem,
  isActive,
  isSelected,
  onClick,
  onDoubleClick,
  onSelectionChange,
  onCopy = () => {},
  onCut = () => {},
  onDelete = () => {},
  onOpenInNewTab,
  draggable = true,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget = false,
  isBeingDragged = false,
  isDragging = false,
}: GridItemProps) {
  const [thumbnailError, setThumbnailError] = React.useState(false)
  const isDotfile = fileItem.name.startsWith('.')
  const isFolder = fileItem.file_type === 'folder'

  const renderThumbnail = () => {
    if (fileItem.file_type === 'folder') {
      return (
        <div className="w-full aspect-square flex items-center justify-center bg-blue-500/10 rounded-md">
          <FaFolder className="h-16 w-16 text-blue-500" />
        </div>
      )
    }

    const extension = fileItem.extension?.toLowerCase()

    // Show thumbnail for images
    if (
      extension &&
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension) &&
      !thumbnailError
    ) {
      const imageUrl = convertFileSrc(fileItem.path)
      return (
        <div className="w-full aspect-square relative overflow-hidden rounded-md bg-muted flex items-center justify-center">
          <img
            src={imageUrl}
            alt={fileItem.name}
            className="w-full h-full object-contain"
            onError={() => setThumbnailError(true)}
          />
        </div>
      )
    }

    // Show icon for other file types
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-muted-foreground/15 rounded-md">
        {getFileIcon(fileItem.file_type, fileItem.extension, 'lg')}
      </div>
    )
  }

  const formatFileSize = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return ''
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <FileContextMenu
      fileItem={fileItem}
      isSelected={isSelected}
      onCopy={onCopy}
      onCut={onCut}
      onDelete={onDelete}
      onOpen={onDoubleClick}
      onOpenInNewTab={onOpenInNewTab}>
      <div
        className={cn(
          'relative flex flex-col gap-2 p-1.5 rounded-lg border transition-all duration-150 cursor-pointer group',
          isSelected
            ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
            : isActive
              ? 'bg-accent/40 border-primary'
              : 'border-border/50 bg-accent/15 hover:bg-accent/30',
          isDotfile && 'opacity-50',
          // Dragging state - item being dragged
          isBeingDragged && 'opacity-50 scale-95',
          // Drop target states with clear visual feedback
          isDropTarget && isFolder && 'ring-2 ring-primary border-primary bg-primary/20 scale-105 shadow-lg',
          // When dragging, highlight all valid drop targets (folders)
          isDragging &&
            isFolder &&
            !isDropTarget &&
            !isBeingDragged &&
            'ring-1 ring-primary/30 border-primary/50 bg-primary/5',
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={isFolder ? onDrop : undefined}>
        {renderThumbnail()}
        <div className="flex flex-col gap-1 p-1.5">
          <span
            className={cn('text-xs text-center truncate w-full font-medium', isDropTarget && 'text-primary')}
            title={fileItem.name}>
            {fileItem.name}
          </span>
          <span className="text-[10px] text-muted-foreground text-center">
            {isDropTarget ? (
              <span className="text-primary animate-pulse">Drop here</span>
            ) : fileItem.file_type === 'folder' ? (
              'Folder'
            ) : (
              formatFileSize(fileItem.size)
            )}
          </span>
        </div>
      </div>
    </FileContextMenu>
  )
}
