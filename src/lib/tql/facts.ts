/**
 * Facts & Links Helpers
 * 
 * Type definitions and helper functions for creating TQL facts and links
 */

import type { Fact, Link } from '../../../.sandbox/tql/src/index';

/**
 * Link taxonomy for MVP
 */
export const LinkTypes = {
  FS_CONTAINS: 'fs:contains',
  // Future link types (placeholders):
  // IMPORTS: 'imports',
  // REFERENCES: 'references',
  // MENTIONS: 'mentions',
  // AUTHORED_BY: 'authored_by',
  // SIMILAR_TO: 'similar_to',
} as const;

export type LinkType = (typeof LinkTypes)[keyof typeof LinkTypes];

/**
 * File statistics from Tauri
 */
export interface FileStats {
  path: string;
  name: string;
  file_type: 'file' | 'folder';
  size?: number;
  modified?: number; // epoch ms
  created?: number; // epoch ms
  extension?: string;
  is_hidden?: boolean;
}

/**
 * Create facts for a file/folder entity
 */
export function createFileFacts(
  entityId: string,
  stats: FileStats,
): Fact[] {
  const facts: Fact[] = [
    { e: entityId, a: 'type', v: stats.file_type },
    { e: entityId, a: 'path', v: stats.path },
    { e: entityId, a: 'name', v: stats.name },
  ];

  // Add optional attributes
  if (stats.size !== undefined) {
    facts.push({ e: entityId, a: 'size', v: stats.size });
  }

  if (stats.modified !== undefined) {
    facts.push({ e: entityId, a: 'modified', v: stats.modified });
  }

  if (stats.created !== undefined) {
    facts.push({ e: entityId, a: 'created', v: stats.created });
  }

  if (stats.extension) {
    // Remove leading dot if present
    const ext = stats.extension.startsWith('.')
      ? stats.extension.slice(1)
      : stats.extension;
    facts.push({ e: entityId, a: 'ext', v: ext });
  }

  if (stats.is_hidden !== undefined) {
    facts.push({ e: entityId, a: 'hidden', v: stats.is_hidden });
  }

  return facts;
}

/**
 * Create parent→child containment link
 */
export function createContainsLink(parentId: string, childId: string): Link {
  return {
    e1: parentId,
    a: LinkTypes.FS_CONTAINS,
    e2: childId,
  };
}

/**
 * Extract parent path from a file/folder path
 */
export function getParentPath(path: string): string | null {
  // Handle root
  if (path === '/' || path === '') return null;

  // Get parent directory
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';

  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Get base name from path
 */
export function getBaseName(path: string): string {
  if (path === '/' || path === '') return '/';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '/';
}

/**
 * Get extension from path
 */
export function getExtension(path: string): string | null {
  const name = getBaseName(path);
  const lastDot = name.lastIndexOf('.');

  // No extension, hidden file, or starts with dot
  if (lastDot <= 0) return null;

  return name.slice(lastDot + 1);
}

/**
 * Check if path represents a hidden file/folder
 */
export function isHidden(path: string): boolean {
  const name = getBaseName(path);
  return name.startsWith('.');
}

/**
 * Normalize path (remove trailing slash, handle relative paths)
 */
export function normalizePath(path: string): string {
  // Remove trailing slash unless it's root
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}
