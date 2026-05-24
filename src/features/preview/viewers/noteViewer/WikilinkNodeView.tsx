/**
 * WikilinkNodeView - Custom React NodeView for TipTap wikilinks
 *
 * Renders wikilinks as EntityLink-style components with HoverCard preview support.
 */

import * as React from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Link2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { ResolvedReference } from '@/lib/links/linkResolver'

// Namespace display names
const NAMESPACE_LABELS: Record<string, string> = {
  person: 'Person',
  org: 'Organization',
  proj: 'Project',
  task: 'Task',
  ms: 'Milestone',
  acc: 'Account',
  tx: 'Transaction',
  bill: 'Bill',
  goal: 'Goal',
  note: 'Note',
  canvas: 'Canvas',
  event: 'Event',
  reminder: 'Reminder',
  agent: 'Agent',
  persona: 'Persona',
}

function extractNamespace(target: string): string {
  const match = target.match(/^([a-z]+):/i)
  return match ? match[1].toLowerCase() : 'default'
}

interface EntityPreviewContentProps {
  target: string
  resolved: ResolvedReference | null
  namespace: string
}

function EntityPreviewContent({ target, resolved, namespace }: EntityPreviewContentProps) {
  if (!resolved) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-amber-600 dark:text-amber-400">Unresolved Reference</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]">{target}</code>
        </div>
        <p className="text-xs text-muted-foreground">This entity could not be found in the vault.</p>
      </div>
    )
  }

  const entityData = resolved.entityData || {}
  const name: string =
    typeof entityData.name === 'string'
      ? entityData.name
      : typeof entityData.title === 'string'
        ? entityData.title
        : target
  const description: string | null =
    typeof entityData.description === 'string'
      ? entityData.description
      : typeof entityData.bio === 'string'
        ? entityData.bio
        : typeof entityData.summary === 'string'
          ? entityData.summary
          : null

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Link2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{name}</div>
          <div className="text-xs text-muted-foreground capitalize">{NAMESPACE_LABELS[namespace] || namespace}</div>
        </div>
      </div>
      {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
      <div className="text-[10px] text-muted-foreground/70 font-mono">{target}</div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <span className="truncate">{resolved.relativePath}</span>
      </div>
    </div>
  )
}

export function WikilinkNodeView({ node }: NodeViewProps) {
  const entityId = node.attrs.id as string
  const label = (node.attrs.label as string) || entityId
  const namespace = extractNamespace(entityId)

  const [, linkActions] = useLinkIndex()
  const linkActionsRef = React.useRef(linkActions)
  linkActionsRef.current = linkActions

  const [resolved, setResolved] = React.useState<ResolvedReference | null>(null)
  const [isNotFound, setIsNotFound] = React.useState(false)

  React.useEffect(() => {
    let mounted = true

    const resolveLink = async () => {
      try {
        const result = await linkActionsRef.current.resolve(entityId)
        if (!mounted) return

        if (result.status === 'resolved') {
          setResolved(result)
          setIsNotFound(false)
        } else {
          setResolved(null)
          setIsNotFound(true)
        }
      } catch {
        if (mounted) {
          setResolved(null)
          setIsNotFound(true)
        }
      }
    }

    resolveLink()

    return () => {
      mounted = false
    }
  }, [entityId])

  const wikilinkContent = (
    <span
      className={cn(
        'wikilink inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-sm cursor-pointer transition-all',
        isNotFound
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15',
      )}
      data-id={entityId}>
      {isNotFound ? (
        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
      ) : (
        <Link2 className="h-3 w-3 opacity-60 shrink-0" />
      )}
      {label}
    </span>
  )

  return (
    <NodeViewWrapper as="span" className="inline">
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{wikilinkContent}</HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-72 p-3">
          <EntityPreviewContent target={entityId} resolved={resolved} namespace={namespace} />
        </HoverCardContent>
      </HoverCard>
    </NodeViewWrapper>
  )
}

export default WikilinkNodeView
