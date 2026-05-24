import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AlertCircle, Save, Braces, GripHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { AppearanceSettings } from '@/components/app/settings/AppearanceSettings'
import { ExplorerSettings } from '@/components/app/settings/ExplorerSettings'
import { LayoutSettings } from '@/components/app/settings/LayoutSettings'
import { AdvancedSettings } from '@/components/app/settings/AdvancedSettings'
import { KeyboardSettings } from '@/components/app/settings/KeyboardSettings'
import { CodeViewer } from './codeViewer'

import { useTheme } from '@/components/themeProvider'
import { useUIStore } from '@/stores/useUIStore'

import type { LayoutMode } from '@/components/app/navigation'

interface SettingsState {
  // Appearance
  mode?: 'light' | 'dark' | 'system'
  themeId?: string

  // Explorer
  showDotfiles?: boolean

  // Layout
  layoutMode?: LayoutMode
  previewEnabled?: boolean
  dockPosition?: 'left' | 'bottom' | 'right'
}

interface SettingsViewerProps {
  filePath: string
}

export function SettingsViewer({ filePath }: SettingsViewerProps) {
  const [settings, setSettings] = React.useState<SettingsState | null>(null)
  const [sourceValue, setSourceValue] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showSource, setShowSource] = React.useState(() => {
    const stored = localStorage.getItem('settingsViewer.showSource')
    return stored === 'true'
  })
  const [sourcePanelHeight, setSourcePanelHeight] = React.useState(() => {
    const stored = localStorage.getItem('settingsViewer.sourcePanelHeight')
    return stored ? parseInt(stored, 10) : 250
  })
  const [isResizing, setIsResizing] = React.useState(false)
  const suppressSourceSyncRef = React.useRef(false)

  // Get store actions for real-time sync
  const { setMode: setThemeMode, setThemeId } = useTheme()
  const { setLayoutMode, setPreviewEnabled, setShowDotfiles } = useUIStore()

  React.useEffect(() => {
    let cancelled = false

    const loadFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<{ content: string }>('read_text_file', {
          filePath,
        })

        if (!cancelled) {
          try {
            const parsed = JSON.parse(result.content)
            setSettings(parsed)
            setSourceValue(result.content)
          } catch (e) {
            setError('Invalid JSON format')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
    }
  }, [filePath])

  const saveSettings = async (newSettings: SettingsState) => {
    setIsSaving(true)
    try {
      const serialized = JSON.stringify(newSettings, null, 2)
      // Save to file
      await invoke('write_text_file', {
        filePath,
        content: serialized,
      })
      setSettings(newSettings)
      if (!suppressSourceSyncRef.current) {
        setSourceValue(serialized)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSource = React.useCallback(() => {
    setShowSource((prev) => {
      const next = !prev
      localStorage.setItem('settingsViewer.showSource', String(next))
      return next
    })
  }, [])

  const handleSourceChange = React.useCallback(
    (newContent: string) => {
      try {
        const parsed = JSON.parse(newContent)
        suppressSourceSyncRef.current = true
        setSourceValue(newContent)
        setSettings(parsed)

        // Save to file
        invoke('write_text_file', {
          filePath,
          content: newContent,
        }).catch((err) => {
          console.error('Failed to save settings:', err)
        })

        requestAnimationFrame(() => {
          suppressSourceSyncRef.current = false
        })
      } catch (err) {
        console.warn('Invalid JSON in source editor:', err)
      }
    },
    [filePath],
  )

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    if (!settings) return

    const newSettings = { ...settings, [key]: value }

    // Update the file
    saveSettings(newSettings)

    // Also update the app stores immediately for real-time sync
    switch (key) {
      case 'mode':
        if (value) setThemeMode(value as 'light' | 'dark' | 'system')
        break
      case 'themeId':
        if (value) setThemeId(value as string)
        break
      case 'showDotfiles':
        if (value !== undefined) setShowDotfiles(value as boolean)
        break
      case 'layoutMode':
        if (value) setLayoutMode(value as LayoutMode)
        break
      case 'previewEnabled':
        if (value !== undefined) setPreviewEnabled(value as boolean)
        break
      // dockPosition doesn't have a store yet, so just save to file
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load settings</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="h-full flex flex-col bg-card/10">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Settings Editor</h2>
          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{filePath}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Save className="h-3 w-3" />
              Saving...
            </div>
          )}
          <Button
            variant={showSource ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleToggleSource}>
            <Braces className="h-3.5 w-3.5" />
            Source
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-8">
              <ExplorerSettings
                showDotfiles={settings.showDotfiles ?? true}
                setShowDotfiles={(v) => updateSetting('showDotfiles', v)}
              />
              <Separator />
              <KeyboardSettings />
            </TabsContent>

            <TabsContent value="appearance">
              <AppearanceSettings
                mode={settings.mode ?? 'system'}
                setMode={(v) => updateSetting('mode', v)}
                themeId={settings.themeId}
                setThemeId={(v) => updateSetting('themeId', v)}
              />
            </TabsContent>

            <TabsContent value="layout">
              <LayoutSettings
                layoutMode={settings.layoutMode ?? 'tree'}
                setLayoutMode={(v) => updateSetting('layoutMode', v)}
                previewEnabled={settings.previewEnabled ?? true}
                setPreviewEnabled={(v) => updateSetting('previewEnabled', v)}
                dockPosition={settings.dockPosition ?? 'bottom'}
                setDockPosition={(v) => updateSetting('dockPosition', v)}
              />
            </TabsContent>

            <TabsContent value="advanced">
              <AdvancedSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Source panel */}
      {showSource && (
        <div className="border-t border-border/60 flex flex-col" style={{ height: sourcePanelHeight }}>
          {/* Resize handle */}
          <div
            className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-accent/50 transition-colors group"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsResizing(true)
              const startY = e.clientY
              const startHeight = sourcePanelHeight

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = startY - moveEvent.clientY
                const newHeight = Math.max(100, Math.min(500, startHeight + delta))
                setSourcePanelHeight(newHeight)
              }

              const handleMouseUp = () => {
                setIsResizing(false)
                localStorage.setItem('settingsViewer.sourcePanelHeight', String(sourcePanelHeight))
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}>
            <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
          </div>

          {/* Code viewer */}
          <div className="flex-1 overflow-hidden">
            <CodeViewer
              filePath={filePath}
              extension="json"
              maxBytes={5 * 1024 * 1024}
              content={sourceValue || undefined}
              onContentChange={handleSourceChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
