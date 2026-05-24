/**
 * Kanban View
 * Shows calendar items in draggable columns
 * Grouping can be by: label, urgency, or custom status
 */

import * as React from 'react'
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type CalendarItem,
  type EventLabel,
  type ItemStatus,
  LABEL_LIST,
  STATUS_LIST,
  getLabelConfig,
  getStatusConfig,
  sortByUrgency,
  isDeadlineApproaching,
} from '@/lib/calendar/types'

interface KanbanViewProps {
  selectedDate: Date
  items: CalendarItem[]
  onDateSelect: (date: Date) => void
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
}

type GroupBy = 'day' | 'label' | 'urgency' | 'status'

export function KanbanView({ selectedDate, items, onDateSelect, onItemClick }: KanbanViewProps) {
  const [groupBy, setGroupBy] = React.useState<GroupBy>('label')

  // Get week days for day grouping
  const weekStart = startOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate),
  })

  // Group items based on current groupBy setting
  const columns = React.useMemo(() => {
    if (groupBy === 'day') {
      return weekDays.map((day) => ({
        id: day.toISOString(),
        title: format(day, 'EEE d'),
        subtitle: format(day, 'MMM'),
        items: sortByUrgency(items.filter((item) => isSameDay(new Date(item.startDate), day))),
        color: undefined,
      }))
    }

    if (groupBy === 'label') {
      // Only show labels that have items
      const labelsWithItems = LABEL_LIST.filter((label) => items.some((item) => item.label === label.id))
      return labelsWithItems.map((label) => ({
        id: label.id,
        title: label.name,
        subtitle: undefined,
        items: sortByUrgency(items.filter((item) => item.label === label.id)),
        color: label.color,
      }))
    }

    if (groupBy === 'urgency') {
      return [
        {
          id: 'high',
          title: 'High Priority',
          subtitle: 'Urgency 3',
          items: sortByUrgency(items.filter((item) => item.urgency === 3)),
          color: '#ef4444',
        },
        {
          id: 'medium',
          title: 'Medium',
          subtitle: 'Urgency 2',
          items: sortByUrgency(items.filter((item) => item.urgency === 2)),
          color: '#f59e0b',
        },
        {
          id: 'low',
          title: 'Low Priority',
          subtitle: 'Urgency 1',
          items: sortByUrgency(items.filter((item) => item.urgency === 1)),
          color: '#22c55e',
        },
      ]
    }

    // Group by status (default columns, show all statuses)
    return STATUS_LIST.map((status) => ({
      id: status.id,
      title: status.name,
      subtitle: undefined,
      items: sortByUrgency(items.filter((item) => (item.status || 'backlog') === status.id)),
      color: status.color,
      icon: status.icon,
    }))
  }, [items, groupBy, weekDays])

  return (
    <div className="flex flex-col h-full">
      {/* Kanban Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Group by:</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="label">Label</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="urgency">Urgency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto h-full">
        <div className="flex gap-4 p-4 min-h-ful h-fit">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col w-72 shrink-0 rounded-xl border bg-muted/30">
              {/* Column Header */}
              <div
                className="flex items-center justify-between px-3 py-2 border-b rounded-t-xl"
                style={{
                  borderTopColor: column.color,
                  borderTopWidth: column.color ? '3px' : undefined,
                }}>
                <div>
                  <h3 className="font-medium text-sm">{column.title}</h3>
                  {column.subtitle && <p className="text-xs text-muted-foreground">{column.subtitle}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{column.items.length}</span>
              </div>

              {/* Column Items */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                  {column.items.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No items</div>
                  ) : (
                    column.items.map((item) => {
                      const labelConfig = getLabelConfig(item.label)
                      const IconComponent = labelConfig.icon
                      const color = item.color || labelConfig.color
                      const shouldPulse = item.urgency === 3 || isDeadlineApproaching(item)

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => onItemClick(item, e)}
                          className={cn(
                            'rounded-lg p-3 bg-card border cursor-pointer hover:shadow-md transition-shadow',
                            shouldPulse && 'animate-pulse-subtle',
                          )}>
                          {/* Item Header */}
                          <div className="flex items-start gap-2 mb-2">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                              style={{ backgroundColor: `${color}20` }}>
                              <IconComponent className="h-3.5 w-3.5" style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-tight">{item.name}</p>
                            </div>
                            {item.urgency === 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium shrink-0">
                                !
                              </span>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {item.startDate && (
                              <p>
                                {format(new Date(item.startDate), 'MMM d')}
                                {item.startDate.includes('T') && ` · ${format(new Date(item.startDate), 'h:mm a')}`}
                              </p>
                            )}
                            {item.location && <p className="truncate">📍 {item.location}</p>}
                            {item.amount !== undefined && (
                              <p className="font-medium" style={{ color }}>
                                ${item.amount.toLocaleString()}
                              </p>
                            )}
                          </div>

                          {/* Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
