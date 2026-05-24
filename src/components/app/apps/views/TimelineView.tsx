/**
 * Timeline / Gantt View
 * Horizontal timeline showing events with duration
 * Supports zooming and panning
 */

import * as React from 'react'
import {
  addDays,
  differenceInDays,
  differenceInHours,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from 'date-fns'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type CalendarItem, getLabelConfig, sortByUrgency, isDeadlineApproaching } from '@/lib/calendar/types'

interface TimelineViewProps {
  selectedDate: Date
  items: CalendarItem[]
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
}

type TimeScale = 'hour' | 'day' | 'week' | 'month'

const SCALES: { id: TimeScale; label: string; dayWidth: number; daysVisible: number }[] = [
  { id: 'hour', label: 'Hour', dayWidth: 200, daysVisible: 3 },
  { id: 'day', label: 'Day', dayWidth: 100, daysVisible: 7 },
  { id: 'week', label: 'Week', dayWidth: 50, daysVisible: 14 },
  { id: 'month', label: 'Month', dayWidth: 25, daysVisible: 31 },
]

export function TimelineView({ selectedDate, items, onDateSelect, onItemClick }: TimelineViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const timelineRowsRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState<TimeScale>('hour') // Start at max zoom

  const scaleConfig = SCALES.find((s) => s.id === scale) || SCALES[1]

  // Calculate date range based on scale
  const dateRange = React.useMemo(() => {
    const start = startOfWeek(selectedDate)
    const end = addWeeks(start, scale === 'month' ? 4 : scale === 'week' ? 2 : 1)
    return eachDayOfInterval({ start, end })
  }, [selectedDate, scale])

  // Filter items that fall within the date range
  const visibleItems = React.useMemo(() => {
    const rangeStart = dateRange[0]
    const rangeEnd = dateRange[dateRange.length - 1]

    return sortByUrgency(
      items.filter((item) => {
        const itemStart = new Date(item.startDate)
        const itemEnd = item.endDate ? new Date(item.endDate) : itemStart
        return itemStart <= rangeEnd && itemEnd >= rangeStart
      }),
    )
  }, [items, dateRange])

  // Group items by row to prevent overlap
  const itemRows = React.useMemo(() => {
    const rows: CalendarItem[][] = []

    visibleItems.forEach((item) => {
      const itemStart = new Date(item.startDate)
      const itemEnd = item.endDate ? new Date(item.endDate) : addDays(itemStart, 1)

      // Find a row where this item doesn't overlap
      let placed = false
      for (const row of rows) {
        const hasOverlap = row.some((existingItem) => {
          const existingStart = new Date(existingItem.startDate)
          const existingEnd = existingItem.endDate ? new Date(existingItem.endDate) : addDays(existingStart, 1)
          return itemStart < existingEnd && itemEnd > existingStart
        })

        if (!hasOverlap) {
          row.push(item)
          placed = true
          break
        }
      }

      if (!placed) {
        rows.push([item])
      }
    })

    return rows
  }, [visibleItems])

  // Scroll to current time on mount
  React.useEffect(() => {
    const scrollToCurrent = () => {
      if (scrollRef.current && timelineRowsRef.current) {
        const todayIndex = dateRange.findIndex((d) => isToday(d))
        if (todayIndex >= 0) {
          const now = new Date()
          const hourProgress = (now.getHours() + now.getMinutes() / 60) / 24
          const currentTimeOffset = todayIndex * scaleConfig.dayWidth + hourProgress * scaleConfig.dayWidth

          // Center the current time in the viewport
          const viewportWidth = scrollRef.current.clientWidth
          const scrollPosition = currentTimeOffset - viewportWidth / 2

          // Scroll both containers
          scrollRef.current.scrollLeft = Math.max(0, scrollPosition)
          timelineRowsRef.current.scrollLeft = Math.max(0, scrollPosition)
        }
      }
    }

    // Small delay to ensure layout is complete
    const timer = setTimeout(scrollToCurrent, 100)
    return () => clearTimeout(timer)
  }, [dateRange, scaleConfig.dayWidth])

  const zoomIn = () => {
    const idx = SCALES.findIndex((s) => s.id === scale)
    if (idx > 0) setScale(SCALES[idx - 1].id)
  }

  const zoomOut = () => {
    const idx = SCALES.findIndex((s) => s.id === scale)
    if (idx < SCALES.length - 1) setScale(SCALES[idx + 1].id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {format(dateRange[0], 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">Zoom:</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={scale === 'hour'}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">{scaleConfig.label}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={scale === 'month'}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Date Headers */}
        <div className="border-b shrink-0 overflow-hidden">
          <div ref={scrollRef} className="flex overflow-x-auto scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
            {dateRange.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'shrink-0 text-center py-2 border-r cursor-pointer hover:bg-accent/50',
                  isToday(day) && 'bg-primary/10',
                  isSameDay(day, selectedDate) && 'bg-accent',
                )}
                style={{ width: scaleConfig.dayWidth }}
                onClick={() => onDateSelect(day)}>
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div className={cn('text-sm font-medium', isToday(day) && 'text-primary')}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Rows */}
        <ScrollArea className="flex-1">
          <div
            ref={timelineRowsRef}
            className="overflow-x-auto scrollbar-hide"
            onScroll={(e) => {
              // Sync scroll with header
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = e.currentTarget.scrollLeft
              }
            }}
            style={{ scrollBehavior: 'smooth' }}>
            <div
              className="relative"
              style={{
                width: dateRange.length * scaleConfig.dayWidth,
                minHeight: itemRows.length * 48 + 20,
              }}>
              {/* Grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dateRange.map((day, idx) => (
                  <div
                    key={day.toISOString()}
                    className={cn('shrink-0 border-r h-full', isToday(day) && 'bg-primary/5')}
                    style={{ width: scaleConfig.dayWidth }}
                  />
                ))}
              </div>

              {/* Items */}
              {itemRows.map((row, rowIndex) =>
                row.map((item) => {
                  const itemStart = new Date(item.startDate)
                  const itemEnd = item.endDate ? new Date(item.endDate) : addDays(itemStart, 1)
                  const labelConfig = getLabelConfig(item.label)
                  const IconComponent = labelConfig.icon
                  const color = item.color || labelConfig.color
                  const isPulsing = isDeadlineApproaching(item)

                  // Calculate position
                  const startOffset = differenceInDays(itemStart, dateRange[0])
                  const duration = Math.max(1, differenceInDays(itemEnd, itemStart))
                  const left = Math.max(0, startOffset * scaleConfig.dayWidth)
                  const width = duration * scaleConfig.dayWidth - 4

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => onItemClick(item, e)}
                      className={cn(
                        'absolute rounded-md px-2 py-1.5 cursor-pointer hover:opacity-90 transition-all overflow-hidden',
                        isPulsing && 'animate-pulse',
                        labelConfig.isFinancial && 'border border-dashed',
                      )}
                      style={{
                        left,
                        top: rowIndex * 48 + 8,
                        width: Math.max(80, width),
                        height: 36,
                        backgroundColor: `${color}20`,
                        borderLeft: `3px solid ${color}`,
                        borderColor: labelConfig.isFinancial ? color : undefined,
                      }}>
                      <div className="flex items-center gap-1.5 h-full">
                        <IconComponent className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                        <span className="font-medium text-xs truncate">{item.name}</span>
                        {item.amount !== undefined && (
                          <span className="text-[10px] opacity-75 ml-auto shrink-0">${item.amount}</span>
                        )}
                        {item.urgency === 3 && (
                          <span className="text-[10px] px-1 rounded bg-destructive/20 text-destructive shrink-0">
                            !
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }),
              )}

              {/* Today indicator */}
              {dateRange.some((d) => isToday(d)) && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                  style={{
                    left:
                      dateRange.findIndex((d) => isToday(d)) * scaleConfig.dayWidth +
                      (new Date().getHours() / 24) * scaleConfig.dayWidth,
                  }}
                />
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
        <span>{visibleItems.length} items visible</span>
        <span>•</span>
        <span>Click to select day, click item for details</span>
      </div>
    </div>
  )
}
