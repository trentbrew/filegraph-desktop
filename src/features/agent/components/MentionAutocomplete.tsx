/**
 * MentionAutocomplete - @ mention autocomplete for agent input
 *
 * Shows a dropdown of entities and notes when user types '@' in the input.
 * Supports filtering by namespace and search query.
 */

import * as React from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import {
  User,
  Briefcase,
  CheckSquare,
  Target,
  DollarSign,
  Calendar,
  FileText,
  Bot,
  MessageSquare,
  Link2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAMESPACES, NAMESPACE_KEYS } from '@/lib/namespaces'

// Namespace to icon mapping
const NAMESPACE_ICONS: Record<string, LucideIcon> = {
  person: User,
  org: Briefcase,
  proj: Briefcase,
  task: CheckSquare,
  ms: Target,
  acc: DollarSign,
  tx: DollarSign,
  bill: DollarSign,
  goal: Target,
  note: FileText,
  canvas: FileText,
  event: Calendar,
  reminder: Calendar,
  agent: Bot,
  persona: Bot,
  dm: MessageSquare,
  channel: MessageSquare,
  thread: MessageSquare,
  default: Link2,
}

export interface MentionOption {
  id: string
  label: string
  namespace: string
  description?: string
}

export interface MentionAutocompleteProps {
  /** Current input value */
  value: string
  /** Callback when input changes */
  onChange: (value: string) => void
  /** Callback when a mention is selected */
  onSelect: (mention: MentionOption) => void
  /** Available mention options */
  options: MentionOption[]
  /** Whether the autocomplete is loading options */
  loading?: boolean
  /** Textarea ref for positioning */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Additional class names */
  className?: string
}

export function MentionAutocomplete({
  value,
  onChange,
  onSelect,
  options,
  loading = false,
  textareaRef,
  className,
}: MentionAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [mentionQuery, setMentionQuery] = React.useState('')
  const [mentionStart, setMentionStart] = React.useState(-1)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map())

  // Detect @ trigger and extract query
  React.useEffect(() => {
    if (!textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)

    // Find the last @ that starts a mention (not preceded by a word character)
    const atMatch = textBeforeCursor.match(/(^|[^a-zA-Z0-9])@([a-zA-Z0-9:_-]*)$/)

    if (atMatch) {
      const query = atMatch[2] || ''
      setMentionQuery(query)
      setMentionStart(cursorPos - query.length - 1) // -1 for the @
      setOpen(true)
    } else {
      setOpen(false)
      setMentionQuery('')
      setMentionStart(-1)
    }
  }, [value, textareaRef])

  // Filter options based on query
  const filteredOptions = React.useMemo(() => {
    if (!mentionQuery) {
      // Show namespace suggestions when just @ is typed
      return NAMESPACE_KEYS.slice(0, 10).map((ns) => ({
        id: `ns:${ns}`,
        label: NAMESPACES[ns].label,
        namespace: ns,
        description: `Browse ${NAMESPACES[ns].label.toLowerCase()}`,
      }))
    }

    const query = mentionQuery.toLowerCase()

    // Check if query starts with a namespace prefix
    const [nsPrefix, ...rest] = query.split(':')
    const searchQuery = rest.join(':') || nsPrefix

    // Filter by namespace if specified
    if (NAMESPACE_KEYS.includes(nsPrefix as any) && rest.length > 0) {
      return options
        .filter((opt) => opt.namespace === nsPrefix && opt.label.toLowerCase().includes(searchQuery))
        .slice(0, 10)
    }

    // General search across all options
    return options
      .filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.id.toLowerCase().includes(query) ||
          opt.namespace.toLowerCase().includes(query),
      )
      .slice(0, 10)
  }, [mentionQuery, options])

  // Handle selection
  const handleSelect = React.useCallback(
    (option: MentionOption) => {
      if (mentionStart < 0) return

      // Replace the @query with the selected mention
      const before = value.slice(0, mentionStart)
      const after = value.slice(mentionStart + mentionQuery.length + 1) // +1 for @

      // Insert the entity ID
      const newValue = `${before}${option.id}${after}`
      onChange(newValue)
      onSelect(option)
      setOpen(false)

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = before.length + option.id.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    },
    [value, mentionStart, mentionQuery, onChange, onSelect, textareaRef],
  )

  // Reset selection when options change
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredOptions.length, mentionQuery])

  // Auto-scroll to selected item
  React.useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex)
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Expose keyboard handler for parent textarea
  React.useEffect(() => {
    if (!textareaRef.current || !open) return

    const textarea = textareaRef.current

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      const flatOptions = filteredOptions

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % flatOptions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + flatOptions.length) % flatOptions.length)
      } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        const selected = flatOptions[selectedIndex]
        if (selected) handleSelect(selected)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const selected = flatOptions[selectedIndex]
        if (selected) handleSelect(selected)
      }
    }

    textarea.addEventListener('keydown', handleKeyDown)
    return () => textarea.removeEventListener('keydown', handleKeyDown)
  }, [open, filteredOptions, selectedIndex, handleSelect, textareaRef])

  // Group options by namespace
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, MentionOption[]> = {}
    filteredOptions.forEach((opt) => {
      const ns = opt.namespace
      if (!groups[ns]) groups[ns] = []
      groups[ns].push(opt)
    })
    return groups
  }, [filteredOptions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative', className)}>
          {/* The textarea is rendered by parent, this is just for positioning */}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[280px] p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList className="max-h-[200px]">
            {loading ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>No results found</CommandEmpty>
            ) : (
              filteredOptions.map((opt, idx) => {
                const IconComponent = NAMESPACE_ICONS[opt.namespace] || NAMESPACE_ICONS.default
                const isSelected = idx === selectedIndex
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(idx, el)
                      else itemRefs.current.delete(idx)
                    }}
                    onSelect={() => handleSelect(opt)}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      isSelected && 'bg-accent text-accent-foreground',
                    )}>
                    <IconComponent className="h-3.5 w-3.5 opacity-60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-muted-foreground truncate">{opt.description}</div>
                      )}
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono">{opt.id}</code>
                  </CommandItem>
                )
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default MentionAutocomplete
