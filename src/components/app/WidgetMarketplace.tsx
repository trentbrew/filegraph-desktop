/**
 * Widget Marketplace
 * Popover for adding/removing widgets from the status bar area.
 */

import * as React from 'react'
import { Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  getWidgetsByCategory,
  WIDGET_CATEGORY_LABELS,
  type WidgetId,
  type WidgetDefinition,
  type WidgetCategory,
} from '@/lib/widgets'
import { useWidgetStore } from '@/stores/useWidgetStore'

function WidgetItem({
  widget,
  isEnabled,
  onToggle,
}: {
  widget: WidgetDefinition
  isEnabled: boolean
  onToggle: () => void
}) {
  const Icon = widget.icon

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left',
        'hover:bg-accent',
        isEnabled && 'bg-accent/50',
      )}>
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{widget.name}</div>
        <div className="text-xs text-muted-foreground truncate">{widget.description}</div>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
          isEnabled ? 'bg-primary border-primary' : 'border-muted-foreground/30',
        )}>
        {isEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
    </button>
  )
}

interface WidgetMarketplaceProps {
  className?: string
}

export function WidgetMarketplace({ className }: WidgetMarketplaceProps) {
  const [open, setOpen] = React.useState(false)
  const { enabledWidgets, toggleWidget } = useWidgetStore()
  const widgetsByCategory = React.useMemo(() => getWidgetsByCategory(), [])

  const categoryOrder: WidgetCategory[] = ['productivity', 'utilities', 'info', 'media']

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 rounded-full hover:bg-accent', className)}
          aria-label="Add widgets">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 p-0" sideOffset={12}>
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Widgets</h3>
          <p className="text-xs text-muted-foreground">Add widgets to your status bar</p>
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-4">
            {categoryOrder.map((category) => {
              const widgets = widgetsByCategory[category]
              if (!widgets?.length) return null

              return (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {WIDGET_CATEGORY_LABELS[category]}
                  </div>
                  <div className="space-y-1">
                    {widgets.map((widget) => (
                      <WidgetItem
                        key={widget.id}
                        widget={widget}
                        isEnabled={enabledWidgets.includes(widget.id)}
                        onToggle={() => toggleWidget(widget.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
