/**
 * MentionList - Dropdown component for entity mention suggestions
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Users, Building2, FolderKanban, FileText, Hash } from 'lucide-react'

export interface MentionItem {
  id: string
  label: string
  namespace?: string
}

interface MentionListProps {
  items: MentionItem[]
  command: (item: MentionItem) => void
  variant?: 'mention' | 'wikilink'
}

// Get icon for namespace
function getNamespaceIcon(namespace?: string) {
  switch (namespace) {
    case 'person':
      return Users
    case 'org':
      return Building2
    case 'proj':
      return FolderKanban
    case 'note':
      return FileText
    default:
      return Hash
  }
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = React.forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) {
      command(item)
    }
  }

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  // Autoscroll to selected item
  React.useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex]
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length)
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % items.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs text-muted-foreground">
        No results found
      </div>
    )
  }

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg py-1 max-h-[200px] overflow-y-auto min-w-[200px]">
      {items.map((item, index) => {
        const Icon = getNamespaceIcon(item.namespace)
        return (
          <button
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            key={item.id}
            onClick={() => selectItem(index)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors',
              index === selectedIndex && 'bg-muted',
            )}>
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{item.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">{item.namespace}</span>
          </button>
        )
      })}
    </div>
  )
})

MentionList.displayName = 'MentionList'
