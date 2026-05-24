import * as React from 'react'
import { Separator } from '@/components/ui/separator'
import { DEFAULT_KEYBINDINGS } from '@/lib/keybindings/defaults'
import { KeyCategory } from '@/lib/keybindings/types'

export function KeyboardSettings() {
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
