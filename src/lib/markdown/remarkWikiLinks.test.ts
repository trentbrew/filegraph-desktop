/**
 * Tests for remarkWikiLinks remark plugin
 */

import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { remarkWikiLinks, isEntityId, parseEntityId } from './remarkWikiLinks'

describe('remarkWikiLinks', () => {
  describe('isEntityId', () => {
    it('should recognize valid entity IDs', () => {
      expect(isEntityId('person:sarah:001')).toBe(true)
      expect(isEntityId('acc:checking:001')).toBe(true)
      expect(isEntityId('ms:discovery:001')).toBe(true)
    })

    it('should reject invalid entity IDs', () => {
      expect(isEntityId('invalid')).toBe(false)
      expect(isEntityId('just:two')).toBe(false)
      expect(isEntityId('no-namespace:slug:001')).toBe(false)
      expect(isEntityId('person:sarah:1')).toBe(false) // needs 3 digits
    })
  })

  describe('parseEntityId', () => {
    it('should parse entity ID components', () => {
      const result = parseEntityId('person:sarah:001')
      expect(result).toEqual({
        namespace: 'person',
        slug: 'sarah',
        index: '001',
      })
    })

    it('should return null for invalid IDs', () => {
      expect(parseEntityId('invalid')).toBe(null)
    })
  })

  describe('plugin', () => {
    const process = (markdown: string): Root => {
      const processor = unified().use(remarkParse).use(remarkWikiLinks)
      const tree = processor.parse(markdown)
      return processor.runSync(tree) as Root
    }

    it('should transform simple wikilinks to links', () => {
      const tree = process('Hello [[world]] there')
      const paragraph = tree.children[0] as { children: unknown[] }

      expect(paragraph.children.length).toBe(3)
      expect((paragraph.children[0] as { value: string }).value).toBe('Hello ')
      expect((paragraph.children[1] as { type: string }).type).toBe('link')
      expect((paragraph.children[1] as { url: string }).url).toBe('wikilink:world')
      expect((paragraph.children[2] as { value: string }).value).toBe(' there')
    })

    it('should transform wikilinks with display text', () => {
      const tree = process('Link to [[person:sarah:001|Sarah Chen]]')
      const paragraph = tree.children[0] as { children: unknown[] }

      const link = paragraph.children[1] as {
        type: string
        url: string
        children: Array<{ value: string }>
      }

      expect(link.type).toBe('link')
      expect(link.url).toBe('wikilink:person:sarah:001')
      expect(link.children[0].value).toBe('Sarah Chen')
    })

    it('should handle multiple wikilinks in same paragraph', () => {
      const tree = process('[[one]] and [[two]] and [[three]]')
      const paragraph = tree.children[0] as { children: Array<{ type: string }> }

      // Should have: link, text, link, text, link
      const linkNodes = paragraph.children.filter((n) => n.type === 'link')
      expect(linkNodes.length).toBe(3)
    })

    it('should preserve text around wikilinks', () => {
      const tree = process('Before [[link]] after')
      const paragraph = tree.children[0] as { children: unknown[] }

      expect((paragraph.children[0] as { value: string }).value).toBe('Before ')
      expect((paragraph.children[2] as { value: string }).value).toBe(' after')
    })

    it('should create correct URLs for entity IDs', () => {
      const tree = process('[[acc:checking:001]] vs [[simple-note]]')
      const paragraph = tree.children[0] as { children: unknown[] }

      const entityLink = paragraph.children[0] as { url: string }
      const simpleLink = paragraph.children[2] as { url: string }

      expect(entityLink.url).toBe('wikilink:acc:checking:001')
      expect(simpleLink.url).toBe('wikilink:simple-note')
    })
  })
})
