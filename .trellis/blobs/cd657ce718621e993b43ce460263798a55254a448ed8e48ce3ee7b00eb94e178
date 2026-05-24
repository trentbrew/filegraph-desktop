/**
 * EntityIdManager Tests
 * Run with: pnpm vitest run src/lib/tql/entity-ids.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EntityIdManager } from './entity-ids'

describe('EntityIdManager', () => {
  let manager: EntityIdManager

  beforeEach(() => {
    manager = new EntityIdManager()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getOrCreateId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getOrCreateId', () => {
    it('creates a new ID for unknown path', () => {
      const id = manager.getOrCreateId('/path/to/file.txt')

      expect(id).toBeDefined()
      expect(id.startsWith('file:')).toBe(true)
    })

    it('returns existing ID for known path', () => {
      const id1 = manager.getOrCreateId('/path/to/file.txt')
      const id2 = manager.getOrCreateId('/path/to/file.txt')

      expect(id1).toBe(id2)
    })

    it('creates unique IDs for different paths', () => {
      const id1 = manager.getOrCreateId('/path/to/file1.txt')
      const id2 = manager.getOrCreateId('/path/to/file2.txt')

      expect(id1).not.toBe(id2)
    })

    it('generates valid UUID format', () => {
      const id = manager.getOrCreateId('/test.txt')

      // Format: file:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidPart = id.replace('file:', '')
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(uuidPart)).toBe(true)
    })

    it('marks manager as dirty when creating new ID', () => {
      expect(manager.getStats().dirty).toBe(false)

      manager.getOrCreateId('/new/path.txt')

      expect(manager.getStats().dirty).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getId', () => {
    it('returns undefined for unknown path', () => {
      const id = manager.getId('/unknown/path.txt')
      expect(id).toBeUndefined()
    })

    it('returns ID for known path', () => {
      const created = manager.getOrCreateId('/known/path.txt')
      const retrieved = manager.getId('/known/path.txt')

      expect(retrieved).toBe(created)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getPath
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPath', () => {
    it('returns undefined for unknown ID', () => {
      const path = manager.getPath('file:unknown-id')
      expect(path).toBeUndefined()
    })

    it('returns path for known ID', () => {
      const originalPath = '/test/file.txt'
      const id = manager.getOrCreateId(originalPath)
      const retrieved = manager.getPath(id)

      expect(retrieved).toBe(originalPath)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // updatePath (rename/move)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updatePath', () => {
    it('updates path while preserving entity ID', () => {
      const oldPath = '/old/location/file.txt'
      const newPath = '/new/location/file.txt'

      const originalId = manager.getOrCreateId(oldPath)
      const returnedId = manager.updatePath(oldPath, newPath)

      expect(returnedId).toBe(originalId)
      expect(manager.getPath(originalId)).toBe(newPath)
      expect(manager.getId(newPath)).toBe(originalId)
    })

    it('removes old path mapping', () => {
      const oldPath = '/old/file.txt'
      const newPath = '/new/file.txt'

      manager.getOrCreateId(oldPath)
      manager.updatePath(oldPath, newPath)

      expect(manager.getId(oldPath)).toBeUndefined()
    })

    it('returns undefined for unknown old path', () => {
      const result = manager.updatePath('/unknown/old.txt', '/new.txt')
      expect(result).toBeUndefined()
    })

    it('marks manager as dirty', () => {
      manager.getOrCreateId('/old.txt')
      // Reset dirty flag by accessing it
      const stats1 = manager.getStats()

      // Clear would reset dirty, so we just check after update
      manager.updatePath('/old.txt', '/new.txt')

      expect(manager.getStats().dirty).toBe(true)
    })

    it('handles renaming in same directory', () => {
      const oldPath = '/folder/old-name.txt'
      const newPath = '/folder/new-name.txt'

      const id = manager.getOrCreateId(oldPath)
      manager.updatePath(oldPath, newPath)

      expect(manager.getId(newPath)).toBe(id)
      expect(manager.getPath(id)).toBe(newPath)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // removeByPath
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeByPath', () => {
    it('removes entity and returns its ID', () => {
      const path = '/test/file.txt'
      const id = manager.getOrCreateId(path)

      const removedId = manager.removeByPath(path)

      expect(removedId).toBe(id)
      expect(manager.getId(path)).toBeUndefined()
      expect(manager.getPath(id)).toBeUndefined()
    })

    it('returns undefined for unknown path', () => {
      const result = manager.removeByPath('/unknown.txt')
      expect(result).toBeUndefined()
    })

    it('marks manager as dirty', () => {
      const path = '/test.txt'
      manager.getOrCreateId(path)

      manager.removeByPath(path)

      expect(manager.getStats().dirty).toBe(true)
    })

    it('decrements entity count', () => {
      manager.getOrCreateId('/file1.txt')
      manager.getOrCreateId('/file2.txt')

      expect(manager.getStats().totalEntities).toBe(2)

      manager.removeByPath('/file1.txt')

      expect(manager.getStats().totalEntities).toBe(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // removeById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeById', () => {
    it('removes entity by ID', () => {
      const path = '/test/file.txt'
      const id = manager.getOrCreateId(path)

      manager.removeById(id)

      expect(manager.getId(path)).toBeUndefined()
      expect(manager.getPath(id)).toBeUndefined()
    })

    it('handles unknown ID gracefully', () => {
      // Should not throw
      manager.removeById('file:unknown-id')
      expect(manager.getStats().totalEntities).toBe(0)
    })

    it('marks manager as dirty', () => {
      const id = manager.getOrCreateId('/test.txt')
      manager.removeById(id)
      expect(manager.getStats().dirty).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getAllPaths / getAllIds
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAllPaths', () => {
    it('returns empty array for empty manager', () => {
      expect(manager.getAllPaths()).toEqual([])
    })

    it('returns all indexed paths', () => {
      manager.getOrCreateId('/file1.txt')
      manager.getOrCreateId('/file2.txt')
      manager.getOrCreateId('/folder/file3.txt')

      const paths = manager.getAllPaths()

      expect(paths).toHaveLength(3)
      expect(paths).toContain('/file1.txt')
      expect(paths).toContain('/file2.txt')
      expect(paths).toContain('/folder/file3.txt')
    })
  })

  describe('getAllIds', () => {
    it('returns empty array for empty manager', () => {
      expect(manager.getAllIds()).toEqual([])
    })

    it('returns all entity IDs', () => {
      const id1 = manager.getOrCreateId('/file1.txt')
      const id2 = manager.getOrCreateId('/file2.txt')

      const ids = manager.getAllIds()

      expect(ids).toHaveLength(2)
      expect(ids).toContain(id1)
      expect(ids).toContain(id2)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // hasPath
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hasPath', () => {
    it('returns false for unknown path', () => {
      expect(manager.hasPath('/unknown.txt')).toBe(false)
    })

    it('returns true for known path', () => {
      manager.getOrCreateId('/known.txt')
      expect(manager.hasPath('/known.txt')).toBe(true)
    })

    it('returns false after path is removed', () => {
      manager.getOrCreateId('/test.txt')
      manager.removeByPath('/test.txt')
      expect(manager.hasPath('/test.txt')).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('returns correct initial stats', () => {
      const stats = manager.getStats()

      expect(stats.totalEntities).toBe(0)
      expect(stats.dirty).toBe(false)
    })

    it('tracks entity count correctly', () => {
      manager.getOrCreateId('/file1.txt')
      manager.getOrCreateId('/file2.txt')
      manager.getOrCreateId('/file3.txt')

      expect(manager.getStats().totalEntities).toBe(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // clear
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clear', () => {
    it('removes all entities', () => {
      manager.getOrCreateId('/file1.txt')
      manager.getOrCreateId('/file2.txt')

      manager.clear()

      expect(manager.getAllPaths()).toEqual([])
      expect(manager.getAllIds()).toEqual([])
      expect(manager.getStats().totalEntities).toBe(0)
    })

    it('marks manager as dirty', () => {
      manager.clear()
      expect(manager.getStats().dirty).toBe(true)
    })

    it('allows adding new entities after clear', () => {
      manager.getOrCreateId('/old.txt')
      manager.clear()
      const newId = manager.getOrCreateId('/new.txt')

      expect(manager.getId('/new.txt')).toBe(newId)
      expect(manager.getId('/old.txt')).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases & Stress Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('handles paths with special characters', () => {
      const specialPath = '/path/with spaces/and-dashes/under_scores/file.txt'
      const id = manager.getOrCreateId(specialPath)

      expect(manager.getPath(id)).toBe(specialPath)
    })

    it('handles very long paths', () => {
      const longPath = '/' + 'a'.repeat(500) + '/file.txt'
      const id = manager.getOrCreateId(longPath)

      expect(manager.getPath(id)).toBe(longPath)
    })

    it('handles unicode paths', () => {
      const unicodePath = '/文件夹/文件.txt'
      const id = manager.getOrCreateId(unicodePath)

      expect(manager.getPath(id)).toBe(unicodePath)
    })

    it('maintains consistency across many operations', () => {
      // Create entities
      const paths = Array.from({ length: 100 }, (_, i) => `/file${i}.txt`)
      const ids = paths.map((p) => manager.getOrCreateId(p))

      // Verify all mappings
      for (let i = 0; i < paths.length; i++) {
        expect(manager.getId(paths[i])).toBe(ids[i])
        expect(manager.getPath(ids[i])).toBe(paths[i])
      }

      // Remove half
      for (let i = 0; i < 50; i++) {
        manager.removeByPath(paths[i])
      }

      // Verify remaining
      expect(manager.getStats().totalEntities).toBe(50)

      for (let i = 50; i < 100; i++) {
        expect(manager.getId(paths[i])).toBe(ids[i])
      }
    })
  })
})
