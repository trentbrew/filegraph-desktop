/**
 * New Event Dialog
 * Dialog for creating new calendar events
 */

import * as React from 'react'
import { format, setHours, setMinutes } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type EventLabel,
  type ItemStatus,
  type Urgency,
  LABEL_LIST,
  STATUS_LIST,
  getLabelConfig,
  getStatusConfig,
} from '@/lib/calendar/types'

// Initial data for pre-populating the form (e.g., from agent)
export interface EventInitialData {
  name?: string
  label?: EventLabel
  urgency?: Urgency
  status?: ItemStatus
  date?: string // YYYY-MM-DD
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  isAllDay?: boolean
  description?: string
  location?: string
  participants?: string[]
  syncToGoogle?: boolean
}

interface NewEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  defaultHour?: number
  initialData?: EventInitialData // Pre-populated data from agent
  onSave?: (event: NewEventData) => void
}

export interface NewEventData {
  name: string
  label: EventLabel
  urgency: Urgency
  status?: ItemStatus
  startDate: string
  endDate?: string
  description?: string
  location?: string
}

export function NewEventDialog({
  open,
  onOpenChange,
  defaultDate = new Date(),
  defaultHour,
  initialData,
  onSave,
}: NewEventDialogProps) {
  // Form state
  const [name, setName] = React.useState('')
  const [label, setLabel] = React.useState<EventLabel>('event')
  const [urgency, setUrgency] = React.useState<Urgency>(2)
  const [status, setStatus] = React.useState<ItemStatus>('backlog')
  const [date, setDate] = React.useState(format(defaultDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = React.useState(
    defaultHour !== undefined ? `${String(defaultHour).padStart(2, '0')}:00` : '09:00',
  )
  const [endTime, setEndTime] = React.useState(
    defaultHour !== undefined ? `${String(defaultHour + 1).padStart(2, '0')}:00` : '10:00',
  )
  const [isAllDay, setIsAllDay] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [location, setLocation] = React.useState('')

  // Reset form when dialog opens with new defaults or initialData
  React.useEffect(() => {
    if (open) {
      // Use initialData if provided, otherwise use defaults
      setName(initialData?.name || '')
      setDate(initialData?.date || format(defaultDate, 'yyyy-MM-dd'))
      setStartTime(
        initialData?.startTime || (defaultHour !== undefined ? `${String(defaultHour).padStart(2, '0')}:00` : '09:00'),
      )
      setEndTime(
        initialData?.endTime ||
          (defaultHour !== undefined ? `${String(defaultHour + 1).padStart(2, '0')}:00` : '10:00'),
      )
      setLabel(initialData?.label || 'event')
      setUrgency(initialData?.urgency || 2)
      setStatus(initialData?.status || 'backlog')
      setIsAllDay(initialData?.isAllDay || false)
      setDescription(initialData?.description || '')
      setLocation(initialData?.location || '')
    }
  }, [open, defaultDate, defaultHour, initialData])

  const handleSave = () => {
    if (!name.trim()) return

    const startDate = isAllDay ? date : `${date}T${startTime}:00`
    const endDate = isAllDay ? undefined : `${date}T${endTime}:00`

    const eventData: NewEventData = {
      name: name.trim(),
      label,
      urgency,
      status,
      startDate,
      endDate,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
    }

    onSave?.(eventData)
    onOpenChange(false)
  }

  const selectedLabelConfig = getLabelConfig(label)
  const IconComponent = selectedLabelConfig.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>Create a new calendar event for {format(defaultDate, 'MMMM d, yyyy')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              placeholder="Enter event name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Label & Urgency Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Select value={label} onValueChange={(v) => setLabel(v as EventLabel)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" style={{ color: selectedLabelConfig.color }} />
                      <span>{selectedLabelConfig.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LABEL_LIST.filter((l) => !l.isFinancial).map((labelConfig) => {
                    const LabelIcon = labelConfig.icon
                    return (
                      <SelectItem key={labelConfig.id} value={labelConfig.id}>
                        <div className="flex items-center gap-2">
                          <LabelIcon className="h-4 w-4" style={{ color: labelConfig.color }} />
                          <span>{labelConfig.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <div className="flex gap-1">
                {([1, 2, 3] as Urgency[]).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={urgency === level ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'flex-1',
                      level === 3 && urgency === level && 'bg-destructive hover:bg-destructive/90',
                    )}
                    onClick={() => setUrgency(level)}>
                    {level === 1 ? 'Low' : level === 2 ? 'Medium' : 'High'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
              <SelectTrigger>
                <SelectValue>
                  {(() => {
                    const statusConfig = getStatusConfig(status)
                    const StatusIcon = statusConfig.icon
                    return (
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" style={{ color: statusConfig.color }} />
                        <span>{statusConfig.name}</span>
                      </div>
                    )
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_LIST.map((statusConfig) => {
                  const StatusIcon = statusConfig.icon
                  return (
                    <SelectItem key={statusConfig.id} value={statusConfig.id}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" style={{ color: statusConfig.color }} />
                        <span>{statusConfig.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="allDay" className="text-sm font-normal cursor-pointer">
              All day event
            </Label>
          </div>

          {/* Time Row (hidden for all-day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              placeholder="Add location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
