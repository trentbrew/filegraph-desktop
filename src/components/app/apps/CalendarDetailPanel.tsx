/**
 * Calendar Detail Panel
 * Sheet-based panel for event details
 */

import * as React from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  AlertTriangle,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  FileText,
  Plus,
  ExternalLink,
  ChevronRight,
  Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { type CalendarItem, getLabelConfig } from '@/lib/calendar/types'
import { rruleToText, isRecurring } from '@/lib/calendar/recurrence'
import { TagEditor } from './TagEditor'

interface CalendarDetailPanelProps {
  item: CalendarItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (item: CalendarItem) => void
  onDelete?: (item: CalendarItem) => void
  onToggleComplete?: (item: CalendarItem) => void
  onCreateNote?: (item: CalendarItem) => void
  onOpenNote?: (notePath: string) => void
  onTagsChange?: (item: CalendarItem, tags: string[]) => void
  suggestedTags?: string[]
}

export function CalendarDetailPanel({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleComplete,
  onCreateNote,
  onOpenNote,
  onTagsChange,
  suggestedTags = [],
}: CalendarDetailPanelProps) {
  const [inlineNotes, setInlineNotes] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Reset inline notes when item changes
  React.useEffect(() => {
    setInlineNotes(item?.description || '')
  }, [item?.id, item?.description])

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inlineNotes])

  const labelConfig = item ? getLabelConfig(item.label) : null
  const IconComponent = labelConfig?.icon
  const color = item?.color || labelConfig?.color || '#888'

  const startDate = item ? new Date(item.startDate) : new Date()
  const endDate = item?.endDate ? new Date(item.endDate) : null
  const isAllDay = item ? !item.startDate.includes('T') : false
  const isMultiDay = endDate && startDate.toDateString() !== endDate.toDateString()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        {item && labelConfig && IconComponent && (
          <>
            {/* Header */}
            <SheetHeader className="p-4 border-b space-y-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0"
                  style={{ backgroundColor: `${color}20` }}>
                  <IconComponent className="h-5 w-5" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg truncate">{item.name}</SheetTitle>
                  <SheetDescription asChild>
                    <Badge
                      variant="secondary"
                      className="text-xs mt-1"
                      style={{ backgroundColor: `${color}20`, color }}>
                      {labelConfig.name}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
              {item.urgency === 3 && (
                <div className="flex items-center gap-1.5 mt-3 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">High Priority</span>
                </div>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Date & Time */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                      {isMultiDay && endDate && (
                        <p className="text-muted-foreground">to {format(endDate, 'EEEE, MMMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>

                  {!isAllDay && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="text-sm">
                        <p>
                          {format(startDate, 'h:mm a')}
                          {endDate && ` - ${format(endDate, 'h:mm a')}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {isAllDay && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">All day</span>
                    </div>
                  )}

                  {/* Recurrence */}
                  {isRecurring(item.recurrence) && (
                    <div className="flex items-start gap-3">
                      <Repeat className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-500 dark:text-purple-400">Recurring</p>
                        <p className="text-muted-foreground">{rruleToText(item.recurrence)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location */}
                {item.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm">{item.location}</p>
                  </div>
                )}

                {/* Participants */}
                {item.participants && item.participants.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {item.participants.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {p.replace(/^person:/, '').replace(/:.*$/, '')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <TagEditor
                    tags={item.tags || []}
                    onChange={(tags) => onTagsChange?.(item, tags)}
                    suggestedTags={suggestedTags}
                    disabled={!onTagsChange}
                    placeholder="Add tag..."
                  />
                </div>

                {/* Amount (for financial items) */}
                {item.amount !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                    <span className="text-2xl font-bold" style={{ color }}>
                      ${item.amount.toLocaleString()}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Quick Notes (inline description) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Quick Notes</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={inlineNotes}
                    onChange={(e) => setInlineNotes(e.target.value)}
                    placeholder="Add a quick note..."
                    className={cn(
                      'w-full min-h-[80px] p-3 rounded-lg border bg-muted/30 resize-none',
                      'text-sm leading-relaxed',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                      'placeholder:text-muted-foreground/50',
                    )}
                  />
                </div>

                {/* Linked Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Linked Notes</span>
                      {item.notes && item.notes.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.notes.length}
                        </Badge>
                      )}
                    </div>
                    {onCreateNote && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => onCreateNote(item)}>
                        <Plus className="h-3 w-3" />
                        New Note
                      </Button>
                    )}
                  </div>

                  {item.notes && item.notes.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        // Pre-compute display names and count duplicates
                        const nameCount: Record<string, number> = {}
                        const displayNames = item.notes!.map((noteRef) => {
                          const isEntityId = noteRef.match(/^note:([a-z0-9-]+):\d{3}$/i)
                          let baseName: string
                          if (isEntityId) {
                            const slug = isEntityId[1]
                            const withoutTimestamp = slug.replace(/-\d{13}$/, '')
                            baseName = withoutTimestamp.replace(/-/g, ' ') || 'Note'
                          } else {
                            baseName =
                              noteRef
                                .split('/')
                                .pop()
                                ?.replace(/\.note$/, '') || noteRef
                          }
                          nameCount[baseName] = (nameCount[baseName] || 0) + 1
                          return baseName
                        })

                        // Track occurrence index for numbering
                        const nameOccurrence: Record<string, number> = {}
                        return item.notes!.map((noteRef, index) => {
                          const baseName = displayNames[index]
                          nameOccurrence[baseName] = (nameOccurrence[baseName] || 0) + 1
                          const displayName =
                            nameCount[baseName] > 1 ? `${baseName} (${nameOccurrence[baseName]})` : baseName
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => onOpenNote?.(noteRef)}
                              className={cn(
                                'flex items-center gap-2 w-full p-2 rounded-lg border bg-muted/30',
                                'hover:bg-accent transition-colors text-left group',
                              )}>
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate flex-1 capitalize">{displayName}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )
                        })
                      })()}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed bg-muted/20 text-center">
                      <p className="text-sm text-muted-foreground">No linked notes yet</p>
                      {onCreateNote && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs"
                          onClick={() => onCreateNote(item)}>
                          Create your first note
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Completion Status (for tasks) */}
                {item.completed !== undefined && (
                  <button
                    type="button"
                    onClick={() => onToggleComplete?.(item)}
                    className={cn(
                      'flex items-center gap-3 w-full p-3 rounded-lg border transition-colors',
                      item.completed ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-accent',
                    )}>
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={cn('text-sm font-medium', item.completed && 'text-green-500')}>
                      {item.completed ? 'Completed' : 'Mark as complete'}
                    </span>
                  </button>
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            {/* <SheetFooter className="border-t p-4 flex-row gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => onEdit?.(item)}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onDelete?.(item)
                  onOpenChange(false)
                }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </SheetFooter> */}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
