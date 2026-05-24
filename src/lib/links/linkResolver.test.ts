/**
 * Link Resolver Tests
 * Run with: pnpm vitest run src/lib/links/linkResolver.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LinkResolver, type EntityLocation } from './linkResolver'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

describe('LinkResolver', () => {
  let resolver: LinkResolver

  beforeEach(() => {
    resolver = new LinkResolver('/vault')
    vi.clearAllMocks()
  })

  describe('Entity Registration', () => {
    it('registers and retrieves entity locations', () => {
      const location: EntityLocation = {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 0,
        entityData: { id: 'acc:checking:001', name: 'Checking Account' },
      }

      resolver.registerEntity('acc:checking:001', location)

      const retrieved = resolver.getEntityLocation('acc:checking:001')
      expect(retrieved).toEqual(location)
    })

    it('returns undefined for unregistered entities', () => {
      const location = resolver.getEntityLocation('nonexistent:id:001')
      expect(location).toBeUndefined()
    })

    it('tracks all registered entity IDs', () => {
      resolver.registerEntity('acc:checking:001', {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 0,
        entityData: {},
      })
      resolver.registerEntity('person:sarah:001', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 0,
        entityData: {},
      })

      const ids = resolver.getRegisteredEntityIds()
      expect(ids).toContain('acc:checking:001')
      expect(ids).toContain('person:sarah:001')
    })
  })

  describe('Entity ID Resolution', () => {
    it('resolves registered entity IDs', async () => {
      resolver.registerEntity('acc:checking:001', {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 0,
        entityData: { id: 'acc:checking:001', name: 'Checking' },
      })

      const result = await resolver.resolve('acc:checking:001')

      expect(result.status).toBe('resolved')
      if (result.status === 'resolved') {
        expect(result.filePath).toBe('/vault/@finance/accounts.data')
        expect(result.relativePath).toBe('@finance/accounts.data')
        expect(result.entityData?.name).toBe('Checking')
      }
    })

    it('returns not-found with suggestions for unregistered entity IDs', async () => {
      // Mock file search to return nothing
      vi.mocked(invoke).mockRejectedValue(new Error('Not found'))

      const result = await resolver.resolve('acc:unknown:001')

      expect(result.status).toBe('not-found')
      if (result.status === 'not-found') {
        expect(result.suggestions).toContain('@finance/accounts.data')
      }
    })
  })

  describe('Wikilink Normalization', () => {
    it('strips wikilink brackets', async () => {
      resolver.registerEntity('person:sarah:001', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 0,
        entityData: {},
      })

      const result = await resolver.resolve('[[person:sarah:001]]')

      expect(result.status).toBe('resolved')
    })

    it('strips display text from wikilinks', async () => {
      resolver.registerEntity('person:sarah:001', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 0,
        entityData: {},
      })

      const result = await resolver.resolve('[[person:sarah:001|Sarah Johnson]]')

      expect(result.status).toBe('resolved')
    })
  })

  describe('Suggested Locations', () => {
    it('suggests @finance for acc namespace', () => {
      const suggestions = resolver.getSuggestedLocation('acc:new:001')
      expect(suggestions.some((s) => s.includes('@finance'))).toBe(true)
    })

    it('suggests @people for person namespace', () => {
      const suggestions = resolver.getSuggestedLocation('person:new:001')
      expect(suggestions.some((s) => s.includes('@people'))).toBe(true)
    })

    it('returns empty for invalid IDs', () => {
      const suggestions = resolver.getSuggestedLocation('invalid')
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('Slug Resolution', () => {
    it('resolves entities by name slug match', async () => {
      resolver.registerEntity('person:sarah:001', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 0,
        entityData: { id: 'person:sarah:001', name: 'Sarah Johnson' },
      })

      const result = await resolver.resolve('sarah-johnson')

      expect(result.status).toBe('resolved')
      if (result.status === 'resolved') {
        expect(result.entityData?.name).toBe('Sarah Johnson')
      }
    })

    it('returns ambiguous when multiple matches exist', async () => {
      resolver.registerEntity('person:sarah-a:001', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 0,
        entityData: { id: 'person:sarah-a:001', name: 'Sarah' },
      })
      resolver.registerEntity('person:sarah-b:002', {
        filePath: '/vault/@people/people.data',
        relativePath: '@people/people.data',
        collectionKey: 'people',
        collectionIndex: 1,
        entityData: { id: 'person:sarah-b:002', name: 'Sarah' },
      })

      const result = await resolver.resolve('sarah')

      expect(result.status).toBe('ambiguous')
      if (result.status === 'ambiguous') {
        expect(result.candidates).toHaveLength(2)
      }
    })
  })

  describe('Batch Resolution', () => {
    it('resolves multiple targets at once', async () => {
      resolver.registerEntity('acc:checking:001', {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 0,
        entityData: {},
      })
      resolver.registerEntity('acc:savings:001', {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 1,
        entityData: {},
      })

      const results = await resolver.resolveMany(['acc:checking:001', 'acc:savings:001', 'acc:unknown:001'])

      expect(results.get('acc:checking:001')?.status).toBe('resolved')
      expect(results.get('acc:savings:001')?.status).toBe('resolved')
      // Unknown would try to search files, which are mocked to fail
    })
  })

  describe('canResolve', () => {
    it('returns true for resolvable targets', async () => {
      resolver.registerEntity('acc:checking:001', {
        filePath: '/vault/@finance/accounts.data',
        relativePath: '@finance/accounts.data',
        collectionKey: 'accounts',
        collectionIndex: 0,
        entityData: {},
      })

      const canResolve = await resolver.canResolve('acc:checking:001')
      expect(canResolve).toBe(true)
    })

    it('returns false for unresolvable targets', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Not found'))

      const canResolve = await resolver.canResolve('nonexistent:id:001')
      expect(canResolve).toBe(false)
    })
  })
})
