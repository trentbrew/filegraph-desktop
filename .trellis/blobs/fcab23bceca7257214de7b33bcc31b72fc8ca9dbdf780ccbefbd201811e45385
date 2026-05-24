/**
 * Command Bar
 * Global dock for switching between top-level apps.
 * Automatically populated from the app registry.
 * Supports drag-and-drop reordering with localStorage persistence.
 */

import * as React from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useTerminalPanesStore } from '@/stores/useTerminalPanesStore'
import { cn } from '@/lib/utils'
import { ExpandableTabs, type TabItem } from '@/components/ui/expandable-tabs'
import { Button } from '@/components/ui/button'
import { APPS_BY_SECTION, SECTION_APP_IDS, getApp, getDefaultAppIds, type AppId, VISIBLE_APPS } from '@/lib/apps'
import { SystemStatusBar } from './SystemStatusBar'
import { AppMarketplace } from './AppMarketplace'
import { Settings } from 'lucide-react'

// Storage keys for persisted state
const STORAGE_KEYS = {
  home: 'filegraph:dock:home-order',
  visibleApps: 'filegraph:dock:visible-apps',
} as const

// Get persisted visible apps or defaults (filter out hidden apps)
function getPersistedVisibleApps(): AppId[] {
  const visibleAppIds = new Set(VISIBLE_APPS.map((app) => app.id))
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.visibleApps)
    if (stored) {
      const parsed = JSON.parse(stored) as AppId[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any apps that are now hidden
        return parsed.filter((id) => visibleAppIds.has(id))
      }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultAppIds()
}

// Save visible apps to localStorage
function persistVisibleApps(ids: AppId[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.visibleApps, JSON.stringify(ids))
  } catch {
    // Ignore storage errors
  }
}

// Get persisted order for home section
function getPersistedHomeOrder(defaultIds: AppId[]): AppId[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.home)
    if (stored) {
      const parsed = JSON.parse(stored) as AppId[]
      if (parsed.length === defaultIds.length && parsed.every((id) => defaultIds.includes(id))) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return defaultIds
}

// Save home order to localStorage
function persistHomeOrder(ids: AppId[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.home, JSON.stringify(ids))
  } catch {
    // Ignore storage errors
  }
}

// Generate tabs from app IDs
function idsToTabs(ids: AppId[]): TabItem[] {
  return ids.map((id) => {
    const app = getApp(id)
    return { title: app.name, icon: app.icon }
  })
}

export function CommandBar() {
  const { activeApp, setActiveApp } = useAppStore()
  const paneCount = useTerminalPanesStore((state) => state.panes?.length ?? 1)

  // Home section (always visible, reorderable)
  const [homeIds, setHomeIds] = React.useState<AppId[]>(() => getPersistedHomeOrder(SECTION_APP_IDS.home))

  // Configurable visible apps (user can add/remove via marketplace)
  const [visibleAppIds, setVisibleAppIds] = React.useState<AppId[]>(() => getPersistedVisibleApps())

  // Filter visible apps into apps and utilities sections
  const visibleApps = React.useMemo(() => {
    return visibleAppIds.filter((id) => {
      const app = getApp(id)
      return app.section === 'apps' || app.section === 'utilities'
    })
  }, [visibleAppIds])

  // Generate tabs from visible apps
  const homeTabs = React.useMemo(() => idsToTabs(homeIds), [homeIds])
  const appTabs = React.useMemo(() => {
    const terminalTitle = activeApp === 'terminal' && paneCount > 1 ? `Terminal (${paneCount})` : 'Terminal'
    return visibleApps.map((id) => {
      const app = getApp(id)
      return { title: id === 'terminal' ? terminalTitle : app.name, icon: app.icon }
    })
  }, [visibleApps, activeApp, paneCount])

  const toggleTerminalApp = React.useCallback(() => {
    setActiveApp(activeApp === 'terminal' ? 'files' : 'terminal')
  }, [activeApp, setActiveApp])

  // Find active indices
  const homeActiveIndex = React.useMemo(() => {
    const idx = homeIds.indexOf(activeApp as AppId)
    return idx >= 0 ? idx : null
  }, [activeApp, homeIds])

  const appActiveIndex = React.useMemo(() => {
    const idx = visibleApps.indexOf(activeApp as AppId)
    return idx >= 0 ? idx : null
  }, [activeApp, visibleApps])

  // Handle section changes
  const handleHomeChange = React.useCallback(
    (index: number | null) => {
      if (index !== null && index < homeIds.length) {
        setActiveApp(homeIds[index])
      }
    },
    [setActiveApp, homeIds],
  )

  const handleAppChange = React.useCallback(
    (index: number | null) => {
      if (index === null || index >= visibleApps.length) return
      const appId = visibleApps[index]

      if (appId === 'terminal') {
        toggleTerminalApp()
      } else {
        setActiveApp(appId)
      }
    },
    [toggleTerminalApp, setActiveApp, visibleApps],
  )

  // Handle reordering
  const handleHomeReorder = React.useCallback((tabs: TabItem[]) => {
    const newIds = tabs
      .filter((t) => !t.type)
      .map((t) => {
        const app = APPS_BY_SECTION.home.find((a) => a.name === t.title)
        return app?.id as AppId
      })
    setHomeIds(newIds)
    persistHomeOrder(newIds)
  }, [])

  const handleAppReorder = React.useCallback(
    (tabs: TabItem[]) => {
      const newIds = tabs
        .filter((t) => !t.type)
        .map((t) => {
          const title = t.title.startsWith('Terminal') ? 'Terminal' : t.title
          const app = visibleApps.find((id) => getApp(id).name === title)
          return app as AppId
        })
        .filter(Boolean)
      setVisibleAppIds(newIds)
      persistVisibleApps(newIds)
    },
    [visibleApps],
  )

  // Toggle app visibility (from marketplace)
  const handleToggleApp = React.useCallback((appId: AppId) => {
    setVisibleAppIds((current) => {
      const newIds = current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]
      persistVisibleApps(newIds)
      return newIds
    })
  }, [])

  const Separator = () => <div className="mx-1 h-4 w-[1.2px] bg-foreground/15" aria-hidden="true" />

  return (
    <div
      id="dock"
      className={cn(
        'flex flex-col mx-3 mb-3 rounded-xl border-none bg-transparent backdrop-blur-sm overflow-hidden shrink-0',
      )}>
      {/* Dock Bar Layout */}
      <div className="flex items-center justify-between px-2 py-2 gap-2 h-12 border bg-card rounded-xl">
        <div className="flex items-center gap-2 w-full min-w-0">
          {/* Left: Tabs (horizontally scrollable on small widths) */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="flex items-center gap-1 pr-1">
              <ExpandableTabs
                tabs={homeTabs}
                activeIndex={homeActiveIndex}
                onChange={handleHomeChange}
                tabTrailing={(_, index) => {
                  if (homeIds[index] !== 'graph') return null

                  return (
                    <Button
                      variant={activeApp === 'settings' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveApp('settings')
                      }}
                      aria-label="Settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )
                }}
                reorderable
                onReorder={handleHomeReorder}
                className="border-0 shadow-none bg-transparent flex-nowrap"
              />
              <Separator />
              <ExpandableTabs
                tabs={appTabs}
                activeIndex={appActiveIndex}
                onChange={handleAppChange}
                reorderable
                onReorder={handleAppReorder}
                className="border-0 shadow-none bg-transparent flex-nowrap"
              />
              {/* App Marketplace (+) button */}
              <AppMarketplace
                visibleAppIds={visibleAppIds}
                onToggleApp={handleToggleApp}
                className="opacity-50 shrink-0"
              />
            </div>
          </div>

          {/* Right: System Status Bar */}
          <SystemStatusBar className="pr-2 shrink-0" />
        </div>
      </div>
    </div>
  )
}
