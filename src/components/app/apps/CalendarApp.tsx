/**
 * Calendar App
 * Full-screen calendar view with event management
 * Loads events from @calendar/ namespace and @finance/ for financial items
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { add, format, isSameDay, parse, startOfToday } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  LayoutGrid,
  CalendarDays,
  List,
  Columns,
  GanttChart,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Switch } from '@/components/ui/switch'
import { useVault } from '@/contexts/VaultContext'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { MiniCalendar } from '../MiniCalendar'
import {
  type CalendarItem,
  type EventLabel,
  type ItemStatus,
  type Urgency,
  EVENT_LABELS,
  LABEL_LIST,
  FINANCIAL_LABELS,
  getLabelConfig,
  sortByUrgency,
  isDeadlineApproaching,
} from '@/lib/calendar/types'
import { CalendarDetailPanel } from './CalendarDetailPanel'
import { NewEventDialog, type NewEventData, type EventInitialData } from './NewEventDialog'
import { MonthView, WeekView, DayView } from './views'
import { Skeleton } from '@/components/ui/skeleton'

const KanbanView = React.lazy(() => import('./views/KanbanView').then((m) => ({ default: m.KanbanView })))
const GanttView = React.lazy(() => import('./views/GanttView').then((m) => ({ default: m.GanttView })))
const TableView = React.lazy(() => import('./views/TableView').then((m) => ({ default: m.TableView })))
import { useGoogleCalendarStore } from '@/stores/useGoogleCalendarStore'
import { SettingsDialog } from '../SettingsDialog'

// View types
type CalendarView = 'month' | 'week' | 'day' | 'kanban' | 'gantt' | 'table'

const VIEW_OPTIONS: { id: CalendarView; label: string; icon: React.ReactNode }[] = [
  { id: 'month', label: 'Month', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'week', label: 'Week', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'day', label: 'Day', icon: <List className="h-4 w-4" /> },
  { id: 'table', label: 'Table', icon: <List className="h-4 w-4 rotate-90" /> },
  { id: 'kanban', label: 'Kanban', icon: <Columns className="h-4 w-4" /> },
  { id: 'gantt', label: 'Timeline', icon: <GanttChart className="h-4 w-4" /> },
]

export function CalendarApp() {
  const { vaultPath } = useVault()
  const { selectedDate, setSelectedDate, currentMonth, setCurrentMonth, goToPreviousMonth, goToNextMonth } =
    useCalendarStore()
  const { accounts, initSyncEngine } = useGoogleCalendarStore()

  const today = startOfToday()

  // Local state
  const [items, setItems] = React.useState<CalendarItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [currentView, setCurrentView] = React.useState<CalendarView>('month')

  // Filter state
  const [enabledLabels, setEnabledLabels] = React.useState<Set<EventLabel>>(new Set(LABEL_LIST.map((l) => l.id)))

  // Detail panel state
  const [selectedItem, setSelectedItem] = React.useState<CalendarItem | null>(null)
  const [panelOpen, setPanelOpen] = React.useState(false)

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  // New event dialog state
  const [newEventDialogOpen, setNewEventDialogOpen] = React.useState(false)
  const [newEventDate, setNewEventDate] = React.useState<Date>(new Date())
  const [newEventHour, setNewEventHour] = React.useState<number | undefined>(undefined)
  const [newEventInitialData, setNewEventInitialData] = React.useState<EventInitialData | undefined>(undefined)

  // Listen for agent-triggered new event dialog
  React.useEffect(() => {
    const handleAgentNewEvent = (e: CustomEvent<EventInitialData>) => {
      const data = e.detail
      setNewEventInitialData(data)
      if (data.date) {
        setNewEventDate(new Date(data.date))
      }
      setNewEventDialogOpen(true)
    }

    window.addEventListener('agent:open-new-event-dialog', handleAgentNewEvent as EventListener)
    return () => {
      window.removeEventListener('agent:open-new-event-dialog', handleAgentNewEvent as EventListener)
    }
  }, [])

  // Open item in detail panel
  const handleItemClick = (item: CalendarItem, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent day selection
    setSelectedItem(item)
    setPanelOpen(true)
  }

  // Close panel
  const closePanel = React.useCallback(() => {
    setPanelOpen(false)
  }, [])

  // Open new event dialog for a specific day (and optionally hour)
  const openNewEventDialog = React.useCallback((date: Date, hour?: number) => {
    setNewEventDate(date)
    setNewEventHour(hour)
    setNewEventDialogOpen(true)
  }, [])

  // Handle saving new event
  const handleSaveNewEvent = React.useCallback(async (eventData: NewEventData) => {
    // TODO: Actually save to @calendar/events.data
    console.log('New event created:', eventData)
    // For now, just add to local state
    const newItem: CalendarItem = {
      id: `event:${Date.now()}`,
      ...eventData,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  // Copy date to clipboard
  const copyDateToClipboard = React.useCallback((date: Date) => {
    navigator.clipboard.writeText(format(date, 'MMMM d, yyyy'))
  }, [])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          if (panelOpen) {
            closePanel()
            e.preventDefault()
          }
          break
        case 'ArrowLeft':
          goToPreviousMonth()
          e.preventDefault()
          break
        case 'ArrowRight':
          goToNextMonth()
          e.preventDefault()
          break
        case 't':
          if (!e.metaKey && !e.ctrlKey) {
            goToToday()
            e.preventDefault()
          }
          break
        case '1':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('month')
            e.preventDefault()
          }
          break
        case '2':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('week')
            e.preventDefault()
          }
          break
        case '3':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('day')
            e.preventDefault()
          }
          break
        case '4':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('table')
            e.preventDefault()
          }
          break
        case '5':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('kanban')
            e.preventDefault()
          }
          break
        case '6':
          if (!e.metaKey && !e.ctrlKey) {
            setCurrentView('gantt')
            e.preventDefault()
          }
          break
        case 'n':
          if (e.metaKey || e.ctrlKey) {
            openNewEventDialog(selectedDate)
            e.preventDefault()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panelOpen, closePanel])
  const [showFinancial, setShowFinancial] = React.useState(true)
  const [minUrgency, setMinUrgency] = React.useState<Urgency>(1)

  // Parse current month
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

  // Toggle label filter
  const toggleLabel = (label: EventLabel) => {
    setEnabledLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  // Filter items based on current settings
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // Label filter
      if (!enabledLabels.has(item.label)) return false
      // Financial filter
      const labelConfig = getLabelConfig(item.label)
      if (labelConfig.isFinancial && !showFinancial) return false
      // Urgency filter
      if (item.urgency < minUrgency) return false
      return true
    })
  }, [items, enabledLabels, showFinancial, minUrgency])

  // Get items for a specific day (sorted by urgency)
  const getItemsForDay = React.useCallback(
    (day: Date) => {
      const dayItems = filteredItems.filter((item) => {
        const itemDate = new Date(item.startDate)
        return isSameDay(itemDate, day)
      })
      return sortByUrgency(dayItems)
    },
    [filteredItems],
  )

  // Load events from @calendar/ and optionally @finance/
  const loadCalendarItems = React.useCallback(async () => {
    if (!vaultPath) return

    setLoading(true)
    setError(null)

    const foundItems: CalendarItem[] = []

    // Load from @calendar/events.data
    try {
      const calendarPath = `${vaultPath}/@calendar/events.data`
      const response = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
      const data = JSON.parse(response.content)
      const entities = data['@graph'] || []

      for (const entity of entities) {
        if (!entity?.startDate) continue
        foundItems.push({
          '@type': entity['@type'],
          id: entity.id || entity['@id'],
          slug: entity.slug,
          label: (entity.label as EventLabel) || 'event',
          urgency: (entity.urgency as Urgency) || 2,
          status: (entity.status as ItemStatus) || 'backlog',
          name: entity.name || 'Untitled',
          description: entity.description,
          startDate: entity.startDate,
          endDate: entity.endDate,
          location: entity.location,
          participants: entity.participants,
          notes: entity.notes || (entity.note ? [entity.note] : undefined),
          recurrence: entity.recurrence,
          completed: entity.completed,
          color: entity.color,
          tags: entity.tags,
        })
      }
    } catch (e) {
      console.warn('[CalendarApp] No @calendar/events.data found or error reading:', e)
    }

    // Load financial items from @finance/ if enabled
    if (showFinancial) {
      const financeFiles = ['bills.data', 'subscriptions.data', 'transactions.data']
      for (const file of financeFiles) {
        try {
          const financePath = `${vaultPath}/@finance/${file}`
          const response = await invoke<{ content: string }>('read_text_file', { filePath: financePath })
          const data = JSON.parse(response.content)
          const entities = data['@graph'] || []

          for (const entity of entities) {
            const dateField = entity.dueDate || entity.date || entity.nextDate || entity.startDate
            if (!dateField) continue

            // Map finance entity to calendar item
            const isPayday = entity.type === 'income' || entity.category === 'income'
            const isBill = file === 'bills.data' || entity.type === 'bill'

            foundItems.push({
              '@type': entity['@type'],
              id: entity.id || entity['@id'],
              slug: entity.slug,
              label: isPayday ? 'payday' : isBill ? 'transaction' : 'transaction',
              urgency: entity.urgency || (isBill ? 2 : 1),
              name: entity.name || entity.description || 'Financial Item',
              description: entity.description,
              startDate: dateField,
              amount: entity.amount,
              color: entity.color,
              tags: entity.tags,
            })
          }
        } catch {
          // File doesn't exist or can't be read
        }
      }
    }

    // Load Google Calendar synced events
    for (const account of accounts) {
      if (!account.calendarSyncEnabled) continue

      for (const calendarId of account.selectedCalendars) {
        try {
          const safeCalendarId = calendarId.replace(/[^a-z0-9]/gi, '-')
          const googlePath = `${vaultPath}/@calendar/google-${account.id}-${safeCalendarId}.data`
          const response = await invoke<{ content: string }>('read_text_file', { filePath: googlePath })
          const data = JSON.parse(response.content)
          const entities = data['@graph'] || []

          for (const entity of entities) {
            if (!entity?.startDate) continue
            // Skip duplicates (by Google event ID)
            if (foundItems.some((item) => item.id === entity.id)) continue

            foundItems.push({
              '@type': entity['@type'],
              id: entity.id,
              slug: entity.slug,
              label: (entity.label as EventLabel) || 'event',
              urgency: (entity.urgency as Urgency) || 2,
              status: (entity.status as ItemStatus) || 'backlog',
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

    setItems(foundItems)
    setLoading(false)
  }, [vaultPath, showFinancial, accounts])

  // Initialize Google Calendar sync engine
  React.useEffect(() => {
    if (vaultPath) {
      initSyncEngine(vaultPath)
    }
  }, [vaultPath, initSyncEngine])

  // Load items on mount and when showFinancial changes
  React.useEffect(() => {
    loadCalendarItems()
  }, [loadCalendarItems])

  // Get items for selected date (for sidebar)
  const selectedDayItems = React.useMemo(() => {
    return getItemsForDay(selectedDate)
  }, [selectedDate, getItemsForDay])

  // Get event dates for mini calendar
  const eventDates = React.useMemo(() => {
    const dates: Date[] = []
    filteredItems.forEach((item) => {
      const d = new Date(item.startDate)
      if (!isNaN(d.getTime())) dates.push(d)
    })
    return dates
  }, [filteredItems])

  // Count items by label for filter badges
  const labelCounts = React.useMemo(() => {
    const counts = new Map<EventLabel, number>()
    items.forEach((item) => {
      counts.set(item.label, (counts.get(item.label) || 0) + 1)
    })
    return counts
  }, [items])

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full p-0 gap-3">
      {/* Left Sidebar */}
      {!sidebarCollapsed && (
        <>
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full rounded-lg border flex flex-col overflow-hidden">
              {/* Sidebar Header with Collapse Button */}
              {/* <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sidebar</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarCollapsed(true)}>
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div> */}
              {/* Google Account Switcher (Non-collapsible) */}
              <div className="px-3 py-3 border-b space-y-3">
                {accounts.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-2">No accounts connected</p>
                    <SettingsDialog
                      trigger={
                        <Button variant="outline" size="sm">
                          Connect Google
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center gap-2 text-sm">
                        {account.picture ? (
                          <img src={account.picture} alt="" className="h-5 w-5 rounded-full" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-primary/10" />
                        )}
                        <span className="flex-1 truncate">{account.email}</span>
                        {account.calendarSyncEnabled ? (
                          <span className="text-xs text-green-600">Syncing</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Paused</span>
                        )}
                      </div>
                    ))}
                    <SettingsDialog
                      trigger={
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          Manage Accounts
                        </Button>
                      }
                    />
                  </>
                )}
              </div>

              <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={['calendar', 'selected', 'labels']}>
                  {/* Mini Calendar */}
                  <AccordionItem value="calendar" className="border-b">
                    <AccordionTrigger className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:no-underline">
                      Calendar
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                          setSelectedDate(date)
                          setCurrentMonth(format(date, 'MMM-yyyy'))
                        }}
                        eventDates={eventDates}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Selected Day Items */}
                  <AccordionItem value="selected" className="border-b">
                    <AccordionTrigger className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:no-underline">
                      {format(selectedDate, 'EEEE, MMM d')}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="px-3 pb-3">
                          {selectedDayItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground/60 italic">No events scheduled</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedDayItems.map((item) => {
                                const labelConfig = getLabelConfig(item.label)
                                const IconComponent = labelConfig.icon
                                const color = item.color || labelConfig.color
                                const isPulsing = isDeadlineApproaching(item)

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => handleItemClick(item, e)}
                                    className={cn(
                                      'rounded-md p-2.5 text-sm cursor-pointer transition-all hover:translate-x-0.5 hover:shadow-sm min-w-0',
                                      isPulsing && 'animate-pulse',
                                    )}
                                    style={{
                                      backgroundColor: `${color}15`,
                                      borderLeft: `3px solid ${color}`,
                                    }}>
                                    <div className="flex items-start gap-2 min-w-0">
                                      <IconComponent className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
                                      <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="font-medium truncate text-ellipsis">{item.name}</p>
                                        {item.startDate && (
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(item.startDate), 'h:mm a')}
                                          </p>
                                        )}
                                        {item.amount !== undefined && (
                                          <p className="text-xs font-medium" style={{ color }}>
                                            ${item.amount.toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                      {item.urgency === 3 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                                          !
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Labels Filter */}
                  <AccordionItem value="labels" className="border-b">
                    <AccordionTrigger className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:no-underline">
                      Labels
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="max-h-64">
                        <div className="px-3 pb-3 space-y-2">
                          {LABEL_LIST.map((labelConfig) => {
                            const count = labelCounts.get(labelConfig.id) || 0
                            const IconComponent = labelConfig.icon
                            return (
                              <div key={labelConfig.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-3.5 w-3.5" style={{ color: labelConfig.color }} />
                                  <span className="text-sm">{labelConfig.name}</span>
                                  {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
                                </div>
                                <Checkbox
                                  checked={enabledLabels.has(labelConfig.id)}
                                  onCheckedChange={() => toggleLabel(labelConfig.id)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}

      {/* Sidebar Expand Button (when collapsed) */}
      {sidebarCollapsed && (
        <div className="shrink-0 rounded-lg border rounded-xl bg-transparent flex flex-col items-center py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarCollapsed(false)}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Calendar Area */}
      <ResizablePanel defaultSize={panelOpen ? 55 : 80} minSize={40} className="h-full">
        <div className="h-full flex flex-col min-w-0 rounded-lg border bg-background/50 overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">{format(firstDayCurrentMonth, 'MMMM yyyy')}</h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Loading...' : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="inline-flex -space-x-px rounded-lg border shadow-sm">
                {VIEW_OPTIONS.map((view, idx) => (
                  <Button
                    key={view.id}
                    onClick={() => setCurrentView(view.id)}
                    variant={currentView === view.id ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-9 px-3 gap-1.5',
                      idx === 0 && 'rounded-r-none',
                      idx === VIEW_OPTIONS.length - 1 && 'rounded-l-none',
                      idx > 0 && idx < VIEW_OPTIONS.length - 1 && 'rounded-none',
                    )}>
                    {view.icon}
                    <span className="hidden lg:inline text-xs">{view.label}</span>
                  </Button>
                ))}
              </div>

              {/* Month Navigation */}
              <div className="inline-flex -space-x-px rounded-xl border">
                <Button onClick={previousMonth} variant="ghost" size="icon" className="h-9 w-9 rounded-r-none">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button onClick={goToToday} variant="ghost" className="h-9 px-3 rounded-none text-sm border-x">
                  Today
                </Button>
                <Button onClick={nextMonth} variant="ghost" size="icon" className="h-9 w-9 rounded-l-none">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Refresh */}
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadCalendarItems} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>

              {/* New Event */}
              <Button size="sm" className="h-9 gap-1.5" onClick={() => openNewEventDialog(selectedDate)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </div>
          </div>

          {/* Month View with Scroll Snap */}
          {currentView === 'month' && (
            <MonthView
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              items={filteredItems}
              onMonthChange={setCurrentMonth}
              onDateSelect={setSelectedDate}
              onItemClick={handleItemClick}
              onSlotClick={(date) => openNewEventDialog(date)}
              onViewDay={(date) => {
                setSelectedDate(date)
                setCurrentView('day')
              }}
              onViewWeek={(date) => {
                setSelectedDate(date)
                setCurrentView('week')
              }}
            />
          )}

          {/* Week View */}
          {currentView === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              items={filteredItems}
              onWeekChange={(date) => setSelectedDate(date)}
              onDateSelect={setSelectedDate}
              onItemClick={handleItemClick}
              onSlotClick={(date, hour) => openNewEventDialog(date, hour)}
            />
          )}

          {/* Day View */}
          {currentView === 'day' && (
            <DayView
              selectedDate={selectedDate}
              items={filteredItems}
              onItemClick={handleItemClick}
              onSlotClick={(date, hour) => openNewEventDialog(date, hour)}
            />
          )}

          {/* Table View */}
          {currentView === 'table' && (
            <React.Suspense fallback={<Skeleton className="flex-1" />}>
              <TableView items={filteredItems} onItemClick={handleItemClick} />
            </React.Suspense>
          )}

          {/* Kanban View */}
          {currentView === 'kanban' && (
            <React.Suspense fallback={<Skeleton className="flex-1" />}>
              <KanbanView
                selectedDate={selectedDate}
                items={filteredItems}
                onDateSelect={setSelectedDate}
                onItemClick={handleItemClick}
              />
            </React.Suspense>
          )}

          {/* Timeline/Gantt View */}
          {currentView === 'gantt' && (
            <React.Suspense fallback={<Skeleton className="flex-1" />}>
              <GanttView
                selectedDate={selectedDate}
                items={filteredItems}
                onDateSelect={setSelectedDate}
                onItemClick={handleItemClick}
              />
            </React.Suspense>
          )}
        </div>
      </ResizablePanel>

      {/* New Event Dialog */}
      <NewEventDialog
        open={newEventDialogOpen}
        onOpenChange={(open) => {
          setNewEventDialogOpen(open)
          if (!open) setNewEventInitialData(undefined) // Clear initial data when closing
        }}
        defaultDate={newEventDate}
        defaultHour={newEventHour}
        initialData={newEventInitialData}
        onSave={handleSaveNewEvent}
      />

      {/* Item Detail Sheet */}
      <CalendarDetailPanel
        item={selectedItem}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onEdit={(item) => {
          // TODO: Open edit form
          console.log('Edit item:', item.id)
        }}
        onDelete={(item) => {
          // TODO: Delete item
          console.log('Delete item:', item.id)
        }}
        onToggleComplete={(item) => {
          // TODO: Toggle completion
          console.log('Toggle complete:', item.id)
        }}
        onCreateNote={async (item) => {
          // Generate stable entity ID for note
          const eventSlug = item.slug || item.id.split(':')[1] || 'untitled'
          const timestamp = Date.now()
          const noteSlug = `${eventSlug}-${timestamp}`
          const noteId = `note:${noteSlug}:001`

          // Note file goes in @notes/ (entity namespace)
          const notePath = `${vaultPath}/@notes/${noteSlug}.note`

          try {
            // Create structured note file (JSON format matching existing notes)
            const noteData = {
              '@context': { schema: 'https://schema.org/' },
              '@type': 'Note',
              '@id': noteId,
              title: `Notes: ${item.name}`,
              status: 'draft',
              linkedEvent: item.id,
              blocks: [
                {
                  id: 'b-1',
                  type: 'heading',
                  level: 1,
                  content: [{ type: 'text', text: item.name }],
                },
                {
                  id: 'b-2',
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add your notes here...' }],
                },
              ],
            }

            await invoke('write_text_file', {
              filePath: notePath,
              content: JSON.stringify(noteData, null, 2),
            })

            // Reference by ID (not path) for stability
            const updatedNotes = [...(item.notes || []), noteId]
            const updatedItem = { ...item, notes: updatedNotes }

            // Update items array
            setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)))

            // Update selectedItem to reflect the change
            setSelectedItem(updatedItem)

            console.log('Created note:', noteId, 'at', notePath)
          } catch (err) {
            console.error('Failed to create note:', err)
          }
        }}
        onOpenNote={async (noteRef) => {
          // Resolve note ID to file path
          const isEntityId = noteRef.match(/^note:([a-z0-9-]+):\d{3}$/i)
          let filePath: string

          if (isEntityId) {
            // Extract slug from ID and construct path
            const slug = isEntityId[1]
            filePath = `${vaultPath}/@notes/${slug}.note`
          } else {
            // Legacy path format - use directly
            filePath = noteRef.startsWith('/') ? noteRef : `${vaultPath}/${noteRef}`
          }

          console.log('Open note:', noteRef, '→', filePath)
          // TODO: Open in editor tab via useTabStore.openEditorPinned()
        }}
      />
    </ResizablePanelGroup>
  )
}
