/**
 * Calendar Item Dialog
 * Popup for viewing/editing calendar items
 * Shows item details, linked note, and participants
 */

import * as React from 'react'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import {
  X,
  Clock,
  MapPin,
  Users,
  FileText,
  Tag,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type CalendarItem, getLabelConfig, isDeadlineApproaching } from '@/lib/calendar/types'

interface CalendarItemDialogProps {
  item: CalendarItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (item: CalendarItem) => void
  onDelete?: (item: CalendarItem) => void
  onToggleComplete?: (item: CalendarItem) => void
}

export function CalendarItemDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleComplete,
}: CalendarItemDialogProps) {
  const [noteContents, setNoteContents] = React.useState<Record<string, string | null>>({})
  const [noteLoading, setNoteLoading] = React.useState(false)

  // Load linked notes content
  React.useEffect(() => {
    if (!item?.notes?.length || !open) {
      setNoteContents({})
      return
    }

    const loadNotes = async () => {
      setNoteLoading(true)
      const contents: Record<string, string | null> = {}
      for (const notePath of item.notes || []) {
        try {
          const response = await invoke<{ content: string }>('read_text_file', {
            filePath: notePath,
          })
          contents[notePath] = response.content
        } catch {
          contents[notePath] = null
        }
      }
      setNoteContents(contents)
      setNoteLoading(false)
    }

    loadNotes()
  }, [item?.notes, open])

  if (!item) return null

  const labelConfig = getLabelConfig(item.label)
  const IconComponent = labelConfig.icon
  const color = item.color || labelConfig.color
  const isPulsing = isDeadlineApproaching(item)
  const isCompletable = labelConfig.behavior === 'completable'

  const startDate = new Date(item.startDate)
  const endDate = item.endDate ? new Date(item.endDate) : null
  const isAllDay = !item.startDate.includes('T')

  // Format time display
  const timeDisplay = isAllDay
    ? 'All day'
    : endDate
      ? `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
      : format(startDate, 'h:mm a')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with color accent */}
        <div className="px-6 pt-6 pb-4" style={{ backgroundColor: `${color}15` }}>
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isPulsing && 'animate-pulse',
                )}
                style={{ backgroundColor: `${color}30` }}>
                <IconComponent className="h-5 w-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold leading-tight">{item.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${color}20`,
                      color,
                      borderColor: color,
                    }}>
                    {labelConfig.name}
                  </Badge>
                  {item.urgency === 3 && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      High Priority
                    </Badge>
                  )}
                  {item.urgency === 2 && (
                    <Badge variant="outline" className="text-xs">
                      Medium
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-4 space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-muted-foreground">{timeDisplay}</p>
                {item.recurrence && <p className="text-xs text-muted-foreground mt-1">Recurring event</p>}
              </div>
            </div>

            {/* Location */}
            {item.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm">{item.location}</p>
              </div>
            )}

            {/* Amount (financial items) */}
            {item.amount !== undefined && (
              <div className="flex items-start gap-3">
                <span className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 text-center text-sm font-bold">$</span>
                <p className="text-sm font-semibold" style={{ color }}>
                  ${item.amount.toLocaleString()}
                </p>
              </div>
            )}

            {/* Participants */}
            {item.participants && item.participants.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {item.participants.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p.split(':')[1] || p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{item.description}</p>
                </div>
              </>
            )}

            {/* Linked Notes */}
            {item.notes && item.notes.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Linked Notes ({item.notes.length})</p>
                  </div>
                  {noteLoading ? (
                    <p className="text-sm text-muted-foreground">Loading notes...</p>
                  ) : (
                    <div className="space-y-2">
                      {item.notes.map((notePath) => {
                        const fileName = notePath.split('/').pop() || notePath
                        const content = noteContents[notePath]
                        return (
                          <div key={notePath} className="rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">{fileName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  // TODO: Open note in editor
                                }}>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            </div>
                            {content ? (
                              <pre className="text-sm whitespace-pre-wrap font-mono">
                                {content.slice(0, 300)}
                                {content.length > 300 && '...'}
                              </pre>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Note not found</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-2">
            {isCompletable && onToggleComplete && (
              <Button
                variant={item.completed ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => onToggleComplete(item)}
                className="gap-1.5">
                {item.completed ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Mark Complete
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
