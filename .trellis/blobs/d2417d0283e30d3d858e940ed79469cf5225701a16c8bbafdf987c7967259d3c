'use client'

import * as React from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { useOnClickOutside } from 'usehooks-ts'
import { cn } from '@/lib/utils'
import { LucideIcon, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Tab {
  title: string
  icon: LucideIcon
  type?: never
}

interface Separator {
  type: 'separator'
  title?: never
  icon?: never
}

export type TabItem = Tab | Separator

export interface ExpandableTabsProps {
  tabs: TabItem[]
  className?: string
  activeColor?: string
  activeIndex?: number | null
  onChange?: (index: number | null) => void
  tabTrailing?: (tab: Tab, index: number) => React.ReactNode
  /** Enable drag-and-drop reordering */
  reorderable?: boolean
  /** Callback when tabs are reordered */
  onReorder?: (tabs: TabItem[]) => void
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: '.5rem',
    paddingRight: '.5rem',
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? '.5rem' : 0,
    paddingLeft: isSelected ? '1rem' : '.5rem',
    paddingRight: isSelected ? '1rem' : '.5rem',
  }),
}

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
}

const transition: Transition = { delay: 0.1, type: 'spring', bounce: 0, duration: 0.6 }

// ─────────────────────────────────────────────────────────────────────────────
// Sortable Tab Item
// ─────────────────────────────────────────────────────────────────────────────

interface SortableTabProps {
  id: string
  tab: Tab
  index: number
  selected: number | null
  activeColor: string
  onSelect: (index: number) => void
  reorderable: boolean
  tabTrailing?: (tab: Tab, index: number) => React.ReactNode
}

function SortableTab({ id, tab, index, selected, activeColor, onSelect, reorderable, tabTrailing }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition: sortTransition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  const Icon = tab.icon
  const trailing = tabTrailing?.(tab, index)

  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-center', isDragging && 'shadow-lg rounded-full')}>
      <motion.button
        variants={buttonVariants}
        initial={false}
        animate="animate"
        custom={selected === index}
        onClick={() => onSelect(index)}
        transition={transition}
        className={cn(
          'relative flex items-center px-2 py-2 text-[12px] font-medium transition-colors duration-300 rounded-full',
          selected === index
            ? cn('bg-muted border border-primary/30 py-1 !px-2', activeColor)
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        {...(reorderable ? { ...attributes, ...listeners } : {})}>
        <Icon size={14} />
        <AnimatePresence initial={false}>
          {selected === index && (
            <motion.span
              variants={spanVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="overflow-hidden">
              {tab.title}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {trailing && <div className="ml-1 shrink-0">{trailing}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExpandableTabs({
  tabs: initialTabs,
  className,
  activeColor = 'text-primary',
  activeIndex,
  onChange,
  tabTrailing,
  reorderable = false,
  onReorder,
}: ExpandableTabsProps) {
  const [tabs, setTabs] = React.useState(initialTabs)
  const [selected, setSelected] = React.useState<number | null>(activeIndex ?? null)
  const outsideClickRef = React.useRef<HTMLDivElement>(null!)

  // Sync tabs with prop changes
  React.useEffect(() => {
    setTabs(initialTabs)
  }, [initialTabs])

  // Sync with controlled prop
  React.useEffect(() => {
    if (activeIndex !== undefined) {
      setSelected(activeIndex)
    }
  }, [activeIndex])

  useOnClickOutside(outsideClickRef, () => {
    // Don't deselect on outside click for dock behavior
  })

  const handleSelect = (index: number) => {
    setSelected(index)
    onChange?.(index)
  }

  // DnD sensors with activation constraint to distinguish click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => !t.type && t.title === active.id)
      const newIndex = tabs.findIndex((t) => !t.type && t.title === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTabs = arrayMove(tabs, oldIndex, newIndex)
        setTabs(newTabs)
        onReorder?.(newTabs)

        // Adjust selected index if needed
        if (selected === oldIndex) {
          setSelected(newIndex)
        } else if (selected !== null) {
          if (oldIndex < selected && newIndex >= selected) {
            setSelected(selected - 1)
          } else if (oldIndex > selected && newIndex <= selected) {
            setSelected(selected + 1)
          }
        }
      }
    }
  }

  const Separator = () => <div className="mx-1 h-4 w-[1.2px] bg-border" aria-hidden="true" />

  // Get sortable IDs (only for non-separator tabs)
  const sortableIds = tabs.filter((t) => !t.type).map((t) => (t as Tab).title)

  const content = (
    <div
      ref={outsideClickRef}
      className={cn('flex flex-wrap items-center gap-1 rounded-2xl border bg-background p-1 shadow-sm', className)}>
      {tabs.map((tab, index) => {
        if (tab.type === 'separator') {
          return <Separator key={`separator-${index}`} />
        }

        return (
          <SortableTab
            key={tab.title}
            id={tab.title}
            tab={tab}
            index={index}
            selected={selected}
            activeColor={activeColor}
            onSelect={handleSelect}
            reorderable={reorderable}
            tabTrailing={tabTrailing}
          />
        )
      })}
    </div>
  )

  if (reorderable) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
          {content}
        </SortableContext>
      </DndContext>
    )
  }

  return content
}
