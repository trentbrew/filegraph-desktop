/**
 * TQL Runtime
 * 
 * Main integration layer between filesystem and TQL EAV store.
 * Handles entity lifecycle, batching, and query execution.
 */

import { invoke } from '@tauri-apps/api/core';
import { EAVStore, jsonEntityFacts } from '../../../.sandbox/tql/src/index';
import type { Fact, Link, QueryResult } from '../../../.sandbox/tql/src/index';
import { EntityIdManager } from './entity-ids';
import { FSWatcherQueue, type FSEvent, type FSEventBatch } from './watcher-queue';
import {
  createFileFacts,
  createContainsLink,
  getParentPath,
  getExtension,
  isHidden,
  normalizePath,
  type FileStats,
} from './facts';

/**
 * File item from Tauri list_directory command
 */
interface FileItem {
  name: string;
  path: string;
  file_type: 'file' | 'folder';
  size: number;
  modified: number;
  created: number;
}

/**
 * Progress callback for initial scan
 */
export interface ScanProgress {
  phase: 'scanning' | 'indexing' | 'linking';
  processed: number;
  total: number;
  currentFile?: string;
  rate?: number; // files per second
  eta?: number; // estimated seconds remaining
}

export type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Runtime events
 */
export type RuntimeEvent =
  | { type: 'ingest_started'; rootPath: string }
  | { type: 'ingest_batch'; processed: number; total: number }
  | { type: 'ingest_done'; totalFiles: number; durationMs: number }
  | { type: 'fs_batch_applied'; eventCount: number; durationMs: number }
  | { type: 'query_slow'; query: string; durationMs: number }
  | {
      type: 'error';
      code: string;
      message: string;
      context?: Record<string, any>;
    };

export type EventCallback = (event: RuntimeEvent) => void;

/**
 * Main TQL Runtime
 */
export class TQLRuntime {
  private store: EAVStore;
  private idManager: EntityIdManager;
  private watcherQueue: FSWatcherQueue;
  private eventCallbacks: EventCallback[] = [];
  private appDataDir: string | null = null;
  private batching = false;
  private batchedFacts: Fact[] = [];
  private batchedLinks: Link[] = [];

  constructor() {
    this.store = new EAVStore();
    this.idManager = new EntityIdManager();
    this.watcherQueue = new FSWatcherQueue(300, (batch) =>
      this.handleFSBatch(batch),
    );
  }

  /**
   * Initialize runtime (load indexes from disk)
   */
  async initialize(appDataDir: string): Promise<void> {
    this.appDataDir = appDataDir;
    await this.idManager.load(appDataDir);
    console.log('[TQL] Runtime initialized');
  }

  /**
   * Save indexes to disk
   */
  async save(): Promise<void> {
    if (!this.appDataDir) {
      throw new Error('Runtime not initialized');
    }
    await this.idManager.save(this.appDataDir);
  }

  /**
   * Get entity ID for a path (for validation/testing)
   */
  getEntityId(path: string): string | undefined {
    return this.idManager.getId(path);
  }

  /**
   * Get entity ID manager (for validation/testing)
   */
  getEntityIdManager(): EntityIdManager {
    return this.idManager;
  }

  /**
   * Manually flush the watcher queue (for validation/testing)
   */
  async flushQueue(): Promise<void> {
    await this.watcherQueue.flushNow();
  }

  /**
   * Get current queue size (for validation/testing)
   */
  getQueueSize(): number {
    return this.watcherQueue.getPendingCount();
  }

  /**
   * Subscribe to runtime events
   */
  on(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }

  /**
   * Emit a runtime event
   */
  private emit(event: RuntimeEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (err) {
        console.error('[TQL] Event callback error:', err);
      }
    }
  }

  /**
   * Initial scan of a directory tree
   */
  async initialScan(
    rootPath: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const startTime = performance.now();
    this.emit({ type: 'ingest_started', rootPath });

    try {
      // Recursively scan directory
      const allFiles = await this.scanDirectoryRecursive(rootPath);
      const total = allFiles.length;

      console.log(`[TQL] Scanning ${total} files from ${rootPath}`);

      // Process in batches
      const BATCH_SIZE = import.meta.env.DEV ? 10 : 100;
      let processed = 0;
      const rateWindow: number[] = [];

      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batchStartTime = performance.now();
        const batch = allFiles.slice(i, Math.min(i + BATCH_SIZE, total));

        this.beginBatch();

        for (const file of batch) {
          await this.ingestFile(file.path, file);
        }

        this.commitBatch();

        processed += batch.length;

        // Calculate rate
        const batchTime = performance.now() - batchStartTime;
        const batchRate = (batch.length / batchTime) * 1000; // files/sec
        rateWindow.push(batchRate);
        if (rateWindow.length > 10) rateWindow.shift();

        const avgRate =
          rateWindow.reduce((a, b) => a + b, 0) / rateWindow.length;
        const remaining = total - processed;
        const eta = remaining / avgRate;

        this.emit({ type: 'ingest_batch', processed, total });

        onProgress?.({
          phase: 'indexing',
          processed,
          total,
          currentFile: batch[batch.length - 1]?.path,
          rate: avgRate,
          eta,
        });
      }

      // Save indexes after scan
      await this.save();

      const duration = performance.now() - startTime;
      this.emit({ type: 'ingest_done', totalFiles: total, durationMs: duration });

      console.log(
        `[TQL] Scan complete: ${total} files in ${(duration / 1000).toFixed(2)}s (${(total / (duration / 1000)).toFixed(0)} files/sec)`,
      );
    } catch (err) {
      this.emit({
        type: 'error',
        code: 'SCAN_FAILED',
        message: String(err),
        context: { rootPath },
      });
      throw err;
    }
  }

  /**
   * Recursively scan a directory
   */
  private async scanDirectoryRecursive(
    dirPath: string,
  ): Promise<FileItem[]> {
    const results: FileItem[] = [];

    try {
      const items = await invoke<FileItem[]>('list_directory', {
        path: dirPath,
      });

      for (const item of items) {
        // Skip hidden files/folders for now
        if (isHidden(item.path)) continue;

        results.push(item);

        // Recurse into folders
        if (item.file_type === 'folder') {
          const children = await this.scanDirectoryRecursive(item.path);
          results.push(...children);
        }
      }
    } catch (err) {
      console.error(`[TQL] Failed to scan ${dirPath}:`, err);
    }

    return results;
  }

  /**
   * Ingest a single file/folder
   */
  async ingestFile(path: string, stats: FileItem): Promise<string> {
    const normalizedPath = normalizePath(path);
    const entityId = this.idManager.getOrCreateId(normalizedPath);

    // Convert FileItem to FileStats
    const fileStats: FileStats = {
      path: normalizedPath,
      name: stats.name,
      file_type: stats.file_type,
      size: stats.size,
      modified: stats.modified,
      created: stats.created,
      extension: getExtension(normalizedPath) || undefined,
      is_hidden: isHidden(normalizedPath),
    };

    // Create facts
    const facts = createFileFacts(entityId, fileStats);
    this.addFacts(facts);

    // Create parent→child link
    const parentPath = getParentPath(normalizedPath);
    if (parentPath) {
      const parentId = this.idManager.getId(parentPath);
      if (parentId) {
        const link = createContainsLink(parentId, entityId);
        this.addLinks([link]);
      }
    }

    return entityId;
  }

  /**
   * Update an existing file (handles modify events)
   */
  async updateByPath(
    path: string,
    changes: Partial<FileStats>,
  ): Promise<void> {
    const normalizedPath = normalizePath(path);
    const entityId = this.idManager.getId(normalizedPath);
    if (!entityId) {
      console.warn(`[TQL] Cannot update unknown path: ${path}`);
      return;
    }

    // Remove old facts for changed attributes
    const attributesToUpdate = Object.keys(changes);
    this.removeFactsByEntityAttributes(entityId, attributesToUpdate);

    // Add new facts
    const facts: Fact[] = [];
    for (const [attr, value] of Object.entries(changes)) {
      if (value !== undefined) {
        facts.push({ e: entityId, a: attr, v: value as any });
      }
    }

    this.addFacts(facts);
  }

  /**
   * Handle file/folder rename/move
   */
  async handleRename(oldPath: string, newPath: string): Promise<void> {
    const normalizedOld = normalizePath(oldPath);
    const normalizedNew = normalizePath(newPath);

    const entityId = this.idManager.updatePath(normalizedOld, normalizedNew);
    if (!entityId) {
      console.warn(`[TQL] Cannot rename unknown path: ${oldPath}`);
      return;
    }

    // Update path and name facts
    this.removeFactsByEntityAttributes(entityId, ['path', 'name']);
    this.addFacts([
      { e: entityId, a: 'path', v: normalizedNew },
      { e: entityId, a: 'name', v: normalizedNew.split('/').pop() || '/' },
    ]);

    // Update parent links if needed
    const oldParent = getParentPath(normalizedOld);
    const newParent = getParentPath(normalizedNew);

    if (oldParent !== newParent) {
      // Remove old parent→child link
      if (oldParent) {
        const oldParentId = this.idManager.getId(oldParent);
        if (oldParentId) {
          this.removeLinksByEntityAndRel(oldParentId, 'fs:contains', entityId);
        }
      }

      // Add new parent→child link
      if (newParent) {
        const newParentId = this.idManager.getId(newParent);
        if (newParentId) {
          const link = createContainsLink(newParentId, entityId);
          this.addLinks([link]);
        }
      }
    }
  }

  /**
   * Remove a file/folder
   */
  async removeByPath(path: string): Promise<void> {
    const normalizedPath = normalizePath(path);
    const entityId = this.idManager.removeByPath(normalizedPath);
    if (!entityId) {
      return; // Already removed or never indexed
    }

    // Remove all facts for this entity
    this.removeEntity(entityId);

    // Remove all links involving this entity
    this.removeLinksByEntity(entityId);
  }

  /**
   * Push filesystem event to queue
   */
  pushFSEvent(event: FSEvent): void {
    this.watcherQueue.push(event);
  }

  /**
   * Handle batch of filesystem events from queue
   */
  private async handleFSBatch(batch: FSEventBatch): Promise<void> {
    const startTime = performance.now();

    this.beginBatch();

    let processedCount = 0;

    for (const event of batch.events) {

      try {
        switch (event.kind) {
          case 'create':
            // Fetch file stats and ingest
            try {
              const parentPath = getParentPath(event.path);

              if (parentPath) {
                const items = await invoke<FileItem[]>('list_directory', {
                  path: parentPath,
                });

                const createStats = items.find((item) => item.path === event.path);
                if (createStats) {
                  await this.ingestFile(event.path, createStats);
                  processedCount++;
                }
              }
            } catch (err) {
              console.error(`[TQL] Failed to fetch stats for ${event.path}:`, err);
            }
            break;

          case 'modify':
            // Fetch updated stats
            try {
              const parentPath = getParentPath(event.path);
              if (parentPath) {
                const items = await invoke<FileItem[]>('list_directory', {
                  path: parentPath,
                });
                const modifyStats = items.find((item) => item.path === event.path);
                if (modifyStats) {
                  await this.updateByPath(event.path, {
                    size: modifyStats.size,
                    modified: modifyStats.modified,
                  });
                  processedCount++;
                }
              }
            } catch (err) {
              console.error(`[TQL] Failed to fetch stats for ${event.path}:`, err);
            }
            break;

          case 'remove':
            await this.removeByPath(event.path);
            processedCount++;
            break;

          case 'rename':
            if (event.fromPath) {
              await this.handleRename(event.fromPath, event.path);
              processedCount++;
            }
            break;
        }
      } catch (err) {
        console.error(`[TQL] Error processing event ${event.kind} for ${event.path}:`, err);
      }
    }

    this.commitBatch();

    // Save indexes after batch
    await this.save();

    const duration = performance.now() - startTime;
    this.emit({
      type: 'fs_batch_applied',
      eventCount: batch.events.length,
      durationMs: duration,
    });

    console.log(
      `[TQL] Applied ${batch.events.length} FS events in ${duration.toFixed(2)}ms`,
    );
  }

  /**
   * Execute a query
   */
  runQuery(eqls: string): QueryResult {
    const startTime = performance.now();

    // TODO: Parse and execute EQL-S query
    // For now, return empty result
    const result: QueryResult = {
      bindings: [],
      executionTime: 0,
    };

    const duration = performance.now() - startTime;
    result.executionTime = duration;

    if (duration > 100) {
      this.emit({ type: 'query_slow', query: eqls, durationMs: duration });
    }

    return result;
  }

  /**
   * Begin batch mode (coalesce adds)
   */
  beginBatch(): void {
    this.batching = true;
    this.batchedFacts = [];
    this.batchedLinks = [];
  }

  /**
   * Commit batch (apply all pending adds)
   */
  commitBatch(): void {
    if (!this.batching) {
      return;
    }

    if (this.batchedFacts.length > 0) {
      this.store.addFacts(this.batchedFacts);
      this.batchedFacts = [];
    }

    if (this.batchedLinks.length > 0) {
      this.store.addLinks(this.batchedLinks);
      this.batchedLinks = [];
    }

    this.batching = false;
  }

  /**
   * Add facts (batched if in batch mode)
   */
  private addFacts(facts: Fact[]): void {
    if (this.batching) {
      this.batchedFacts.push(...facts);
    } else {
      this.store.addFacts(facts);
    }
  }

  /**
   * Add links (batched if in batch mode)
   */
  private addLinks(links: Link[]): void {
    if (this.batching) {
      this.batchedLinks.push(...links);
    } else {
      this.store.addLinks(links);
    }
  }

  /**
   * Remove facts by entity and attributes
   * Note: This is a workaround since EAVStore doesn't have remove methods
   * TODO: Implement in Step 4 with proper EAVStore.removeFacts()
   */
  private removeFactsByEntityAttributes(
    _entityId: string,
    _attributes: string[],
  ): void {
    // TODO: Add proper remove methods to EAVStore in Step 4
    // For now, we rely on fact overwriting (may cause temporary duplicates)
  }

  /**
   * Remove all facts for an entity
   * TODO: Implement in Step 4 with proper EAVStore.removeEntity()
   */
  private removeEntity(_entityId: string): void {
    // TODO: Add proper remove method to EAVStore in Step 4
  }

  /**
   * Remove all links involving an entity
   * TODO: Implement in Step 4 with proper EAVStore.removeLinks()
   */
  private removeLinksByEntity(_entityId: string): void {
    // TODO: Add proper remove method to EAVStore in Step 4
  }

  /**
   * Remove specific link
   * TODO: Implement in Step 4 with proper EAVStore.removeLink()
   */
  private removeLinksByEntityAndRel(
    _fromId: string,
    _rel: string,
    _toId: string,
  ): void {
    // TODO: Add proper remove method to EAVStore in Step 4
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      ...this.store.getStats(),
      ...this.idManager.getStats(),
      queueSize: this.watcherQueue.getSize(),
      queueProcessing: this.watcherQueue.isProcessing(),
    };
  }

  /**
   * Get the underlying EAV store (for direct access if needed)
   */
  getStore(): EAVStore {
    return this.store;
  }

  /**
   * Ingest generated image metadata and link it to the file entity
   */
  async addImageMetadata(
    filePath: string,
    meta: {
      description: string;
      model: string;
      fileHash: string;
      generatedAt: number;
      tags?: string[];
      contentType?: string;
    },
  ): Promise<void> {
    const normalizedPath = normalizePath(filePath);
    const fileId = this.idManager.getOrCreateId(normalizedPath);
    const metaId = `meta:${fileId}:${meta.fileHash}`;

    const type = meta.contentType ? `${meta.contentType}.metadata` : 'image.metadata';
    const facts = jsonEntityFacts(metaId, meta, type);
    this.addFacts(facts);

    const link: Link = { e1: fileId, a: 'meta:has', e2: metaId };
    this.addLinks([link]);
  }

  getImageMetadata(filePath: string): { description?: string; model?: string; fileHash?: string; generatedAt?: number; tags?: string[] } | null {
    const normalizedPath = normalizePath(filePath);
    const fileId = this.idManager.getId(normalizedPath);
    if (!fileId) return null;
    const links = this.store.getLinksByEntityAndAttribute(fileId, 'meta:has');
    if (!links.length) return null;
    let latest: { meta: any; gen: number } | null = null;
    for (const lk of links) {
      const facts = this.store.getFactsByEntity(lk.e2);
      const meta: any = {};
      for (const f of facts) {
        meta[f.a] = f.v as any;
      }
      const gen = Number(meta['generatedAt'] ?? 0);
      if (!latest || gen > latest.gen) {
        latest = { meta, gen };
      }
    }
    return latest?.meta ?? null;
  }
}
