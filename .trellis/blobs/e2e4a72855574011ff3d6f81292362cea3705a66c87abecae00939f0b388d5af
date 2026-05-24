import * as React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { CalendarItem, getLabelConfig, isDeadlineApproaching } from '@/lib/calendar/types'
import { Badge } from '@/components/ui/badge'

interface TableViewProps {
  items: CalendarItem[]
  onItemClick: (item: CalendarItem, e: React.MouseEvent) => void
}

const COLUMNS = [
  { key: 'name', label: 'Name', width: 200 },
  { key: 'label', label: 'Type', width: 100 },
  { key: 'startDate', label: 'Start Date', width: 140 },
  { key: 'endDate', label: 'End Date', width: 140 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'urgency', label: 'Urgency', width: 80 },
  { key: 'location', label: 'Location', width: 150 },
  { key: 'amount', label: 'Amount', width: 100 },
  { key: 'description', label: 'Description', width: 300 },
]

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return dateStr
    return format(date, 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function TableView({ items, onItemClick }: TableViewProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background z-10">
              <TableHead className="w-10">#</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }} className="text-xs font-medium">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 1} className="py-10 text-center text-muted-foreground text-xs">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => {
                const labelConfig = getLabelConfig(item.label)
                const IconComponent = labelConfig.icon
                const color = item.color || labelConfig.color
                const shouldPulse = item.urgency === 3 || isDeadlineApproaching(item)

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'group cursor-pointer hover:bg-muted/50',
                      shouldPulse && 'animate-pulse-subtle',
                    )}
                    onClick={(e) => onItemClick(item, e)}>
                    <TableCell className="w-10 text-[10px] text-muted-foreground tabular-nums">{idx + 1}</TableCell>

                    {/* Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                          title={labelConfig.name}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                    </TableCell>

                    {/* Label */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-xs">{labelConfig.name}</span>
                      </div>
                    </TableCell>

                    {/* Start Date */}
                    <TableCell className="text-xs tabular-nums">{formatDate(item.startDate)}</TableCell>

                    {/* End Date */}
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(item.endDate)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {item.status && (
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Urgency */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.urgency }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              item.urgency === 3
                                ? 'bg-destructive'
                                : item.urgency === 2
                                  ? 'bg-amber-500'
                                  : 'bg-muted-foreground',
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="text-xs text-muted-foreground truncate">{item.location}</TableCell>

                    {/* Amount */}
                    <TableCell className="text-xs tabular-nums font-medium">
                      {item.amount !== undefined && (
                        <span style={{ color: item.amount >= 0 ? color : undefined }}>
                          {formatCurrency(item.amount)}
                        </span>
                      )}
                    </TableCell>

                    {/* Description */}
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="line-clamp-2">{item.description}</div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  )
}
