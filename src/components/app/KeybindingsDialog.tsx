/**
 * Keyboard shortcuts viewer and editor
 * Shows all available shortcuts, allows customization
 */

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Keyboard,
  RotateCcw,
  ChevronRight,
  Command,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { DEFAULT_KEYBINDINGS, KeyCategory, type KeybindingDefinition } from '@/lib/keybindings'
import { useKeybindingStore } from '@/stores/keybindingStore'
import { cn } from '@/lib/utils'

interface KeybindingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

// Group keybindings by category
function groupByCategory(bindings: KeybindingDefinition[]): Record<KeyCategory, KeybindingDefinition[]> {
  return bindings.reduce(
    (acc, binding) => {
      const category = binding.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(binding)
      return acc
    },
    {} as Record<KeyCategory, KeybindingDefinition[]>,
  )
}

// Human-readable category names
const CATEGORY_LABELS: Record<KeyCategory, string> = {
  [KeyCategory.Navigation]: 'Navigation',
  [KeyCategory.FileOperations]: 'File Operations',
  [KeyCategory.Editing]: 'Editing',
  [KeyCategory.View]: 'View',
  [KeyCategory.Search]: 'Search',
  [KeyCategory.Terminal]: 'Terminal',
  [KeyCategory.Debug]: 'Debug',
  [KeyCategory.Custom]: 'General',
}

// Render a key symbol
function KeySymbol({ keyPart }: { keyPart: string }) {
  const symbolMap: Record<string, React.ReactNode> = {
    cmd: <Command className="w-3 h-3" />,
    ctrl: <span className="text-[10px]">⌃</span>,
    alt: <span className="text-[10px]">⌥</span>,
    shift: <span className="text-[10px]">⇧</span>,
    up: <ArrowUp className="w-3 h-3" />,
    down: <ArrowDown className="w-3 h-3" />,
    left: <ArrowLeft className="w-3 h-3" />,
    right: <ArrowRight className="w-3 h-3" />,
    enter: <span className="text-[10px]">↵</span>,
    backspace: <span className="text-[10px]">⌫</span>,
    delete: <span className="text-[10px]">⌦</span>,
    esc: <span className="text-[10px]">⎋</span>,
    tab: <span className="text-[10px]">⇥</span>,
    space: <span className="text-[10px]">␣</span>,
  }

  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-muted border border-border rounded text-[11px] font-medium">
      {symbolMap[keyPart.toLowerCase()] || keyPart.toUpperCase()}
    </kbd>
  )
}

// Render a full keybinding
function KeyBinding({ binding }: { binding: string }) {
  // Handle chords (e.g., "cmd+k cmd+s")
  const chords = binding.split(' ')

  return (
    <div className="flex items-center gap-1">
      {chords.map((chord, chordIndex) => (
        <React.Fragment key={chordIndex}>
          {chordIndex > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <div className="flex items-center gap-0.5">
            {chord.split('+').map((part, partIndex) => (
              <KeySymbol key={partIndex} keyPart={part} />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

// Single keybinding row
function KeybindingRow({
  binding,
  isCustomized,
  onReset,
}: {
  binding: KeybindingDefinition
  isCustomized: boolean
  onReset?: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{binding.description}</span>
        {binding.when && <span className="text-xs text-muted-foreground">When: {binding.when}</span>}
      </div>
      <div className="flex items-center gap-2">
        {isCustomized && (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onReset}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
        <KeyBinding binding={binding.key} />
        {isCustomized && (
          <Badge variant="outline" className="text-[10px] h-4">
            Modified
          </Badge>
        )}
      </div>
    </div>
  )
}

export function KeybindingsDialog({ isOpen, onClose }: KeybindingsDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<KeyCategory | 'all'>('all')
  const { customBindings, disabledBindings, resetToDefaults } = useKeybindingStore()

  // Filter bindings based on search and category
  const filteredBindings = React.useMemo(() => {
    let bindings = DEFAULT_KEYBINDINGS

    // Apply custom bindings
    bindings = bindings.map((binding) => {
      const custom = customBindings.find((c) => c.command === binding.command)
      if (custom) {
        return { ...binding, key: custom.key }
      }
      return binding
    })

    // Filter by category
    if (selectedCategory !== 'all') {
      bindings = bindings.filter((b) => b.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      bindings = bindings.filter(
        (b) =>
          b.description.toLowerCase().includes(query) ||
          b.command.toLowerCase().includes(query) ||
          b.key.toLowerCase().includes(query),
      )
    }

    return bindings
  }, [searchQuery, selectedCategory, customBindings])

  const groupedBindings = groupByCategory(filteredBindings)
  const categories = Object.keys(groupedBindings) as KeyCategory[]

  const isCustomized = (command: string) => customBindings.some((c) => c.command === command)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        {/* Search and filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as KeyCategory | 'all')}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">All Categories</option>
            {Object.values(KeyCategory).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Keybindings list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-0.5">
                  {groupedBindings[category].map((binding) => (
                    <KeybindingRow
                      key={binding.id}
                      binding={binding}
                      isCustomized={isCustomized(binding.command)}
                      onReset={() => {
                        // TODO: Implement reset individual binding
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredBindings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No shortcuts found matching "{searchQuery}"</div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredBindings.length} shortcuts
            {customBindings.length > 0 && ` · ${customBindings.length} customized`}
          </span>
          <div className="flex items-center gap-2">
            {customBindings.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
