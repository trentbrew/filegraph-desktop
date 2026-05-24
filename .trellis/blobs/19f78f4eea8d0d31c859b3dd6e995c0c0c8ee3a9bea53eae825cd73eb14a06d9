import * as React from 'react'
import { Grid3x3, TableIcon, Columns3, ListTree, Network, PanelLeft, PanelBottom, PanelRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { LayoutMode } from '@/components/app/navigation'

interface LayoutSettingsProps {
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
  previewEnabled: boolean
  setPreviewEnabled: (enabled: boolean) => void
  dockPosition: 'left' | 'bottom' | 'right'
  setDockPosition: (position: 'left' | 'bottom' | 'right') => void
}

export function LayoutSettings({
  layoutMode,
  setLayoutMode,
  previewEnabled,
  setPreviewEnabled,
  dockPosition,
  setDockPosition,
}: LayoutSettingsProps) {
  const viewModes: { value: LayoutMode; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: 'table',
      label: 'Table',
      description: 'Classic table view with columns',
      icon: <TableIcon className="h-5 w-5 mt-0.5 shrink-0" />,
    },
    {
      value: 'grid',
      label: 'Grid',
      description: 'Icon grid with thumbnails',
      icon: <Grid3x3 className="h-5 w-5 mt-0.5 shrink-0" />,
    },
    {
      value: 'columns',
      label: 'Columns',
      description: 'Multi-column layout',
      icon: <Columns3 className="h-5 w-5 mt-0.5 shrink-0" />,
    },
    {
      value: 'tree',
      label: 'Tree',
      description: 'Hierarchical tree view',
      icon: <ListTree className="h-5 w-5 mt-0.5 shrink-0" />,
    },
    {
      value: 'graph',
      label: 'Graph',
      description: 'Visual graph layout',
      icon: <Network className="h-5 w-5 mt-0.5 shrink-0" />,
    },
  ]

  const dockIcons = {
    left: <PanelLeft className="h-5 w-5" />,
    bottom: <PanelBottom className="h-5 w-5" />,
    right: <PanelRight className="h-5 w-5" />,
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Default View Mode</h3>
        <div className="grid gap-3">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setLayoutMode(mode.value)}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary ${
                layoutMode === mode.value ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
              {mode.icon}
              <div className="flex-1">
                <div className="font-medium">{mode.label}</div>
                <div className="text-sm text-muted-foreground">{mode.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Preview Panel</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preview-enabled">Enable Preview</Label>
              <p className="text-sm text-muted-foreground">Show file preview in side panel</p>
            </div>
            <Switch id="preview-enabled" checked={previewEnabled} onCheckedChange={setPreviewEnabled} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Dock Position</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['left', 'bottom', 'right'] as const).map((position) => (
            <button
              key={position}
              onClick={() => setDockPosition(position)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-all hover:border-primary ${
                dockPosition === position ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
              {dockIcons[position]}
              <div className="font-medium capitalize">{position}</div>
              <div className="text-xs text-muted-foreground">
                {position === 'left' && 'Dock on left side'}
                {position === 'bottom' && 'Dock at bottom'}
                {position === 'right' && 'Dock on right side'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
