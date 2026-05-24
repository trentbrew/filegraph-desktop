import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/themeProvider'
import { useUIStore } from '@/stores/useUIStore'
import { RotateCcw, Minus, Plus } from 'lucide-react'

interface AppearanceSettingsProps {
  mode: string
  setMode: (mode: 'light' | 'dark' | 'system') => void
  themeId?: string
  setThemeId?: (id: string) => void
}

export function AppearanceSettings({
  mode,
  setMode,
  themeId: propThemeId,
  setThemeId: propSetThemeId,
}: AppearanceSettingsProps) {
  const { availableThemes, themeId: contextThemeId, setThemeId: contextSetThemeId } = useTheme()
  const {
    zoomLevel,
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    webPreviewZoom,
    setWebPreviewZoom,
    resetWebPreviewZoom,
  } = useUIStore()

  const themeId = propThemeId ?? contextThemeId
  const setThemeId = propSetThemeId ?? contextSetThemeId

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Color Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => setMode(t as 'light' | 'dark' | 'system')}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary ${
                mode === t ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
              <div
                className={`h-16 w-full rounded ${
                  t === 'light'
                    ? 'bg-white border'
                    : t === 'dark'
                      ? 'bg-zinc-900'
                      : 'bg-linear-to-br from-white via-zinc-400 to-zinc-900'
                }`}
              />
              <span className="text-sm font-medium capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Theme Presets</h3>
        <p className="text-sm text-muted-foreground mb-2">Choose from built-in theme presets.</p>
        <div className="max-w-xs">
          <Select value={themeId} onValueChange={setThemeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a theme" />
            </SelectTrigger>
            <SelectContent>
              {availableThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Zoom</h3>
        <div className="space-y-4">
          {/* UI Zoom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Interface Zoom</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 50}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-12 text-center text-sm font-medium">{zoomLevel}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 200}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={resetZoom} disabled={zoomLevel === 100}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-muted-foreground">Scale the entire UI (50% - 200%)</p>
          </div>

          {/* Web Preview Zoom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Web Preview Zoom</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setWebPreviewZoom(Math.max(25, webPreviewZoom - 25))}
                  disabled={webPreviewZoom <= 25}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-12 text-center text-sm font-medium">{webPreviewZoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setWebPreviewZoom(Math.min(400, webPreviewZoom + 25))}
                  disabled={webPreviewZoom >= 400}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={resetWebPreviewZoom}
                  disabled={webPreviewZoom === 100}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <input
              type="range"
              min="25"
              max="400"
              step="25"
              value={webPreviewZoom}
              onChange={(e) => setWebPreviewZoom(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-muted-foreground">Scale .web file previews independently (25% - 400%)</p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Interface Density</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
            </div>
            <Switch id="compact-mode" disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
