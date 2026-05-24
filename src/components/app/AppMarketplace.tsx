/**
 * App Marketplace
 * Popover for adding/removing apps from the CommandBar dock.
 */

import * as React from 'react'
import { Plus, Check, Grip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getAppsByCategory, getApp, CATEGORY_LABELS, type AppId, type AppDefinition } from '@/lib/apps'

interface AppMarketplaceProps {
  visibleAppIds: AppId[]
  onToggleApp: (appId: AppId) => void
  className?: string
  popoverSide?: 'top' | 'right' | 'bottom' | 'left'
}

function AppItem({ app, isVisible, onToggle }: { app: AppDefinition; isVisible: boolean; onToggle: () => void }) {
  const Icon = app.icon

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left',
        'hover:bg-accent',
        isVisible && 'bg-accent/50',
      )}>
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isVisible ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{app.name}</div>
        <div className="text-xs text-muted-foreground truncate">{app.description}</div>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
          isVisible ? 'bg-primary border-primary' : 'border-muted-foreground/30',
        )}>
        {isVisible && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
    </button>
  )
}

export function AppMarketplace({ visibleAppIds, onToggleApp, className, popoverSide = 'top' }: AppMarketplaceProps) {
  const [open, setOpen] = React.useState(false)
  const appsByCategory = React.useMemo(() => getAppsByCategory(), [])

  const categoryOrder = ['productivity', 'communication', 'media', 'utilities', 'data']

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 rounded-full hover:bg-accent', className)}
          aria-label="Add apps">
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={popoverSide} align={popoverSide === 'right' ? 'start' : 'end'} className="w-80 p-0" sideOffset={12}>
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">App Library</h3>
          <p className="text-xs text-muted-foreground">Add or remove apps from your dock</p>
        </div>
        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-4">
            {categoryOrder.map((category) => {
              const apps = appsByCategory[category]
              if (!apps?.length) return null

              return (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  <div className="space-y-1">
                    {apps.map((app) => (
                      <AppItem
                        key={app.id}
                        app={app}
                        isVisible={visibleAppIds.includes(app.id)}
                        onToggle={() => onToggleApp(app.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">Drag apps in the dock to reorder</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
