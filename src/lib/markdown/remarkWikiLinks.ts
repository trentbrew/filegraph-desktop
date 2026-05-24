/**
 * Remark Plugin: WikiLinks
 *
 * Transforms [[target]] and [[target|display]] syntax into link nodes.
 * Part of RFC-001 Universal Bi-directional Linking System.
 *
 * Syntax:
 * - [[target]] - Simple link, display text = target
 * - [[target|Display Text]] - Link with custom display text
 * - [[person:sarah:001|Sarah]] - Entity ID with display name
 */

import { findAndReplace } from 'mdast-util-find-and-replace'
import type { Root, Link, Text } from 'mdast'

// Pattern to match wikilinks: [[target]] or [[target|display]]
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

// Entity ID pattern: namespace:slug:index
const ENTITY_ID_PATTERN = /^([a-z]+):([a-z0-9-]+):(\d{3})$/

/**
 * Check if a string is an entity ID
 */
export function isEntityId(target: string): boolean {
  return ENTITY_ID_PATTERN.test(target)
}

/**
 * Parse entity ID into components
 */
export function parseEntityId(id: string): { namespace: string; slug: string; index: string } | null {
  const match = ENTITY_ID_PATTERN.exec(id)
  if (!match) return null
  return {
    namespace: match[1],
    slug: match[2],
    index: match[3],
  }
}

/**
 * Remark plugin to transform wikilink syntax into link nodes
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        WIKILINK_REGEX,
        (_match: string, target: string, displayText?: string): Link => {
          const targetTrimmed = target.trim()
          const finalDisplayText = displayText?.trim() || targetTrimmed
          const entityId = isEntityId(targetTrimmed)

          // Create a link node with wikilink: URL scheme
          // This allows the component handler to detect wikilinks
          return {
            type: 'link',
            url: `wikilink:${targetTrimmed}`,
            title: entityId ? `Entity: ${targetTrimmed}` : targetTrimmed,
            data: {
              hProperties: {
                className: entityId ? 'wikilink wikilink-entity' : 'wikilink',
                'data-target': targetTrimmed,
                'data-entity-id': entityId ? 'true' : 'false',
              },
            },
            children: [{ type: 'text', value: finalDisplayText } as Text],
          }
        },
      ],
    ])
  }
}

export default remarkWikiLinks
