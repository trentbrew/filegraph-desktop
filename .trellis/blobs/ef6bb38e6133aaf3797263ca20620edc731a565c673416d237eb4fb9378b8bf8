import * as React from 'react'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TreeView } from './treeView'
import { ColumnView } from './columnView'
import { GridItem } from './gridItem'
import { GraphView } from './GraphView'
import { FilePlus, FolderPlus, ListTree, PenTool } from 'lucide-react'
import { Whiteboard } from './Whiteboard'
import type { FileItem } from './fileStructure'
import type { LayoutMode } from './navigation'
import { buildSelectionState, isMultiSelectEvent } from '@/lib/utils/selection'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { useFileDragDrop, type DragData } from '@/hooks/useFileDragDrop'

interface FileViewContainerProps {
  layoutMode: LayoutMode
  table: TanstackTable<FileItem>
  currentPath: string
  activeItem: FileItem | null
  previewEnabled: boolean
  showDotfiles: boolean
  searchValue: string
  onNavigate: (path: string) => void
  onFileSelect: (item: FileItem | null) => void
  onItemDoubleClick: (item: FileItem) => void
  onOpenInNewTab: (item: FileItem) => void
  onCopyItem: (item: FileItem) => void
  onCutItem: (item: FileItem) => void
  onDeleteItem: (item: FileItem) => void
  renderTableView: () => React.ReactNode
  className?: string
  rootPath?: string | null
  onCreateFile?: () => void
  onCreateFolder?: () => void
  onRefresh?: () => void
  // Selection props
  gridSelection?: Record<string, boolean>
  onGridSelectionChange?: (selection: Record<string, boolean>) => void
  treeSelection?: Record<string, boolean>
  onTreeSelectionChange?: (selection: Record<string, boolean>) => void
  columnSelection?: Record<string, boolean>
  onColumnSelectionChange?: (selection: Record<string, boolean>) => void
}

export function FileViewContainer({
  layoutMode,
  table,
  currentPath,
  activeItem,
  previewEnabled,
  showDotfiles,
  searchValue,
  onNavigate,
  onFileSelect,
  onItemDoubleClick,
  onOpenInNewTab,
  onCopyItem,
  onCutItem,
  onDeleteItem,
  renderTableView,
  className = '',
  rootPath,
  onCreateFile = () => {},
  onCreateFolder = () => {},
  gridSelection = {},
  onGridSelectionChange = () => {},
  treeSelection = {},
  onTreeSelectionChange = () => {},
  columnSelection = {},
  onColumnSelectionChange = () => {},
  onRefresh,
}: FileViewContainerProps) {
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* View Container */}
        <div className="bg-card/50 border flex-1 h-full overflow-hidden rounded-xl flex flex-col min-h-full max-h-[calc(100vh-96rem)]">
          {/* Table View */}
          {layoutMode === 'table' && renderTableView()}
          {/* Grid View */}
          {layoutMode === 'grid' && (
            <div className={`flex-1 overflow-hidden ${className}`}>
              <ScrollArea className="h-full">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-3">
                  {table.getRowModel().rows.map((row) => {
                    const fileItem = row.original
                    return (
                      <GridItem
                        key={row.id}
                        fileItem={fileItem}
                        isActive={activeItem?.path === fileItem.path}
                        isSelected={row.getIsSelected()}
                        onClick={(e) => {
                          const nextSelection = buildSelectionState(
                            table.getState().rowSelection,
                            row.id,
                            !row.getIsSelected(),
                            e,
                          )
                          table.setRowSelection(nextSelection)

                          if (!isMultiSelectEvent(e)) {
                            table.setRowSelection(nextSelection)
                          }

                          if (previewEnabled && fileItem.file_type !== 'folder') {
                            onFileSelect(fileItem)
                          }
                        }}
                        onDoubleClick={() => onItemDoubleClick(fileItem)}
                        onSelectionChange={(checked) => {
                          const nextSelection = buildSelectionState(table.getState().rowSelection, row.id, checked)
                          table.setRowSelection(nextSelection)
                        }}
                        onCopy={() => onCopyItem(fileItem)}
                        onCut={() => onCutItem(fileItem)}
                        onDelete={() => onDeleteItem(fileItem)}
                        onOpenInNewTab={fileItem.file_type === 'folder' ? () => onOpenInNewTab(fileItem) : undefined}
                        // Drag & drop
                        draggable
                        onDragStart={(e) => {
                          const selected = getSelectedItems()
                          const items =
                            selected.length > 0 && selected.some((s) => s.path === fileItem.path)
                              ? selected
                              : [fileItem]
                          handleDragStart(e, items)
                        }}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, fileItem.file_type === 'folder' ? fileItem : null)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, fileItem)}
                        isDropTarget={dropTargetPath === fileItem.path}
                        isBeingDragged={isDragging && draggedItems.some((item) => item.path === fileItem.path)}
                        isDragging={isDragging}
                      />
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Columns View */}
          {layoutMode === 'columns' && (
            <ColumnView
              currentPath={currentPath}
              onNavigate={onNavigate}
              onFileSelect={onFileSelect}
              onItemDoubleClick={onItemDoubleClick}
              activeItem={activeItem}
              showDotfiles={showDotfiles}
              searchValue={searchValue}
              table={table}
              onCopyItem={onCopyItem}
              onCutItem={onCutItem}
              onDeleteItem={onDeleteItem}
              rootPath={rootPath}
              selection={columnSelection}
              onSelectionChange={onColumnSelectionChange}
              onOpenInNewTab={onOpenInNewTab}
              onRefresh={onRefresh}
            />
          )}

          {/* Tree View */}
          {layoutMode === 'tree' && (
            <TreeView
              currentPath={currentPath}
              onNavigate={onNavigate}
              onFileSelect={onFileSelect}
              onItemDoubleClick={onItemDoubleClick}
              activeItem={activeItem}
              showDotfiles={showDotfiles}
              searchValue={searchValue}
              table={table}
              onCopyItem={onCopyItem}
              onCutItem={onCutItem}
              onDeleteItem={onDeleteItem}
              onOpenInNewTab={onOpenInNewTab}
              selection={treeSelection}
              onSelectionChange={onTreeSelectionChange}
              onRefresh={onRefresh}
            />
          )}

          {/* Graph View */}
          {layoutMode === 'graph' && (
            <div className="flex-1 overflow-hidden">
              <GraphView currentPath={currentPath} onFileSelect={onFileSelect} className="w-full h-full" />
            </div>
          )}

          {/* Whiteboard View */}
          {layoutMode === 'whiteboard' && (
            <div className="flex-1 overflow-hidden">
              <Whiteboard />
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onCreateFile}>
          <FilePlus className="h-4 w-4 mr-2" />
          New File
        </ContextMenuItem>
        <ContextMenuItem onClick={onCreateFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
