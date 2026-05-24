/**
 * System Status Bar
 * OS-style status indicators: WiFi, Battery, Time/Date
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Bot,
  Pin,
  Pause,
  Settings,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/useUIStore'
import { useAppStore } from '@/stores/useAppStore'
import { useWidgetStore } from '@/stores/useWidgetStore'
import { getWidget } from '@/lib/widgets'
import { useGlobalTimer } from '@/hooks/useGlobalTimer'
import { WidgetMarketplace } from './WidgetMarketplace'
import { WidgetPopover } from '@/components/widgets'

interface BatteryInfo {
  percentage: number
  is_charging: boolean
  time_to_empty_mins?: number
  time_to_full_mins?: number
}

interface SystemInfo {
  battery: BatteryInfo | null
  memory_usage_percent: number
  cpu_usage_percent: number
}

function formatTime(date: Date, opts: { showSeconds: boolean; use24Hour: boolean }): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: opts.showSeconds ? '2-digit' : undefined,
    hour12: !opts.use24Hour,
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function BatteryIcon({ percentage, charging }: { percentage: number; charging: boolean }) {
  if (charging) {
    return <BatteryCharging className="w-4 h-4" />
  }
  if (percentage >= 80) return <BatteryFull className="w-4 h-4" />
  if (percentage >= 50) return <BatteryMedium className="w-4 h-4" />
  if (percentage >= 20) return <BatteryLow className="w-4 h-4" />
  return <BatteryWarning className="w-4 h-4 text-red-500" />
}

const Separator = ({ className }: { className?: string }) => (
  <div className={cn('mx-0.5 h-4 w-[1.2px] bg-foreground/15', className)} aria-hidden="true" />
)

export function SystemStatusBar({ className }: { className?: string }) {
  const [time, setTime] = React.useState(new Date())
  const [systemInfo, setSystemInfo] = React.useState<SystemInfo | null>(null)
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const { setActiveApp } = useAppStore()
  const { agentOpen, toggleAgent, dockShowSeconds, dockUse24Hour, setDockShowSeconds, setDockUse24Hour } = useUIStore()
  const { enabledWidgets, widgetOrder, pinnedWidgets, togglePinnedWidget } = useWidgetStore()
  const timerState = useGlobalTimer() // Runs timer globally
  const [widgetsOpen, setWidgetsOpen] = React.useState(false)

  // Get enabled widgets in order (exclude agent - it's always shown separately)
  const orderedWidgets = React.useMemo(() => {
    return widgetOrder.filter((id) => enabledWidgets.includes(id) && id !== 'agent')
  }, [enabledWidgets, widgetOrder])

  const orderedPinnedWidgets = React.useMemo(() => {
    return pinnedWidgets.filter((id) => enabledWidgets.includes(id) && id !== 'agent')
  }, [enabledWidgets, pinnedWidgets])

  const orderedUnpinnedWidgets = React.useMemo(() => {
    const pinned = new Set(orderedPinnedWidgets)
    return orderedWidgets.filter((id) => !pinned.has(id))
  }, [orderedPinnedWidgets, orderedWidgets])

  // Update time (seconds when enabled)
  React.useEffect(() => {
    const intervalMs = dockShowSeconds ? 1000 : 60000
    const interval = setInterval(() => setTime(new Date()), intervalMs)
    return () => clearInterval(interval)
  }, [dockShowSeconds])

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch system info periodically
  React.useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const info = await invoke<SystemInfo>('get_system_info')
        setSystemInfo(info)
      } catch (err) {
        console.warn('[SystemStatusBar] Failed to get system info:', err)
      }
    }

    fetchSystemInfo()
    const interval = setInterval(fetchSystemInfo, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const battery = systemInfo?.battery

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        {/* Pinned widgets (favorites) */}
        {orderedPinnedWidgets.length > 0 && (
          <div className="flex items-center gap-1">
            {orderedPinnedWidgets.map((widgetId) => {
              if (widgetId === 'timer' && timerState?.isRunning) {
                return (
                  <div key={widgetId} className="group relative flex items-center overflow-visible">
                    <WidgetPopover widgetId={widgetId}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 gap-1.5 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30">
                        <Pause className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-mono font-medium tabular-nums text-primary">
                          {formatTimerDisplay(timerState.remaining)}
                        </span>
                      </Button>
                    </WidgetPopover>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full p-0 shadow-sm',
                        'bg-background/90 ring-1 ring-border hover:bg-background',
                        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        togglePinnedWidget(widgetId)
                      }}
                      aria-label="Unpin widget">
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              }

              const widget = getWidget(widgetId)
              if (!widget) return null
              const Icon = widget.icon

              return (
                <div key={widgetId} className="group relative flex items-center overflow-visible">
                  <WidgetPopover widgetId={widgetId}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full bg-transparent hover:bg-accent/40"
                      aria-label={widget.name}>
                      <Icon className="h-4 w-4" />
                    </Button>
                  </WidgetPopover>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full p-0 shadow-sm',
                      'bg-background/90 ring-1 ring-border hover:bg-background',
                      'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      togglePinnedWidget(widgetId)
                    }}
                    aria-label="Unpin widget">
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Always surface timer when running, even if not pinned */}
        {timerState?.isRunning && !orderedPinnedWidgets.includes('timer') && (
          <WidgetPopover widgetId="timer">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 gap-1.5 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30">
              <Pause className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono font-medium tabular-nums text-primary">
                {formatTimerDisplay(timerState.remaining)}
              </span>
            </Button>
          </WidgetPopover>
        )}

        {/* Divider before widgets button */}
        {(orderedPinnedWidgets.length > 0 || timerState?.isRunning) && <Separator />}

        {/* Widgets (left-expanding strip) */}
        <div className="flex items-center">
          <div
            className={cn(
              'flex items-center gap-1 overflow-x-hidden overflow-y-visible transition-all duration-200 ease-out',
              widgetsOpen ? 'max-w-[360px] opacity-100 mr-1' : 'max-w-0 opacity-0 mr-0',
            )}
            aria-hidden={!widgetsOpen}>
            <div className="flex items-center gap-1">
              {orderedUnpinnedWidgets.map((widgetId) => {
                const widget = getWidget(widgetId)
                if (!widget) return null
                const Icon = widget.icon
                const isPinned = orderedPinnedWidgets.includes(widgetId)

                return (
                  <div key={widgetId} className="group relative flex items-center overflow-visible">
                    <WidgetPopover widgetId={widgetId}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-transparent hover:bg-accent/40"
                        aria-label={widget.name}>
                        <Icon className="h-4 w-4" />
                      </Button>
                    </WidgetPopover>

                    <Button
                      type="button"
                      variant={isPinned ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn(
                        'absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full p-0 opacity-100 shadow-sm',
                        'bg-background/90 ring-1 ring-border hover:bg-background',
                        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        togglePinnedWidget(widgetId)
                      }}
                      aria-label={isPinned ? 'Unpin widget' : 'Pin widget'}>
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>

            <WidgetMarketplace />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={widgetsOpen ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                aria-label="Widgets"
                onClick={() => setWidgetsOpen((v) => !v)}>
                <Wrench className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Widgets</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider between widgets and status cluster */}
        {/* <Separator /> */}

        {/* WiFi / Battery (always visible) */}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 h-7 rounded-full bg-transparent text-muted-foreground hover:bg-accent/40">
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isOnline ? 'Connected' : 'Offline'}</p>
          </TooltipContent>
        </Tooltip>

        {battery && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 h-7 rounded-full bg-transparent text-muted-foreground hover:bg-accent/40">
                <BatteryIcon percentage={battery.percentage} charging={battery.is_charging} />
                <span className="tabular-nums">{Math.round(battery.percentage)}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                {battery.is_charging
                  ? battery.time_to_full_mins
                    ? `Charging - ${battery.time_to_full_mins}m to full`
                    : 'Charging'
                  : battery.time_to_empty_mins
                    ? `${battery.time_to_empty_mins}m remaining`
                    : `${Math.round(battery.percentage)}% charged`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Divider to the left of the datetime */}
        <Separator />

        {/* Date & Time (popover for time settings only) */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 rounded-full text-xs text-muted-foreground bg-transparent hover:bg-accent/40">
                  <span className="hidden sm:inline">{formatDate(time)}</span>
                  <span className="tabular-nums sm:ml-1">
                    {formatTime(time, { showSeconds: dockShowSeconds, use24Hour: dockUse24Hour })}
                  </span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{formatDate(time)}</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent side="top" align="end" className="w-80 p-3" sideOffset={12}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{formatDate(time)}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(time, { showSeconds: true, use24Hour: dockUse24Hour })}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setActiveApp('settings')}
                aria-label="Open Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Show seconds</Label>
                <Switch checked={dockShowSeconds} onCheckedChange={(v) => setDockShowSeconds(Boolean(v))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">24-hour time</Label>
                <Switch checked={dockUse24Hour} onCheckedChange={(v) => setDockUse24Hour(Boolean(v))} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Agent (right of datetime) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              onClick={toggleAgent}
              size="icon"
              style={{ border: 'none !important' }}
              className={cn(
                'h-7 w-7 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 border-none',
                agentOpen && 'ring-1 ring-ring',
              )}
              aria-label={agentOpen ? 'Close Agent' : 'Agent'}>
              <Bot className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{agentOpen ? 'Close Agent' : 'Agent'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
