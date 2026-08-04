/**
 * AppRail Component
 *
 * Horizontal icon-only rail at the bottom for app switching.
 * Tooltip on hover, highlight on active, marketplace (+) and settings at the end.
 */

import * as React from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useUIStore } from '@/stores/useUIStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import {
  SECTION_APP_IDS,
  VISIBLE_APPS,
  getApp,
  getDefaultAppIds,
  type AppId,
} from '@/lib/apps'
import { AppMarketplace } from './AppMarketplace'
import { Settings, EyeOff } from 'lucide-react'

// Storage key for persisted visible apps (shared with CommandBar)
const STORAGE_KEY_VISIBLE = 'filegraph:dock:visible-apps'

function getPersistedVisibleApps(): AppId[] {
  const visibleAppIds = new Set(VISIBLE_APPS.map((app) => app.id))
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VISIBLE)
    if (stored) {
      const parsed = JSON.parse(stored) as AppId[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((id) => visibleAppIds.has(id))
      }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultAppIds()
}

function persistVisibleApps(ids: AppId[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(ids))
  } catch {
    // Ignore storage errors
  }
}

export function AppRail({ className }: { className?: string }) {
  const { activeApp, setActiveApp } = useAppStore()
  const setAppRailOpen = useUIStore((state) => state.setAppRailOpen)

  // Home section apps (always shown)
  const homeIds = SECTION_APP_IDS.home

  // Configurable visible apps
  const [visibleAppIds, setVisibleAppIds] = React.useState<AppId[]>(() => getPersistedVisibleApps())

  // Apps hidden from the rail (accessible via file explorer sidebar or command palette)
  const RAIL_HIDDEN_APPS: AppId[] = ['files', 'terminal']

  const visibleApps = React.useMemo(() => {
    return visibleAppIds.filter((id) => {
      if (RAIL_HIDDEN_APPS.includes(id)) return false
      const app = getApp(id)
      return app.section === 'apps' || app.section === 'utilities'
    })
  }, [visibleAppIds])

  const handleToggleApp = React.useCallback((appId: AppId) => {
    setVisibleAppIds((current) => {
      const newIds = current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]
      persistVisibleApps(newIds)
      return newIds
    })
  }, [])

  const Separator = () => <div className="mx-1 w-[1.2px] h-5 bg-foreground/15 shrink-0" aria-hidden="true" />

  return (
    <TooltipProvider delayDuration={300}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="bg-transparent px-3 pb-3 shrink-0">
            <div
              className={cn(
                'flex flex-row items-center justify-center p-2 gap-1 h-12 w-full bg-card/0 rounded-xl border-none',
                className,
              )}>
              {/* Home section apps */}
              <div className="flex flex-row items-center gap-1 shrink-0">
                {homeIds.map((id) => {
                  const app = getApp(id)
                  const Icon = app.icon
                  const isActive = activeApp === id
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActiveApp(id)}
                          className={cn(
                            'h-8 w-8 rounded-lg transition-colors',
                            isActive && 'bg-accent text-accent-foreground',
                          )}
                          aria-label={app.name}>
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>
                        <p>
                          {app.name}
                          {app.shortcut ? ` (${app.shortcut})` : ''}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <Separator />
              {/* App section - scrollable if many */}
              <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex flex-row items-center justify-center gap-1 scrollbar-none">
                {visibleApps.map((id) => {
                  const app = getApp(id)
                  const Icon = app.icon
                  const isActive = activeApp === id
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActiveApp(id)}
                          className={cn(
                            'h-8 w-8 rounded-lg transition-colors shrink-0',
                            isActive && 'bg-accent text-accent-foreground',
                          )}
                          aria-label={app.name}>
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>
                        <p>
                          {app.name}
                          {app.shortcut ? ` (${app.shortcut})` : ''}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <Separator />
              {/* End: Marketplace + Settings */}
              <div className="flex flex-row items-center gap-1 shrink-0">
                <AppMarketplace
                  visibleAppIds={visibleAppIds}
                  onToggleApp={handleToggleApp}
                  popoverSide="top"
                  className="h-8 w-8 opacity-50"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveApp('settings')}
                      className={cn(
                        'h-8 w-8 rounded-lg transition-colors',
                        activeApp === 'settings' && 'bg-accent text-accent-foreground',
                      )}
                      aria-label="Settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    <p>Settings (⌘,)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => setAppRailOpen(false)}>
            <EyeOff className="mr-2 h-4 w-4" />
            Hide App Rail
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  )
}
