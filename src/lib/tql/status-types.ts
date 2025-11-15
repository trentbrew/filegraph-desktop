/**
 * Status Bar Data Contract
 * 
 * Stable, minimal payload for UI updates (~4Hz)
 * Single source of truth for indexing state
 * 
 * Schema version: 1
 */

import { z } from 'zod';

// Zod schemas (validation first, types inferred)
const IndexingStateSchema = z.enum([
  'idle',
  'discovering',
  'fts',
  'embedding',
  'paused',
  'error',
]);

const ThrottleModeSchema = z.enum(['low', 'auto', 'high']);

const LockStateSchema = z.union([z.boolean(), z.literal('unknown')]);

const PauseReasonSchema = z.enum(['user', 'battery', 'thermal', 'throttle']).nullable();

const VaultInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  locked: LockStateSchema,
});

const StatusCountsSchema = z.object({
  done: z.number(),
  total: z.number(),
  edges: z.number(),
  errors: z.number(),
  errorsReviewed: z.number(),
});

const StatusPerfSchema = z.object({
  etaSec: z.number().nullable(),
  queue: z.number(),
  throttle: ThrottleModeSchema,
  phaseProgress: z.number().min(0).max(1).optional(),
});

const StatusDeltaSchema = z.object({
  edgesPlus: z.number(),
  edgesMinus: z.number(),
}).partial();

const StatusBarTickSchema = z.object({
  schemaVersion: z.literal(1),
  vault: VaultInfoSchema,
  state: IndexingStateSchema,
  counts: StatusCountsSchema,
  perf: StatusPerfSchema,
  delta: StatusDeltaSchema.optional(),
  pauseReason: PauseReasonSchema.optional(),
  daemonTimestamp: z.number(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const StatusEventSchema = z.object({
  type: z.enum(['state_changed', 'error_added', 'queue_len', 'progress']),
  timestamp: z.number(),
  data: z.record(z.string(), z.unknown()),
});

// Exported schemas for validation
export { StatusBarTickSchema, StatusEventSchema };

// Inferred types from Zod schemas
export type IndexingState = z.infer<typeof IndexingStateSchema>;
export type ThrottleMode = z.infer<typeof ThrottleModeSchema>;
export type LockState = z.infer<typeof LockStateSchema>;
export type PauseReason = z.infer<typeof PauseReasonSchema>;
export type VaultInfo = z.infer<typeof VaultInfoSchema>;
export type StatusCounts = z.infer<typeof StatusCountsSchema>;
export type StatusPerf = z.infer<typeof StatusPerfSchema>;
export type StatusDelta = z.infer<typeof StatusDeltaSchema>;
export type StatusBarTick = z.infer<typeof StatusBarTickSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;

// Error detail type (for error panel)
export type ErrorSource = 'parser' | 'fs' | 'embed' | 'daemon';

export interface ErrorDetail {
  id: string;
  ts: number;          // Daemon timestamp
  file?: string;       // File path
  source: ErrorSource;
  code: string;        // Error code (e.g., "PARSE_FAILED")
  message: string;     // Human-readable message
  provenance?: {
    method?: string;
    version?: string;
  };
}

// Current schema version
export const SCHEMA_VERSION = 1;

// Helper to get human-readable state text (always verb form)
export function getStateLabel(state: IndexingState): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'discovering':
      return 'Discovering files…';
    case 'fts':
      return 'Building index…';
    case 'embedding':
      return 'Computing embeddings…';
    case 'paused':
      return 'Paused';
    case 'error':
      return 'Error';
  }
}

// Format pause reason for display
export function getPauseReasonText(reason: PauseReason): string {
  if (!reason) return '';
  switch (reason) {
    case 'user': return 'by user';
    case 'battery': return 'low battery';
    case 'thermal': return 'thermal throttle';
    case 'throttle': return 'rate limit';
  }
}

// Helper to format ETA using Intl.RelativeTimeFormat
export function formatETA(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Validate tick with Zod (fail closed)
export function validateTick(data: unknown): StatusBarTick | null {
  const result = StatusBarTickSchema.safeParse(data);
  if (!result.success) {
    console.error('[StatusBar] Invalid tick schema:', result.error.flatten());
    return null;
  }
  return result.data;
}

// Validate schema version (fail closed)
export function isCompatibleSchema(tick: StatusBarTick): boolean {
  return tick.schemaVersion === SCHEMA_VERSION;
}

// Redact sensitive data when vault is locked
export function redactIfLocked(tick: StatusBarTick): StatusBarTick {
  if (tick.vault.locked === true) {
    return {
      ...tick,
      vault: {
        ...tick.vault,
        path: '[Locked]',
      },
    };
  }
  return tick;
}

// Persist last status to localStorage (with redaction)
export function persistStatus(tick: StatusBarTick): void {
  try {
    const redacted = redactIfLocked(tick);
    localStorage.setItem('tql:last-status', JSON.stringify(redacted));
  } catch (err) {
    console.warn('[StatusBar] Failed to persist status:', err);
  }
}

// Restore last status from localStorage
export function restoreStatus(): StatusBarTick | null {
  try {
    const raw = localStorage.getItem('tql:last-status');
    if (!raw) return null;
    const tick = JSON.parse(raw) as StatusBarTick;
    
    // Validate schema version
    if (!isCompatibleSchema(tick)) {
      console.warn(`[StatusBar] Incompatible schema version: ${tick.schemaVersion} (expected ${SCHEMA_VERSION})`);
      return null;
    }
    
    return tick;
  } catch (err) {
    console.warn('[StatusBar] Failed to restore status:', err);
    return null;
  }
}

// Event log management (append-only for ETA smoothing)
const EVENT_LOG_KEY = 'tql:event-log';
const MAX_EVENTS = 100; // Keep last 100 events

export function appendEvent(event: StatusEvent): void {
  try {
    const raw = localStorage.getItem(EVENT_LOG_KEY);
    const log: StatusEvent[] = raw ? JSON.parse(raw) : [];
    log.push(event);
    
    // Trim to last MAX_EVENTS
    if (log.length > MAX_EVENTS) {
      log.splice(0, log.length - MAX_EVENTS);
    }
    
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
  } catch (err) {
    console.warn('[StatusBar] Failed to append event:', err);
  }
}

export function getEventLog(): StatusEvent[] {
  try {
    const raw = localStorage.getItem(EVENT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[StatusBar] Failed to read event log:', err);
    return [];
  }
}
