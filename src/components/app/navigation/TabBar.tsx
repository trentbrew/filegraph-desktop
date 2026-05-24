import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tab } from './Tab'
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
} from '@dnd-kit/sortable'
import { SortableTab } from './SortableTab'
import type { TabData } from '@/stores/useTabStore'

// Re-export TabData for consumers
export type { TabData }

interface TabBarProps {
  tabs: TabData[]
  activeTabId: string
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onNewTab: () => void
  onReorderTabs: (newTabs: TabData[]) => void
  onTabRename: (tabId: string, newTitle: string) => void
  onTabIconChange: (tabId: string, newIcon: string) => void
  className?: string
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onReorderTabs,
  onTabRename,
  onTabIconChange,
  className = '',
}: TabBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id)
      const newIndex = tabs.findIndex((tab) => tab.id === over.id)
      const newTabs = arrayMove(tabs, oldIndex, newIndex)
      onReorderTabs(newTabs)
    }
  }

  return (
    <div className={`relative flex items-center border-b border-border ${className}`}>
      {/* Scroll container: takes available space, horizontal scroll only */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-border/30 hover:scrollbar-thumb-border/50"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* DnD context does not constrain width; inner flex is w-fit to match content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}>
          <div className="flex w-fit items-center gap-3 px-2 py-2">
            <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
              {/* Tabs row: width fits content, no max width */}
              <div className="flex items-center gap-3">
                {tabs.map((tab) => (
                  <SortableTab
                    key={tab.id}
                    id={tab.id}
                    title={tab.title}
                    path={tab.path}
                    icon={tab.icon}
                    isActive={tab.id === activeTabId}
                    closable={tab.closable !== false}
                    onSelect={() => onTabSelect(tab.id)}
                    onClose={() => onTabClose(tab.id)}
                    onRename={(newTitle) => onTabRename(tab.id, newTitle)}
                    onIconChange={(newIcon) => onTabIconChange(tab.id, newIcon)}
                  />
                ))}
              </div>
            </SortableContext>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNewTab}
              className="h-9 w-9 p-0 shrink-0 rounded-xl"
              title="New Tab (Cmd+T)">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </DndContext>
      </div>
    </div>
  )
}
