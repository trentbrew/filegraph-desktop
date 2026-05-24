/**
 * App Registry
 * Single source of truth for all app definitions in Filegraph.
 * CommandBar, Dock, and AppRouter consume this registry automatically.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Folder,
  Calendar,
  Mail,
  Globe,
  Settings,
  MessageCircle,
  Music,
  ImageIcon,
  Terminal,
  Home,
  Network,
  Sparkles,
  FileText,
  Kanban,
  Video,
  Podcast,
  Wallet,
  BookOpen,
  Database,
  Map,
  Users,
  User,
  HeartHandshake,
  Camera,
  Lightbulb,
  AlarmClock,
  Workflow,
  BarChart3,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Unique identifier for each app */
export type AppId =
  | 'home'
  | 'graph'
  | 'files'
  | 'calendar'
  | 'inbox'
  | 'messages'
  | 'browser'
  | 'gallery'
  | 'music'
  | 'terminal'
  | 'settings'
  | 'agent'
  | 'database'
  | 'schema'
  | 'places'
  | 'contacts'
  | 'posts'
  | 'camera'
  | 'projects'
  | 'clock'
  | 'workflows'
  | 'profile'
  // Future apps (placeholder)
  | 'notes'
  | 'tasks'
  | 'finance'
  | 'reader'
  | 'podcasts'
  | 'video'

/** Section where app appears in CommandBar */
export type AppSection = 'home' | 'apps' | 'utilities'

/** App implementation status */
export type AppStatus = 'implemented' | 'placeholder' | 'hidden'

/** Full app definition */
export interface AppDefinition {
  id: AppId
  name: string
  icon: LucideIcon
  section: AppSection
  status: AppStatus
  /** Short description for tooltips/placeholders */
  description?: string
  /** Keyboard shortcut hint (display only) */
  shortcut?: string
  /** If true, this is a toggle (like Agent) not a navigation */
  isToggle?: boolean
  /** Order within section (lower = first) */
  order: number
  /** If true, shown in dock by default (user can hide). If false, hidden by default (user can add from marketplace) */
  isDefault?: boolean
  /** Category for marketplace grouping */
  category?: 'productivity' | 'communication' | 'media' | 'utilities' | 'data'
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master app registry.
 * Add new apps here and they'll automatically appear in CommandBar.
 */
export const APP_REGISTRY: Record<AppId, AppDefinition> = {
  // ── Home Section ──
  home: {
    id: 'home',
    name: 'Home',
    icon: Home,
    section: 'home',
    status: 'implemented',
    description: 'Dashboard overview',
    shortcut: '⌘H',
    order: 0,
    isDefault: true,
    category: 'productivity',
  },
  graph: {
    id: 'graph',
    name: 'Graph',
    icon: Network,
    section: 'home',
    status: 'implemented',
    description: 'Knowledge graph explorer',
    shortcut: '⌘G',
    order: 1,
    isDefault: true,
    category: 'data',
  },
  database: {
    id: 'database',
    name: 'Database',
    icon: Database,
    section: 'utilities',
    status: 'placeholder',
    description: 'Data management',
    order: 20,
    isDefault: false,
    category: 'data',
  },
  schema: {
    id: 'schema',
    name: 'Schema',
    icon: BarChart3,
    section: 'utilities',
    status: 'implemented',
    description: 'Vault ontology and entity type browser',
    order: 21,
    isDefault: false,
    category: 'data',
  },

  // ── Apps Section (center) ──
  files: {
    id: 'files',
    name: 'Workspaces',
    icon: Folder,
    section: 'apps',
    status: 'implemented',
    description: 'File browser and workspaces',
    shortcut: '⌘1',
    order: 0,
    isDefault: true,
    category: 'productivity',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    section: 'apps',
    status: 'implemented',
    description: 'Events and scheduling',
    shortcut: '⌘2',
    order: 1,
    isDefault: true,
    category: 'productivity',
  },
  inbox: {
    id: 'inbox',
    name: 'Inbox',
    icon: Mail,
    section: 'apps',
    status: 'implemented',
    description: 'Email and notifications',
    shortcut: '⌘3',
    order: 2,
    isDefault: true,
    category: 'communication',
  },
  messages: {
    id: 'messages',
    name: 'Messages',
    icon: MessageCircle,
    section: 'apps',
    status: 'placeholder',
    description: 'Chat and messaging',
    shortcut: '⌘4',
    order: 3,
    isDefault: false,
    category: 'communication',
  },
  browser: {
    id: 'browser',
    name: 'Browser',
    icon: Globe,
    section: 'apps',
    status: 'placeholder',
    description: 'Web browser',
    shortcut: '⌘5',
    order: 4,
    isDefault: false,
    category: 'utilities',
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    icon: ImageIcon,
    section: 'apps',
    status: 'placeholder',
    description: 'Photos and media',
    shortcut: '⌘6',
    order: 5,
    isDefault: false,
    category: 'media',
  },
  music: {
    id: 'music',
    name: 'Music',
    icon: Music,
    section: 'apps',
    status: 'placeholder',
    description: 'Music player',
    shortcut: '⌘7',
    order: 6,
    isDefault: false,
    category: 'media',
  },
  places: {
    id: 'places',
    name: 'Places',
    icon: Map,
    section: 'apps',
    status: 'placeholder',
    description: 'Maps and locations',
    order: 7,
    isDefault: false,
    category: 'utilities',
  },
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    section: 'apps',
    status: 'placeholder',
    description: 'People and contacts',
    order: 8,
    isDefault: false,
    category: 'communication',
  },
  posts: {
    id: 'posts',
    name: 'Posts',
    icon: HeartHandshake,
    section: 'apps',
    status: 'placeholder',
    description: 'Social posts and sharing',
    order: 9,
    isDefault: false,
    category: 'communication',
  },
  camera: {
    id: 'camera',
    name: 'Camera',
    icon: Camera,
    section: 'apps',
    status: 'placeholder',
    description: 'Camera and capture',
    order: 10,
    isDefault: false,
    category: 'media',
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    icon: Lightbulb,
    section: 'apps',
    status: 'placeholder',
    description: 'Project management',
    order: 11,
    isDefault: false,
    category: 'productivity',
  },
  clock: {
    id: 'clock',
    name: 'Clock',
    icon: AlarmClock,
    section: 'apps',
    status: 'placeholder',
    description: 'Time and alarms',
    order: 12,
    isDefault: false,
    category: 'utilities',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    section: 'apps',
    status: 'implemented',
    description: 'Command line',
    shortcut: '⌘T',
    order: 13,
    isDefault: true,
    category: 'utilities',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    section: 'utilities',
    status: 'implemented',
    description: 'App settings',
    shortcut: '⌘,',
    order: 14,
    isDefault: false,
    category: 'utilities',
  },
  profile: {
    id: 'profile',
    name: 'Profile',
    icon: User,
    section: 'apps',
    status: 'implemented',
    description: 'Your identity and agent preferences',
    order: 15,
    isDefault: false,
    category: 'utilities',
  },
  // ── Future Apps (hidden for now) ──
  notes: {
    id: 'notes',
    name: 'Notes',
    icon: FileText,
    section: 'apps',
    status: 'hidden',
    description: 'Quick notes and scratchpad',
    order: 10,
  },
  tasks: {
    id: 'tasks',
    name: 'Tasks',
    icon: Kanban,
    section: 'apps',
    status: 'hidden',
    description: 'Task management',
    order: 11,
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    icon: Wallet,
    section: 'apps',
    status: 'hidden',
    description: 'Budget and transactions',
    order: 12,
  },
  reader: {
    id: 'reader',
    name: 'Reader',
    icon: BookOpen,
    section: 'apps',
    status: 'hidden',
    description: 'RSS and article reader',
    order: 13,
  },
  podcasts: {
    id: 'podcasts',
    name: 'Podcasts',
    icon: Podcast,
    section: 'apps',
    status: 'hidden',
    description: 'Podcast player',
    order: 14,
  },
  video: {
    id: 'video',
    name: 'Video',
    icon: Video,
    section: 'apps',
    status: 'hidden',
    description: 'Video player',
    order: 15,
  },

  // ── Utilities Section (right) ──
  workflows: {
    id: 'workflows',
    name: 'Workflows',
    icon: Workflow,
    section: 'utilities',
    status: 'placeholder',
    description: 'Automation workflows',
    order: 0,
    isDefault: false,
    category: 'productivity',
  },
  agent: {
    id: 'agent',
    name: 'Agent',
    icon: Sparkles,
    section: 'apps',
    status: 'hidden', // Hidden for now - using AgentSidebar + canvas as primary interface
    description: 'AI assistant with channels, threads, and vault integration',
    shortcut: '⌘/',
    order: 10,
    isDefault: false,
    category: 'productivity',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived Data (computed from registry)
// ─────────────────────────────────────────────────────────────────────────────

/** All app definitions as sorted array */
export const APP_LIST = Object.values(APP_REGISTRY).sort((a, b) => {
  // Sort by section first, then by order
  const sectionOrder = { home: 0, apps: 1, utilities: 2 }
  const sectionDiff = sectionOrder[a.section] - sectionOrder[b.section]
  return sectionDiff !== 0 ? sectionDiff : a.order - b.order
})

/** All visible (non-hidden) apps */
export const VISIBLE_APPS = APP_LIST.filter((app) => app.status !== 'hidden')

/** Apps by section (for CommandBar) */
export const APPS_BY_SECTION = {
  home: VISIBLE_APPS.filter((app) => app.section === 'home').sort((a, b) => a.order - b.order),
  apps: VISIBLE_APPS.filter((app) => app.section === 'apps').sort((a, b) => a.order - b.order),
  utilities: VISIBLE_APPS.filter((app) => app.section === 'utilities').sort((a, b) => a.order - b.order),
}

/** App IDs for each section (for index mapping) */
export const SECTION_APP_IDS = {
  home: APPS_BY_SECTION.home.map((app) => app.id),
  apps: APPS_BY_SECTION.apps.map((app) => app.id),
  utilities: APPS_BY_SECTION.utilities.map((app) => app.id),
}

/** All valid app IDs (for type guards) */
export const ALL_APP_IDS = Object.keys(APP_REGISTRY) as AppId[]

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Get app definition by ID */
export function getApp(id: AppId): AppDefinition {
  return APP_REGISTRY[id]
}

/** Check if an ID is a valid app */
export function isValidAppId(id: string): id is AppId {
  return id in APP_REGISTRY
}

/** Get apps that are implemented (have real views) */
export function getImplementedApps(): AppDefinition[] {
  return VISIBLE_APPS.filter((app) => app.status === 'implemented')
}

/** Get apps that are placeholders (coming soon) */
export function getPlaceholderApps(): AppDefinition[] {
  return VISIBLE_APPS.filter((app) => app.status === 'placeholder')
}

/** Convert section apps to TabItem format for ExpandableTabs */
export function sectionToTabs(section: AppSection) {
  return APPS_BY_SECTION[section].map((app) => ({
    title: app.name,
    icon: app.icon,
  }))
}

/** Get default app IDs (shown in dock by default) */
export function getDefaultAppIds(): AppId[] {
  return VISIBLE_APPS.filter((app) => app.isDefault).map((app) => app.id)
}

/** Get marketplace apps (can be added/removed from dock) */
export function getMarketplaceApps(): AppDefinition[] {
  return VISIBLE_APPS.filter((app) => app.section === 'apps' || app.section === 'utilities')
}

/** Get apps grouped by category for marketplace display */
export function getAppsByCategory(): Record<string, AppDefinition[]> {
  const categories: Record<string, AppDefinition[]> = {}
  for (const app of getMarketplaceApps()) {
    const cat = app.category || 'utilities'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(app)
  }
  return categories
}

/** Category display names */
export const CATEGORY_LABELS: Record<string, string> = {
  productivity: 'Productivity',
  communication: 'Communication',
  media: 'Media',
  utilities: 'Utilities',
  data: 'Data',
}
