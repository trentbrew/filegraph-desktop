/**
 * App Sidebar
 * Collapsible left sidebar for app navigation
 */

import * as React from 'react'
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
}

interface AppSidebarProps {
  items: SidebarItem[]
  activeItem: string
  onItemSelect: (id: string) => void
  title?: string
  defaultCollapsed?: boolean
  className?: string
}

export function AppSidebar({
  items,
  activeItem,
  onItemSelect,
  title,
  defaultCollapsed = false,
  className,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(() => {
    const stored = localStorage.getItem('appSidebar.collapsed')
    return stored ? stored === 'true' : defaultCollapsed
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('appSidebar.collapsed', String(next))
      return next
    })
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full border-r bg-card/50 transition-all duration-200',
          collapsed ? 'w-14' : 'w-52',
          className,
        )}>
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-3 border-b shrink-0">
          {!collapsed && title && <span className="text-sm font-semibold text-muted-foreground truncate">{title}</span>}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 shrink-0', collapsed && 'mx-auto')}
            onClick={toggleCollapsed}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id

              const button = (
                <button
                  key={item.id}
                  onClick={() => onItemSelect(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-0',
                  )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
