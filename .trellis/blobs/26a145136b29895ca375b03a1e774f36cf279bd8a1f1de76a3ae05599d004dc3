/**
 * App Shell
 * Wrapper for non-Files apps with traffic light header
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function AppShell({ title, children, className }: AppShellProps) {
  return (
    <div className={cn('h-full flex flex-col rounded-xl bg-transparent overflow-hidden', className)}>
      {/* Traffic Light Header */}
      {/* <div className="flex items-center h-10 px-4 border-b bg-muted/30 shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div> */}

      {/* App Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

// Placeholder component for apps not yet built
export function PlaceholderApp({ name, icon }: { name: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center space-y-3">
        {icon && <div className="flex justify-center text-4xl opacity-50">{icon}</div>}
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-sm">Coming soon</p>
      </div>
    </div>
  )
}
