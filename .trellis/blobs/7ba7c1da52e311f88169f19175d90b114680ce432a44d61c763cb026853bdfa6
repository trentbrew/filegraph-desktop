/**
 * MonthView - Scrollable month calendar with scroll-snap pagination
 * Supports both horizontal and vertical scroll navigation between months
 */

import * as React from 'react'
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, Plus, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface MonthViewProps {
  currentMonth: string
  selectedDate: Date
  items: CalendarItem[]
  scrollDirection?: ScrollDirection
  onMonthChange: (month: string) => void
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
  onSlotClick: (date: Date) => void
  onViewDay: (date: Date) => void
  onViewWeek: (date: Date) => void
}

interface MonthGridProps {
  month: Date
  selectedDate: Date
  items: CalendarItem[]
  hoveredDay: string | null
  onHoverDay: (dayKey: string | null) => void
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
  onSlotClick: (date: Date) => void
  onViewDay: (date: Date) => void
  onViewWeek: (date: Date) => void
  getItemsForDay: (day: Date) => CalendarItem[]
}

// Event item height in pixels (py-0.5 + text-xs line-height + gap)
const EVENT_ITEM_HEIGHT = 22
// Header height (day number + padding)
const DAY_HEADER_HEIGHT = 44
// "+X more" row height
const MORE_ROW_HEIGHT = 16
// Minimum padding at bottom
const BOTTOM_PADDING = 4

function MonthGrid({
  month,
  selectedDate,
  hoveredDay,
  onHoverDay,
  onDateSelect,
  onItemClick,
  onSlotClick,
  onViewDay,
  onViewWeek,
  getItemsForDay,
}: MonthGridProps) {
  const [cellHeight, setCellHeight] = React.useState(100)
  const cellRef = React.useRef<HTMLDivElement>(null)

  // Measure cell height on mount and resize
  React.useEffect(() => {
    const measureHeight = () => {
      if (cellRef.current) {
        setCellHeight(cellRef.current.clientHeight)
      }
    }
    measureHeight()
    const observer = new ResizeObserver(measureHeight)
    if (cellRef.current) {
      observer.observe(cellRef.current)
    }
    return () => observer.disconnect()
  }, [])

  // Calculate max visible events based on cell height
  const maxVisibleEvents = React.useMemo(() => {
    const availableHeight = cellHeight - DAY_HEADER_HEIGHT - BOTTOM_PADDING
    // Reserve space for "+X more" if we might need it
    const eventsSpace = availableHeight - MORE_ROW_HEIGHT
    return Math.max(1, Math.floor(eventsSpace / EVENT_ITEM_HEIGHT))
  }, [cellHeight])

  const days = eachDayOfInterval({
    start: startOfWeek(month),
    end: endOfWeek(endOfMonth(month)),
  })

  const copyDateToClipboard = (date: Date) => {
    navigator.clipboard.writeText(format(date, 'yyyy-MM-dd'))
  }

  return (
    <div className="grid grid-cols-7 auto-rows-fr h-full min-h-full bg-card/25">
      {days.map((day, index) => {
        const dayItems = getItemsForDay(day)
        const isSelected = isEqual(day, selectedDate)
        const isCurrentMonth = isSameMonth(day, month)
        const dayKey = format(day, 'yyyy-MM-dd')
        const isHovered = hoveredDay === dayKey
        // Only show "+X more" if there are actually more items than we can display
        const visibleItems = dayItems.slice(0, maxVisibleEvents)
        const hiddenCount = dayItems.length - visibleItems.length

        return (
          <ContextMenu key={day.toString()}>
            <ContextMenuTrigger asChild>
              <div
                ref={index === 0 ? cellRef : undefined}
                onClick={() => onDateSelect(day)}
                onMouseEnter={() => onHoverDay(dayKey)}
                onMouseLeave={() => onHoverDay(null)}
                className={cn(
                  'relative flex flex-col border-b border-r cursor-pointer overflow-hidden min-h-[100px] group',
                  !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                  isSelected && 'bg-accent/50',
                  !isSelected && 'hover:bg-foreground/5',
                )}>
                {/* Day Number */}
                <div className="flex items-center justify-between p-2 shrink-0">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                      isToday(day) && isSelected && 'bg-primary text-primary-foreground',
                      isToday(day) && !isSelected && 'bg-primary/20 text-primary font-semibold',
                      isSelected && !isToday(day) && 'bg-foreground text-background',
                    )}>
                    {format(day, 'd')}
                  </span>

                  {/* Plus button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlotClick(day)
                    }}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all',
                      isHovered ? 'opacity-100' : 'opacity-0',
                    )}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Items */}
                <div
                  className="flex-1 px-1 pb-1 space-y-0.5 overflow-y-auto"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && dayItems.length === 0) {
                      e.stopPropagation()
                      onSlotClick(day)
                    }
                  }}>
                  {visibleItems.map((item) => {
                    const labelConfig = getLabelConfig(item.label)
                    const IconComponent = labelConfig.icon
                    const color = item.color || labelConfig.color
                    const shouldPulse = item.urgency === 3 || isDeadlineApproaching(item)

                    return (
                      <HoverCard key={item.id} openDelay={300} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <div
                            onClick={(e) => onItemClick(item, e)}
                            className={cn(
                              'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs leading-tight cursor-pointer hover:opacity-80',
                              shouldPulse && 'animate-pulse-subtle',
                              labelConfig.isFinancial && 'border border-dashed',
                            )}
                            style={{
                              backgroundColor: `${color}20`,
                              borderLeft: `2px solid ${color}`,
                              borderColor: labelConfig.isFinancial ? color : undefined,
                            }}>
                            <IconComponent className="h-3 w-3 shrink-0" style={{ color }} />
                            <span className="font-medium truncate">{item.name}</span>
                            {isRecurring(item.recurrence) && (
                              <Repeat className="h-2.5 w-2.5 shrink-0 opacity-60" style={{ color }} />
                            )}
                            {item.amount !== undefined && (
                              <span className="text-[10px] opacity-75 ml-auto shrink-0">${item.amount}</span>
                            )}
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
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <CalendarDays className="mr-1.5 h-3 w-3" />
                                  {format(new Date(item.startDate), 'MMM d, h:mm a')}
                                </div>
                                {item.amount !== undefined && (
                                  <span
                                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${color}20`, color }}>
                                    ${item.amount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                                  style={{ backgroundColor: `${color}30`, color }}>
                                  {item.label}
                                </span>
                                {item.urgency && (
                                  <span className="text-[10px] text-muted-foreground">Priority {item.urgency}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  })}
                  {hiddenCount > 0 && (
                    <div className="text-[10px] text-muted-foreground px-1.5 font-medium">+{hiddenCount} more</div>
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onSlotClick(day)}>
                <Plus className="h-4 w-4 mr-2" />
                New Event
                <ContextMenuShortcut>N</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => copyDateToClipboard(day)}>
                Copy Date
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onViewDay(day)}>View Day</ContextMenuItem>
              <ContextMenuItem onClick={() => onViewWeek(day)}>View Week</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
    </div>
  )
}

export function MonthView({
  currentMonth,
  selectedDate,
  items,
  scrollDirection = 'vertical',
  onMonthChange,
  onDateSelect,
  onItemClick,
  onSlotClick,
  onViewDay,
  onViewWeek,
}: MonthViewProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [hoveredDay, setHoveredDay] = React.useState<string | null>(null)
  const isScrollingRef = React.useRef(false)
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const isVertical = scrollDirection === 'vertical'

  // Parse current month and calculate prev/next
  const currentMonthDate = parse(currentMonth, 'MMM-yyyy', new Date())
  const prevMonthDate = add(currentMonthDate, { months: -1 })
  const nextMonthDate = add(currentMonthDate, { months: 1 })

  const months = [prevMonthDate, currentMonthDate, nextMonthDate]

  // Get items for a specific day
  const getItemsForDay = React.useCallback(
    (day: Date) => {
      return items
        .filter((item) => {
          const itemDate = new Date(item.startDate)
          return isSameDay(itemDate, day)
        })
        .sort((a, b) => b.urgency - a.urgency)
    },
    [items],
  )

  // Scroll to center month on mount and when currentMonth changes externally
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Scroll to center (current month) instantly (no animation)
    const scrollToCenter = () => {
      // Temporarily disable smooth scroll for instant repositioning
      container.style.scrollBehavior = 'auto'
      if (isVertical) {
        const containerHeight = container.clientHeight
        container.scrollTop = containerHeight
      } else {
        const containerWidth = container.clientWidth
        container.scrollLeft = containerWidth
      }
      // Re-enable smooth scroll after repositioning
      requestAnimationFrame(() => {
        container.style.scrollBehavior = 'smooth'
      })
    }

    // Small delay to ensure layout is complete
    requestAnimationFrame(scrollToCenter)
  }, [currentMonth, isVertical])

  // Handle scroll end to detect month change
  const handleScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    isScrollingRef.current = true

    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return

      let snapIndex: number
      if (isVertical) {
        const containerHeight = container.clientHeight
        const scrollTop = container.scrollTop
        snapIndex = Math.round(scrollTop / containerHeight)
      } else {
        const containerWidth = container.clientWidth
        const scrollLeft = container.scrollLeft
        snapIndex = Math.round(scrollLeft / containerWidth)
      }

      isScrollingRef.current = false

      // Determine which month is now visible
      if (snapIndex === 0) {
        // Scrolled to previous month
        onMonthChange(format(prevMonthDate, 'MMM-yyyy'))
      } else if (snapIndex === 2) {
        // Scrolled to next month
        onMonthChange(format(nextMonthDate, 'MMM-yyyy'))
      }
      // snapIndex === 1 means we're still on current month, no change needed
    }, 150)
  }, [onMonthChange, prevMonthDate, nextMonthDate, isVertical])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Scrollable Month Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          'flex-1 min-h-0 scrollbar-none',
          isVertical
            ? 'overflow-y-auto overflow-x-hidden snap-y snap-mandatory'
            : 'overflow-x-auto overflow-y-hidden snap-x snap-mandatory',
        )}
        style={{ scrollBehavior: 'smooth' }}>
        <div
          className={cn('h-full', isVertical ? 'flex flex-col' : 'flex')}
          style={isVertical ? { height: '300%' } : { width: '300%' }}>
          {months.map((month) => (
            <div
              key={format(month, 'MMM-yyyy')}
              className={cn('snap-center shrink-0 flex flex-col', isVertical ? 'h-1/3 w-full' : 'w-1/3 h-full')}>
              {/* Week Days Header - inside each month for vertical scroll */}
              <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-3 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-h-0">
                <MonthGrid
                  month={month}
                  selectedDate={selectedDate}
                  items={items}
                  hoveredDay={hoveredDay}
                  onHoverDay={setHoveredDay}
                  onDateSelect={onDateSelect}
                  onItemClick={onItemClick}
                  onSlotClick={onSlotClick}
                  onViewDay={onViewDay}
                  onViewWeek={onViewWeek}
                  getItemsForDay={getItemsForDay}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
