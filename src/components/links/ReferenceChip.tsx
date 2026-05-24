/**
 * ReferenceChip - Lightweight inline reference link
 *
 * A compact, clickable chip for entity IDs and note file references.
 * Used in agent chat, markdown rendering, and anywhere inline mentions appear.
 *
 * For full hover previews and resolution, use EntityLink instead.
 */

import * as React from 'react'
import {
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
  Link2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/stores/useTabStore'
import { useHighlightStore } from '@/stores/useHighlightStore'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { useVault } from '@/contexts/VaultContext'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { join } from '@tauri-apps/api/path'
import { NAMESPACE_FILES, isEntityId, isNoteFile } from '@/lib/namespaces'

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

export interface ReferenceChipProps {
  /** The reference target (entity ID or note file) */
  reference: string
  /** Optional click handler override */
  onClick?: (reference: string) => void
  /** Additional class names */
  className?: string
  /** Size variant */
  size?: 'xs' | 'sm' | 'md'
  /** Show external link icon */
  showExternalIcon?: boolean
}

export function ReferenceChip({
  reference,
  onClick,
  className,
  size = 'xs',
  showExternalIcon = true,
}: ReferenceChipProps) {
  const { vaultPath } = useVault()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)
  const setHighlightedEntity = useHighlightStore((s) => s.setHighlightedEntity)

  // Determine type and get icon
  const isEntity = isEntityId(reference)
  const isNote = isNoteFile(reference)
  const namespace = isEntity ? reference.split(':')[0] : 'note'
  const IconComponent = NAMESPACE_ICONS[namespace] || NAMESPACE_ICONS.default

  // Size classes
  const sizeClasses = {
    xs: 'text-[11px] px-1 py-0.5 gap-0.5',
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
  }

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  }

  // Default click handler - navigate to file or add to canvas
  const handleClick = React.useCallback(async () => {
    if (onClick) {
      onClick(reference)
      return
    }

    // For person entities, dispatch canvas event to add a person card
    if (isEntity && namespace === 'person') {
      window.dispatchEvent(new CustomEvent('canvas-entity-click', { detail: { entityId: reference } }))
      return
    }

    if (!vaultPath) return

    try {
      let fullPath: string
      let fileName: string

      if (isNote) {
        const noteName = reference.replace(/^@notes\//, '')
        fullPath = await join(vaultPath, '@notes', noteName)
        fileName = noteName
      } else if (isEntity) {
        const [ns] = reference.split(':')
        const relativePath = NAMESPACE_FILES[ns]
        if (!relativePath) return

        fullPath = await join(vaultPath, relativePath)
        fileName = relativePath.split('/').pop() || relativePath

        // Highlight the entity row
        setHighlightedEntity(reference, 3000)
      } else {
        return
      }

      openEditorPinned({
        id: fileName,
        name: fileName,
        path: fullPath,
        file_type: 'file',
        size: 0,
        date_modified: new Date().toISOString(),
        extension: getEffectiveExtension(fileName) || '',
      })
    } catch (err) {
      console.error('[ReferenceChip] Failed to open reference:', err)
    }
  }, [reference, onClick, vaultPath, openEditorPinned, setHighlightedEntity, isNote, isEntity, namespace])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center rounded font-mono transition-colors cursor-pointer border-none',
        'bg-primary/15 text-primary hover:bg-primary/25',
        sizeClasses[size],
        className,
      )}
      title={`Open ${reference}`}>
      <IconComponent className={cn(iconSizes[size], 'opacity-60 shrink-0')} />
      <span className="truncate max-w-[200px]">{reference}</span>
      {showExternalIcon && <ExternalLink className={cn(iconSizes[size], 'opacity-50 shrink-0')} />}
    </button>
  )
}

export default ReferenceChip
