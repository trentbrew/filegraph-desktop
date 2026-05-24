/**
 * Calendar Node Component
 *
 * A canvas node that displays a mini calendar with events.
 * Events can be dragged out onto the canvas to create EventNode instances.
 * Behaves similarly to FolderNode but for calendar events.
 */

import * as React from 'react'
import { type NodeProps } from 'reactflow'
import { invoke } from '@tauri-apps/api/core'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Loader2, GripVertical } from 'lucide-react'
import {
  add,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfToday,
  parse,
} from 'date-fns'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useVault } from '@/contexts/VaultContext'
import { useGoogleCalendarStore } from '@/stores/useGoogleCalendarStore'
import { type CalendarItem, type EventLabel, getLabelConfig, sortByUrgency } from '@/lib/calendar/types'

import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarNodeData {
  label?: string
  /** Optional: filter to specific calendar source (e.g., 'google', 'local') */
  source?: string
  /** Optional: filter to specific labels */
  filterLabels?: EventLabel[]
  isMaximized?: boolean
  deleting?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CalendarNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<CalendarNodeData> & { groupColor?: string }) {
  const { vaultPath } = useVault()
  const { accounts } = useGoogleCalendarStore()
  const isMaximized = data?.isMaximized || false
  const label = data?.label || 'Calendar'

  const [isEditing, setIsEditing] = React.useState(false)
  const [items, setItems] = React.useState<CalendarItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Calendar navigation state
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = React.useState(format(today, 'MMM-yyyy'))
  const [selectedDate, setSelectedDate] = React.useState<Date>(today)

  const firstDayCurrentMonth = parse(currentMonth, 'MMM-yyyy', new Date())

  // Navigation
  const previousMonth = () => {
    const prev = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(prev, 'MMM-yyyy'))
  }

  const nextMonth = () => {
    const next = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(next, 'MMM-yyyy'))
  }

  const goToToday = () => {
    setCurrentMonth(format(today, 'MMM-yyyy'))
    setSelectedDate(today)
  }

  // Generate calendar days
  const days = React.useMemo(() => {
    const monthStart = startOfMonth(firstDayCurrentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [firstDayCurrentMonth])

  // Load calendar items
  const loadItems = React.useCallback(async () => {
    if (!vaultPath) return

    setIsLoading(true)
    setError(null)

    const foundItems: CalendarItem[] = []

    // Load from @calendar/events.data (local events)
    try {
      const calendarPath = `${vaultPath}/@calendar/events.data`
      const response = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
      const parsed = JSON.parse(response.content)
      const entities = parsed['@graph'] || []

      for (const entity of entities) {
        if (!entity?.startDate) continue
        foundItems.push({
          '@type': entity['@type'],
          id: entity.id || entity['@id'],
          slug: entity.slug,
          label: (entity.label as EventLabel) || 'event',
          urgency: entity.urgency || 2,
          status: entity.status || 'backlog',
          name: entity.name || 'Untitled',
          description: entity.description,
          startDate: entity.startDate,
          endDate: entity.endDate,
          location: entity.location,
          participants: entity.participants,
          notes: entity.notes,
          recurrence: entity.recurrence,
          completed: entity.completed,
          color: entity.color,
          tags: entity.tags,
        })
      }
    } catch {
      // File doesn't exist or can't be read
    }

    // Load Google Calendar synced events
    for (const account of accounts) {
      if (!account.calendarSyncEnabled) continue

      for (const calendarId of account.selectedCalendars) {
        try {
          const safeCalendarId = calendarId.replace(/[^a-z0-9]/gi, '-')
          const googlePath = `${vaultPath}/@calendar/google-${account.id}-${safeCalendarId}.data`
          const response = await invoke<{ content: string }>('read_text_file', { filePath: googlePath })
          const parsed = JSON.parse(response.content)
          const entities = parsed['@graph'] || []

          for (const entity of entities) {
            if (!entity?.startDate) continue
            // Skip duplicates (by Google event ID)
            if (foundItems.some((item) => item.id === entity.id)) continue

            foundItems.push({
              '@type': entity['@type'],
              id: entity.id,
              slug: entity.slug,
              label: (entity.label as EventLabel) || 'event',
              urgency: entity.urgency || 2,
              status: entity.status || 'backlog',
              name: entity.name || 'Untitled',
              description: entity.description,
              startDate: entity.startDate,
              endDate: entity.endDate,
              location: entity.location,
              participants: entity.participants,
              recurrence: entity.recurrence,
              color: entity.color,
              tags: [...(entity.tags || []), 'google-calendar'],
            })
          }
        } catch {
          // Google sync file doesn't exist yet
        }
      }
    }

    // Apply label filter if specified
    const filtered = data?.filterLabels?.length
      ? foundItems.filter((item) => data.filterLabels!.includes(item.label))
      : foundItems

    setItems(filtered)
    setIsLoading(false)
  }, [vaultPath, data?.filterLabels, accounts])

  // Load on mount
  React.useEffect(() => {
    void loadItems()
  }, [loadItems])

  // Exit editing when deselected
  React.useEffect(() => {
    if (!selected) setIsEditing(false)
  }, [selected])

  // Get items for a specific day
  const getItemsForDay = React.useCallback(
    (day: Date) => {
      const dayItems = items.filter((item) => {
        const itemDate = new Date(item.startDate)
        return isSameDay(itemDate, day)
      })
      return sortByUrgency(dayItems)
    },
    [items],
  )

  // Get items for selected date
  const selectedDayItems = React.useMemo(() => {
    return getItemsForDay(selectedDate)
  }, [selectedDate, getItemsForDay])

  // Check if day has events
  const dayHasEvents = React.useCallback(
    (day: Date) => {
      return items.some((item) => isSameDay(new Date(item.startDate), day))
    },
    [items],
  )

  const canInteract = isMaximized || isEditing

  // Render a single event item (draggable)
  const renderEventItem = (item: CalendarItem) => {
    const labelConfig = getLabelConfig(item.label)
    const IconComponent = labelConfig.icon
    const color = item.color || labelConfig.color

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => {
          e.stopPropagation()
          try {
            // Set event data for canvas drop handling
            e.dataTransfer.setData('application/x-filegraph-event', JSON.stringify(item))
            e.dataTransfer.setData('text/plain', item.name)
          } catch {
            // ignore
          }
          e.dataTransfer.effectAllowed = 'copy'
        }}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 cursor-grab rounded-md transition-colors',
          'hover:bg-accent/50 active:cursor-grabbing',
        )}
        style={{
          borderLeft: `3px solid ${color}`,
        }}>
        <IconComponent className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{item.name}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(item.startDate), 'h:mm a')}</p>
        </div>
        <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  }

  const toolbarRightExtra = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void loadItems()
      }}
      className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      title="Refresh">
      <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
    </button>
  )

  const body = (
    <div
      className={cn('flex-1 min-h-0 p-3 flex flex-col gap-3', canInteract ? 'nodrag nowheel' : 'pointer-events-none')}>
      {/* Mini Calendar Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{format(firstDayCurrentMonth, 'MMMM yyyy')}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={previousMonth}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {/* Day headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-[9px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, today)
          const isCurrentMonth = isSameMonth(day, firstDayCurrentMonth)
          const hasEvents = dayHasEvents(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className={cn(
                'relative h-6 w-6 mx-auto text-[10px] rounded-full transition-colors',
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && isToday && 'bg-accent text-accent-foreground',
                !isSelected && !isToday && 'hover:bg-accent/50',
              )}>
              {format(day, 'd')}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {/* Selected Day Events */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {format(selectedDate, 'EEEE, MMM d')}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-1">
            {isLoading && items.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                Loading...
              </div>
            )}

            {!isLoading && selectedDayItems.length === 0 && (
              <div className="text-xs text-muted-foreground/60 px-2 py-4 text-center italic">No events</div>
            )}

            {selectedDayItems.map(renderEventItem)}
          </div>
        </ScrollArea>

        <div className="text-[10px] text-muted-foreground pt-2 border-t mt-2">Drag events onto the canvas</div>
      </div>
    </div>
  )

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          label={label}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        {body}
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      minWidth={280}
      minHeight={360}
      resizable
      toolbarRightExtra={toolbarRightExtra}>
      {body}
    </CanvasNodeWrapper>
  )
}
