/**
 * FullscreenTabs Component
 *
 * Tab bar for switching between nodes while in fullscreen mode.
 * Features:
 * - Uniform tab widths with truncated titles
 * - Horizontal scroll overflow
 * - Close tabs (delete nodes)
 * - Keyboard navigation support
 */

import * as React from 'react'
import {
  X,
  Type,
  StickyNote,
  Image,
  Video,
  Mic,
  FileText,
  Code,
  Table,
  Globe,
  Music,
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  Folder,
  User,
  Calendar,
  CalendarDays,
  Terminal,
  PenTool,
  MapPin,
  Plus,
  Bot,
  File,
  Minimize2,
  type LucideIcon,
} from 'lucide-react'
import { getFileIcon } from '@/lib/fileIcons'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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

interface FullscreenTab {
  id: string
  title: string
  nodeType: string
  shapeType?: string
  fileExtension?: string
  isActive: boolean
}

interface FullscreenTabsProps {
  tabs: FullscreenTab[]
  activeTabId: string | null
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onReorderTabs?: (newTabs: FullscreenTab[]) => void
  onExit: () => void
  className?: string
}

const TAB_MAX_WIDTH = 200 // Max width before truncation
const MAX_TITLE_LENGTH = 24 // Characters before truncation

const truncateTitle = (title: string): string => {
  if (title.length <= MAX_TITLE_LENGTH) return title
  return title.slice(0, MAX_TITLE_LENGTH - 3) + '...'
}

const getNodeTypeIcon = (nodeType: string, shapeType?: string): LucideIcon => {
  switch (nodeType) {
    case 'richText':
      return Type
    case 'stickyNote':
      return StickyNote
    case 'image':
      return Image
    case 'video':
    case 'youtube':
      return Video
    case 'audio':
      return Mic
    case 'pdf':
      return FileText
    case 'code':
    case 'codeBlock':
      return Code
    case 'table':
      return Table
    case 'embed':
      return Globe
    case 'spotify':
      return Music
    case 'shape':
      // Return shape-specific icon
      switch (shapeType) {
        case 'circle':
          return Circle
        case 'diamond':
          return Diamond
        case 'triangle':
          return Triangle
        case 'hexagon':
          return Hexagon
        default:
          return Square
      }
    case 'folder':
      return Folder
    case 'person':
      return User
    case 'calendar':
      return Calendar
    case 'event':
      return CalendarDays
    case 'terminal':
      return Terminal
    case 'freehand':
      return PenTool
    case 'location':
      return MapPin
    case 'placeholder':
      return Plus
    case 'agent':
      return Bot
    default:
      return File
  }
}

// Icon component for consistent rendering
function NodeTypeIcon({
  nodeType,
  shapeType,
  fileExtension,
  className,
}: {
  nodeType: string
  shapeType?: string
  fileExtension?: string
  className?: string
}) {
  if (fileExtension !== undefined) {
    return <>{getFileIcon('file', fileExtension || null, 'sm')}</>
  }
  const Icon = getNodeTypeIcon(nodeType, shapeType)
  return <Icon className={className} />
}

// Sortable wrapper for individual fullscreen tabs
function SortableFullscreenTab({
  tab,
  isActive,
  index,
  activeTabRef,
  onTabClick,
  onTabClose,
}: {
  tab: FullscreenTab
  isActive: boolean
  index: number
  activeTabRef: React.RefObject<HTMLButtonElement | null>
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    maxWidth: TAB_MAX_WIDTH,
  }

  const keyboardShortcut = index < 9 ? `⌘${index + 1}` : ''

  return (
    <div ref={setNodeRef} style={style} className="relative shrink-0 group" {...attributes} {...listeners}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={isActive ? activeTabRef : undefined}
            onClick={() => onTabClick(tab.id)}
            className={cn(
              'w-full h-7 px-2 flex items-center gap-1.5 rounded-lg',
              'transition-colors duration-150',
              'select-none',
              isDragging ? 'shadow-lg cursor-grabbing' : 'cursor-grab',
              isActive
                ? 'bg-card text-foreground border border-border/50'
                : 'bg-card/0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50',
            )}
            aria-label={`Switch to ${tab.title}`}>
            <NodeTypeIcon nodeType={tab.nodeType} shapeType={tab.shapeType} fileExtension={tab.fileExtension} className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap text-left pr-4">
              {truncateTitle(tab.title)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{tab.title}</div>
            <div className="text-xs text-muted-foreground">
              Type: {tab.nodeType}
              {keyboardShortcut && <span className="ml-2">• {keyboardShortcut}</span>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'absolute top-1/2 right-1.5 -translate-y-1/2',
          'h-5 w-5 p-0 rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-muted/40',
          'transition-opacity duration-150',
          isActive ? 'opacity-50 hover:opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => {
          e.stopPropagation()
          onTabClose(tab.id)
        }}
        aria-label={`Close ${tab.title}`}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function FullscreenTabs({ tabs, activeTabId, onTabClick, onTabClose, onReorderTabs, onExit, className }: FullscreenTabsProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const activeTabRef = React.useRef<HTMLButtonElement | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id && onReorderTabs) {
        const oldIndex = tabs.findIndex((t) => t.id === active.id)
        const newIndex = tabs.findIndex((t) => t.id === over.id)
        onReorderTabs(arrayMove(tabs, oldIndex, newIndex))
      }
    },
    [tabs, onReorderTabs],
  )

  // Scroll active tab into view when it changes
  React.useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeTab = activeTabRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeTabId])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInput) return

      // Cmd/Ctrl + 1-9 to switch to tab by index
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const tabIndex = parseInt(e.key) - 1
        if (tabs[tabIndex]) {
          onTabClick(tabs[tabIndex].id)
        }
        return
      }

      // Alt+Cmd+Right / Ctrl+Alt+Right - Next fullscreen tab
      if (e.altKey && (e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault()
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        if (currentIndex === -1) return
        const nextIndex = (currentIndex + 1) % tabs.length
        onTabClick(tabs[nextIndex].id)
        return
      }

      // Alt+Cmd+Left / Ctrl+Alt+Left - Previous fullscreen tab
      if (e.altKey && (e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault()
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        if (currentIndex === -1) return
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
        onTabClick(tabs[prevIndex].id)
        return
      }

      // Cmd+W / Ctrl+W - Close active fullscreen tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) {
          onTabClose(activeTabId)
        }
        return
      }

      // Tab key to cycle through tabs (Shift+Tab for reverse)
      if (e.key === 'Tab' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        if (currentIndex === -1) return

        const nextIndex = e.shiftKey ? (currentIndex - 1 + tabs.length) % tabs.length : (currentIndex + 1) % tabs.length

        onTabClick(tabs[nextIndex].id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, onTabClick, onTabClose])

  if (tabs.length === 0) return null

  return (
    <TooltipProvider delayDuration={500}>
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-50',
          'bg-background/95 backdrop-blur-sm border-b border-border',
          'h-9 flex items-center',
          className,
        )}>
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden px-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground"
          style={{ scrollbarWidth: 'thin' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}>
            <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex items-center gap-1.5 h-full py-1" style={{ minWidth: 'fit-content' }}>
                {tabs.map((tab, index) => (
                  <SortableFullscreenTab
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    index={index}
                    activeTabRef={activeTabRef}
                    onTabClick={onTabClick}
                    onTabClose={onTabClose}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Tab count indicator */}
        {tabs.length > 1 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-l border-border">{tabs.length} tabs</div>
        )}

        {/* Exit fullscreen button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="h-8 w-8 mx-2 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              aria-label="Exit fullscreen">
              <Minimize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Exit fullscreen <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted rounded">Esc</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
