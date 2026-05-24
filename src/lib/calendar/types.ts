/**
 * Calendar Type System
 * Defines event labels, colors, icons, and behaviors
 */

import {
  Calendar,
  Bell,
  Sun,
  CheckSquare,
  DollarSign,
  ArrowLeftRight,
  Cake,
  Brain,
  Users,
  Clock,
  Heart,
  AlertTriangle,
  Moon,
  Gamepad2,
  Inbox,
  Hourglass,
  ArrowRight,
  Play,
  Ban,
  Eye,
  CheckCircle2,
  Archive,
  Repeat,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

// Event urgency levels
export type Urgency = 1 | 2 | 3

// Item status types
export type ItemStatus =
  | 'backlog'
  | 'pending'
  | 'up_next'
  | 'in_progress'
  | 'blocked'
  | 'reviewing'
  | 'done'
  | 'archived'
  | 'repeating'
  | 'cancelled'

// Status configuration
export interface StatusConfig {
  id: ItemStatus
  name: string
  icon: LucideIcon
  color: string
  order: number // For column ordering
}

// Status definitions
export const ITEM_STATUSES: Record<ItemStatus, StatusConfig> = {
  backlog: {
    id: 'backlog',
    name: 'Backlog',
    icon: Inbox,
    color: '#64748b',
    order: 0,
  },
  pending: {
    id: 'pending',
    name: 'Pending',
    icon: Hourglass,
    color: '#f59e0b',
    order: 1,
  },
  up_next: {
    id: 'up_next',
    name: 'Up Next',
    icon: ArrowRight,
    color: '#3b82f6',
    order: 2,
  },
  in_progress: {
    id: 'in_progress',
    name: 'In Progress',
    icon: Play,
    color: '#8b5cf6',
    order: 3,
  },
  blocked: {
    id: 'blocked',
    name: 'Blocked',
    icon: Ban,
    color: '#ef4444',
    order: 4,
  },
  reviewing: {
    id: 'reviewing',
    name: 'Reviewing',
    icon: Eye,
    color: '#06b6d4',
    order: 5,
  },
  done: {
    id: 'done',
    name: 'Done',
    icon: CheckCircle2,
    color: '#22c55e',
    order: 6,
  },
  archived: {
    id: 'archived',
    name: 'Archived',
    icon: Archive,
    color: '#6b7280',
    order: 7,
  },
  repeating: {
    id: 'repeating',
    name: 'Repeating',
    icon: Repeat,
    color: '#a855f7',
    order: 8,
  },
  cancelled: {
    id: 'cancelled',
    name: 'Cancelled',
    icon: XCircle,
    color: '#9ca3af',
    order: 9,
  },
}

// Get all status configs as array (sorted by order)
export const STATUS_LIST = Object.values(ITEM_STATUSES).sort((a, b) => a.order - b.order)

// Get status config by ID
export function getStatusConfig(status: ItemStatus): StatusConfig {
  return ITEM_STATUSES[status] || ITEM_STATUSES.backlog
}

// Event label types
export type EventLabel =
  | 'event'
  | 'reminder'
  | 'holiday'
  | 'task'
  | 'payday'
  | 'transaction'
  | 'birthday'
  | 'deepwork'
  | 'meeting'
  | 'appointment'
  | 'social'
  | 'deadline'
  | 'rest'
  | 'play'

// Label configuration
export interface LabelConfig {
  id: EventLabel
  name: string
  icon: LucideIcon
  color: string
  isFinancial?: boolean
  behavior?: 'notification' | 'completable' | 'pulsing' | 'allday'
}

// Label definitions
export const EVENT_LABELS: Record<EventLabel, LabelConfig> = {
  event: {
    id: 'event',
    name: 'Event',
    icon: Calendar,
    color: '#3b82f6',
  },
  reminder: {
    id: 'reminder',
    name: 'Reminder',
    icon: Bell,
    color: '#f59e0b',
    behavior: 'notification',
  },
  holiday: {
    id: 'holiday',
    name: 'Holiday',
    icon: Sun,
    color: '#22c55e',
    behavior: 'allday',
  },
  task: {
    id: 'task',
    name: 'Task',
    icon: CheckSquare,
    color: '#8b5cf6',
    behavior: 'completable',
  },
  payday: {
    id: 'payday',
    name: 'Payday',
    icon: DollarSign,
    color: '#10b981',
    isFinancial: true,
  },
  transaction: {
    id: 'transaction',
    name: 'Transaction',
    icon: ArrowLeftRight,
    color: '#6b7280',
    isFinancial: true,
  },
  birthday: {
    id: 'birthday',
    name: 'Birthday',
    icon: Cake,
    color: '#ec4899',
    behavior: 'allday',
  },
  deepwork: {
    id: 'deepwork',
    name: 'Deep Work',
    icon: Brain,
    color: '#6366f1',
  },
  meeting: {
    id: 'meeting',
    name: 'Meeting',
    icon: Users,
    color: '#0ea5e9',
  },
  appointment: {
    id: 'appointment',
    name: 'Appointment',
    icon: Clock,
    color: '#14b8a6',
  },
  social: {
    id: 'social',
    name: 'Social',
    icon: Heart,
    color: '#f43f5e',
  },
  deadline: {
    id: 'deadline',
    name: 'Deadline',
    icon: AlertTriangle,
    color: '#ef4444',
    behavior: 'pulsing',
  },
  rest: {
    id: 'rest',
    name: 'Rest',
    icon: Moon,
    color: '#a855f7',
  },
  play: {
    id: 'play',
    name: 'Play',
    icon: Gamepad2,
    color: '#84cc16',
  },
}

// Get all label configs as array
export const LABEL_LIST = Object.values(EVENT_LABELS)

// Get financial labels
export const FINANCIAL_LABELS = LABEL_LIST.filter((l) => l.isFinancial)

// Calendar item interface (matches JSON-LD schema)
export interface CalendarItem {
  '@type'?: string
  id: string
  slug?: string
  label: EventLabel
  urgency: Urgency
  status?: ItemStatus // Workflow status
  name: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  participants?: string[] // Entity IDs: person:sarah:001
  notes?: string[] // Paths to .note files (rich text content)
  recurrence?: string // RRULE format
  completed?: boolean // For tasks
  amount?: number // For financial items
  color?: string // Override label color
  tags?: string[]
}

// Sort items by urgency (high to low), then by time
export function sortByUrgency(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    // First by urgency (descending)
    if (b.urgency !== a.urgency) {
      return b.urgency - a.urgency
    }
    // Then by start time (ascending)
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  })
}

// Check if deadline is approaching (within 24 hours)
export function isDeadlineApproaching(item: CalendarItem): boolean {
  if (item.label !== 'deadline') return false
  const now = new Date()
  const deadline = new Date(item.startDate)
  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntil > 0 && hoursUntil <= 24
}

// Get label config by ID
export function getLabelConfig(label: EventLabel): LabelConfig {
  return EVENT_LABELS[label] || EVENT_LABELS.event
}
