/**
 * useTQL Hook
 * 
 * React hook for TQL runtime initialization and management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { path } from '@tauri-apps/api';
import { TQLRuntime, type RuntimeEvent, type ScanProgress } from '@/lib/tql';
import type { FSEvent } from '@/lib/tql';
import { exposeTQLDebugger } from '@/lib/tql/debug';

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

  const actions: TQLActions = {
    scanDirectory,
    pushFSEvent,
    getRuntime,
  };

  return [state, actions];
}
