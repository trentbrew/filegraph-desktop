/**
 * Widget Popover
 * Renders the appropriate widget in a popover based on widget ID
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useVault } from '@/contexts/VaultContext'
import { getWidget, createDefaultWidgetData, type WidgetId, type WidgetData } from '@/lib/widgets'
import { TimerWidget } from './TimerWidget'
import { QuickNotesWidget } from './QuickNotesWidget'
import { TodayScheduleWidget } from './TodayScheduleWidget'
import { CalculatorWidget } from './CalculatorWidget'

interface WidgetPopoverProps {
  widgetId: WidgetId
  children?: React.ReactNode
}

export function WidgetPopover({ widgetId, children }: WidgetPopoverProps) {
  const { vaultPath } = useVault()
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<WidgetData | null>(null)
  const widget = getWidget(widgetId)

  // Load widget data from file
  const loadWidgetData = React.useCallback(async () => {
    if (!vaultPath) return

    const widgetPath = `${vaultPath}/@system/widgets/${widgetId}.data`

    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath: widgetPath })
      const parsed = JSON.parse(response.content) as WidgetData

      // For timer: don't auto-resume from previous session - user must start manually
      if (widgetId === 'timer' && (parsed as any).state?.isRunning) {
        ;(parsed as any).state.isRunning = false
      }

      setData(parsed)
    } catch {
      // File doesn't exist, create default data
      const defaultData = createDefaultWidgetData(widgetId)
      setData(defaultData)
    }
  }, [vaultPath, widgetId])

  // Save widget data to file
  const saveWidgetData = React.useCallback(
    async (newData: WidgetData) => {
      if (!vaultPath) return

      const widgetPath = `${vaultPath}/@system/widgets/${widgetId}.data`
      const content = JSON.stringify(newData, null, 2)

      try {
        await invoke('write_text_file', { filePath: widgetPath, content })
      } catch (e) {
        console.warn(`[WidgetPopover] Failed to save ${widgetId}:`, e)
      }
    },
    [vaultPath, widgetId],
  )

  // Load data when popover opens
  React.useEffect(() => {
    if (open) {
      loadWidgetData()
    }
  }, [open, loadWidgetData])

  // Handle widget data updates
  const handleUpdate = React.useCallback(
    (partial: Partial<WidgetData>) => {
      if (!data) return

      const newData = {
        ...data,
        ...partial,
        state: { ...data.state, ...(partial as any).state },
        settings: { ...data.settings, ...(partial as any).settings },
        updatedAt: new Date().toISOString(),
      } as WidgetData

      setData(newData)
      saveWidgetData(newData)
    },
    [data, saveWidgetData],
  )

  // Render the appropriate widget
  const renderWidget = () => {
    if (!data) return null

    switch (widgetId) {
      case 'timer':
        return <TimerWidget data={data as any} onUpdate={handleUpdate} />
      case 'quick-notes':
        return <QuickNotesWidget data={data as any} onUpdate={handleUpdate} />
      case 'today-schedule':
        return <TodayScheduleWidget data={data as any} onUpdate={handleUpdate} />
      case 'calculator':
        return <CalculatorWidget data={data as any} onUpdate={handleUpdate} />
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{widget.name}</p>
            <p className="text-xs">Coming soon</p>
          </div>
        )
    }
  }

  // Get popover size based on widget type
  const getPopoverClass = () => {
    switch (widgetId) {
      case 'timer':
        return 'w-80' // Larger for tabs
      case 'quick-notes':
        return 'w-80'
      case 'today-schedule':
        return 'w-80'
      case 'calculator':
        return 'w-64'
      default:
        return 'w-72'
    }
  }

  // Skip rendering if widget not found in registry (may have been removed)
  if (!widget) return null

  const Icon = widget.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {children || (
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Icon className="h-4 w-4" />
              </Button>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && (
          <TooltipContent side="bottom">
            <p>{widget.name}</p>
          </TooltipContent>
        )}
      </Tooltip>
      <PopoverContent side="bottom" align="end" className={`${getPopoverClass()} p-0`} sideOffset={8}>
        <div className="border-b px-3 py-2 flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{widget.name}</span>
        </div>
        {renderWidget()}
      </PopoverContent>
    </Popover>
  )
}
