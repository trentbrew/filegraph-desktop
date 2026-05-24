/**
 * Settings App
 * Full-screen settings interface with collapsible sidebar navigation
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useVault } from '@/contexts/VaultContext'
import {
  Settings,
  FolderOpen,
  Palette,
  Layout,
  Keyboard,
  Sparkles,
  Eye,
  Save,
  Braces,
  GripHorizontal,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-react'

import { AppSidebar, type SidebarItem } from './AppSidebar'
import { AppearanceSettings } from '@/components/app/settings/AppearanceSettings'
import { ExplorerSettings } from '@/components/app/settings/ExplorerSettings'
import { LayoutSettings } from '@/components/app/settings/LayoutSettings'
import { AdvancedSettings } from '@/components/app/settings/AdvancedSettings'
import { KeyboardSettings } from '@/components/app/settings/KeyboardSettings'
import { ProfileSettings } from '@/components/app/settings/ProfileSettings'
import { CodeViewer } from '@/features/preview/viewers/codeViewer'

import { useTheme } from '@/components/themeProvider'
import { useUIStore } from '@/stores/useUIStore'
import type { LayoutMode } from '@/components/app/navigation'

const SETTINGS_SECTIONS: SidebarItem[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'layout', label: 'Layout', icon: Layout },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'advanced', label: 'Advanced', icon: Sparkles },
]

interface SettingsState {
  mode?: 'light' | 'dark' | 'system'
  themeId?: string
  showDotfiles?: boolean
  layoutMode?: LayoutMode
  previewEnabled?: boolean
  dockPosition?: 'left' | 'bottom' | 'right'
}

export function SettingsApp() {
  const { vaultPath } = useVault()
  const settingsFilePath = vaultPath ? `${vaultPath}/@system/config.data` : null

  const [activeSection, setActiveSection] = React.useState('general')
  const [settings, setSettings] = React.useState<SettingsState | null>(null)
  const [sourceValue, setSourceValue] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showSource, setShowSource] = React.useState(false)
  const suppressSourceSyncRef = React.useRef(false)

  const { setMode: setThemeMode, setThemeId } = useTheme()
  const { setLayoutMode, setPreviewEnabled, setShowDotfiles } = useUIStore()

  // Load settings
  React.useEffect(() => {
    if (!settingsFilePath) {
      setLoading(false)
      return
    }

    let cancelled = false
    const loadFile = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath: settingsFilePath })
        if (!cancelled) {
          try {
            const parsed = JSON.parse(result.content)
            setSettings(parsed)
            setSourceValue(result.content)
          } catch {
            setError('Invalid JSON format')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadFile()
    return () => {
      cancelled = true
    }
  }, [settingsFilePath])

  const saveSettings = async (newSettings: SettingsState) => {
    if (!settingsFilePath) return
    setIsSaving(true)
    try {
      const serialized = JSON.stringify(newSettings, null, 2)
      await invoke('write_text_file', { filePath: settingsFilePath, content: serialized })
      setSettings(newSettings)
      if (!suppressSourceSyncRef.current) setSourceValue(serialized)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    if (!settings) return
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)

    // Sync with stores
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
    }
  }

  // No vault state
  if (!vaultPath || !settingsFilePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 rounded-xl border bg-card">
        <Settings className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Vault Selected</h2>
        <p className="text-muted-foreground max-w-sm mb-6">Open a vault to access settings.</p>
        <Button variant="outline" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Open Vault
        </Button>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full rounded-xl border bg-card flex">
        <div className="w-52 border-r p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 rounded-xl border bg-card">
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
    <div className="h-full rounded-xl border bg-card overflow-hidden flex">
      {/* Sidebar */}
      <AppSidebar
        items={SETTINGS_SECTIONS}
        activeItem={activeSection}
        onItemSelect={setActiveSection}
        title="Settings"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label || 'Settings'}
            </h2>
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
              onClick={() => setShowSource(!showSource)}>
              <Braces className="h-3.5 w-3.5" />
              Source
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'general' && (
            <ExplorerSettings
              showDotfiles={settings.showDotfiles ?? true}
              setShowDotfiles={(v) => updateSetting('showDotfiles', v)}
            />
          )}

          {activeSection === 'appearance' && (
            <AppearanceSettings
              mode={settings.mode ?? 'system'}
              setMode={(v) => updateSetting('mode', v)}
              themeId={settings.themeId}
              setThemeId={(v) => updateSetting('themeId', v)}
            />
          )}

          {activeSection === 'layout' && (
            <LayoutSettings
              layoutMode={settings.layoutMode ?? 'tree'}
              setLayoutMode={(v) => updateSetting('layoutMode', v)}
              previewEnabled={settings.previewEnabled ?? true}
              setPreviewEnabled={(v) => updateSetting('previewEnabled', v)}
              dockPosition={settings.dockPosition ?? 'bottom'}
              setDockPosition={(v) => updateSetting('dockPosition', v)}
            />
          )}

          {activeSection === 'keyboard' && <KeyboardSettings />}

          {activeSection === 'profile' && <ProfileSettings />}

          {activeSection === 'advanced' && <AdvancedSettings />}
        </div>

        {/* Source Panel */}
        {showSource && (
          <div className="border-t h-64 flex flex-col">
            <div className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-accent/50 transition-colors group">
              <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeViewer
                filePath={settingsFilePath}
                extension="json"
                maxBytes={5 * 1024 * 1024}
                content={sourceValue || undefined}
                onContentChange={(newContent) => {
                  try {
                    const parsed = JSON.parse(newContent)
                    suppressSourceSyncRef.current = true
                    setSourceValue(newContent)
                    setSettings(parsed)
                    invoke('write_text_file', { filePath: settingsFilePath, content: newContent })
                    requestAnimationFrame(() => {
                      suppressSourceSyncRef.current = false
                    })
                  } catch {}
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
