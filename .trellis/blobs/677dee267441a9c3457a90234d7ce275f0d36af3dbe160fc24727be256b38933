/**
 * Gantt View
 * Full-featured Gantt chart using roadmap-ui pattern
 * Supports draggable items, markers, and zoom
 */

import * as React from 'react'
import { format } from 'date-fns'
import { EyeIcon, LinkIcon, TrashIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import {
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type GanttFeature,
  type GanttStatus,
  type Range,
} from '@/components/ui/gantt'
import { type CalendarItem, type EventLabel, LABEL_LIST, getLabelConfig, isDeadlineApproaching } from '@/lib/calendar/types'

interface GanttViewProps {
  selectedDate: Date
  items: CalendarItem[]
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
}

// Map urgency to status
const URGENCY_STATUSES: Record<number, GanttStatus> = {
  1: { id: '1', name: 'Low', color: '#22c55e' },
  2: { id: '2', name: 'Medium', color: '#f59e0b' },
  3: { id: '3', name: 'High', color: '#ef4444' },
}

// Convert CalendarItem to GanttFeature
function toGanttFeature(item: CalendarItem): GanttFeature & { originalItem: CalendarItem } {
  const labelConfig = getLabelConfig(item.label)
  const status = URGENCY_STATUSES[item.urgency] || URGENCY_STATUSES[1]

  return {
    id: item.id,
    name: item.name,
    startAt: new Date(item.startDate),
    endAt: item.endDate ? new Date(item.endDate) : new Date(item.startDate),
    status: {
      ...status,
      color: item.color || labelConfig.color,
    },
    originalItem: item,
  }
}

// Group items by label
function groupByLabel(items: CalendarItem[]): Record<string, CalendarItem[]> {
  const groups: Record<string, CalendarItem[]> = {}

  for (const item of items) {
    const labelConfig = getLabelConfig(item.label)
    const groupName = labelConfig.name

    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(item)
  }

  // Sort groups alphabetically
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)))
}

// Zoom constraints
const MIN_ZOOM = 50
const MAX_ZOOM = 200
const ZOOM_STEP = 10

export function GanttView({ selectedDate, items, onDateSelect, onItemClick }: GanttViewProps) {
  const [range, setRange] = React.useState<Range>('daily') // Daily for 30-min block granularity
  const [zoom, setZoom] = React.useState(MAX_ZOOM) // Start at max zoom
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Convert items to Gantt features grouped by label
  const groupedItems = React.useMemo(() => groupByLabel(items), [items])

  // Pinch-to-zoom handler
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let lastDistance = 0

    const handleWheel = (e: WheelEvent) => {
      // Pinch gesture on trackpad (ctrlKey is set for pinch)
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
        setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)))
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastDistance = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (lastDistance > 0) {
          const delta = distance > lastDistance ? ZOOM_STEP : -ZOOM_STEP
          if (Math.abs(distance - lastDistance) > 10) {
            setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)))
            lastDistance = distance
          }
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  const handleViewItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item) {
      // Create a synthetic mouse event
      const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent
      onItemClick(item, syntheticEvent)
    }
  }

  const handleCopyLink = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item) {
      navigator.clipboard.writeText(`filegraph://calendar/${id}`)
    }
  }

  const handleMoveItem = (id: string, startAt: Date, endAt: Date | null) => {
    // TODO: Implement item move/resize
    console.log('Move item:', id, startAt, endAt)
  }

  const handleAddItem = (date: Date) => {
    // TODO: Open create item dialog
    console.log('Add item at:', date)
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <GanttProvider onAddItem={handleAddItem} range={range} zoom={zoom} className="h-full border-0 rounded-none">
        <GanttSidebar>
          {Object.entries(groupedItems).map(([group, groupItems]) => (
            <GanttSidebarGroup key={group} name={group}>
              {groupItems.map((item) => {
                const feature = toGanttFeature(item)
                return <GanttSidebarItem key={item.id} feature={feature} onSelectItem={handleViewItem} />
              })}
            </GanttSidebarGroup>
          ))}
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {Object.entries(groupedItems).map(([group, groupItems]) => (
              <GanttFeatureListGroup key={group}>
                {groupItems.map((item) => {
                  const feature = toGanttFeature(item)
                  const shouldPulse = item.urgency === 3 || isDeadlineApproaching(item)
                  return (
                    <div className={cn('flex', shouldPulse && 'animate-pulse-subtle')} key={item.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <button type="button" onClick={() => handleViewItem(item.id)}>
                            <GanttFeatureItem onMove={handleMoveItem} {...feature} />
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem className="flex items-center gap-2" onClick={() => handleViewItem(item.id)}>
                            <EyeIcon size={16} className="text-muted-foreground" />
                            View details
                          </ContextMenuItem>
                          <ContextMenuItem className="flex items-center gap-2" onClick={() => handleCopyLink(item.id)}>
                            <LinkIcon size={16} className="text-muted-foreground" />
                            Copy link
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  )
                })}
              </GanttFeatureListGroup>
            ))}
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  )
}
