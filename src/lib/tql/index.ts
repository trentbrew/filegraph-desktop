/**
 * TQL Integration
 * 
 * Main exports for TQL runtime integration
 */

export { TQLRuntime } from './runtime';
export type {
  ScanProgress,
  ProgressCallback,
  RuntimeEvent,
  EventCallback,
} from './runtime';

export { EntityIdManager } from './entity-ids';
export type { EntityIndexes } from './entity-ids';

export { FSWatcherQueue } from './watcher-queue';
export type { FSEvent, FSEventKind, FSEventBatch } from './watcher-queue';

export { LinkTypes } from './facts';
export type { LinkType, FileStats } from './facts';

export { TQLDebugger, exposeTQLDebugger } from './debug';
