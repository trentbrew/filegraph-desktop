/**
 * InlineEventCard - Compact event preview card for chat bubbles
 *
 * Shows a summary of the event with an "Expand" button to open the full modal.
 * Can be in pending, created, or cancelled state.
 */

import * as React from 'react'
import { format, parse } from 'date-fns'
import { Calendar, Clock, MapPin, Maximize2, Check, X, Edit2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getLabelConfig, type EventLabel } from '@/lib/calendar/types'
import { type EventFormCardData } from '../hooks/useChatStore'

interface InlineEventCardProps {
  data: EventFormCardData
  onExpand: () => void
  onConfirm: () => void
  onCancel: () => void
  onViewEvent?: () => void
  onEdit?: (data: EventFormCardData) => void
}

export function InlineEventCard({ data, onExpand, onConfirm, onCancel, onViewEvent }: InlineEventCardProps) {
  const labelConfig = getLabelConfig((data.label as EventLabel) || 'event')
  const IconComponent = labelConfig.icon
  const color = labelConfig.color

  // Format date for display
  const formattedDate = React.useMemo(() => {
    if (!data.date) return 'No date'
    try {
      const date = parse(data.date, 'yyyy-MM-dd', new Date())
      return format(date, 'EEE, MMM d, yyyy')
    } catch {
      return data.date
    }
  }, [data.date])

  // Format time for display
  const formattedTime = React.useMemo(() => {
    if (data.isAllDay) return 'All day'
    if (!data.startTime) return ''
    const start = data.startTime
    const end = data.endTime || ''
    return end ? `${start} - ${end}` : start
  }, [data.startTime, data.endTime, data.isAllDay])

  const isCreated = data.status === 'created'
  const isCancelled = data.status === 'cancelled'
  const isPending = data.status === 'pending' || !data.status

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden mt-2',
        isCreated && 'border-green-500/50 bg-green-500/5',
        isCancelled && 'border-muted bg-muted/30 opacity-60',
        isPending && 'border-border bg-card',
      )}>
      {/* Header with icon and name */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ backgroundColor: isPending ? `${color}10` : undefined }}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}20` }}>
          <IconComponent className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{data.name || 'Untitled Event'}</h4>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: `${color}20`, color }}>
            {data.label || 'event'}
          </span>
        </div>
        {isCreated && <Check className="h-5 w-5 text-green-500 shrink-0" />}
        {isCancelled && <X className="h-5 w-5 text-muted-foreground shrink-0" />}
      </div>

      {/* Details */}
      <div className="px-3 py-2 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        {formattedTime && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{formattedTime}</span>
          </div>
        )}
        {data.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{data.location}</span>
          </div>
        )}
        {data.description && <p className="text-muted-foreground line-clamp-2 pt-1">{data.description}</p>}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t bg-muted/30">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onExpand}>
            <Maximize2 className="h-3 w-3" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={onConfirm}>
            <Check className="h-3 w-3" />
            Create
          </Button>
        </div>
      )}

      {/* Status messages */}
      {isCreated && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-green-500/5">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            Event created successfully
          </div>
          {onViewEvent && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onViewEvent}>
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
          )}
        </div>
      )}
      {isCancelled && (
        <div className="flex items-center gap-2 px-3 py-2 border-t text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Event creation cancelled
        </div>
      )}
    </div>
  )
}
