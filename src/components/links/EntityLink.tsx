/**
 * EntityLink Component
 *
 * A universal link component for rendering entity references, wikilinks,
 * file paths, and URLs across the application. Handles:
 * - Visual distinction for resolved vs unresolved links
 * - Hover preview popups with entity details
 * - Click navigation to referenced entities/files
 * - Support for all link types (entity ID, wikilink, file path, URL)
 *
 * Part of RFC-001 Universal Bi-directional Linking System.
 */

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
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
  Calendar,
  Bot,
  MessageSquare,
  Folder,
  Globe,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { ResolvedReference } from '@/lib/links/linkResolver'

// ============================================================================
// Types
// ============================================================================

export type LinkType = 'entity-id' | 'wikilink' | 'file-path' | 'url'

export interface EntityLinkProps {
  /** The link target (entity ID, file path, slug, or URL) */
  target: string
  /** Display text for the link */
  displayText?: string
  /** Override the detected link type */
  type?: LinkType
  /** Callback when link is clicked to navigate */
  onNavigate?: (target: string, resolved?: ResolvedReference) => void
  /** Additional class names */
  className?: string
  /** Whether to show detailed hover preview (default: true for entity IDs) */
  showPreview?: boolean
  /** Whether to show inline icon (default: true) */
  showIcon?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// Constants
// ============================================================================

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

// Namespace to color mapping
const NAMESPACE_COLORS: Record<string, string> = {
  person: 'text-blue-600 dark:text-blue-400',
  org: 'text-purple-600 dark:text-purple-400',
  proj: 'text-emerald-600 dark:text-emerald-400',
  task: 'text-amber-600 dark:text-amber-400',
  ms: 'text-pink-600 dark:text-pink-400',
  acc: 'text-green-600 dark:text-green-400',
  tx: 'text-cyan-600 dark:text-cyan-400',
  bill: 'text-orange-600 dark:text-orange-400',
  goal: 'text-indigo-600 dark:text-indigo-400',
  note: 'text-slate-600 dark:text-slate-400',
  canvas: 'text-violet-600 dark:text-violet-400',
  event: 'text-rose-600 dark:text-rose-400',
  reminder: 'text-red-600 dark:text-red-400',
  agent: 'text-teal-600 dark:text-teal-400',
  persona: 'text-sky-600 dark:text-sky-400',
  dm: 'text-fuchsia-600 dark:text-fuchsia-400',
  channel: 'text-lime-600 dark:text-lime-400',
  thread: 'text-yellow-600 dark:text-yellow-400',
  default: 'text-primary',
}

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
  dm: 'Direct Message',
  channel: 'Channel',
  thread: 'Thread',
}

// Entity ID pattern: namespace:slug:index
const ENTITY_ID_PATTERN = /^([a-z]+):([a-z0-9-]+):(\d{3})$/i

// URL pattern
const URL_PATTERN = /^https?:\/\//i

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect the type of link target
 */
function detectLinkType(target: string): LinkType {
  if (URL_PATTERN.test(target)) return 'url'
  if (ENTITY_ID_PATTERN.test(target)) return 'entity-id'
  if (target.includes('/') || target.includes('.')) return 'file-path'
  return 'wikilink'
}

/**
 * Extract namespace from entity ID
 */
function extractNamespace(target: string): string {
  const match = target.match(/^([a-z]+):/i)
  return match ? match[1].toLowerCase() : 'default'
}

/**
 * Parse entity ID into components
 */
function parseEntityId(id: string): { namespace: string; slug: string; index: string } | null {
  const match = ENTITY_ID_PATTERN.exec(id)
  if (!match) return null
  return {
    namespace: match[1].toLowerCase(),
    slug: match[2],
    index: match[3],
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface EntityPreviewProps {
  target: string
  resolved: ResolvedReference | null
  linkType: LinkType
  namespace: string
}

function EntityPreview({ target, resolved, linkType, namespace }: EntityPreviewProps) {
  const IconComponent = NAMESPACE_ICONS[namespace] || NAMESPACE_ICONS.default
  const colorClass = NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default
  const entityParsed = parseEntityId(target)

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
        <p className="text-xs text-muted-foreground">
          This {linkType === 'entity-id' ? 'entity' : 'reference'} could not be found in the vault.
          {linkType === 'entity-id' && entityParsed && (
            <span className="block mt-1">
              Expected in: <code className="font-mono">@entities/{namespace}s.data</code>
            </span>
          )}
        </p>
      </div>
    )
  }

  // Safe access to entity data with proper typing
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
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className={cn('p-1.5 rounded-md bg-muted', colorClass)}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{name}</div>
          <div className="text-xs text-muted-foreground capitalize">{NAMESPACE_LABELS[namespace] || namespace}</div>
        </div>
      </div>

      {/* Description */}
      {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}

      {/* Entity ID */}
      <div className="text-[10px] text-muted-foreground/70 font-mono">{target}</div>

      {/* Source file */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <Folder className="h-3 w-3" />
        <span className="truncate">{resolved.relativePath}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function EntityLink({
  target,
  displayText,
  type,
  onNavigate,
  className,
  showPreview = true,
  showIcon = true,
  size = 'sm',
}: EntityLinkProps) {
  const [, linkActions] = useLinkIndex()
  const [resolved, setResolved] = React.useState<ResolvedReference | null>(null)
  const [resolving, setResolving] = React.useState(true)
  const [isNotFound, setIsNotFound] = React.useState(false)

  // Detect link type
  const linkType = type || detectLinkType(target)
  const isEntityId = linkType === 'entity-id'
  const isUrl = linkType === 'url'
  const namespace = isEntityId ? extractNamespace(target) : 'default'

  // Resolve the link target
  React.useEffect(() => {
    let mounted = true
    setResolving(true)
    setIsNotFound(false)

    // URLs don't need resolution
    if (isUrl) {
      setResolving(false)
      return
    }

    const resolveLink = async () => {
      try {
        const result = await linkActions.resolve(target)
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
      } finally {
        if (mounted) {
          setResolving(false)
        }
      }
    }

    resolveLink()

    return () => {
      mounted = false
    }
  }, [target, linkActions, isUrl])

  // Get display properties
  const IconComponent = NAMESPACE_ICONS[namespace] || NAMESPACE_ICONS.default
  const colorClass = isNotFound
    ? 'text-amber-600 dark:text-amber-400'
    : isUrl
      ? 'text-sky-600 dark:text-sky-400'
      : NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-2.5 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  // Click handler
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isUrl) {
      window.open(target, '_blank', 'noopener,noreferrer')
      return
    }

    if (onNavigate) {
      onNavigate(target, resolved || undefined)
    } else {
      // Dispatch a custom event for navigation
      const event = new CustomEvent('filegraph:navigate', {
        detail: { target, resolved, linkType },
        bubbles: true,
      })
      e.currentTarget.dispatchEvent(event)
    }
  }

  // Render the link content
  const linkContent = (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center rounded-md font-medium transition-all duration-150',
        'hover:bg-primary/20 active:bg-primary/25',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1',
        sizeClasses[size],
        // Background based on resolution status
        isNotFound
          ? 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30'
          : 'bg-primary/10 hover:bg-primary/15 border border-primary/20',
        colorClass,
        className,
      )}>
      {/* Link Icon - always show for entity references */}
      {showIcon && (
        <>
          {resolving ? (
            <Loader2 className={cn(iconSizes[size], 'animate-spin opacity-50')} />
          ) : isNotFound ? (
            <AlertTriangle className={cn(iconSizes[size], 'text-amber-500 shrink-0')} />
          ) : isUrl ? (
            <Globe className={cn(iconSizes[size], 'shrink-0')} />
          ) : (
            <Link2 className={cn(iconSizes[size], 'shrink-0 opacity-60')} />
          )}
        </>
      )}

      {/* Text */}
      <span className={cn(isNotFound && 'text-amber-700 dark:text-amber-300')}>{displayText || target}</span>

      {/* External link indicator for URLs */}
      {isUrl && <ExternalLink className={cn(iconSizes[size], 'opacity-50 ml-0.5')} />}
    </button>
  )

  // Wrap with hover preview for entity IDs using HoverCard
  if (showPreview && isEntityId && !resolving) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{linkContent}</HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-72 p-3">
          <EntityPreview target={target} resolved={resolved} linkType={linkType} namespace={namespace} />
        </HoverCardContent>
      </HoverCard>
    )
  }

  // Simple tooltip for other link types or unresolved references
  if (isNotFound) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              <span>Reference not found – needs resolution</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return linkContent
}

export default EntityLink
