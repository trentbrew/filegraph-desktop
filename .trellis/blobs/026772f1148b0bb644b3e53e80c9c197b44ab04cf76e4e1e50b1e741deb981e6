/**
 * Backlinks Panel
 *
 * Shows all files/entities that reference the current entity or file.
 * Part of RFC-001 Universal Bi-directional Linking System.
 */

import * as React from 'react'
import { Link2, FileText, ChevronRight, ChevronDown, RefreshCw, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { useVault } from '@/contexts/VaultContext'
import type { ParsedReference } from '@/lib/links'

interface BacklinksPanelProps {
  /** The entity ID or file path to show backlinks for */
  targetId: string
  /** Optional callback when a backlink is clicked */
  onNavigate?: (filePath: string) => void
  /** Whether to show as compact (inline) or expanded */
  compact?: boolean
  /** Optional class name */
  className?: string
}

interface GroupedBacklinks {
  filePath: string
  relativePath: string
  references: ParsedReference[]
}

/** Expandable backlink group */
function BacklinkGroup({
  group,
  defaultOpen,
  onNavigate,
}: {
  group: GroupedBacklinks
  defaultOpen: boolean
  onNavigate?: (filePath: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="group rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 p-1.5 text-left">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs truncate flex-1" title={group.relativePath}>
            {group.relativePath}
          </span>
          {group.references.length > 1 && (
            <span className="text-[10px] text-muted-foreground">({group.references.length})</span>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onNavigate?.(group.filePath)}
          title="Go to file">
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
      {isOpen && (
        <div className="ml-6 pl-2 border-l border-border/50 space-y-0.5 pb-1">
          {group.references.map((ref, idx) => (
            <div
              key={`${ref.sourceFile}-${ref.propertyPath || idx}`}
              className="text-[10px] text-muted-foreground py-0.5 px-1.5 rounded hover:bg-muted/30"
              title={ref.propertyPath || 'Direct reference'}>
              {ref.propertyPath ? (
                <code className="font-mono">{ref.propertyPath}</code>
              ) : ref.lineNumber ? (
                <span>Line {ref.lineNumber}</span>
              ) : (
                <span className="italic">Reference</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BacklinksPanel({ targetId, onNavigate, compact = false, className }: BacklinksPanelProps) {
  const { vaultPath } = useVault()
  const [linkState, linkActions] = useLinkIndex()
  const [backlinks, setBacklinks] = React.useState<ParsedReference[]>([])
  const [expanded, setExpanded] = React.useState(!compact)

  // Fetch backlinks when targetId changes
  React.useEffect(() => {
    if (!targetId || linkState.indexing) return

    const refs = linkActions.getBacklinks(targetId)
    setBacklinks(refs)
  }, [targetId, linkState.indexing, linkState.stats, linkActions])

  // Group backlinks by source file
  const groupedBacklinks = React.useMemo(() => {
    const groups = new Map<string, GroupedBacklinks>()

    for (const ref of backlinks) {
      const existing = groups.get(ref.sourceFile)
      if (existing) {
        existing.references.push(ref)
      } else {
        const relativePath =
          vaultPath && ref.sourceFile.startsWith(vaultPath)
            ? ref.sourceFile.slice(vaultPath.length + 1)
            : ref.sourceFile
        groups.set(ref.sourceFile, {
          filePath: ref.sourceFile,
          relativePath,
          references: [ref],
        })
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  }, [backlinks, vaultPath])

  const handleRefresh = React.useCallback(() => {
    const refs = linkActions.getBacklinks(targetId)
    setBacklinks(refs)
  }, [targetId, linkActions])

  // Compact mode: just show count badge
  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md',
          'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
          'transition-colors',
          className,
        )}
        title={`${backlinks.length} backlink${backlinks.length !== 1 ? 's' : ''}`}>
        <Link2 className="h-3 w-3" />
        <span>{backlinks.length}</span>
      </button>
    )
  }

  // Loading state
  if (linkState.indexing) {
    return (
      <div className={cn('p-3 space-y-2', className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Indexing references...</span>
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    )
  }

  // Empty state
  if (backlinks.length === 0) {
    return (
      <div className={cn('p-3', className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            <span>Backlinks</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRefresh} title="Refresh backlinks">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/70 italic">No references found</p>
      </div>
    )
  }

  // Full panel
  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Backlinks</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {backlinks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRefresh} title="Refresh backlinks">
            <RefreshCw className="h-3 w-3" />
          </Button>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(false)}
              title="Collapse">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Backlink list */}
      <ScrollArea className="max-h-64">
        <div className="p-2 space-y-1">
          {groupedBacklinks.map((group) => (
            <BacklinkGroup
              key={group.filePath}
              group={group}
              defaultOpen={groupedBacklinks.length <= 3}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/**
 * Compact backlinks badge - shows just the count with expandable popover
 */
export function BacklinksBadge({
  targetId,
  onNavigate,
}: {
  targetId: string
  onNavigate?: (filePath: string) => void
}) {
  const [, linkActions] = useLinkIndex()
  const [count, setCount] = React.useState(0)
  const [showPanel, setShowPanel] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const refs = linkActions.getBacklinks(targetId)
    setCount(refs.length)
  }, [targetId, linkActions])

  // Close panel when clicking outside
  React.useEffect(() => {
    if (!showPanel) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPanel])

  if (count === 0) return null

  return (
    <div className="relative inline-block" ref={containerRef}>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setShowPanel(!showPanel)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowPanel(!showPanel)
          }
        }}
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded',
          'bg-primary/10 text-primary hover:bg-primary/20',
          'transition-colors cursor-pointer',
        )}
        title={`${count} backlink${count !== 1 ? 's' : ''} - click to expand`}>
        <Link2 className="h-2.5 w-2.5" />
        <span>{count}</span>
      </span>
      {showPanel && (
        <div className="absolute z-50 mt-1 left-0 w-72 bg-popover border border-border rounded-md shadow-lg">
          <BacklinksPanel
            targetId={targetId}
            onNavigate={(path) => {
              onNavigate?.(path)
              setShowPanel(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
