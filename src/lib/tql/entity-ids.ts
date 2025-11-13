/**
 * Entity ID Management & Persistence
 * 
 * Maintains stable UUIDs for files/folders across moves, renames, and restarts.
 * Persists path↔id mappings to survive app restarts.
 */

import { invoke } from '@tauri-apps/api/core';

export interface EntityIndexes {
  pathToId: Record<string, string>;
  idToPath: Record<string, string>;
  version: number;
}

const INDEX_VERSION = 1;
const INDEX_FILE = 'tql-indexes.json';

export class EntityIdManager {
  private pathToId = new Map<string, string>();
  private idToPath = new Map<string, string>();
  private dirty = false;

  /**
   * Generate a stable entity ID for a file/folder
   * Returns existing ID if path is already tracked, or generates new UUID
   */
  getOrCreateId(path: string): string {
    const existing = this.pathToId.get(path);
    if (existing) return existing;

    const id = `file:${globalThis.crypto.randomUUID()}`;
    this.pathToId.set(path, id);
    this.idToPath.set(id, path);
    this.dirty = true;

    return id;
  }

  /**
   * Get entity ID for a path (returns undefined if not indexed)
   */
  getId(path: string): string | undefined {
    return this.pathToId.get(path);
  }

  /**
   * Get path for an entity ID
   */
  getPath(id: string): string | undefined {
    return this.idToPath.get(id);
  }

  /**
   * Update path for an entity (handles renames/moves)
   * Preserves the entity ID
   */
  updatePath(oldPath: string, newPath: string): string | undefined {
    const id = this.pathToId.get(oldPath);
    if (!id) return undefined;

    // Remove old mapping
    this.pathToId.delete(oldPath);

    // Add new mapping
    this.pathToId.set(newPath, id);
    this.idToPath.set(id, newPath);
    this.dirty = true;

    return id;
  }

  /**
   * Remove entity by path
   */
  removeByPath(path: string): string | undefined {
    const id = this.pathToId.get(path);
    if (!id) return undefined;

    this.pathToId.delete(path);
    this.idToPath.delete(id);
    this.dirty = true;

    return id;
  }

  /**
   * Remove entity by ID
   */
  removeById(id: string): void {
    const path = this.idToPath.get(id);
    if (path) {
      this.pathToId.delete(path);
    }
    this.idToPath.delete(id);
    this.dirty = true;
  }

  /**
   * Get all paths currently indexed
   */
  getAllPaths(): string[] {
    return Array.from(this.pathToId.keys());
  }

  /**
   * Get all entity IDs
   */
  getAllIds(): string[] {
    return Array.from(this.idToPath.keys());
  }

  /**
   * Check if path is indexed
   */
  hasPath(path: string): boolean {
    return this.pathToId.has(path);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalEntities: this.idToPath.size,
      dirty: this.dirty,
    };
  }

  /**
   * Load indexes from disk
   */
  async load(appDataDir: string): Promise<void> {
    try {
      const indexPath = `${appDataDir}/${INDEX_FILE}`;
      const content = await invoke<string>('read_text_file', {
        filePath: indexPath,
      });

      const data: EntityIndexes = JSON.parse(content);

      // Version check
      if (data.version !== INDEX_VERSION) {
        console.warn(
          `Index version mismatch (${data.version} vs ${INDEX_VERSION}), starting fresh`,
        );
        return;
      }

      // Load mappings
      this.pathToId = new Map(Object.entries(data.pathToId));
      this.idToPath = new Map(Object.entries(data.idToPath));
      this.dirty = false;

      console.log(`[TQL] Loaded ${this.idToPath.size} entity indexes`);
    } catch (err) {
      // File doesn't exist or is invalid - start fresh
      console.log('[TQL] No existing indexes found, starting fresh');
      this.pathToId.clear();
      this.idToPath.clear();
      this.dirty = false;
    }
  }

  /**
   * Save indexes to disk
   */
  async save(appDataDir: string): Promise<void> {
    if (!this.dirty) return;

    try {
      const data: EntityIndexes = {
        pathToId: Object.fromEntries(this.pathToId),
        idToPath: Object.fromEntries(this.idToPath),
        version: INDEX_VERSION,
      };

      const indexPath = `${appDataDir}/${INDEX_FILE}`;
      await invoke('write_text_file', {
        filePath: indexPath,
        content: JSON.stringify(data, null, 2),
      });

      this.dirty = false;
      console.log(`[TQL] Saved ${this.idToPath.size} entity indexes`);
    } catch (err) {
      console.error('[TQL] Failed to save indexes:', err);
      throw err;
    }
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.pathToId.clear();
    this.idToPath.clear();
    this.dirty = true;
  }
}
