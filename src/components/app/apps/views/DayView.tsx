/**
 * Day View
 * Shows a single day with hourly time slots
 */

import * as React from 'react'
import { format, isSameDay, isToday, setHours } from 'date-fns'
import { Plus, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { type CalendarItem, getLabelConfig, isDeadlineApproaching, sortByUrgency } from '@/lib/calendar/types'
import { isRecurring } from '@/lib/calendar/recurrence'

interface DayViewProps {
  selectedDate: Date
  items: CalendarItem[]
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
}

// Hours to display (6am - 10pm)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

export function DayView({ selectedDate, items, onItemClick, onSlotClick }: DayViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [hoveredSlot, setHoveredSlot] = React.useState<number | null>(null)

  // Get items for the selected day
  const dayItems = items.filter((item) => {
    const itemDate = new Date(item.startDate)
    return isSameDay(itemDate, selectedDate)
  })

  // Separate all-day and timed items
  const allDayItems = dayItems.filter((item) => !item.startDate.includes('T'))
  const timedItems = dayItems.filter((item) => item.startDate.includes('T'))

  // Get items for a specific hour
  const getItemsForHour = (hour: number) => {
    return timedItems.filter((item) => {
      const itemDate = new Date(item.startDate)
      return itemDate.getHours() === hour
    })
  }

  // Scroll to current hour on mount
  React.useEffect(() => {
    const now = new Date()
    const currentHour = now.getHours()
    if (scrollRef.current && currentHour >= 6 && isToday(selectedDate)) {
      const hourHeight = 80 // Each hour slot is 80px
      scrollRef.current.scrollTop = (currentHour - 6) * hourHeight - 100
    }
  }, [selectedDate])

  return (
    <div className="flex flex-col h-full">
      {/* Day Header */}
      <div className="flex items-center gap-4 p-4 border-b shrink-0">
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg px-4 py-2',
            isToday(selectedDate) ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}>
          <span className="text-xs uppercase">{format(selectedDate, 'EEE')}</span>
          <span className="text-2xl font-bold">{format(selectedDate, 'd')}</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{format(selectedDate, 'MMMM d, yyyy')}</h2>
          <p className="text-sm text-muted-foreground">
            {dayItems.length} item{dayItems.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {/* All-day items */}
      {allDayItems.length > 0 && (
        <div className="p-4 border-b bg-muted/30">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">All Day</h3>
          <div className="space-y-1">
            {sortByUrgency(allDayItems).map((item) => {
              const labelConfig = getLabelConfig(item.label)
              const IconComponent = labelConfig.icon
              const color = item.color || labelConfig.color

              return (
                <div
                  key={item.id}
                  onClick={(e) => onItemClick(item, e)}
                  className="flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: `${color}15`,
                    borderLeft: `3px solid ${color}`,
                  }}>
                  <IconComponent className="h-4 w-4 shrink-0" style={{ color }} />
                  <span className="font-medium">{item.name}</span>
                  {isRecurring(item.recurrence) && <Repeat className="h-3 w-3 shrink-0 opacity-60" style={{ color }} />}
                  {item.urgency === 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium ml-auto">
                      !
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex">
          {/* Time labels */}
          <div className="w-20 shrink-0">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[80px] flex items-start justify-end pr-3 pt-0 text-sm text-muted-foreground">
                {format(setHours(new Date(), hour), 'h a')}
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div className="flex-1 border-l">
            {HOURS.map((hour) => {
              const hourItems = getItemsForHour(hour)
              const now = new Date()
              const isCurrentHour = isToday(selectedDate) && now.getHours() === hour
              const isSlotHovered = hoveredSlot === hour

              return (
                <ContextMenu key={hour}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn('h-[80px] border-b relative cursor-pointer group', isCurrentHour && 'bg-primary/5')}
                      onMouseEnter={() => setHoveredSlot(hour)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      onClick={() => {
                        if (hourItems.length === 0) {
                          onSlotClick?.(selectedDate, hour)
                        }
                      }}>
                      {/* Current time indicator */}
                      {isCurrentHour && (
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-primary z-10"
                          style={{
                            top: `${(now.getMinutes() / 60) * 100}%`,
                          }}>
                          <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        </div>
                      )}

                      {/* Plus button on hover for empty slots */}
                      {hourItems.length === 0 && isSlotHovered && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSlotClick?.(selectedDate, hour)
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      )}

                      {/* Items */}
                      <div className="p-1 space-y-1">
                        {hourItems.map((item) => {
                          const labelConfig = getLabelConfig(item.label)
                          const IconComponent = labelConfig.icon
                          const color = item.color || labelConfig.color
                          const shouldPulse = item.urgency === 3 || isDeadlineApproaching(item)

                          // Calculate height based on duration
                          const startTime = new Date(item.startDate)
                          const endTime = item.endDate
                            ? new Date(item.endDate)
                            : new Date(startTime.getTime() + 60 * 60 * 1000)
                          const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
                          const heightPx = Math.max(30, Math.min(durationHours * 80 - 8, 72))

                          return (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onItemClick(item, e)
                              }}
                              className={cn(
                                'flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80',
                                shouldPulse && 'animate-pulse-subtle',
                              )}
                              style={{
                                backgroundColor: `${color}20`,
                                borderLeft: `3px solid ${color}`,
                                minHeight: `${heightPx}px`,
                              }}>
                              <IconComponent className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(startTime, 'h:mm a')}
                                  {item.endDate && ` - ${format(endTime, 'h:mm a')}`}
                                </p>
                                {item.location && (
                                  <p className="text-xs text-muted-foreground truncate">📍 {item.location}</p>
                                )}
                              </div>
                              {item.urgency === 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium shrink-0">
                                  !
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onSlotClick?.(selectedDate, hour)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Event at {format(setHours(new Date(), hour), 'h a')}
                      <ContextMenuShortcut>N</ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
