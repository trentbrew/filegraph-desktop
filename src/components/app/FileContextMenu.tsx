import * as React from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Copy, ScissorsIcon, Trash, FolderOpen, FileText, Edit, PanelsTopLeft, Pin, PinOff } from 'lucide-react'
import type { FileItem } from './fileStructure'

interface FileContextMenuProps {
  children: React.ReactNode
  fileItem: FileItem
  isSelected: boolean
  onCopy: () => void
  onCut: () => void
  onDelete: () => void
  onOpen: () => void
  onRename?: () => void
  onOpenInNewTab?: () => void
  onPinToSidebar?: () => void
  isPinned?: boolean
}

export function FileContextMenu({
  children,
  fileItem,
  isSelected,
  onCopy,
  onCut,
  onDelete,
  onOpen,
  onRename,
  onOpenInNewTab,
  onPinToSidebar,
  isPinned,
}: FileContextMenuProps) {
  const isFolder = fileItem.file_type === 'folder'
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? '⌘' : 'Ctrl'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onOpen}>
          {isFolder ? (
            <>
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Folder
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Open
            </>
          )}
          <ContextMenuShortcut>↵</ContextMenuShortcut>
        </ContextMenuItem>

        {isFolder && onOpenInNewTab && (
          <ContextMenuItem onClick={onOpenInNewTab}>
            <PanelsTopLeft className="h-4 w-4 mr-2" />
            Open in New Tab
          </ContextMenuItem>
        )}

        {isFolder && onPinToSidebar && (
          <ContextMenuItem onClick={onPinToSidebar}>
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin from Sidebar
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin to Sidebar
              </>
            )}
          </ContextMenuItem>
        )}

        {onRename && (
          <ContextMenuItem onClick={onRename}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onCut}>
          <ScissorsIcon className="h-4 w-4 mr-2" />
          Cut
          <ContextMenuShortcut>{modKey}X</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem onClick={onCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
          <ContextMenuShortcut>{modKey}C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash className="h-4 w-4 mr-2" />
          Delete {isSelected ? 'Selected' : ''}
          <ContextMenuShortcut>{modKey}⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
