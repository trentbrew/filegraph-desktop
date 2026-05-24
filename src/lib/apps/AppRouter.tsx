/**
 * App Router
 * Renders the correct app view based on the active app from registry.
 * Automatically generates placeholder views for unimplemented apps.
 * Uses Motion for smooth transitions between apps.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { APP_REGISTRY, APP_LIST, type AppId, type AppDefinition } from './registry'

// ─────────────────────────────────────────────────────────────────────────────
// Transition Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionPreset = 'fade' | 'scale' | 'none'

const defaultTransition = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1] as const,
}

/** Get global index for an app (used for external reference) */
export function getAppIndex(appId: AppId): number {
  return APP_LIST.findIndex((app) => app.id === appId)
}

/** Transition variants - simple fade/scale that works with any order */
const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.99 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppViewProps {
  app: AppDefinition
}

export type AppViewComponent = React.ComponentType<AppViewProps>

export interface AppViewConfig {
  /** The view component to render */
  component: AppViewComponent
  /** If true, wrap in AppShell with traffic lights */
  useShell?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// View Registry (maps AppId to view components)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register app view components here.
 * Apps not registered will use PlaceholderView automatically.
 */
const VIEW_REGISTRY: Partial<Record<AppId, AppViewConfig>> = {
  // Implemented apps register their views here
  // Example:
  // calendar: { component: CalendarView, useShell: true },
  // graph: { component: GraphView, useShell: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Placeholder View
// ─────────────────────────────────────────────────────────────────────────────

function PlaceholderView({ app }: AppViewProps) {
  const Icon = app.icon

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-muted/50">
            <Icon className="h-12 w-12 opacity-50" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">{app.name}</h2>
        {app.description && <p className="text-sm text-muted-foreground/80">{app.description}</p>}
        <div className="pt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-xs font-medium">
            Coming soon
          </span>
        </div>
        {app.shortcut && (
          <p className="text-xs text-muted-foreground/60">
            Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">{app.shortcut}</kbd>
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App Router Component
// ─────────────────────────────────────────────────────────────────────────────

export interface AppRouterProps {
  appId: AppId
  /** Optional shell wrapper component */
  Shell?: React.ComponentType<{ title: string; children: React.ReactNode }>
  /** Transition preset (default: 'scale') */
  transition?: TransitionPreset
}

/**
 * Renders the appropriate view for the given app ID with smooth transitions.
 * Uses registered view components or falls back to PlaceholderView.
 */
export function AppRouter({ appId, Shell, transition = 'scale' }: AppRouterProps) {
  const app = APP_REGISTRY[appId]

  if (!app) {
    console.warn(`[AppRouter] Unknown app ID: ${appId}`)
    return null
  }

  // Render the appropriate content
  const renderContent = () => {
    const viewConfig = VIEW_REGISTRY[appId]

    if (viewConfig) {
      const { component: ViewComponent, useShell } = viewConfig

      if (useShell && Shell) {
        return (
          <Shell title={app.name}>
            <ViewComponent app={app} />
          </Shell>
        )
      }

      return <ViewComponent app={app} />
    }

    // Fall back to placeholder for unimplemented apps
    if (app.status === 'placeholder' || app.status === 'hidden') {
      if (Shell) {
        return (
          <Shell title={app.name}>
            <PlaceholderView app={app} />
          </Shell>
        )
      }
      return <PlaceholderView app={app} />
    }

    // Implemented app without registered view - this is a config error
    console.warn(`[AppRouter] Implemented app '${appId}' has no registered view`)
    return <PlaceholderView app={app} />
  }

  const variants = transitionVariants[transition]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={appId}
        className="h-full w-full"
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={defaultTransition}>
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration API (for dynamic view registration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a view component for an app.
 * Call this from your app's module to register its view.
 */
export function registerAppView(appId: AppId, config: AppViewConfig): void {
  VIEW_REGISTRY[appId] = config
}

/**
 * Check if an app has a registered view.
 */
export function hasRegisteredView(appId: AppId): boolean {
  return appId in VIEW_REGISTRY
}

/**
 * Get all registered views (for debugging).
 */
export function getRegisteredViews(): Partial<Record<AppId, AppViewConfig>> {
  return { ...VIEW_REGISTRY }
}
