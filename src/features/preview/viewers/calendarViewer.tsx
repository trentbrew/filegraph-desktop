/**
 * Calendar Viewer
 * Full-screen calendar that scans vault for entities with date properties
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
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
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useVault } from '@/contexts/VaultContext'
import { useCalendarStore, type CalendarEvent } from '@/stores/useCalendarStore'

interface CalendarViewerProps {
  filePath: string
  fileName: string
}

const colStartClasses = ['', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7']

// Date property keys to look for in entities
const DATE_PROPERTIES = [
  'date',
  'datetime',
  'startDate',
  'endDate',
  'dueDate',
  'createdAt',
  'updatedAt',
  'scheduledDate',
  'completedDate',
  'birthDate',
  'deathDate',
  'foundedDate',
  'startTime',
  'endTime',
  'eventDate',
  'deadline',
]

export function CalendarViewer({ filePath, fileName }: CalendarViewerProps) {
  const { vaultPath } = useVault()
  const today = startOfToday()

  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
    setCalendarMode,
    loading,
    setLoading,
    getEventsForDate,
  } = useCalendarStore()

  const [error, setError] = React.useState<string | null>(null)
  const firstDayCurrentMonth = parse(currentMonth, 'MMM-yyyy', new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  // Enable calendar mode when viewer mounts
  React.useEffect(() => {
    setCalendarMode(true)
    return () => setCalendarMode(false)
  }, [setCalendarMode])

  // Scan vault for all entities with date properties
  const loadAllEvents = React.useCallback(async () => {
    if (!vaultPath) return

    setLoading(true)
    setError(null)

    const foundEvents: CalendarEvent[] = []

    // Recursively scan for .data files
    const scanDirectory = async (path: string) => {
      try {
        const files = await invoke<any[]>('list_directory', { path })
        for (const file of files) {
          if (file.file_type === 'folder') {
            await scanDirectory(file.path)
          } else if (file.extension === 'data') {
            try {
              const response = await invoke<{ content: string }>('read_text_file', { filePath: file.path })
              const data = JSON.parse(response.content)

              // Extract entities from @graph or root array
              const entities = data['@graph'] || (Array.isArray(data) ? data : [data])

              for (const entity of entities) {
                if (!entity || typeof entity !== 'object') continue

                // Check for any date property
                for (const prop of DATE_PROPERTIES) {
                  const dateValue = entity[prop]
                  if (dateValue && typeof dateValue === 'string') {
                    const parsedDate = new Date(dateValue)
                    if (!isNaN(parsedDate.getTime())) {
                      foundEvents.push({
                        id: entity.id || entity['@id'] || `${file.path}-${Math.random()}`,
                        name: entity.name || entity.title || entity.description || 'Untitled',
                        datetime: dateValue,
                        time: format(parsedDate, 'h:mm a'),
                        description: entity.description,
                        color: entity.color || getColorForProperty(prop),
                        sourcePath: file.path,
                      })
                      break // Only one event per entity
                    }
                  }
                }
              }
            } catch (e) {
              // Skip files that can't be parsed
            }
          }
        }
      } catch (e) {
        console.warn(`[CalendarViewer] Failed to scan ${path}:`, e)
      }
    }

    await scanDirectory(vaultPath)
    setEvents(foundEvents)
    setLoading(false)
  }, [vaultPath, setEvents, setLoading])

  React.useEffect(() => {
    loadAllEvents()
  }, [loadAllEvents])

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, 'MMM-yyyy'))
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, 'MMM-yyyy'))
  }

  function goToToday() {
    setCurrentMonth(format(today, 'MMM-yyyy'))
    setSelectedDate(today)
  }

  // Get color based on property type
  function getColorForProperty(prop: string): string {
    const colors: Record<string, string> = {
      dueDate: 'hsl(var(--destructive))',
      deadline: 'hsl(var(--destructive))',
      startDate: 'hsl(var(--primary))',
      eventDate: 'hsl(var(--primary))',
      birthDate: 'hsl(142, 76%, 36%)',
      completedDate: 'hsl(142, 76%, 36%)',
    }
    return colors[prop] || 'hsl(var(--muted-foreground))'
  }

  // Get events for selected day
  const selectedDayEvents = React.useMemo(() => {
    return getEventsForDate(selectedDate)
  }, [selectedDate, getEventsForDate])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.datetime)
      return isSameDay(eventDate, day)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Calendar className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadAllEvents}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full ">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="hidden w-14 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 sm:flex">
            <span className="text-[10px] uppercase text-muted-foreground">{format(today, 'MMM')}</span>
            <span className="text-lg font-bold">{format(today, 'd')}</span>
          </div>
          <div>
            <h2 className="text-base font-semibold">{format(firstDayCurrentMonth, 'MMMM yyyy')}</h2>
            <p className="text-xs text-muted-foreground">
              {events.length} event{events.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex -space-x-px rounded-lg shadow-sm">
            <Button onClick={previousMonth} variant="outline" size="icon" className="h-8 w-8 rounded-r-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={goToToday} variant="outline" className="h-8 px-3 rounded-none text-xs">
              Today
            </Button>
            <Button onClick={nextMonth} variant="outline" size="icon" className="h-8 w-8 rounded-l-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Event</span>
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground shrink-0">
        <div className="py-2 border-r">Sun</div>
        <div className="py-2 border-r">Mon</div>
        <div className="py-2 border-r">Tue</div>
        <div className="py-2 border-r">Wed</div>
        <div className="py-2 border-r">Thu</div>
        <div className="py-2 border-r">Fri</div>
        <div className="py-2">Sat</div>
      </div>

      {/* Calendar Grid - Full Height */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-hidden bg-background">
        {days.slice(0, 35).map((day, dayIdx) => {
          const dayEvents = getEventsForDay(day)
          const isSelected = isEqual(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, firstDayCurrentMonth)

          return (
            <div
              key={dayIdx}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'relative flex flex-col border-b border-r cursor-pointer overflow-hidden',
                !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                isSelected && 'bg-accent',
                !isSelected && 'hover:bg-accent/10',
              )}>
              {/* Day Number */}
              <div className="flex items-center justify-between p-1.5 shrink-0">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday(day) && isSelected && 'bg-primary text-primary-foreground',
                    isToday(day) && !isSelected && 'bg-primary/20 text-primary',
                    isSelected && !isToday(day) && 'bg-foreground text-background',
                  )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="flex-1 px-1 pb-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="rounded px-1.5 py-0.5 text-[10px] leading-tight truncate"
                    style={{
                      backgroundColor: event.color ? `${event.color}20` : 'hsl(var(--primary) / 0.15)',
                      borderLeft: `2px solid ${event.color || 'hsl(var(--primary))'}`,
                    }}>
                    <span className="font-medium">{event.name}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
