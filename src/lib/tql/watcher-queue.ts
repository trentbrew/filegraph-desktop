/**
 * Filesystem Watcher Queue
 * 
 * Debounces and coalesces filesystem events before applying to TQL store.
 * Handles rapid changes (e.g., git checkout) gracefully.
 */

export type FSEventKind =
  | 'create'
  | 'modify'
  | 'remove'
  | 'rename'
  | 'unknown';

export interface FSEvent {
  kind: FSEventKind;
  path: string;
  fromPath?: string; // For rename events
  timestamp: number;
}

export interface FSEventBatch {
  events: FSEvent[];
  timestamp: number;
}

type FlushCallback = (batch: FSEventBatch) => void | Promise<void>;

/**
 * Debounced queue for filesystem events
 */
export class FSWatcherQueue {
  private pending = new Map<string, FSEvent>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly onFlush: FlushCallback;
  private processing = false;

  constructor(debounceMs: number, onFlush: FlushCallback) {
    this.debounceMs = debounceMs;
    this.onFlush = onFlush;
  }

  /**
   * Push a filesystem event into the queue
   * Coalesces events for the same path
   */
  push(event: FSEvent): void {
    const existing = this.pending.get(event.path);

    if (existing) {
      // Merge with existing event
      this.pending.set(event.path, this.mergeEvents(existing, event));
    } else {
      this.pending.set(event.path, event);
    }

    // Reset debounce timer
    this.resetTimer();
  }

  /**
   * Push multiple events at once (batch from backend)
   */
  pushBatch(events: FSEvent[]): void {
    for (const event of events) {
      const existing = this.pending.get(event.path);
      if (existing) {
        this.pending.set(event.path, this.mergeEvents(existing, event));
      } else {
        this.pending.set(event.path, event);
      }
    }

    this.resetTimer();
  }

  /**
   * Force immediate flush (for testing or explicit sync)
   */
  async flushNow(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.flush();
  }

  /**
   * Get current queue size
   */
  getSize(): number {
    return this.pending.size;
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Clear pending events without flushing
   */
  clear(): void {
    this.pending.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Reset the debounce timer
   */
  private resetTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * Flush pending events to callback
   */
  private async flush(): Promise<void> {
    if (this.pending.size === 0) return;
    if (this.processing) {
      // Already processing, reschedule
      this.resetTimer();
      return;
    }

    // Extract pending events
    const events = Array.from(this.pending.values());
    this.pending.clear();

    // Detect renames from remove+create pairs
    const processedEvents = this.detectRenames(events);

    const batch: FSEventBatch = {
      events: processedEvents,
      timestamp: Date.now(),
    };

    // Process batch
    this.processing = true;
    try {
      await this.onFlush(batch);
    } catch (err) {
      console.error('[FSWatcherQueue] Flush error:', err);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Merge two events for the same path
   * 
   * Rules:
   * - create + modify → create (with latest data)
   * - modify + modify → modify (with latest data)
   * - create + remove → remove (file created then deleted = net remove)
   * - modify + remove → remove
   * - any + remove → remove (deletes win)
   * - remove + create → create (resurrection)
   */
  private mergeEvents(existing: FSEvent, incoming: FSEvent): FSEvent {
    const exKind = existing.kind;
    const inKind = incoming.kind;

    // Delete always wins
    if (inKind === 'remove') {
      return incoming;
    }

    // If existing was a delete and now we have create, it's effectively a create
    if (exKind === 'remove' && inKind === 'create') {
      return incoming;
    }

    // create + modify = create (with latest timestamp)
    if (exKind === 'create' && inKind === 'modify') {
      return { ...existing, timestamp: incoming.timestamp };
    }

    // modify + modify = modify (latest)
    if (exKind === 'modify' && inKind === 'modify') {
      return incoming;
    }

    // Default: keep the latest event
    return incoming;
  }

  /**
   * Detect rename operations from remove+create pairs
   * 
   * Heuristic: If we see a remove and create with very close timestamps,
   * and no other file operations in between, it's likely a rename.
   * 
   * This is imperfect but handles the common case.
   */
  private detectRenames(events: FSEvent[]): FSEvent[] {
    const removes: FSEvent[] = [];
    const creates: FSEvent[] = [];
    const others: FSEvent[] = [];

    // Separate events by kind
    for (const event of events) {
      if (event.kind === 'remove') {
        removes.push(event);
      } else if (event.kind === 'create') {
        creates.push(event);
      } else {
        others.push(event);
      }
    }

    const processed: FSEvent[] = [...others];
    const usedRemoves = new Set<number>();
    const usedCreates = new Set<number>();

    // Try to pair removes with creates
    for (let i = 0; i < removes.length; i++) {
      if (usedRemoves.has(i)) continue;

      const remove = removes[i];

      for (let j = 0; j < creates.length; j++) {
        if (usedCreates.has(j)) continue;

        const create = creates[j];

        // Check if timestamps are close (within 100ms)
        const timeDiff = Math.abs(create.timestamp - remove.timestamp);
        if (timeDiff < 100) {
          // Likely a rename
          processed.push({
            kind: 'rename',
            path: create.path,
            fromPath: remove.path,
            timestamp: create.timestamp,
          });

          usedRemoves.add(i);
          usedCreates.add(j);
          break;
        }
      }
    }

    // Add unmatched removes
    for (let i = 0; i < removes.length; i++) {
      if (!usedRemoves.has(i)) {
        processed.push(removes[i]);
      }
    }

    // Add unmatched creates
    for (let j = 0; j < creates.length; j++) {
      if (!usedCreates.has(j)) {
        processed.push(creates[j]);
      }
    }

    return processed;
  }
}
