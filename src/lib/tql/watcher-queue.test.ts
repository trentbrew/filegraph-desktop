/**
 * FSWatcherQueue Tests
 * Run with: pnpm vitest run src/lib/tql/watcher-queue.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FSWatcherQueue, type FSEvent, type FSEventBatch } from './watcher-queue'

describe('FSWatcherQueue', () => {
  let queue: FSWatcherQueue
  let receivedBatches: FSEventBatch[]

  beforeEach(() => {
    vi.useFakeTimers()
    receivedBatches = []
    queue = new FSWatcherQueue(100, (batch: FSEventBatch) => {
      receivedBatches.push(batch)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    queue.clear()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Basic Queue Operations
  // ═══════════════════════════════════════════════════════════════════════════

  describe('push', () => {
    it('adds event to pending queue', () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      expect(queue.getSize()).toBe(1)
    })

    it('does not flush immediately', () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      expect(receivedBatches).toHaveLength(0)
    })

    it('flushes after debounce period', async () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      expect(receivedBatches).toHaveLength(1)
    })

    it('resets debounce timer on new events', async () => {
      queue.push({ kind: 'create', path: '/file1.txt', timestamp: Date.now() })

      vi.advanceTimersByTime(50) // Half the debounce time

      queue.push({ kind: 'create', path: '/file2.txt', timestamp: Date.now() })

      vi.advanceTimersByTime(50) // Still shouldn't flush

      expect(receivedBatches).toHaveLength(0)

      vi.advanceTimersByTime(50) // Now it should flush
      await vi.runAllTimersAsync()

      expect(receivedBatches).toHaveLength(1)
      expect(receivedBatches[0].events).toHaveLength(2)
    })
  })

  describe('pushBatch', () => {
    it('adds multiple events at once', () => {
      const events: FSEvent[] = [
        { kind: 'create', path: '/file1.txt', timestamp: Date.now() },
        { kind: 'create', path: '/file2.txt', timestamp: Date.now() },
        { kind: 'create', path: '/file3.txt', timestamp: Date.now() },
      ]

      queue.pushBatch(events)

      expect(queue.getSize()).toBe(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Merging (Coalescing)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Event Merging', () => {
    it('merges create + modify → create', async () => {
      const now = Date.now()
      queue.push({ kind: 'create', path: '/file.txt', timestamp: now })
      queue.push({ kind: 'modify', path: '/file.txt', timestamp: now + 10 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(1)
      expect(receivedBatches[0].events[0].kind).toBe('create')
    })

    it('merges modify + modify → modify', async () => {
      const now = Date.now()
      queue.push({ kind: 'modify', path: '/file.txt', timestamp: now })
      queue.push({ kind: 'modify', path: '/file.txt', timestamp: now + 10 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(1)
      expect(receivedBatches[0].events[0].kind).toBe('modify')
    })

    it('removes all before delete: create + remove → remove', async () => {
      const now = Date.now()
      queue.push({ kind: 'create', path: '/file.txt', timestamp: now })
      queue.push({ kind: 'remove', path: '/file.txt', timestamp: now + 10 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(1)
      expect(receivedBatches[0].events[0].kind).toBe('remove')
    })

    it('removes all before delete: modify + remove → remove', async () => {
      const now = Date.now()
      queue.push({ kind: 'modify', path: '/file.txt', timestamp: now })
      queue.push({ kind: 'remove', path: '/file.txt', timestamp: now + 10 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(1)
      expect(receivedBatches[0].events[0].kind).toBe('remove')
    })

    it('handles resurrection: remove + create → create', async () => {
      const now = Date.now()
      queue.push({ kind: 'remove', path: '/file.txt', timestamp: now })
      queue.push({ kind: 'create', path: '/file.txt', timestamp: now + 10 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(1)
      expect(receivedBatches[0].events[0].kind).toBe('create')
    })

    it('keeps events separate for different paths', async () => {
      const now = Date.now()
      // Use timestamps far apart to avoid rename detection pairing
      queue.push({ kind: 'create', path: '/file1.txt', timestamp: now })
      queue.push({ kind: 'modify', path: '/file2.txt', timestamp: now + 200 })
      queue.push({ kind: 'modify', path: '/file3.txt', timestamp: now + 400 })

      await queue.flushNow()

      expect(receivedBatches[0].events).toHaveLength(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Rename Detection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rename Detection', () => {
    it('detects rename from remove + create with close timestamps', async () => {
      const now = Date.now()
      queue.push({ kind: 'remove', path: '/old-name.txt', timestamp: now })
      queue.push({ kind: 'create', path: '/new-name.txt', timestamp: now + 10 })

      await queue.flushNow()

      const events = receivedBatches[0].events
      const renameEvent = events.find((e) => e.kind === 'rename')

      expect(renameEvent).toBeDefined()
      expect(renameEvent?.path).toBe('/new-name.txt')
      expect(renameEvent?.fromPath).toBe('/old-name.txt')
    })

    it('does not detect rename if timestamps are far apart', async () => {
      const now = Date.now()
      queue.push({ kind: 'remove', path: '/old-name.txt', timestamp: now })
      queue.push({ kind: 'create', path: '/new-name.txt', timestamp: now + 200 })

      await queue.flushNow()

      const events = receivedBatches[0].events
      const renameEvent = events.find((e) => e.kind === 'rename')

      expect(renameEvent).toBeUndefined()
      expect(events.find((e) => e.kind === 'remove')).toBeDefined()
      expect(events.find((e) => e.kind === 'create')).toBeDefined()
    })

    it('handles multiple potential renames', async () => {
      const now = Date.now()
      // Two separate renames happening around the same time
      queue.push({ kind: 'remove', path: '/old1.txt', timestamp: now })
      queue.push({ kind: 'create', path: '/new1.txt', timestamp: now + 5 })
      queue.push({ kind: 'remove', path: '/old2.txt', timestamp: now + 10 })
      queue.push({ kind: 'create', path: '/new2.txt', timestamp: now + 15 })

      await queue.flushNow()

      const events = receivedBatches[0].events
      const renames = events.filter((e) => e.kind === 'rename')

      // Should detect at least one rename (timing might affect which pairs match)
      expect(renames.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // flushNow
  // ═══════════════════════════════════════════════════════════════════════════

  describe('flushNow', () => {
    it('immediately flushes pending events', async () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      await queue.flushNow()

      expect(receivedBatches).toHaveLength(1)
      expect(queue.getSize()).toBe(0)
    })

    it('cancels pending debounce timer', async () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      await queue.flushNow()

      vi.advanceTimersByTime(200) // Past the debounce time
      await vi.runAllTimersAsync()

      // Should still only have been called once
      expect(receivedBatches).toHaveLength(1)
    })

    it('does nothing if queue is empty', async () => {
      await queue.flushNow()

      expect(receivedBatches).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Queue State Methods
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getSize / getPendingCount', () => {
    it('returns 0 for empty queue', () => {
      expect(queue.getSize()).toBe(0)
      expect(queue.getPendingCount()).toBe(0)
    })

    it('returns correct count after adding events', () => {
      queue.push({ kind: 'create', path: '/file1.txt', timestamp: Date.now() })
      queue.push({ kind: 'create', path: '/file2.txt', timestamp: Date.now() })

      expect(queue.getSize()).toBe(2)
      expect(queue.getPendingCount()).toBe(2)
    })

    it('merges events for same path', () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })
      queue.push({ kind: 'modify', path: '/file.txt', timestamp: Date.now() })

      expect(queue.getSize()).toBe(1) // Merged into single event
    })
  })

  describe('isProcessing', () => {
    it('returns false when idle', () => {
      expect(queue.isProcessing()).toBe(false)
    })

    it('returns true during flush callback', async () => {
      let wasProcessing = false
      const slowQueue = new FSWatcherQueue(10, () => {
        wasProcessing = slowQueue.isProcessing()
      })

      slowQueue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      await slowQueue.flushNow()

      expect(wasProcessing).toBe(true)
    })
  })

  describe('clear', () => {
    it('removes all pending events', () => {
      queue.push({ kind: 'create', path: '/file1.txt', timestamp: Date.now() })
      queue.push({ kind: 'create', path: '/file2.txt', timestamp: Date.now() })

      queue.clear()

      expect(queue.getSize()).toBe(0)
    })

    it('cancels pending debounce timer', async () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      queue.clear()

      vi.advanceTimersByTime(200)
      await vi.runAllTimersAsync()

      expect(receivedBatches).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('recovers from callback errors', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })

      const errorQueue = new FSWatcherQueue(10, errorCallback)
      errorQueue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      // Should not throw
      await errorQueue.flushNow()

      // Should be able to push more events
      errorQueue.push({ kind: 'create', path: '/file2.txt', timestamp: Date.now() })
      expect(errorQueue.getSize()).toBe(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch Structure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Batch Structure', () => {
    it('includes timestamp in batch', async () => {
      queue.push({ kind: 'create', path: '/file.txt', timestamp: Date.now() })

      await queue.flushNow()

      expect(receivedBatches[0].timestamp).toBeDefined()
      expect(typeof receivedBatches[0].timestamp).toBe('number')
    })

    it('includes all event fields', async () => {
      const event: FSEvent = {
        kind: 'rename',
        path: '/new.txt',
        fromPath: '/old.txt',
        timestamp: 1234567890,
      }

      queue.push(event)
      await queue.flushNow()

      const processed = receivedBatches[0].events[0]
      expect(processed.kind).toBe('rename')
      expect(processed.path).toBe('/new.txt')
      expect(processed.fromPath).toBe('/old.txt')
      expect(processed.timestamp).toBe(1234567890)
    })
  })
})
