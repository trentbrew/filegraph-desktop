/**
 * HomeCanvasHeader Component
 *
 * Persistent header bar for the home canvas view.
 * Contains traffic lights, workspace/space selector, status cluster, and search trigger.
 * Styled to match the dock (bg-card, rounded-xl, border).
 * Window-draggable via data-tauri-drag-region.
 */

import * as React from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  Minus,
  Square,
  X,
  Search,
  Bot,
  // Wifi,
  // WifiOff,
  // BatteryCharging,
  // BatteryFull,
  // BatteryLow,
  // BatteryMedium,
  // BatteryWarning,
  // Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
// import { invoke } from '@tauri-apps/api/core'
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// import { Switch } from '@/components/ui/switch'
// import { Label } from '@/components/ui/label'
// import { useAppStore } from '@/stores/useAppStore'
import { useTrafficLights } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import { useHomeCanvasStore } from './useHomeCanvasStore'
import { SpaceTabs } from './SpaceTabs'

// ── Status helpers ────────────────────────────────────────────────────────────
// interface BatteryInfo {
//   percentage: number
//   is_charging: boolean
//   time_to_empty_mins?: number
//   time_to_full_mins?: number
// }
// interface SystemInfo {
//   battery: BatteryInfo | null
//   memory_usage_percent: number
//   cpu_usage_percent: number
// }
// function formatTime(date: Date, opts: { showSeconds: boolean; use24Hour: boolean }): string {
//   return date.toLocaleTimeString('en-US', {
//     hour: 'numeric',
//     minute: '2-digit',
//     second: opts.showSeconds ? '2-digit' : undefined,
//     hour12: !opts.use24Hour,
//   })
// }
// function formatDate(date: Date): string {
//   return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
// }
// function BatteryIcon({ percentage, charging }: { percentage: number; charging: boolean }) {
//   if (charging) return <BatteryCharging className="w-3.5 h-3.5" />
//   if (percentage >= 80) return <BatteryFull className="w-3.5 h-3.5" />
//   if (percentage >= 50) return <BatteryMedium className="w-3.5 h-3.5" />
//   if (percentage >= 20) return <BatteryLow className="w-3.5 h-3.5" />
//   return <BatteryWarning className="w-3.5 h-3.5 text-red-500" />
// }

/** Compact status cluster for the header */
function HeaderStatusCluster() {
  const { agentOpen, toggleAgent } = useUIStore()
  // const [time, setTime] = React.useState(new Date())
  // const [systemInfo, setSystemInfo] = React.useState<SystemInfo | null>(null)
  // const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  // const { dockShowSeconds, dockUse24Hour, setDockShowSeconds, setDockUse24Hour } = useUIStore()
  // const { setActiveApp } = useAppStore()

  // React.useEffect(() => {
  //   const intervalMs = dockShowSeconds ? 1000 : 60000
  //   const interval = setInterval(() => setTime(new Date()), intervalMs)
  //   return () => clearInterval(interval)
  // }, [dockShowSeconds])

  // React.useEffect(() => {
  //   const handleOnline = () => setIsOnline(true)
  //   const handleOffline = () => setIsOnline(false)
  //   window.addEventListener('online', handleOnline)
  //   window.addEventListener('offline', handleOffline)
  //   return () => {
  //     window.removeEventListener('online', handleOnline)
  //     window.removeEventListener('offline', handleOffline)
  //   }
  // }, [])

  // React.useEffect(() => {
  //   const fetchSystemInfo = async () => {
  //     try {
  //       const info = await invoke<SystemInfo>('get_system_info')
  //       setSystemInfo(info)
  //     } catch {
  //       // Silently ignore
  //     }
  //   }
  //   fetchSystemInfo()
  //   const interval = setInterval(fetchSystemInfo, 30000)
  //   return () => clearInterval(interval)
  // }, [])

  // const battery = systemInfo?.battery

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
        {/* Agent toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={toggleAgent}
              size="icon"
              className={cn(
                'h-7 w-7 rounded-full',
                agentOpen && 'bg-accent text-accent-foreground',
              )}
              aria-label={agentOpen ? 'Close Agent' : 'Agent'}>
              <Bot className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{agentOpen ? 'Close Agent' : 'Agent'}</p>
          </TooltipContent>
        </Tooltip>

        {/* WiFi */}
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center px-1 h-7 rounded-full text-muted-foreground">
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 text-red-500" />}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isOnline ? 'Connected' : 'Offline'}</p>
          </TooltipContent>
        </Tooltip> */}

        {/* Battery */}
        {/* {battery && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 px-1 h-7 rounded-full text-muted-foreground">
                <BatteryIcon percentage={battery.percentage} charging={battery.is_charging} />
                <span className="tabular-nums text-[11px]">{Math.round(battery.percentage)}%</span>
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
        )} */}

        {/* <div className="mx-0.5 h-4 w-[1.2px] bg-foreground/15" aria-hidden="true" /> */}

        {/* Date & Time */}
        {/* <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-full text-[11px] text-muted-foreground bg-transparent hover:bg-accent/40">
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
          <PopoverContent side="bottom" align="end" className="w-80 p-3" sideOffset={12}>
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
        </Popover> */}
      </div>
    </TooltipProvider>
  )
}

// ── Main Header ──

interface HomeCanvasHeaderProps {
  className?: string
}

export function HomeCanvasHeader({ className }: HomeCanvasHeaderProps) {
  const spaces = useHomeCanvasStore((s) => s.spaces)
  const activeSpaceId = useHomeCanvasStore((s) => s.activeSpaceId)
  const switchSpace = useHomeCanvasStore((s) => s.switchSpace)
  const createNewSpace = useHomeCanvasStore((s) => s.createNewSpace)
  const appWindow = React.useMemo(() => {
    try {
      return getCurrentWindow()
    } catch {
      return null
    }
  }, [])

  const handleFullscreen = async () => {
    if (!appWindow) return
    const isFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!isFullscreen)
  }

  const handleMaximize = async () => {
    if (!appWindow) return
    const isMaximized = await appWindow.isMaximized()
    if (isMaximized) {
      await appWindow.unmaximize()
    } else {
      await appWindow.maximize()
    }
  }

  return (
    <div
      data-tauri-drag-region
      className={cn(
        'relative flex items-center justify-between px-2 py-2 gap-2 h-12 border bg-card rounded-xl mx-3 mt-3 shrink-0',
        className,
      )}>
      {/* Left: Window controls + Sidebar toggle + Space selector */}
      <div data-tauri-drag-region className="flex items-center gap-2 min-w-0 flex-1">
        {/* Window Controls — platform-aware */}
        {useTrafficLights() ? (
          /* macOS Traffic Lights */
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <button
              onClick={() => appWindow?.close()}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Close">
              <span className="hidden group-hover:inline text-[10px] text-red-900 font-bold leading-none">×</span>
            </button>
            <button
              onClick={() => appWindow?.minimize()}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Minimize">
              <span className="hidden group-hover:inline text-[10px] text-yellow-900 font-bold leading-none">−</span>
            </button>
            <button
              onClick={handleFullscreen}
              className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#34C759] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Fullscreen">
              <span className="hidden group-hover:inline text-[8px] text-green-900 font-bold leading-none">⤢</span>
            </button>
          </div>
        ) : (
          /* Linux / Windows CSD buttons */
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => appWindow?.minimize()}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Minimize">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Maximize">
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => appWindow?.close()}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/90 hover:text-white transition-colors"
              aria-label="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Separator */}
        {/* <div className="mx-1 h-4 w-[1.2px] bg-foreground/15 shrink-0" aria-hidden="true" /> */}

        {/* Breadcrumb path with space selector as last crumb */}
        <Breadcrumb className="min-w-0 ml-4">
          <BreadcrumbList className="flex-nowrap gap-2 sm:gap-1.5">
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbPage className="text-muted-foreground font-normal text-sm opacity-50">~</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block [&>svg]:size-3 text-muted-foreground/50">
              <span className="mx-2">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbPage className="text-muted-foreground font-normal text-sm opacity-50">Filegraph</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block [&>svg]:size-3 text-muted-foreground/50">
              <span className="mx-2">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbPage className="text-muted-foreground font-normal text-sm opacity-75">Spaces</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block [&>svg]:size-3 text-muted-foreground/50">
              <span className="ml-2">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <SpaceTabs
                spaces={spaces}
                activeSpaceId={activeSpaceId}
                onSpaceChange={switchSpace}
                onCreateSpace={(name) => createNewSpace(name)}
                className="min-w-0"
              />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Search input button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="flex-1 h-7 px-3 flex items-center gap-2 rounded-lg text-xs text-muted-foreground max-w-[250px]">
        <Search className="h-3 w-3 shrink-0 opacity-50" />
        <span className="truncate">Search anything...</span>
        <kbd className="ml-auto hidden sm:inline-flex h-4 items-center gap-0.5 rounded border bg-muted-foreground/10 px-1 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      {/* Right: Status cluster */}
      <div className="flex items-center gap-1 shrink-0">
        <HeaderStatusCluster />
      </div>
    </div>
  )
}
