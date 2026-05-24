/**
 * CommandList - Dropdown component for slash command suggestions
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  CheckSquare,
  Image,
  Table,
  Type,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

export interface CommandItem {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  command: (editor: Editor) => void
}

// Available slash commands
export const SLASH_COMMANDS: CommandItem[] = [
  {
    title: 'Text',
    description: 'Just start writing with plain text.',
    icon: Type,
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: Heading1,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: Heading2,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: Heading3,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list.',
    icon: List,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list.',
    icon: ListOrdered,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quote.',
    icon: Quote,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet.',
    icon: Code,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    description: 'Visually divide blocks.',
    icon: Minus,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: 'Add a table.',
    icon: Table,
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Embed an image.',
    icon: Image,
    command: (editor) => {
      const url = window.prompt('Enter image URL:')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
  },
]

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const CommandList = React.forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
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
        No commands found
      </div>
    )
  }

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg py-1 max-h-[300px] overflow-y-auto min-w-[250px]">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            key={item.title}
            onClick={() => selectItem(index)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors',
              index === selectedIndex && 'bg-muted',
            )}>
            <div className="flex items-center justify-center w-8 h-8 rounded bg-muted/50 shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground truncate">{item.description}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
})

CommandList.displayName = 'CommandList'
