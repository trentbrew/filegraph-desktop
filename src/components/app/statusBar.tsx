/**
 * StatusBar Component
 * 
 * Production-grade status bar showing system state at a glance.
 * 
 * Layout (left → right):
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │ 📂 Vault ▾ │ Phase: FTS │ 847/1,247 • 68% • ETA 4m │ ⏳ 112 │ ⚠︎ 3 │ Pause │ 🤖 │
 * └────────────────────────────────────────────────────────────────────────────────────┘
 * 
 * Features:
 * - Always visible, never blocks main UI
 * - Single line, ~32-40px height
 * - Click sections for details
 * - Keyboard: ⌘I (toggle panel), ⌘⇧I (cycle throttle)
 * - Responsive: icons-only at ≤960px
 * - Debounced updates (~4Hz)
 * - States: idle, paused, running, background, error
 */

import { useState, useEffect, useMemo } from 'react';
import { useTQL } from '@/hooks/useTQL';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Folder,
  Loader2,
  AlertCircle,
  Lock,
  Pause,
  Play,
  MoreHorizontal,
  Bot,
  Database,
} from 'lucide-react';
import {
  type IndexingState,
  type StatusBarTick,
  getStateLabel,
  formatETA,
  persistStatus,
  restoreStatus,
} from '@/lib/tql/status-types';

interface StatusBarProps {
  onIndexFolder?: () => void;
  onVaultSwitch?: () => void;
}

export function StatusBar({ onIndexFolder, onVaultSwitch }: StatusBarProps = {}) {
  const [state] = useTQL();
  const { scanning, scanProgress, stats, error } = state;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Restore last status on mount
  useEffect(() => {
    const restored = restoreStatus();
    if (restored) {
      console.log('[StatusBar] Restored last status:', restored.state);
    }
  }, []);

  // Keyboard shortcuts: ⌘I (toggle panel), ⌘⇧I (cycle throttle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        if (e.shiftKey) {
          e.preventDefault();
          // TODO: Cycle throttle (Low → Auto → High)
          console.log('[StatusBar] Cycle throttle');
        } else {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced status tick (4Hz = 250ms)
  const statusTick = useMemo<StatusBarTick | null>(() => {
    // Map TQL state to FSM state
    let fsmState: IndexingState = 'idle';
    if (error) {
      fsmState = 'error';
    } else if (isPaused) {
      fsmState = 'paused';
    } else if (scanning) {
      const phase = scanProgress?.phase || 'scanning';
      if (phase === 'scanning') fsmState = 'discovering';
      else if (phase === 'indexing') fsmState = 'fts';
      else fsmState = 'fts'; // Default to fts if unknown
    } else if (stats) {
      fsmState = 'idle';
    }

    const processed = scanProgress?.processed || 0;
    const total = scanProgress?.total || 0;

    // Calculate ETA (rough estimate - TODO: sliding window)
    const etaSec = total > 0 && processed > 0
      ? Math.ceil(((total - processed) / processed) * 120) // 2min per batch estimate
      : 0;

    const tick: StatusBarTick = {
      schemaVersion: 1,
      vault: {
        name: '~/.filegraph',
        path: '/Users/trentbrew/.filegraph',
        locked: false, // TODO: get from vault state
      },
      state: fsmState,
      counts: {
        done: processed,
        total: total,
        edges: stats?.totalLinks || 0,
        errors: error ? 1 : 0,
        errorsReviewed: 0,
      },
      perf: {
        etaSec,
        queue: 0, // TODO: get from runtime
        throttle: 'auto',
      },
      daemonTimestamp: Math.floor(Date.now() / 1000),
    };

    // Persist every update
    persistStatus(tick);
    return tick;
  }, [scanning, scanProgress, stats, error, isPaused, lastUpdate]);

  // Debounce updates to ~4Hz
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 250); // 4Hz
    return () => clearInterval(interval);
  }, []);

  // Compute display values
  const fsmState = statusTick?.state || 'idle';
  const percent = statusTick?.counts.total
    ? Math.round((statusTick.counts.done / statusTick.counts.total) * 100)
    : 0;
  const etaText = statusTick?.perf.etaSec ? formatETA(statusTick.perf.etaSec) : null;

  // Get state color (WCAG AA compliant)
  const getStateColor = () => {
    if (fsmState === 'error') return 'text-red-600 dark:text-red-400';
    if (fsmState === 'paused') return 'text-amber-600 dark:text-amber-400';
    if (fsmState === 'discovering' || fsmState === 'fts' || fsmState === 'embedding')
      return 'text-blue-600 dark:text-blue-400';
    if (stats) return 'text-green-600 dark:text-green-400';
    return 'text-muted-foreground';
  };

  // Get microcopy
  const getStatusText = () => {
    if (fsmState === 'idle' && stats) {
      return `Graph ready — ${stats.uniqueEntities.toLocaleString()} files • ${stats.totalFacts.toLocaleString()} facts`;
    }
    if (fsmState === 'paused') {
      return 'Paused — queries use current snapshot';
    }
    if (fsmState === 'error') return 'Indexing failed';
    return getStateLabel(fsmState);
  };

  return (
    <>
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          <div className="px-4 py-3 space-y-3">
            {/* Progress Details */}
            {scanning && scanProgress && scanProgress.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {scanProgress.phase === 'scanning' && 'Discovering files...'}
                    {scanProgress.phase === 'indexing' && 'Building graph...'}
                  </span>
                  <span className="font-medium">
                    {scanProgress.processed} / {scanProgress.total}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${(scanProgress.processed / scanProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Stats Grid */}
            {stats && !scanning && (
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Files</div>
                  <div className="font-semibold">{stats.uniqueEntities.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Facts</div>
                  <div className="font-semibold">{stats.totalFacts.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Links</div>
                  <div className="font-semibold">{stats.totalLinks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Attributes</div>
                  <div className="font-semibold">{stats.uniqueAttributes.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Status Bar - Taller height (44px) for better tap targets */}
      <div
        className="h-11 border-t border-border bg-background flex items-center px-3 text-xs select-none"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* 1. Vault */}
        <button
          onClick={() => onVaultSwitch?.()}
          className={`flex items-center gap-1.5 hover:bg-accent px-2 py-1.5 rounded transition-colors ${getStateColor()}`}
          title={`Current vault: ${statusTick?.vault.path || '~/.filegraph'}${onVaultSwitch ? ' • Click to switch' : ''}`}
          aria-label={`Vault: ${statusTick?.vault.name || '~/.filegraph'}`}
        >
          {statusTick?.vault.locked && <Lock className="h-3.5 w-3.5 mr-1" aria-label="Locked" />}
          <Folder className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium truncate max-w-[120px]">
            {statusTick?.vault.name || '~/.filegraph'}
          </span>
        </button>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* 2. File Count (when available) */}
        {stats && !scanning && (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium">{stats.uniqueEntities.toLocaleString()}</span>
              <span>files</span>
            </div>
            <Separator orientation="vertical" className="mx-2 h-5" />
          </>
        )}

        {/* 3. Phase */}
        <div
          className="flex items-center gap-1.5 text-muted-foreground"
          title={`Current phase: ${getStateLabel(fsmState)}`}
        >
          <span className={scanning ? 'font-medium text-foreground' : ''}>
            {getStatusText()}
          </span>
        </div>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* 4. Progress (when indexing) */}
        {scanning && statusTick && statusTick.counts.total > 0 && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 hover:bg-accent px-2 py-1.5 rounded transition-colors"
              title="Click for details (⌘I)"
              aria-label={`Progress: ${percent}% complete, ${statusTick.counts.done} of ${statusTick.counts.total} files${etaText ? `, ETA ${etaText}` : ''}`}
            >
              <Loader2
                className="h-4 w-4 animate-spin text-blue-500"
                aria-hidden="true"
              />
              <span className="font-mono">
                {statusTick.counts.done.toLocaleString()}/{statusTick.counts.total.toLocaleString()}
              </span>
              <span className="text-muted-foreground" aria-hidden="true">•</span>
              <span className="font-medium">{percent}%</span>
              {etaText && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">•</span>
                  <span className="text-muted-foreground">ETA {etaText}</span>
                </>
              )}
            </button>
            <Separator orientation="vertical" className="mx-2 h-5" />
          </>
        )}

        {/* 5. Errors */}
        {statusTick && statusTick.counts.errors > 0 && (
          <>
            <button
              onClick={() => {
                console.log('[StatusBar] Open error panel');
                // TODO: Open error panel with filtered table
              }}
              className="flex items-center gap-1.5 hover:bg-destructive/10 px-2 py-1.5 rounded transition-colors text-red-600 dark:text-red-400"
              title="Click to review errors and retry failed files"
              aria-label={`${statusTick.counts.errors} indexing ${statusTick.counts.errors === 1 ? 'error' : 'errors'}`}
            >
              <AlertCircle className="h-4 w-4 animate-pulse" aria-hidden="true" />
              <span className="font-medium">{statusTick.counts.errors}</span>
            </button>
            <Separator orientation="vertical" className="mx-2 h-5" />
          </>
        )}

        {/* 6. Controls (right side) */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Index Folder Button (icon-only) */}
          {onIndexFolder && !scanning && (
            <Button
              variant="outline"
              size="sm"
              onClick={onIndexFolder}
              className="h-8 px-2.5"
              title="Index a folder"
              aria-label="Index a folder"
            >
              <Database className="h-4 w-4" />
            </Button>
          )}

          {/* Pause/Resume */}
          {scanning && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-1.5"
              onClick={() => {
                setIsPaused(!isPaused);
                console.log('[StatusBar] Toggle pause');
              }}
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              )}
            </Button>
          )}

          {/* More Actions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => console.log('[StatusBar] More actions')}
            title="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {/* Agent Status */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5"
            onClick={() => console.log('[StatusBar] Agent permissions & settings')}
            title="Agent ready • Click to configure permissions"
            aria-label="AI agent status: Ready"
            disabled={statusTick?.vault.locked === true}
          >
            <Bot
              className={`h-4 w-4 ${statusTick?.vault.locked ? 'text-muted-foreground' : 'text-green-500'}`}
              aria-hidden="true"
            />
            {statusTick?.vault.locked && (
              <span className="text-[10px] text-muted-foreground">Locked</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
