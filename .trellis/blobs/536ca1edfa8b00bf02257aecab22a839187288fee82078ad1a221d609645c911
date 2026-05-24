/**
 * Editor Tabs Component
 * VS Code-style tab bar for open files
 *
 * Features:
 * - Pinned tabs (normal style)
 * - Preview tab (italic, replaced on single-click)
 * - Close button on hover
 * - Dirty indicator (dot)
 * - Double-click to pin preview
 * - Middle-click to close
 * - Drag to reorder
 * - Context menu for tab actions
 *
 * Note: Editor tabs are workspace-scoped (stored in TabData, not global)
 */

import * as React from 'react'
import { X, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFileIcon } from '@/lib/fileIcons'
import { useTabStore, EditorTab } from '@/stores/useTabStore'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface EditorTabsProps {
  className?: string
}

// Single sortable editor tab
function SortableEditorTab({
  tab,
  isActive,
  onSelect,
  onDoubleClick,
  onMiddleClick,
  onClose,
  onCloseOthers,
  onCloseAll,
  onPin,
}: {
  tab: EditorTab
  isActive: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onMiddleClick: (e: React.MouseEvent) => void
  onClose: () => void
  onCloseOthers: () => void
  onCloseAll: () => void
  onPin: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={onSelect}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMiddleClick}
            className={cn(
              'group relative inline-flex items-center gap-1.5 px-2 h-7 mb-2 rounded-lg cursor-grab select-none transition-colors min-w-0',
              isActive
                ? 'bg-card text-foreground border-t border-accent'
                : 'bg-card/0 text-muted-foreground/50 border border-border/50 hover:text-foreground',
              !tab.isPinned && 'italic',
              isDragging && 'cursor-grabbing shadow-lg',
            )}>
            {getFileIcon(tab.file.file_type, tab.file.extension || null, 'sm')}

            {/* File name */}
            <span className={cn('text-xs font-medium truncate max-w-[120px] pr-6', !tab.isPinned && 'italic')}>
              {tab.file.name}
            </span>

            {/* Dirty indicator or close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className={cn(
                'absolute right-1.5 h-5 w-5 p-0 rounded-md transition-opacity',
                'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                isActive ? 'opacity-50 hover:opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}>
              {tab.isDirty ? <Circle className="h-2 w-2 fill-current" /> : <X className="h-3 w-3" />}
            </Button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={onClose}>Close</ContextMenuItem>
          <ContextMenuItem onClick={onCloseOthers}>Close Others</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onCloseAll}>Close All</ContextMenuItem>
          {!tab.isPinned && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onPin}>Keep Open</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

export function EditorTabs({ className }: EditorTabsProps) {
  // Get workspace-scoped editor tabs from the active workspace tab
  const {
    tabs: workspaceTabs,
    activeTabId: activeWorkspaceId,
    setActiveEditorTab,
    closeEditorTab,
    pinEditorTab,
    reorderEditorTabs,
    closeAllEditorTabs,
    closeOtherEditorTabs,
  } = useTabStore()

  // Get editor tabs for the current workspace
  const activeWorkspace = workspaceTabs.find((t) => t.id === activeWorkspaceId)
  const tabs = activeWorkspace?.editorTabs || []
  const activeTabId = activeWorkspace?.activeEditorTabId || null

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id)
      const newIndex = tabs.findIndex((t) => t.id === over.id)
      reorderEditorTabs(arrayMove(tabs, oldIndex, newIndex))
    }
  }

  const handleMiddleClick = (tab: EditorTab, e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      closeEditorTab(tab.id)
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}>
      <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
        <div
          className={cn(
            'flex items-center border-none gap-1.5 p-0 overflow-x-auto scrollbar-none',
            className,
          )}>
          {tabs.map((tab) => (
            <SortableEditorTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={() => setActiveEditorTab(tab.id)}
              onDoubleClick={() => !tab.isPinned && pinEditorTab(tab.id)}
              onMiddleClick={(e) => handleMiddleClick(tab, e)}
              onClose={() => closeEditorTab(tab.id)}
              onCloseOthers={() => closeOtherEditorTabs(tab.id)}
              onCloseAll={closeAllEditorTabs}
              onPin={() => pinEditorTab(tab.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
