/**
 * EAV Store Tests - Comprehensive Test Suite
 * Run with: pnpm vitest run src/lib/tql/eav-store.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EAVStore, type Link, type Fact, jsonEntityFacts } from './eav-store'

// ═══════════════════════════════════════════════════════════════════════════
// FACTS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('EAVStore - Facts Methods', () => {
  let store: EAVStore

  beforeEach(() => {
    store = new EAVStore()
  })

  describe('addFacts', () => {
    it('adds facts for a new entity', () => {
      const facts: Fact[] = [
        { e: 'file-1', a: 'name', v: 'test.txt' },
        { e: 'file-1', a: 'size', v: 1024 },
      ]

      store.addFacts(facts)

      const retrieved = store.getFactsByEntity('file-1')
      expect(retrieved).toHaveLength(2)
    })

    it('appends facts to existing entity', () => {
      store.addFacts([{ e: 'file-1', a: 'name', v: 'test.txt' }])
      store.addFacts([{ e: 'file-1', a: 'size', v: 1024 }])

      const retrieved = store.getFactsByEntity('file-1')
      expect(retrieved).toHaveLength(2)
    })

    it('handles facts for multiple entities', () => {
      const facts: Fact[] = [
        { e: 'file-1', a: 'name', v: 'test1.txt' },
        { e: 'file-2', a: 'name', v: 'test2.txt' },
        { e: 'file-1', a: 'size', v: 100 },
      ]

      store.addFacts(facts)

      expect(store.getFactsByEntity('file-1')).toHaveLength(2)
      expect(store.getFactsByEntity('file-2')).toHaveLength(1)
    })

    it('handles empty facts array', () => {
      store.addFacts([])
      expect(store.getStats().factCount).toBe(0)
    })

    it('stores boolean values correctly', () => {
      store.addFacts([{ e: 'file-1', a: 'hidden', v: true }])

      const facts = store.getFactsByEntity('file-1')
      expect(facts[0].v).toBe(true)
    })

    it('stores numeric values correctly', () => {
      store.addFacts([{ e: 'file-1', a: 'modified', v: 1702300000000 }])

      const facts = store.getFactsByEntity('file-1')
      expect(facts[0].v).toBe(1702300000000)
    })
  })

  describe('getFactsByEntity', () => {
    it('returns empty array for unknown entity', () => {
      const facts = store.getFactsByEntity('nonexistent')
      expect(facts).toEqual([])
    })

    it('returns facts in insertion order', () => {
      store.addFacts([
        { e: 'file-1', a: 'name', v: 'test.txt' },
        { e: 'file-1', a: 'size', v: 1024 },
        { e: 'file-1', a: 'type', v: 'file' },
      ])

      const facts = store.getFactsByEntity('file-1')
      expect(facts[0].a).toBe('name')
      expect(facts[1].a).toBe('size')
      expect(facts[2].a).toBe('type')
    })
  })

  describe('getStats', () => {
    it('returns correct counts for empty store', () => {
      const stats = store.getStats()
      expect(stats.factCount).toBe(0)
      expect(stats.linkCount).toBe(0)
      expect(stats.entityCount).toBe(0)
    })

    it('counts facts correctly', () => {
      store.addFacts([
        { e: 'file-1', a: 'name', v: 'test1.txt' },
        { e: 'file-1', a: 'size', v: 100 },
        { e: 'file-2', a: 'name', v: 'test2.txt' },
      ])

      const stats = store.getStats()
      expect(stats.factCount).toBe(3)
      expect(stats.entityCount).toBe(2)
    })

    it('counts links correctly', () => {
      store.addLinks([
        { e1: 'folder', a: 'fs:contains', e2: 'file-1' },
        { e1: 'folder', a: 'fs:contains', e2: 'file-2' },
      ])

      const stats = store.getStats()
      expect(stats.linkCount).toBe(2)
    })
  })

  describe('clear', () => {
    it('removes all facts', () => {
      store.addFacts([
        { e: 'file-1', a: 'name', v: 'test.txt' },
        { e: 'file-2', a: 'name', v: 'test2.txt' },
      ])

      store.clear()

      expect(store.getFactsByEntity('file-1')).toEqual([])
      expect(store.getStats().factCount).toBe(0)
    })

    it('removes all links', () => {
      store.addLinks([{ e1: 'folder', a: 'fs:contains', e2: 'file-1' }])

      store.clear()

      expect(store.getBacklinks('file-1')).toEqual([])
      expect(store.getStats().linkCount).toBe(0)
    })

    it('can add data after clear', () => {
      store.addFacts([{ e: 'file-1', a: 'name', v: 'old.txt' }])
      store.clear()
      store.addFacts([{ e: 'file-2', a: 'name', v: 'new.txt' }])

      expect(store.getFactsByEntity('file-1')).toEqual([])
      expect(store.getFactsByEntity('file-2')).toHaveLength(1)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// jsonEntityFacts TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('jsonEntityFacts', () => {
  it('creates facts from simple object', () => {
    const facts = jsonEntityFacts('entity-1', {
      name: 'Test',
      size: 1024,
      active: true,
    })

    expect(facts).toHaveLength(3)
    expect(facts.find((f) => f.a === 'name')?.v).toBe('Test')
    expect(facts.find((f) => f.a === 'size')?.v).toBe(1024)
    expect(facts.find((f) => f.a === 'active')?.v).toBe(true)
  })

  it('adds type fact when provided', () => {
    const facts = jsonEntityFacts('entity-1', { name: 'Test' }, 'Person')

    expect(facts).toHaveLength(2)
    expect(facts.find((f) => f.a === 'type')?.v).toBe('Person')
  })

  it('skips null and undefined values', () => {
    const facts = jsonEntityFacts('entity-1', {
      name: 'Test',
      empty: null,
      missing: undefined,
    })

    expect(facts).toHaveLength(1)
    expect(facts[0].a).toBe('name')
  })

  it('handles arrays with indexed attribute names', () => {
    const facts = jsonEntityFacts('entity-1', {
      tags: ['red', 'blue', 'green'],
    })

    expect(facts).toHaveLength(3)
    expect(facts.find((f) => f.a === 'tags[0]')?.v).toBe('red')
    expect(facts.find((f) => f.a === 'tags[1]')?.v).toBe('blue')
    expect(facts.find((f) => f.a === 'tags[2]')?.v).toBe('green')
  })

  it('handles arrays with numeric values', () => {
    const facts = jsonEntityFacts('entity-1', {
      scores: [100, 200, 300],
    })

    expect(facts).toHaveLength(3)
    expect(facts.find((f) => f.a === 'scores[1]')?.v).toBe(200)
  })

  it('skips nested objects', () => {
    const facts = jsonEntityFacts('entity-1', {
      name: 'Test',
      nested: { foo: 'bar' },
    })

    expect(facts).toHaveLength(1)
    expect(facts[0].a).toBe('name')
  })

  it('skips arrays containing objects', () => {
    const facts = jsonEntityFacts('entity-1', {
      items: [{ id: 1 }, { id: 2 }],
    })

    expect(facts).toHaveLength(0)
  })

  it('handles mixed arrays (only primitives)', () => {
    const facts = jsonEntityFacts('entity-1', {
      mixed: ['string', 123, { obj: true }, false],
    })

    expect(facts).toHaveLength(3) // string, number, boolean - object skipped
    expect(facts.find((f) => f.a === 'mixed[0]')?.v).toBe('string')
    expect(facts.find((f) => f.a === 'mixed[1]')?.v).toBe(123)
    expect(facts.find((f) => f.a === 'mixed[3]')?.v).toBe(false)
  })

  it('handles empty object', () => {
    const facts = jsonEntityFacts('entity-1', {})
    expect(facts).toHaveLength(0)
  })

  it('handles empty object with type', () => {
    const facts = jsonEntityFacts('entity-1', {}, 'Empty')
    expect(facts).toHaveLength(1)
    expect(facts[0]).toEqual({ e: 'entity-1', a: 'type', v: 'Empty' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LINK TESTS (existing)
// ═══════════════════════════════════════════════════════════════════════════

describe('EAVStore - Link Methods', () => {
  let store: EAVStore

  beforeEach(() => {
    store = new EAVStore()
  })

  describe('getBacklinks', () => {
    it('returns links where entity is the target', () => {
      const links: Link[] = [
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-c', a: 'ref:links', e2: 'entity-2' },
      ]
      store.addLinks(links)

      const backlinks = store.getBacklinks('entity-1')

      expect(backlinks).toHaveLength(2)
      expect(backlinks.every((l) => l.e2 === 'entity-1')).toBe(true)
    })

    it('returns empty array for entity with no backlinks', () => {
      store.addLinks([{ e1: 'file-a', a: 'ref:links', e2: 'entity-1' }])

      const backlinks = store.getBacklinks('entity-999')

      expect(backlinks).toHaveLength(0)
    })
  })

  describe('getOutgoingLinks', () => {
    it('returns links where entity is the source', () => {
      const links: Link[] = [
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-a', a: 'ref:links', e2: 'entity-2' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
      ]
      store.addLinks(links)

      const outgoing = store.getOutgoingLinks('file-a')

      expect(outgoing).toHaveLength(2)
      expect(outgoing.every((l) => l.e1 === 'file-a')).toBe(true)
    })
  })

  describe('removeLinksFromSource', () => {
    it('removes all links from a source entity', () => {
      const links: Link[] = [
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-a', a: 'ref:links', e2: 'entity-2' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
      ]
      store.addLinks(links)

      const removed = store.removeLinksFromSource('file-a')

      expect(removed).toBe(2)
      expect(store.getOutgoingLinks('file-a')).toHaveLength(0)
      expect(store.getOutgoingLinks('file-b')).toHaveLength(1)
    })

    it('updates target indexes after removal', () => {
      store.addLinks([
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
      ])

      store.removeLinksFromSource('file-a')

      const backlinks = store.getBacklinks('entity-1')
      expect(backlinks).toHaveLength(1)
      expect(backlinks[0].e1).toBe('file-b')
    })

    it('returns 0 when no links to remove', () => {
      const removed = store.removeLinksFromSource('nonexistent')
      expect(removed).toBe(0)
    })
  })

  describe('hasLink', () => {
    it('returns true when link exists', () => {
      store.addLinks([{ e1: 'file-a', a: 'ref:links', e2: 'entity-1' }])

      expect(store.hasLink('file-a', 'entity-1')).toBe(true)
    })

    it('returns false when link does not exist', () => {
      store.addLinks([{ e1: 'file-a', a: 'ref:links', e2: 'entity-1' }])

      expect(store.hasLink('file-a', 'entity-999')).toBe(false)
    })

    it('filters by attribute when provided', () => {
      store.addLinks([{ e1: 'file-a', a: 'ref:links', e2: 'entity-1' }])

      expect(store.hasLink('file-a', 'entity-1', 'ref:links')).toBe(true)
      expect(store.hasLink('file-a', 'entity-1', 'ref:mentions')).toBe(false)
    })
  })

  describe('getAllTargetIds', () => {
    it('returns all unique target IDs', () => {
      store.addLinks([
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-c', a: 'ref:links', e2: 'entity-2' },
      ])

      const targets = store.getAllTargetIds()

      expect(targets.size).toBe(2)
      expect(targets.has('entity-1')).toBe(true)
      expect(targets.has('entity-2')).toBe(true)
    })
  })

  describe('getAllSourceIds', () => {
    it('returns all unique source IDs', () => {
      store.addLinks([
        { e1: 'file-a', a: 'ref:links', e2: 'entity-1' },
        { e1: 'file-a', a: 'ref:links', e2: 'entity-2' },
        { e1: 'file-b', a: 'ref:links', e2: 'entity-1' },
      ])

      const sources = store.getAllSourceIds()

      expect(sources.size).toBe(2)
      expect(sources.has('file-a')).toBe(true)
      expect(sources.has('file-b')).toBe(true)
    })
  })
})
