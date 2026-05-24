/**
 * WikiLink Component
 *
 * Renders wikilinks [[target|display]] as interactive, navigable links.
 * Supports entity ID resolution and hover previews.
 * Part of RFC-001 Universal Bi-directional Linking System.
 *
 * Note: This component delegates to EntityLink for entity IDs,
 * providing a unified link rendering experience across the app.
 */

import * as React from 'react'
import {
  Link2,
  AlertTriangle,
  ExternalLink,
  FileText,
  User,
  Briefcase,
  CheckSquare,
  Target,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EntityLink } from '@/components/links'

interface WikiLinkProps {
  /** The link target (entity ID or file path) */
  target: string
  /** Display text for the link */
  displayText: string
  /** Whether the target is an entity ID format */
  isEntityId?: boolean
  /** Callback when link is clicked to navigate */
  onNavigate?: (target: string) => void
  /** Additional class names */
  className?: string
}

// Namespace to icon mapping
const NAMESPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
  default: Link2,
}

// Namespace to color mapping
const NAMESPACE_COLORS: Record<string, string> = {
  person: 'text-blue-500 dark:text-blue-400',
  org: 'text-purple-500 dark:text-purple-400',
  proj: 'text-emerald-500 dark:text-emerald-400',
  task: 'text-amber-500 dark:text-amber-400',
  ms: 'text-pink-500 dark:text-pink-400',
  acc: 'text-green-500 dark:text-green-400',
  tx: 'text-cyan-500 dark:text-cyan-400',
  bill: 'text-orange-500 dark:text-orange-400',
  goal: 'text-indigo-500 dark:text-indigo-400',
  note: 'text-slate-500 dark:text-slate-400',
  default: 'text-primary',
}

/**
 * Extract namespace from entity ID
 */
function extractNamespace(target: string): string {
  const match = target.match(/^([a-z]+):/)
  return match ? match[1] : 'default'
}

export function WikiLink({ target, displayText, isEntityId = false, onNavigate, className }: WikiLinkProps) {
  // For entity IDs, delegate to EntityLink for full preview support
  if (isEntityId) {
    return (
      <EntityLink
        target={target}
        displayText={displayText}
        type="entity-id"
        onNavigate={onNavigate ? () => onNavigate(target) : undefined}
        className={className}
        size="sm"
      />
    )
  }

  // For non-entity targets (file paths, page slugs), use simplified rendering
  const [, linkActions] = useLinkIndex()
  const [resolved, setResolved] = React.useState<boolean | null>(null)
  const [hovered, setHovered] = React.useState(false)

  // Check if the target can be resolved (for wikilinks to file paths)
  React.useEffect(() => {
    let mounted = true

    async function checkResolution() {
      try {
        const canResolve = await linkActions.canResolve(target)
        if (mounted) setResolved(canResolve)
      } catch {
        if (mounted) setResolved(false)
      }
    }

    // For non-entity targets (file paths, slugs), try to resolve
    checkResolution()

    return () => {
      mounted = false
    }
  }, [target, linkActions])

  const IconComponent = NAMESPACE_ICONS.default
  const colorClass = NAMESPACE_COLORS.default

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (onNavigate) {
      onNavigate(target)
    } else {
      // Dispatch a custom event for navigation
      const event = new CustomEvent('filegraph:navigate', {
        detail: { target, isEntityId },
        bubbles: true,
      })
      e.currentTarget.dispatchEvent(event)
    }
  }

  const linkContent = (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm',
        'font-medium text-sm transition-all duration-150',
        'hover:bg-primary/10 active:bg-primary/20',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1',
        resolved === false && 'bg-amber-500/10 hover:bg-amber-500/20',
        colorClass,
        className,
      )}>
      {resolved === false ? (
        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
      ) : (
        <IconComponent className={cn('h-3 w-3 shrink-0', colorClass)} />
      )}
      <span className={cn(resolved === false && 'text-amber-600 dark:text-amber-400')}>{displayText}</span>
      {hovered && resolved !== false && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
    </button>
  )

  // Wrap in tooltip showing the target path
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] text-muted-foreground">{target}</span>
            {resolved === false && <span className="text-amber-500">Page not found</span>}
            {resolved === true && <span className="text-muted-foreground">Click to navigate</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Custom component for ReactMarkdown to render wikiLink nodes
 */
export function WikiLinkRenderer({
  target,
  displayText,
  isEntityId,
  onNavigate,
}: {
  target?: string
  displayText?: string
  isEntityId?: boolean
  onNavigate?: (target: string) => void
}) {
  if (!target || !displayText) {
    return <span className="text-muted-foreground">[invalid link]</span>
  }

  return <WikiLink target={target} displayText={displayText} isEntityId={isEntityId} onNavigate={onNavigate} />
}

export default WikiLink
