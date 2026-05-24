/**
 * Text rendering utilities for agent chat messages
 * Handles expressive text styling and reference link rendering
 */

import * as React from 'react'
import { ReferenceChip } from '@/components/links'
import { REFERENCE_PATTERN } from '@/lib/namespaces'

const COLOR_CLASSES: Record<string, string> = {
  red: 'text-red-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  cyan: 'text-cyan-500',
  pink: 'text-pink-500',
}

/**
 * Render expressive text styling (highlights, colors, underlines, opacity)
 * Supported syntax:
 * - ==highlight== for yellow highlights
 * - ::red::text:: or ::blue::text:: etc for colors
 * - __underline__ for underlines
 * - %%dim%% for reduced opacity text
 */
export function renderWithExpressiveText(children: React.ReactNode): React.ReactNode {
  if (typeof children !== 'string') {
    if (Array.isArray(children)) {
      return children.map((child, i) => <React.Fragment key={i}>{renderWithExpressiveText(child)}</React.Fragment>)
    }
    return children
  }

  const parts: React.ReactNode[] = []
  const remaining = children
  let key = 0

  // Combined regex for all patterns
  const combinedPattern =
    /==([^=]+)==|::(red|blue|green|yellow|purple|orange|cyan|pink)::([^:]+)::|__([^_]+)__|%%([^%]+)%%/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  combinedPattern.lastIndex = 0
  while ((match = combinedPattern.exec(remaining)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index))
    }

    if (match[1]) {
      // Highlight ==text==
      parts.push(
        <mark key={key++} className="bg-yellow-500/30 text-foreground px-0.5 rounded-sm">
          {match[1]}
        </mark>,
      )
    } else if (match[2] && match[3]) {
      // Color ::color::text::
      const colorClass = COLOR_CLASSES[match[2]] || 'text-foreground'
      parts.push(
        <span key={key++} className={colorClass}>
          {match[3]}
        </span>,
      )
    } else if (match[4]) {
      // Underline __text__
      parts.push(
        <span key={key++} className="underline decoration-primary/50 underline-offset-2">
          {match[4]}
        </span>,
      )
    } else if (match[5]) {
      // Dim %%text%%
      parts.push(
        <span key={key++} className="opacity-50">
          {match[5]}
        </span>,
      )
    }

    lastIndex = combinedPattern.lastIndex
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex))
  }

  return parts.length > 0 ? parts : children
}

/**
 * Render text with clickable reference links (entity IDs and note files)
 */
export function renderWithReferenceLinks(children: React.ReactNode): React.ReactNode {
  if (typeof children !== 'string') {
    if (Array.isArray(children)) {
      return children.map((child, i) => <React.Fragment key={i}>{renderWithReferenceLinks(child)}</React.Fragment>)
    }
    return children
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  REFERENCE_PATTERN.lastIndex = 0
  while ((match = REFERENCE_PATTERN.exec(children)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index))
    }

    // Add the reference link using ReferenceChip
    const reference = match[0]
    parts.push(<ReferenceChip key={match.index} reference={reference} size="xs" className="mx-0.5" />)

    lastIndex = REFERENCE_PATTERN.lastIndex
  }

  // Add remaining text
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex))
  }

  return parts.length > 0 ? parts : children
}
