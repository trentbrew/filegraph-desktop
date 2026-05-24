/**
 * Week View
 * Shows a 7-day week with hourly time slots
 */

import * as React from 'react'
import {
  addDays,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameHour,
  isToday,
  setHours,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, Plus, Repeat } from 'lucide-react'
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { type CalendarItem, getLabelConfig, isDeadlineApproaching } from '@/lib/calendar/types'
import { isRecurring } from '@/lib/calendar/recurrence'

type ScrollDirection = 'horizontal' | 'vertical'

interface WeekViewProps {
  selectedDate: Date
  items: CalendarItem[]
  scrollDirection?: ScrollDirection
  onWeekChange?: (date: Date) => void
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
}

// Hours to display (6am - 10pm)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

export function WeekView({
  selectedDate,
  items,
  scrollDirection = 'vertical',
  onWeekChange,
  onDateSelect,
  onItemClick,
  onSlotClick,
}: WeekViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const weekScrollRef = React.useRef<HTMLDivElement>(null)
  const [hoveredSlot, setHoveredSlot] = React.useState<string | null>(null)
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const isVertical = scrollDirection === 'vertical'

  // Get days of the current week
  const weekStart = startOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate),
  })

  // Calculate prev/next weeks for scroll snap
  const prevWeekStart = addDays(weekStart, -7)
  const nextWeekStart = addDays(weekStart, 7)
  const weeks = [prevWeekStart, weekStart, nextWeekStart]

  // Get items for a specific day and hour
  const getItemsForSlot = (day: Date, hour: number) => {
    return items.filter((item) => {
      const itemDate = new Date(item.startDate)
      return isSameDay(itemDate, day) && itemDate.getHours() === hour
    })
  }

  // Get all-day items for a day
  const getAllDayItems = (day: Date) => {
    return items.filter((item) => {
      const itemDate = new Date(item.startDate)
      const isAllDay = !item.startDate.includes('T')
      return isSameDay(itemDate, day) && isAllDay
    })
  }

  // Scroll to current hour on mount
  React.useEffect(() => {
    const now = new Date()
    const currentHour = now.getHours()
    if (scrollRef.current && currentHour >= 6) {
      const hourHeight = 60 // Each hour slot is 60px
      scrollRef.current.scrollTop = (currentHour - 6) * hourHeight - 100
    }
  }, [])

  // Scroll to center week on mount and when selectedDate changes
  React.useEffect(() => {
    const container = weekScrollRef.current
    if (!container) return

    const scrollToCenter = () => {
      container.style.scrollBehavior = 'auto'
      if (isVertical) {
        container.scrollTop = container.clientHeight
      } else {
        container.scrollLeft = container.clientWidth
      }
      requestAnimationFrame(() => {
        container.style.scrollBehavior = 'smooth'
      })
    }

    requestAnimationFrame(scrollToCenter)
  }, [selectedDate, isVertical])

  // Handle scroll end to detect week change
  const handleWeekScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = weekScrollRef.current
      if (!container || !onWeekChange) return

      let snapIndex: number
      if (isVertical) {
        snapIndex = Math.round(container.scrollTop / container.clientHeight)
      } else {
        snapIndex = Math.round(container.scrollLeft / container.clientWidth)
      }

      if (snapIndex === 0) {
        onWeekChange(prevWeekStart)
      } else if (snapIndex === 2) {
        onWeekChange(nextWeekStart)
      }
    }, 150)
  }, [onWeekChange, prevWeekStart, nextWeekStart, isVertical])

  return (
    <div className="flex flex-col h-full">
      {/* Week Header */}
      <div className="flex border-b shrink-0">
        {/* Time column spacer */}
        <div className="w-16 shrink-0 border-r" />

        {/* Day headers */}
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const allDayItems = getAllDayItems(day)

          return (
            <div
              key={day.toString()}
              className={cn(
                'flex-1 min-w-[120px] border-r last:border-r-0 cursor-pointer',
                isSelected && 'bg-accent/30',
              )}
              onClick={() => onDateSelect(day)}>
              {/* Day label */}
              <div className="flex flex-col items-center py-2">
                <span className="text-xs text-muted-foreground">{format(day, 'EEE')}</span>
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    isToday(day) && 'bg-primary text-primary-foreground',
                    isSelected && !isToday(day) && 'bg-foreground text-background',
                  )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* All-day events */}
              {allDayItems.length > 0 && (
                <div className="px-1 pb-1 space-y-0.5">
                  {allDayItems.slice(0, 2).map((item) => {
                    const labelConfig = getLabelConfig(item.label)
                    const IconComponent = labelConfig.icon
                    const color = item.color || labelConfig.color
                    return (
                      <HoverCard key={item.id} openDelay={300} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <div
                            onClick={(e) => onItemClick(item, e)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: `${color}20`,
                              borderLeft: `2px solid ${color}`,
                            }}>
                            <IconComponent className="h-3 w-3 shrink-0" style={{ color }} />
                            <span className="truncate">{item.name}</span>
                            {isRecurring(item.recurrence) && (
                              <Repeat className="h-2.5 w-2.5 shrink-0 opacity-60" style={{ color }} />
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72" side="bottom" align="start">
                          <div className="flex gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${color}20` }}>
                              <IconComponent className="h-5 w-5" style={{ color }} />
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate">{item.name}</h4>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                                  style={{ backgroundColor: `${color}30`, color }}>
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">All day</span>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  })}
                  {allDayItems.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1.5">+{allDayItems.length - 2} more</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time Grid */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex">
          {/* Time labels */}
          <div className="w-16 shrink-0 border-r">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] flex items-start justify-end pr-2 pt-0 text-xs text-muted-foreground">
                {format(setHours(new Date(), hour), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)

            return (
              <div
                key={day.toString()}
                className={cn('flex-1 min-w-[120px] border-r last:border-r-0', isSelected && 'bg-accent/10')}>
                {HOURS.map((hour) => {
                  const slotItems = getItemsForSlot(day, hour)
                  const now = new Date()
                  const isCurrentHour = isToday(day) && now.getHours() === hour
                  const slotKey = `${format(day, 'yyyy-MM-dd')}-${hour}`
                  const isSlotHovered = hoveredSlot === slotKey

                  return (
                    <ContextMenu key={hour}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={cn(
                            'h-[60px] border-b relative cursor-pointer group',
                            isCurrentHour && 'bg-primary/5',
                          )}
                          onMouseEnter={() => setHoveredSlot(slotKey)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          onClick={() => {
                            if (slotItems.length === 0) {
                              onSlotClick?.(day, hour)
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
                          {slotItems.length === 0 && isSlotHovered && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSlotClick?.(day, hour)
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {/* Items */}
                          <div className="p-0.5 space-y-0.5">
                            {slotItems.map((item) => {
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
                              const heightPx = Math.max(20, Math.min(durationHours * 60 - 4, 56))

                              return (
                                <HoverCard key={item.id} openDelay={300} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onItemClick(item, e)
                                      }}
                                      className={cn(
                                        'rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 overflow-hidden',
                                        shouldPulse && 'animate-pulse-subtle',
                                      )}
                                      style={{
                                        backgroundColor: `${color}30`,
                                        borderLeft: `2px solid ${color}`,
                                        height: `${heightPx}px`,
                                      }}>
                                      <div className="flex items-center gap-1">
                                        <IconComponent className="h-3 w-3 shrink-0" style={{ color }} />
                                        <p className="font-medium truncate">{item.name}</p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground pl-4">
                                        {format(startTime, 'h:mm a')}
                                      </p>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-72" side="right" align="start">
                                    <div className="flex gap-3">
                                      <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: `${color}20` }}>
                                        <IconComponent className="h-5 w-5" style={{ color }} />
                                      </div>
                                      <div className="flex-1 space-y-1 min-w-0">
                                        <h4 className="text-sm font-semibold truncate">{item.name}</h4>
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-3 pt-1">
                                          <div className="flex items-center text-xs text-muted-foreground">
                                            <CalendarDays className="mr-1.5 h-3 w-3" />
                                            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                          <span
                                            className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                                            style={{ backgroundColor: `${color}30`, color }}>
                                            {item.label}
                                          </span>
                                          {item.urgency && (
                                            <span className="text-[10px] text-muted-foreground">
                                              Priority {item.urgency}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )
                            })}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => onSlotClick?.(day, hour)}>
                          <Plus className="h-4 w-4 mr-2" />
                          New Event at {format(setHours(new Date(), hour), 'h a')}
                          <ContextMenuShortcut>N</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => onDateSelect(day)}>View Day</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
