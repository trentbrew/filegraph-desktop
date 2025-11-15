/**
 * useTQL Hook
 * 
 * React hook for TQL runtime initialization and management
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api';
import { TQLRuntime, type RuntimeEvent, type ScanProgress } from '@/lib/tql';
import type { FSEvent } from '@/lib/tql';
import { exposeTQLDebugger } from '@/lib/tql/debug';
import { captionImageWithLlava, isImagePath } from '@/lib/ollama';

export interface TQLState {
  initialized: boolean;
  scanning: boolean;
  scanProgress: ScanProgress | null;
  stats: ReturnType<TQLRuntime['getStats']> | null;
  error: string | null;
}

export interface TQLActions {
  scanDirectory: (dirPath: string) => Promise<void>;
  pushFSEvent: (event: FSEvent) => void;
  getRuntime: () => TQLRuntime | null;
  describeImagesInDir: (dirPath: string, opts?: { concurrency?: number }) => Promise<{ described: number; skipped: number; errors: number }>;
}

/**
 * Hook to manage TQL runtime lifecycle
 */
export function useTQL(): [TQLState, TQLActions] {
  const [state, setState] = useState<TQLState>({
    initialized: false,
    scanning: false,
    scanProgress: null,
    stats: null,
    error: null,
  });

  const runtimeRef = useRef<TQLRuntime | null>(null);

  // Initialize runtime on mount
  useEffect(() => {
    const init = async () => {
      try {
        const runtime = new TQLRuntime();
        
        // Get app data directory
        const appDataDir = await path.appDataDir();
        
        // Initialize runtime (loads indexes)
        await runtime.initialize(appDataDir);

        // Subscribe to events
        runtime.on((event: RuntimeEvent) => {
          handleRuntimeEvent(event);
        });

        runtimeRef.current = runtime;

        // Expose to window for console debugging (dev only)
        if (import.meta.env.DEV) {
          (window as any).__tqlRuntime = runtime;
          exposeTQLDebugger(runtime);
          console.log('[TQL Hook] Runtime exposed to window.__tqlRuntime');
          // Expose simple dev helper for image captioning via Tauri backend
          (window as any).describeImage = async (filePath: string) => {
            const host = (import.meta as any).env?.VITE_OLLAMA_HOST as string | undefined;
            const model = (import.meta as any).env?.VITE_IMAGE_CAPTION_MODEL as string | undefined;
            return await invoke('caption_image', { filePath, host, model });
          };
          
          // Auto-run tests if URL parameter is present
          const params = new URLSearchParams(window.location.search);
          if (params.get('runTests') === 'true') {
            console.log('[TQL Hook] Auto-running tests...');
            setTimeout(() => {
              if ((window as any).runTQLTests) {
                (window as any).runTQLTests().catch(console.error);
              } else {
                console.error('[TQL Hook] runTQLTests not available yet');
              }
            }, 1000); // Wait for test runner to load
          }
        }

        // Update stats
        const stats = runtime.getStats();

        setState((prev) => ({
          ...prev,
          initialized: true,
          stats,
        }));

        console.log('[TQL Hook] Runtime initialized', stats);
      } catch (err) {
        console.error('[TQL Hook] Initialization failed:', err);
        setState((prev) => ({
          ...prev,
          error: String(err),
        }));
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (runtimeRef.current) {
        // Save indexes before unmount
        runtimeRef.current.save().catch(console.error);
      }
    };
  }, []);

  // List directory via Tauri
  type DirItem = { path: string; name: string; file_type: 'file' | 'folder'; size?: number | null; date_modified?: string; extension?: string | null };
  const listDirectory = useCallback(async (dirPath: string): Promise<DirItem[]> => {
    try {
      return await invoke<DirItem[]>('list_directory', { path: dirPath });
    } catch (err) {
      console.error('[TQL Hook] list_directory failed:', err);
      return [];
    }
  }, []);

  // Walk a directory tree, yielding file items
  const walkDir = useCallback(async function*(dir: string): AsyncGenerator<DirItem> {
    const items = await listDirectory(dir);
    for (const it of items) {
      yield it;
      if (it.file_type === 'folder') {
        yield* walkDir(it.path);
      }
    }
  }, [listDirectory]);

  // Quick content hash from size + modified timestamp
  const quickHash = (item: DirItem) => `${item.size ?? 0}-${item.date_modified ?? ''}`;

  // Describe all images under dir and ingest metadata into TQL
  const describeImagesInDir = useCallback(async (dirPath: string, opts?: { concurrency?: number }) => {
    const runtime = runtimeRef.current;
    if (!runtime) throw new Error('TQL Runtime not initialized');

    const concurrency = Math.max(1, Math.min(4, opts?.concurrency ?? 2));
    let described = 0, skipped = 0, errors = 0;

    const runTask = async (item: DirItem) => {
      try {
        const hash = quickHash(item);
        // Check existing metadata via links
        const store = runtime.getStore();
        const fileId = runtime.getEntityId(item.path);
        // Fallback: attempt to avoid duplicate ingest by searching links from file entity if known
        let already = false;
        if (fileId) {
          const links = store.getLinksByEntityAndAttribute(fileId as any, 'meta:has');
          for (const lk of links) {
            const facts = store.getFactsByEntity(lk.e2);
            const hashFact = facts.find(f => f.a === 'fileHash');
            if (hashFact && String(hashFact.v) === hash) {
              already = true; break;
            }
          }
        }

        if (already) { skipped++; return; }

        const { description, model } = await captionImageWithLlava(item.path);
        await runtime.addImageMetadata(item.path, {
          description,
          model,
          fileHash: hash,
          generatedAt: Date.now(),
          contentType: 'image',
        });
        described++;
      } catch (err) {
        console.error('[TQL Hook] describe failed:', err);
        errors++;
      }
    };

    const runners: Promise<void>[] = [];
    for await (const it of walkDir(dirPath)) {
      if (it.file_type === 'file' && isImagePath(it.path)) {
        const p = (async () => runTask(it))();
        runners.push(p);
        if (runners.length >= concurrency) {
          await Promise.race(runners.map(async (rp, idx) => rp.then(() => { runners.splice(idx, 1); }).catch(() => { runners.splice(idx, 1); })));
        }
      }
    }
    await Promise.allSettled(runners);

    // Persist indexes
    await runtime.save();

    return { described, skipped, errors };
  }, [walkDir]);

  // Handle runtime events
  const handleRuntimeEvent = useCallback((event: RuntimeEvent) => {
    switch (event.type) {
      case 'ingest_started':
        setState((prev) => ({
          ...prev,
          scanning: true,
          scanProgress: {
            phase: 'scanning',
            processed: 0,
            total: 0,
          },
        }));
        break;

      case 'ingest_batch':
        setState((prev) => ({
          ...prev,
          scanProgress: prev.scanProgress
            ? {
                ...prev.scanProgress,
                phase: 'indexing',
                processed: event.processed,
                total: event.total,
              }
            : null,
        }));
        break;

      case 'ingest_done':
        setState((prev) => ({
          ...prev,
          scanning: false,
          scanProgress: null,
          stats: runtimeRef.current?.getStats() || null,
        }));
        console.log(
          `[TQL Hook] Scan complete: ${event.totalFiles} files in ${(event.durationMs / 1000).toFixed(2)}s`,
        );
        break;

      case 'fs_batch_applied':
        // Update stats after FS batch
        setState((prev) => ({
          ...prev,
          stats: runtimeRef.current?.getStats() || null,
        }));
        break;

      case 'query_slow':
        console.warn(
          `[TQL Hook] Slow query (${event.durationMs}ms): ${event.query}`,
        );
        break;

      case 'error':
        console.error(
          `[TQL Hook] Error ${event.code}: ${event.message}`,
          event.context,
        );
        setState((prev) => ({
          ...prev,
          error: event.message,
        }));
        break;
    }
  }, []);

  // Scan directory
  const scanDirectory = useCallback(async (dirPath: string) => {
    if (!runtimeRef.current) {
      throw new Error('TQL Runtime not initialized');
    }

    setState((prev) => ({ ...prev, scanning: true, error: null }));

    try {
      await runtimeRef.current.initialScan(dirPath, (progress) => {
        setState((prev) => ({
          ...prev,
          scanProgress: progress,
        }));
      });
    } catch (err) {
      console.error('[TQL Hook] Scan failed:', err);
      setState((prev) => ({
        ...prev,
        scanning: false,
        error: String(err),
      }));
      throw err;
    }
  }, []);

  // Push filesystem event
  const pushFSEvent = useCallback((event: FSEvent) => {
    if (!runtimeRef.current) {
      console.warn('[TQL Hook] Cannot push FS event: runtime not initialized');
      return;
    }

    runtimeRef.current.pushFSEvent(event);
  }, []);

  // Get runtime instance
  const getRuntime = useCallback(() => {
    return runtimeRef.current;
  }, []);

  const actions: TQLActions = useMemo(() => ({
    scanDirectory,
    pushFSEvent,
    getRuntime,
    describeImagesInDir,
  }), [
    scanDirectory,
    pushFSEvent,
    getRuntime,
    describeImagesInDir,
  ]);

  return [state, actions];
}
