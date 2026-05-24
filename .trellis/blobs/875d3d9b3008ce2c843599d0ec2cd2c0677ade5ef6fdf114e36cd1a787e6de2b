/**
 * Event Node Component
 *
 * A canvas node that displays a single calendar event.
 * Created when dragging an event from CalendarNode onto the canvas.
 */

import * as React from 'react'
import { type NodeProps } from 'reactflow'
import { format } from 'date-fns'
import { Clock, MapPin, Users, Tag, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  type CalendarItem,
  type EventLabel,
  type Urgency,
  getLabelConfig,
  isDeadlineApproaching,
} from '@/lib/calendar/types'

import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EventNodeData {
  /** The calendar event data */
  event?: CalendarItem
  /** Fallback fields if event not provided */
  eventId?: string
  name?: string
  label?: EventLabel
  urgency?: Urgency
  startDate?: string
  endDate?: string
  location?: string
  description?: string
  completed?: boolean
  color?: string
  participants?: string[]
  tags?: string[]
  isMaximized?: boolean
  deleting?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventNode({ id, data, selected, groupColor }: NodeProps<EventNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [isEditing, setIsEditing] = React.useState(false)

  // Extract event data (either from nested event object or flat data)
  const event = data?.event
  const eventId = event?.id || data?.eventId || id
  const name = event?.name || data?.name || 'Untitled Event'
  const label = event?.label || data?.label || 'event'
  const urgency = event?.urgency || data?.urgency || 2
  const startDate = event?.startDate || data?.startDate
  const endDate = event?.endDate || data?.endDate
  const location = event?.location || data?.location
  const description = event?.description || data?.description
  const completed = event?.completed || data?.completed || false
  const customColor = event?.color || data?.color
  const participants = event?.participants || data?.participants || []
  const tags = event?.tags || data?.tags || []

  // Get label config for styling
  const labelConfig = getLabelConfig(label)
  const IconComponent = labelConfig.icon
  const color = customColor || labelConfig.color

  // Check if deadline is approaching (for pulsing animation)
  const isPulsing = event ? isDeadlineApproaching(event) : false

  // Format time display
  const timeDisplay = React.useMemo(() => {
    if (!startDate) return null
    const start = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
    }
    return format(start, 'h:mm a')
  }, [startDate, endDate])

  // Format date display
  const dateDisplay = React.useMemo(() => {
    if (!startDate) return null
    return format(new Date(startDate), 'EEEE, MMMM d, yyyy')
  }, [startDate])

  // Exit editing when deselected
  React.useEffect(() => {
    if (!selected) setIsEditing(false)
  }, [selected])

  const canInteract = isMaximized || isEditing

  // Urgency indicator
  const UrgencyIndicator = () => {
    if (urgency === 3) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-semibold">High</span>
      )
    }
    if (urgency === 1) {
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Low</span>
    }
    return null
  }

  const body = (
    <div
      className={cn(
        'p-3 flex flex-col gap-2',
        canInteract ? 'nodrag nowheel' : 'pointer-events-none',
        isPulsing && 'animate-pulse',
      )}>
      {/* Header with icon and name */}
      <div className="flex items-start gap-2">
        <div className="shrink-0 p-1.5 rounded-md" style={{ backgroundColor: `${color}20` }}>
          <IconComponent className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {labelConfig.behavior === 'completable' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Toggle completion
                }}
                className="shrink-0">
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            <h3 className={cn('text-sm font-semibold truncate', completed && 'line-through text-muted-foreground')}>
              {name}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${color}20`, color }}>
              {labelConfig.name}
            </span>
            <UrgencyIndicator />
          </div>
        </div>
      </div>

      {/* Time and date */}
      {(timeDisplay || dateDisplay) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <div className="flex flex-col">
            {timeDisplay && <span>{timeDisplay}</span>}
            {dateDisplay && <span className="text-[10px]">{dateDisplay}</span>}
          </div>
        </div>
      )}

      {/* Location */}
      {location && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Participants */}
      {participants.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Description (only in maximized or editing mode) */}
      {description && (isMaximized || isEditing) && (
        <div className="text-xs text-muted-foreground mt-1 border-t pt-2">
          <p className="line-clamp-3">{description}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mt-1">
          <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={`${tag}-${idx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
          {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
        </div>
      )}

      {/* Deadline warning */}
      {isPulsing && (
        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Deadline approaching</span>
        </div>
      )}
    </div>
  )

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<IconComponent className="h-4 w-4" style={{ color }} />}
          label={name}
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
      icon={<IconComponent className="h-3.5 w-3.5" style={{ color }} />}
      label={name}
      minWidth={220}
      minHeight={120}
      autoSize
      borderClass={`border-l-4`}
      bgClass="bg-card"
      selectedRingClass="ring-1 ring-muted-foreground/40"
      editingRingClass="ring-2 ring-primary/70">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ backgroundColor: color }} />
      {body}
    </CanvasNodeWrapper>
  )
}
