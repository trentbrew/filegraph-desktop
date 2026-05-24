import * as React from 'react'
import {
  Eye,
  EyeOff,
  Layout,
  Palette,
  Info,
  Settings as SettingsIcon,
  Sliders,
  Grid3x3,
  PanelsTopLeft,
  FileText,
  Keyboard,
  User,
  Link2,
  Bot,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/themeProvider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUIStore } from '@/stores'
import type { LayoutMode } from './navigation'
import { DEFAULT_KEYBINDINGS } from '@/lib/keybindings/defaults'
import { KeyCategory } from '@/lib/keybindings/types'

import { ThemeEditor } from './ThemeEditor'
import { ProfileSettings } from './settings/ProfileSettings'
import { ConnectedAccountsSettings } from './settings/ConnectedAccountsSettings'
import { AgentSettings } from './settings/AgentSettings'

const settingsSections = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'accounts', name: 'Connected Accounts', icon: Link2 },
  { id: 'agent', name: 'Agent', icon: Bot },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'theme-editor', name: 'Theme Editor', icon: Palette },
  { id: 'home-canvas', name: 'Home Canvas', icon: PanelsTopLeft },
  { id: 'explorer', name: 'File Explorer', icon: FileText },
  { id: 'layout', name: 'Layout & Views', icon: Layout },
  { id: 'keyboard', name: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'advanced', name: 'Advanced', icon: Sliders },
  { id: 'about', name: 'About', icon: Info },
]

interface SettingsDialogProps {
  trigger?: React.ReactNode
  defaultSection?: string
}

function HomeCanvasSettings({
  homeCanvasNamespaceTileClickBehavior,
  setHomeCanvasNamespaceTileClickBehavior,
}: {
  homeCanvasNamespaceTileClickBehavior: 'add_to_canvas' | 'open_file'
  setHomeCanvasNamespaceTileClickBehavior: (behavior: 'add_to_canvas' | 'open_file') => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sidebar</h3>
        <div className="space-y-4">
          <div>
            <Label>Namespace tile click</Label>
            <p className="text-sm text-muted-foreground">Choose what happens when you click a namespace tile.</p>
            <div className="max-w-xs mt-2">
              <Select
                value={homeCanvasNamespaceTileClickBehavior}
                onValueChange={(v) => setHomeCanvasNamespaceTileClickBehavior(v as 'add_to_canvas' | 'open_file')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_to_canvas">Add to canvas</SelectItem>
                  <SelectItem value="open_file">Open file</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsDialog({ trigger, defaultSection = 'profile' }: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState(defaultSection)
  const { mode, setMode } = useTheme()

  const {
    layoutMode,
    previewEnabled,
    showDotfiles,
    homeCanvasNamespaceTileClickBehavior,
    setLayoutMode,
    setPreviewEnabled,
    setShowDotfiles,
    setHomeCanvasNamespaceTileClickBehavior,
  } = useUIStore()

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings />
      case 'accounts':
        return <ConnectedAccountsSettings />
      case 'agent':
        return <AgentSettings />
      case 'appearance':
        return <AppearanceSettings mode={mode} setMode={setMode} />
      case 'theme-editor':
        return <ThemeEditor />
      case 'home-canvas':
        return (
          <HomeCanvasSettings
            homeCanvasNamespaceTileClickBehavior={homeCanvasNamespaceTileClickBehavior}
            setHomeCanvasNamespaceTileClickBehavior={setHomeCanvasNamespaceTileClickBehavior}
          />
        )
      case 'explorer':
        return <ExplorerSettings showDotfiles={showDotfiles} setShowDotfiles={setShowDotfiles} />
      case 'layout':
        return (
          <LayoutSettings
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            previewEnabled={previewEnabled}
            setPreviewEnabled={setPreviewEnabled}
          />
        )
      case 'keyboard':
        return <KeyboardSettings />
      case 'advanced':
        return <AdvancedSettings />
      case 'about':
        return <AboutSection />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" aria-label="Open Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[800px] md:max-w-[900px] lg:max-w-[1100px] rounded-xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Customize your application settings</DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsSections.map((section) => (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton
                          asChild
                          className="rounded-lg"
                          isActive={section.id === activeSection}
                          onClick={() => setActiveSection(section.id)}>
                          <button type="button">
                            <section.icon />
                            <span>{section.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[580px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b">
              <div className="flex items-center gap-2 px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{settingsSections.find((s) => s.id === activeSection)?.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}

// Appearance Settings Section
function AppearanceSettings({ mode, setMode }: { mode: string; setMode: (mode: 'light' | 'dark' | 'system') => void }) {
  const { availableThemes, themeId, setThemeId } = useTheme()

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

// File Explorer Settings Section
function ExplorerSettings({
  showDotfiles,
  setShowDotfiles,
}: {
  showDotfiles: boolean
  setShowDotfiles: (show: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Visibility</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showDotfiles ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="show-dotfiles">Show Hidden Files</Label>
                <p className="text-sm text-muted-foreground">Display files and folders starting with "."</p>
              </div>
            </div>
            <Switch id="show-dotfiles" checked={showDotfiles} onCheckedChange={setShowDotfiles} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Behavior</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirm-delete">Confirm Before Delete</Label>
              <p className="text-sm text-muted-foreground">Show confirmation dialog when deleting files</p>
            </div>
            <Switch id="confirm-delete" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <p className="text-sm text-muted-foreground">Automatically refresh when files change</p>
            </div>
            <Switch id="auto-refresh" defaultChecked disabled />
          </div>
        </div>
      </div>
    </div>
  )
}

// Layout Settings Section
function LayoutSettings({
  layoutMode,
  setLayoutMode,
  previewEnabled,
  setPreviewEnabled,
}: {
  layoutMode: LayoutMode
  previewEnabled: boolean
  setLayoutMode: (mode: LayoutMode) => void
  setPreviewEnabled: (enabled: boolean) => void
}) {
  const viewModes: { value: LayoutMode; label: string; description: string }[] = [
    { value: 'table', label: 'Table', description: 'Classic table view with columns' },
    { value: 'grid', label: 'Grid', description: 'Icon grid with thumbnails' },
    { value: 'columns', label: 'Columns', description: 'Multi-column layout' },
    { value: 'tree', label: 'Tree', description: 'Hierarchical tree view' },
    { value: 'graph', label: 'Graph', description: 'Visual graph layout' },
  ]

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
              <Grid3x3 className="h-5 w-5 mt-0.5 shrink-0" />
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
    </div>
  )
}

// Advanced Settings Section
function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hardware-accel">Hardware Acceleration</Label>
              <p className="text-sm text-muted-foreground">Use GPU for rendering (requires restart)</p>
            </div>
            <Switch id="hardware-accel" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="file-watcher">File System Watcher</Label>
              <p className="text-sm text-muted-foreground">Monitor file changes in real-time</p>
            </div>
            <Switch id="file-watcher" defaultChecked disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Developer</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dev-tools">Enable DevTools</Label>
              <p className="text-sm text-muted-foreground">Access browser developer tools</p>
            </div>
            <Switch id="dev-tools" disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Data</h3>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            Clear Cache
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Reset All Settings
          </Button>
        </div>
      </div>
    </div>
  )
}

// Keyboard Shortcuts Settings Section
function KeyboardSettings() {
  const categories = [
    { id: KeyCategory.Navigation, name: 'Navigation' },
    { id: KeyCategory.FileOperations, name: 'File Operations' },
    { id: KeyCategory.View, name: 'View' },
    { id: KeyCategory.Search, name: 'Search' },
    { id: KeyCategory.Editing, name: 'Editing' },
    { id: KeyCategory.Custom, name: 'Other' },
  ]

  const [selectedCategory, setSelectedCategory] = React.useState(KeyCategory.Navigation)

  const filteredBindings = DEFAULT_KEYBINDINGS.filter((binding) => binding.category === selectedCategory)

  const formatKey = (key: string) => {
    return key
      .split(' ')
      .map((chord) =>
        chord
          .split('+')
          .map((k) => {
            const keyMap: Record<string, string> = {
              cmd: '⌘',
              ctrl: '⌃',
              alt: '⌥',
              shift: '⇧',
              enter: '↩',
              backspace: '⌫',
              delete: '⌦',
              esc: '⎋',
              up: '↑',
              down: '↓',
              left: '←',
              right: '→',
              space: 'Space',
              tab: '⇥',
            }
            return keyMap[k.toLowerCase()] || k.toUpperCase()
          })
          .join(''),
      )
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shortcuts by Category</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredBindings.map((binding) => (
            <div
              key={binding.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium">{binding.description}</div>
                {binding.when && <div className="text-xs text-muted-foreground mt-0.5">When: {binding.when}</div>}
              </div>
              <div className="flex gap-1">
                {binding.key.split(' ').map((chord, idx) => (
                  <kbd
                    key={idx}
                    className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm">
                    {formatKey(chord)}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>Tip:</strong> Key chords (like ⌘K ⌘S) require pressing keys in sequence.
        </p>
        <p>Custom keybinding editor coming soon!</p>
      </div>
    </div>
  )
}

// About Section
function AboutSection() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Logo />
        </div>
        <h3 className="text-2xl font-semibold mb-2">FileGraph</h3>
        <p className="text-sm text-muted-foreground mb-4">Version 0.1.0</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Built with</h4>
          <p className="text-sm text-muted-foreground">React, TypeScript, Tauri, TanStack Table, Zustand, shadcn/ui</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Report an Issue
            </a>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              View License
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
