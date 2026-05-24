/**
 * EntityPicker - Universal entity search and selection component
 * Reusable across NoteViewer, DataViewer, and anywhere entity linking is needed
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  Building2,
  FolderKanban,
  FileText,
  Hash,
  Wallet,
  Receipt,
  Target,
  Calendar,
  Bot,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface EntityItem {
  id: string
  label: string
  namespace?: string
  sourceFile?: string
}

export interface EntityPickerProps {
  items: EntityItem[]
  query: string
  onSelect: (item: EntityItem) => void
  onCreate?: (entityId: string, namespace: string) => void
  variant?: 'mention' | 'wikilink' | 'reference'
  showCreateOption?: boolean
}

export interface EntityPickerRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

// ============================================================================
// Constants
// ============================================================================

const NAMESPACE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  // People & Organizations
  person: { label: 'People', icon: Users, color: 'text-blue-400' },
  org: { label: 'Organizations', icon: Building2, color: 'text-purple-400' },

  // Projects & Tasks
  proj: { label: 'Projects', icon: FolderKanban, color: 'text-green-400' },
  task: { label: 'Tasks', icon: Target, color: 'text-orange-400' },
  ms: { label: 'Milestones', icon: Target, color: 'text-amber-400' },

  // Content
  note: { label: 'Notes', icon: FileText, color: 'text-yellow-400' },
  canvas: { label: 'Canvases', icon: FolderKanban, color: 'text-rose-400' },

  // Finance
  acc: { label: 'Accounts', icon: Wallet, color: 'text-emerald-400' },
  tx: { label: 'Transactions', icon: Receipt, color: 'text-cyan-400' },
  bill: { label: 'Bills', icon: Receipt, color: 'text-red-400' },

  // Design System
  brand: { label: 'Brand', icon: Hash, color: 'text-pink-400' },
  color: { label: 'Colors', icon: Hash, color: 'text-rose-400' },
  palette: { label: 'Palettes', icon: Hash, color: 'text-fuchsia-400' },
  font: { label: 'Fonts', icon: Hash, color: 'text-indigo-400' },

  // Calendar & Events
  event: { label: 'Events', icon: Calendar, color: 'text-pink-400' },

  // AI
  agent: { label: 'AI Agents', icon: Bot, color: 'text-violet-400' },
  persona: { label: 'Personas', icon: Bot, color: 'text-purple-400' },
}

function getNamespaceConfig(namespace?: string) {
  return (
    NAMESPACE_CONFIG[namespace || ''] || { label: namespace || 'Other', icon: Hash, color: 'text-muted-foreground' }
  )
}

// ============================================================================
// Component
// ============================================================================

export const EntityPicker = React.forwardRef<EntityPickerRef, EntityPickerProps>(
  ({ items, query, onSelect, onCreate, variant = 'mention', showCreateOption = true }, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set())
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

    // Group items by namespace
    const groupedItems = React.useMemo(() => {
      const groups: Record<string, EntityItem[]> = {}
      for (const item of items) {
        const ns = item.namespace || 'other'
        if (!groups[ns]) groups[ns] = []
        groups[ns].push(item)
      }
      return groups
    }, [items])

    // Flatten for keyboard navigation (with section headers)
    const flatItems = React.useMemo(() => {
      const flat: Array<{ type: 'item' | 'section' | 'create'; item?: EntityItem; namespace?: string }> = []

      const namespaces = Object.keys(groupedItems).sort((a, b) => {
        // Sort by config order, then alphabetically
        const configKeys = Object.keys(NAMESPACE_CONFIG)
        const aIdx = configKeys.indexOf(a)
        const bIdx = configKeys.indexOf(b)
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
        if (aIdx !== -1) return -1
        if (bIdx !== -1) return 1
        return a.localeCompare(b)
      })

      for (const ns of namespaces) {
        flat.push({ type: 'section', namespace: ns })
        for (const item of groupedItems[ns]) {
          flat.push({ type: 'item', item })
        }
      }

      // Add create option if query looks like an entity ID and doesn't exist
      if (showCreateOption && query && query.includes(':')) {
        const exactMatch = items.find((i) => i.id === query)
        if (!exactMatch) {
          flat.push({ type: 'create', namespace: query.split(':')[0] })
        }
      }

      return flat
    }, [groupedItems, items, query, showCreateOption])

    // Get only selectable items for navigation
    const selectableIndices = React.useMemo(() => {
      return flatItems
        .map((item, index) => (item.type === 'item' || item.type === 'create' ? index : -1))
        .filter((i) => i !== -1)
    }, [flatItems])

    const selectItem = (flatIndex: number) => {
      const entry = flatItems[flatIndex]
      if (entry?.type === 'item' && entry.item) {
        onSelect(entry.item)
      } else if (entry?.type === 'create' && onCreate) {
        const [namespace, ...rest] = query.split(':')
        const slug = rest.join(':') || 'new'
        onCreate(query, namespace)
      }
    }

    // Reset selection when items change
    React.useEffect(() => {
      setSelectedIndex(selectableIndices[0] ?? 0)
      // Auto-expand all sections initially
      setExpandedSections(new Set(Object.keys(groupedItems)))
    }, [items])

    // Autoscroll to selected item
    React.useEffect(() => {
      const el = itemRefs.current[selectedIndex]
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [selectedIndex])

    React.useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        const currentSelectableIdx = selectableIndices.indexOf(selectedIndex)

        if (event.key === 'ArrowUp') {
          const newIdx = currentSelectableIdx > 0 ? currentSelectableIdx - 1 : selectableIndices.length - 1
          setSelectedIndex(selectableIndices[newIdx])
          return true
        }

        if (event.key === 'ArrowDown') {
          const newIdx = currentSelectableIdx < selectableIndices.length - 1 ? currentSelectableIdx + 1 : 0
          setSelectedIndex(selectableIndices[newIdx])
          return true
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }

        return false
      },
    }))

    const toggleSection = (ns: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev)
        if (next.has(ns)) {
          next.delete(ns)
        } else {
          next.add(ns)
        }
        return next
      })
    }

    if (items.length === 0 && !query) {
      return (
        <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-xs text-muted-foreground min-w-[280px]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 opacity-50" />
            <span>Type to search entities...</span>
          </div>
        </div>
      )
    }

    if (items.length === 0 && query && !query.includes(':')) {
      return (
        <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-xs text-muted-foreground min-w-[280px]">
          <div className="space-y-2">
            <p>No entities found for "{query}"</p>
            <p className="opacity-60">
              Tip: Use <code className="bg-muted px-1 rounded">namespace:name</code> format to create new entities
            </p>
          </div>
        </div>
      )
    }

    let itemIdx = 0

    return (
      <div className="bg-popover border border-border rounded-xl shadow-xl max-h-[360px] overflow-y-auto min-w-[360px] bg-popover/95 backdrop-blur-sm">
        {Object.entries(groupedItems).map(([ns, nsItems]) => {
          const config = getNamespaceConfig(ns)
          const Icon = config.icon
          const isExpanded = expandedSections.has(ns)
          const sectionStartIdx = itemIdx

          return (
            <div key={ns} className="mb-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(ns)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors sticky top-0 bg-popover/95 backdrop-blur-sm z-10">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
                <span>{config.label}</span>
                <span className="ml-auto text-[10px] opacity-50">{nsItems.length}</span>
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-2">
                  {nsItems.map((item) => {
                    const currentIdx = flatItems.findIndex((f) => f.type === 'item' && f.item?.id === item.id)
                    const isSelected = selectedIndex === currentIdx

                    return (
                      <button
                        ref={(el) => {
                          itemRefs.current[currentIdx] = el
                        }}
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors rounded-lg mx-1',
                          isSelected && 'bg-muted',
                        )}>
                        <span
                          className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.color.replace('text-', 'bg-'))}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.label !== item.id && (
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                            {item.id}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Create New Option */}
        {showCreateOption && query && query.includes(':') && !items.find((i) => i.id === query) && onCreate && (
          <>
            <div className="border-t border-border/50 my-1" />
            <button
              ref={(el) => {
                itemRefs.current[flatItems.length - 1] = el
              }}
              onClick={() => {
                const [namespace] = query.split(':')
                onCreate(query, namespace)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors',
                selectedIndex === flatItems.length - 1 && 'bg-muted',
              )}>
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium">Create "{query}"</span>
                <span className="text-xs text-muted-foreground">Add new {query.split(':')[0]} entity</span>
              </div>
            </button>
          </>
        )}
      </div>
    )
  },
)

EntityPicker.displayName = 'EntityPicker'

// Re-export for convenience
export type { EntityItem as MentionItem }
