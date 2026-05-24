/**
 * Widget Registry
 * Defines available status bar widgets for the command bar.
 * Widgets are small, focused utilities that appear in the status area.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Timer,
  StickyNote,
  Calendar,
  Calculator,
  Cloud,
  Settings2,
  Music,
  Cpu,
  Bell,
  Bookmark,
  Bot,
  BarChart3,
} from 'lucide-react'

// Widget categories
export type WidgetCategory = 'productivity' | 'utilities' | 'info' | 'media'

// Widget IDs
export type WidgetId =
  | 'agent'
  | 'timer'
  | 'quick-notes'
  | 'today-schedule'
  | 'calculator'
  | 'weather'
  | 'quick-settings'
  | 'now-playing'
  | 'system-monitor'
  | 'notifications'
  | 'bookmarks'

// Widget status
export type WidgetStatus = 'implemented' | 'placeholder' | 'hidden'

// Widget definition
export interface WidgetDefinition {
  id: WidgetId
  name: string
  icon: LucideIcon
  description: string
  status: WidgetStatus
  category: WidgetCategory
  isDefault: boolean // Shown by default
  order: number // Display order in widget area
}

// Widget registry
export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
  agent: {
    id: 'agent',
    name: 'Agent',
    icon: Bot,
    description: 'AI assistant for your vault',
    status: 'implemented',
    category: 'productivity',
    isDefault: true,
    order: 100, // Always rightmost
  },
  timer: {
    id: 'timer',
    name: 'Timer',
    icon: Timer,
    description: 'Pomodoro timer and stopwatch',
    status: 'implemented',
    category: 'productivity',
    isDefault: true,
    order: 0,
  },
  'quick-notes': {
    id: 'quick-notes',
    name: 'Quick Notes',
    icon: StickyNote,
    description: 'Scratch pad for quick thoughts',
    status: 'implemented',
    category: 'productivity',
    isDefault: false,
    order: 1,
  },
  'today-schedule': {
    id: 'today-schedule',
    name: "Today's Schedule",
    icon: Calendar,
    description: "Quick view of today's events",
    status: 'implemented',
    category: 'productivity',
    isDefault: true,
    order: 2,
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    description: 'Quick calculations',
    status: 'implemented',
    category: 'utilities',
    isDefault: false,
    order: 3,
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    icon: Cloud,
    description: 'Current weather conditions',
    status: 'placeholder',
    category: 'info',
    isDefault: false,
    order: 4,
  },
  'quick-settings': {
    id: 'quick-settings',
    name: 'Quick Settings',
    icon: Settings2,
    description: 'Fast access to common settings',
    status: 'placeholder',
    category: 'utilities',
    isDefault: false,
    order: 5,
  },
  'now-playing': {
    id: 'now-playing',
    name: 'Now Playing',
    icon: Music,
    description: 'Media playback controls',
    status: 'placeholder',
    category: 'media',
    isDefault: false,
    order: 6,
  },
  'system-monitor': {
    id: 'system-monitor',
    name: 'System Monitor',
    icon: Cpu,
    description: 'CPU and memory usage',
    status: 'placeholder',
    category: 'info',
    isDefault: false,
    order: 7,
  },
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description: 'Recent notifications',
    status: 'placeholder',
    category: 'utilities',
    isDefault: false,
    order: 8,
  },
  bookmarks: {
    id: 'bookmarks',
    name: 'Bookmarks',
    icon: Bookmark,
    description: 'Quick access bookmarks',
    status: 'placeholder',
    category: 'productivity',
    isDefault: false,
    order: 9,
  },
}

// Category labels for display
export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: 'Productivity',
  utilities: 'Utilities',
  info: 'Information',
  media: 'Media',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Get all widget definitions as array */
export const WIDGET_LIST = Object.values(WIDGET_REGISTRY).sort((a, b) => a.order - b.order)

/** Get widget by ID */
export function getWidget(id: WidgetId): WidgetDefinition {
  return WIDGET_REGISTRY[id]
}

/** Get all widget IDs */
export const WIDGET_IDS = Object.keys(WIDGET_REGISTRY) as WidgetId[]

/** Get default widget IDs */
export function getDefaultWidgetIds(): WidgetId[] {
  return WIDGET_LIST.filter((w) => w.isDefault).map((w) => w.id)
}

/** Get widgets by category */
export function getWidgetsByCategory(): Record<WidgetCategory, WidgetDefinition[]> {
  const byCategory: Record<WidgetCategory, WidgetDefinition[]> = {
    productivity: [],
    utilities: [],
    info: [],
    media: [],
  }

  WIDGET_LIST.forEach((widget) => {
    byCategory[widget.category].push(widget)
  })

  return byCategory
}

/** Get implemented widgets */
export function getImplementedWidgets(): WidgetDefinition[] {
  return WIDGET_LIST.filter((w) => w.status === 'implemented')
}

/** Get placeholder widgets (for marketplace) */
export function getPlaceholderWidgets(): WidgetDefinition[] {
  return WIDGET_LIST.filter((w) => w.status === 'placeholder')
}
