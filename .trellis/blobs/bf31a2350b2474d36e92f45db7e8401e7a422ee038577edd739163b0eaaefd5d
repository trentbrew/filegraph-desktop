/**
 * Today's Schedule Widget
 * Quick view of today's calendar events and reminders
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { format, isSameDay, startOfToday, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { Calendar, RefreshCw, Clock, Bell, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useVault } from '@/contexts/VaultContext'
import { getLabelConfig, type EventLabel } from '@/lib/calendar/types'
import type { TodayScheduleWidgetData } from '@/lib/widgets'

interface ScheduleItem {
  id: string
  name: string
  label: EventLabel
  startDate: string
  endDate?: string
  color?: string
  type: 'event' | 'reminder'
  isAllDay?: boolean
  isPast?: boolean
}

interface TodayScheduleWidgetProps {
  data: TodayScheduleWidgetData
  onUpdate: (data: Partial<TodayScheduleWidgetData>) => void
}

export function TodayScheduleWidget({ data, onUpdate }: TodayScheduleWidgetProps) {
  const { vaultPath } = useVault()
  const { state, settings } = data
  const [loading, setLoading] = React.useState(false)
  const [items, setItems] = React.useState<ScheduleItem[]>([])

  const loadTodayItems = React.useCallback(async () => {
    if (!vaultPath) return
    setLoading(true)

    const today = startOfToday()
    const now = new Date()
    const allItems: ScheduleItem[] = []

    // Load events from @calendar/events.data
    try {
      const eventsPath = `${vaultPath}/@calendar/events.data`
      const response = await invoke<{ content: string }>('read_text_file', { filePath: eventsPath })
      const parsed = JSON.parse(response.content)
      const entities = parsed['@graph'] || parsed.items || []

      entities.forEach((entity: any) => {
        if (!entity?.startDate) return
        const itemDate = parseISO(entity.startDate)
        if (!isSameDay(itemDate, today)) return

        const isAllDay = entity.isAllDay || !entity.startDate.includes('T')
        const isPast = !isAllDay && isBefore(itemDate, now)

        allItems.push({
          id: entity.id || entity['@id'],
          name: entity.name || entity.title || 'Untitled',
          label: entity.label || 'event',
          startDate: entity.startDate,
          endDate: entity.endDate,
          color: entity.color,
          type: 'event',
          isAllDay,
          isPast,
        })
      })
    } catch (e) {
      console.debug('[TodayScheduleWidget] No events found:', e)
    }

    // Load reminders from @calendar/reminders.data
    try {
      const remindersPath = `${vaultPath}/@calendar/reminders.data`
      const response = await invoke<{ content: string }>('read_text_file', { filePath: remindersPath })
      const parsed = JSON.parse(response.content)
      const entities = parsed['@graph'] || parsed.items || []

      entities.forEach((entity: any) => {
        if (!entity?.dueDate) return
        const itemDate = parseISO(entity.dueDate)
        if (!isSameDay(itemDate, today)) return

        const isPast = isBefore(itemDate, now)

        allItems.push({
          id: entity.id || entity['@id'],
          name: entity.name || entity.title || 'Reminder',
          label: 'reminder',
          startDate: entity.dueDate,
          color: entity.color || '#f59e0b',
          type: 'reminder',
          isPast,
        })
      })
    } catch (e) {
      console.debug('[TodayScheduleWidget] No reminders found:', e)
    }

    // Sort: all-day first, then by time, past items last
    allItems.sort((a, b) => {
      // All-day events first
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      // Past items last
      if (a.isPast && !b.isPast) return 1
      if (!a.isPast && b.isPast) return -1
      // Then by start time
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })

    setItems(allItems.slice(0, settings.maxItems))
    onUpdate({
      state: {
        ...state,
        lastRefreshed: new Date().toISOString(),
      },
    })
    setLoading(false)
  }, [vaultPath, settings.maxItems])

  React.useEffect(() => {
    loadTodayItems()
  }, [loadTodayItems])

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Today</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadTodayItems} disabled={loading}>
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Items */}
      <ScrollArea className="h-[200px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <Calendar className="h-8 w-8 mb-2 opacity-30" />
            <p>No events today</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const labelConfig = getLabelConfig(item.label)
              const color = item.color || labelConfig.color
              const Icon = item.type === 'reminder' ? Bell : labelConfig.icon

              const timeDisplay = item.isAllDay ? 'All day' : format(parseISO(item.startDate), 'h:mm a')

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm transition-opacity',
                    item.isPast && 'opacity-50',
                  )}
                  style={{ backgroundColor: `${color}12` }}>
                  <div
                    className="flex items-center justify-center h-7 w-7 rounded-md shrink-0"
                    style={{ backgroundColor: `${color}20` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('truncate font-medium text-sm', item.isPast && 'line-through')}>{item.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeDisplay}</span>
                    </div>
                  </div>
                  {item.isPast && <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
