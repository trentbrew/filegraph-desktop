/**
 * Mini Calendar Component
 * Compact calendar for sidebar navigation
 */

import * as React from 'react'
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface MiniCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  eventDates?: Date[]
  currentMonth?: string // MMM-yyyy format
  onMonthChange?: (month: string) => void
}

export function MiniCalendar({
  selectedDate,
  onDateSelect,
  eventDates = [],
  currentMonth: externalMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const today = startOfToday()
  // Use external month if provided, otherwise manage internally
  const [internalMonth, setInternalMonth] = React.useState(format(selectedDate, 'MMM-yyyy'))
  const currentMonth = externalMonth ?? internalMonth
  const firstDayCurrentMonth = parse(currentMonth, 'MMM-yyyy', new Date())

  // Sync internal month with external when it changes
  React.useEffect(() => {
    if (externalMonth) {
      setInternalMonth(externalMonth)
    }
  }, [externalMonth])

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    const firstDayPrevMonth = add(firstDayCurrentMonth, { months: -1 })
    const newMonth = format(firstDayPrevMonth, 'MMM-yyyy')
    setInternalMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    const newMonth = format(firstDayNextMonth, 'MMM-yyyy')
    setInternalMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  // Check if a day has events
  const hasEvents = (day: Date) => {
    return eventDates.some((eventDate) => isSameDay(eventDate, day))
  }

  return (
    <div className="p-3">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{format(firstDayCurrentMonth, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={previousMonth}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
        <div>S</div>
        <div>M</div>
        <div>T</div>
        <div>W</div>
        <div>T</div>
        <div>F</div>
        <div>S</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, dayIdx) => (
          <button
            key={dayIdx}
            type="button"
            onClick={() => onDateSelect(day)}
            className={cn(
              'relative flex items-center justify-center h-7 w-7 text-xs rounded-md transition-colors',
              // Not same month
              !isSameMonth(day, firstDayCurrentMonth) && 'text-muted-foreground/50',
              // Today
              isToday(day) && !isEqual(day, selectedDate) && 'bg-accent text-accent-foreground font-semibold',
              // Selected
              isEqual(day, selectedDate) && 'bg-primary text-primary-foreground font-semibold',
              // Hover
              !isEqual(day, selectedDate) && 'hover:bg-accent hover:text-accent-foreground',
            )}>
            {format(day, 'd')}
            {/* Event Indicator */}
            {hasEvents(day) && (
              <span
                className={cn(
                  'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                  isEqual(day, selectedDate) ? 'bg-primary-foreground' : 'bg-primary',
                )}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
