import * as React from 'react'
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  File,
  Folder,
  Search,
  LayoutGrid,
  LayoutList,
  Columns,
  Network,
  Eye,
  EyeOff,
  Save,
  Trash,
  Copy,
  Scissors,
  Clipboard,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Home,
  RefreshCw,
  Plus,
  X,
  StickyNote,
  Type,
  Globe,
  Image,
  Table,
  Code,
  Terminal,
  MapPin,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Grid3X3,
  TreeDeciduous,
  Group,
  Ungroup,
  Bot,
  Inbox,
  FolderOpen,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useUIStore } from '@/stores/useUIStore'
import { useTabStore } from '@/stores/useTabStore'
import { useFileStore } from '@/stores/useFileStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

export function GlobalCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const { setLayoutMode, setPreviewEnabled, previewEnabled, setShowDotfiles, showDotfiles } = useUIStore()
  const { navigateBack, navigateForward, navigateInTab, activeTabId, addTab, removeTab } = useTabStore()
  const { selectedItems } = useFileStore()
  const { setClipboard, items: clipboardItems, operation: clipboardOperation } = useClipboardStore()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const openHandler = () => setOpen(true)

    document.addEventListener('keydown', down)
    window.addEventListener('open-command-palette', openHandler)

    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('open-command-palette', openHandler)
    }
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                if (activeTabId) navigateBack(activeTabId)
              })
            }>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Go Back</span>
            <CommandShortcut>⌘[</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                if (activeTabId) navigateForward(activeTabId)
              })
            }>
            <ArrowRight className="mr-2 h-4 w-4" />
            <span>Go Forward</span>
            <CommandShortcut>⌘]</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                if (activeTabId) {
                  // This is async but we don't await it here
                  invoke<string>('get_home_directory').then((homeDir) => {
                    navigateInTab(activeTabId, homeDir)
                  })
                }
              })
            }>
            <Home className="mr-2 h-4 w-4" />
            <span>Go Home</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                window.dispatchEvent(new CustomEvent('refresh-directory'))
              })
            }>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Refresh</span>
            <CommandShortcut>⌘R</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="View">
          <CommandItem onSelect={() => runCommand(() => setLayoutMode('grid'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Grid View</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLayoutMode('table'))}>
            <LayoutList className="mr-2 h-4 w-4" />
            <span>Table View</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLayoutMode('columns'))}>
            <Columns className="mr-2 h-4 w-4" />
            <span>Columns View</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLayoutMode('graph'))}>
            <Network className="mr-2 h-4 w-4" />
            <span>Graph View</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setPreviewEnabled(!previewEnabled))}>
            {previewEnabled ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            <span>{previewEnabled ? 'Hide Preview' : 'Show Preview'}</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setShowDotfiles(!showDotfiles))}>
            {showDotfiles ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            <span>{showDotfiles ? 'Hide Dotfiles' : 'Show Dotfiles'}</span>
            <CommandShortcut>⌘.</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="File Operations">
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('create-new-file')))}>
            <File className="mr-2 h-4 w-4" />
            <span>New File</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('create-new-folder')))}>
            <Folder className="mr-2 h-4 w-4" />
            <span>New Folder</span>
            <CommandShortcut>⇧⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                const selectedArray = Array.from(selectedItems)
                if (selectedArray.length > 0) {
                  setClipboard(selectedArray, 'copy')
                  toast.success(`Copied ${selectedArray.length} item(s)`)
                }
              })
            }>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
            <CommandShortcut>⌘C</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                const selectedArray = Array.from(selectedItems)
                if (selectedArray.length > 0) {
                  setClipboard(selectedArray, 'cut')
                  toast.success(`Cut ${selectedArray.length} item(s)`)
                }
              })
            }>
            <Scissors className="mr-2 h-4 w-4" />
            <span>Cut</span>
            <CommandShortcut>⌘X</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('paste-items')))}>
            <Clipboard className="mr-2 h-4 w-4" />
            <span>Paste</span>
            <CommandShortcut>⌘V</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                const selectedArray = Array.from(selectedItems)
                if (selectedArray.length > 0) {
                  window.dispatchEvent(
                    new CustomEvent('delete-selected-items', {
                      detail: { items: selectedArray },
                    }),
                  )
                }
              })
            }>
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
            <CommandShortcut>⌫</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tabs">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                invoke<string>('get_home_directory')
                  .then((homeDir) => {
                    addTab(homeDir)
                  })
                  .catch(() => addTab())
              })
            }>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Tab</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                if (activeTabId) removeTab(activeTabId)
              })
            }>
            <X className="mr-2 h-4 w-4" />
            <span>Close Tab</span>
            <CommandShortcut>⌘W</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="General">
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('open-settings')))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Switch App">
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'home' } })))
            }>
            <Home className="mr-2 h-4 w-4" />
            <span>Home Canvas</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'files' } })))
            }>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Files</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'calendar' } })))
            }>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'inbox' } })))
            }>
            <Inbox className="mr-2 h-4 w-4" />
            <span>Inbox</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'graph' } })))
            }>
            <Network className="mr-2 h-4 w-4" />
            <span>Graph</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'terminal' } })))
            }>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Terminal</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => window.dispatchEvent(new CustomEvent('switch-app', { detail: { appId: 'agent' } })))
            }>
            <Bot className="mr-2 h-4 w-4" />
            <span>Agent</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Home Canvas">
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'stickyNote' } })),
              )
            }>
            <StickyNote className="mr-2 h-4 w-4" />
            <span>New Sticky Note</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'richText' } })),
              )
            }>
            <Type className="mr-2 h-4 w-4" />
            <span>New Rich Text Note</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'table' } })),
              )
            }>
            <Table className="mr-2 h-4 w-4" />
            <span>New Table</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'codeBlock' } })),
              )
            }>
            <Code className="mr-2 h-4 w-4" />
            <span>New Code Block</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'embed' } })),
              )
            }>
            <Globe className="mr-2 h-4 w-4" />
            <span>New Web Embed</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'image' } })),
              )
            }>
            <Image className="mr-2 h-4 w-4" />
            <span>New Image</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'shape' } })),
              )
            }>
            <Square className="mr-2 h-4 w-4" />
            <span>New Shape</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'location' } })),
              )
            }>
            <MapPin className="mr-2 h-4 w-4" />
            <span>New Location</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-create-node', { detail: { nodeType: 'calendar' } })),
              )
            }>
            <Calendar className="mr-2 h-4 w-4" />
            <span>New Calendar</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Canvas Layout">
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('canvas-auto-layout')))}>
            <TreeDeciduous className="mr-2 h-4 w-4" />
            <span>Auto Layout (Tree)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('canvas-grid-layout')))}>
            <Grid3X3 className="mr-2 h-4 w-4" />
            <span>Grid Layout</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-align-nodes', { detail: { alignment: 'left' } })),
              )
            }>
            <AlignLeft className="mr-2 h-4 w-4" />
            <span>Align Left</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-align-nodes', { detail: { alignment: 'center' } })),
              )
            }>
            <AlignCenter className="mr-2 h-4 w-4" />
            <span>Align Center</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-align-nodes', { detail: { alignment: 'right' } })),
              )
            }>
            <AlignRight className="mr-2 h-4 w-4" />
            <span>Align Right</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(
                  new CustomEvent('canvas-distribute-nodes', { detail: { direction: 'horizontal' } }),
                ),
              )
            }>
            <AlignVerticalJustifyCenter className="mr-2 h-4 w-4" />
            <span>Distribute Horizontally</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent('canvas-distribute-nodes', { detail: { direction: 'vertical' } })),
              )
            }>
            <AlignVerticalJustifyStart className="mr-2 h-4 w-4" />
            <span>Distribute Vertically</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('canvas-group-nodes')))}>
            <Group className="mr-2 h-4 w-4" />
            <span>Group Selected</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('canvas-ungroup-nodes')))}>
            <Ungroup className="mr-2 h-4 w-4" />
            <span>Ungroup</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
