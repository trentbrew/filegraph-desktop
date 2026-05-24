/**
 * Agent Tools — Shared Helpers
 *
 * Utility functions shared across all tool domain files.
 * Import from here instead of duplicating in each domain.
 */

import { invoke } from '@tauri-apps/api/core'
import { join, homeDir } from '@tauri-apps/api/path'
import type { TQLRuntime } from '@/lib/tql'
import type { EAVStore } from '@/lib/tql/eav-store'

// ─────────────────────────────────────────────────────────────────────────────
// Vault path resolution
// ─────────────────────────────────────────────────────────────────────────────

export async function getVaultPath(): Promise<string> {
  const candidates = ['filegraph_vault_path', 'filegraph-vault-path']
  for (const key of candidates) {
    const stored = localStorage.getItem(key)
    if (!stored) continue
    if (key === 'filegraph_vault_path') {
      if (stored.trim()) return stored
      continue
    }
    try {
      const parsed = JSON.parse(stored)
      if (typeof parsed === 'string' && parsed.trim()) return parsed
    } catch {
      if (stored.trim()) return stored
    }
  }
  try {
    const home = await homeDir()
    return await join(home, '.filegraph')
  } catch {
    return '~/.filegraph'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Data file reading
// ─────────────────────────────────────────────────────────────────────────────

export async function readDataFile(relativePath: string): Promise<{ items?: any[]; '@graph'?: any[] } | null> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = await join(vaultPath, relativePath)
    const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
    return JSON.parse(result.content)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (!errorMsg.includes('File does not exist') && !errorMsg.includes('not exist')) {
      console.error('[Agent Tools] readDataFile error:', relativePath, err)
    }
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TQL runtime access
// ─────────────────────────────────────────────────────────────────────────────

export function getTQLRuntime(): TQLRuntime | null {
  return (window as any).__tqlRuntime || null
}

export function getEAVStore(): EAVStore | null {
  const runtime = getTQLRuntime()
  return runtime?.getStore() || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Object utilities
// ─────────────────────────────────────────────────────────────────────────────

export function pickFields(obj: any, fields: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const field of fields) {
    if (obj[field] !== undefined) {
      result[field] = obj[field]
    }
  }
  return result
}

export function findReferences(
  obj: any,
  sourceId: string,
  sourceFile: string,
  targetId: string,
  results: Array<{ sourceId: string; sourceFile: string; field: string }>,
  path: string = '',
) {
  if (!obj || typeof obj !== 'object') return

  for (const [key, value] of Object.entries(obj)) {
    if (['id', '@id', '@type', '@context'].includes(key)) continue

    const currentPath = path ? `${path}.${key}` : key

    if (typeof value === 'string' && value === targetId) {
      results.push({ sourceId, sourceFile, field: currentPath })
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item === targetId) {
          results.push({ sourceId, sourceFile, field: currentPath })
        } else if (typeof item === 'object') {
          findReferences(item, sourceId, sourceFile, targetId, results, currentPath)
        }
      }
    } else if (typeof value === 'object') {
      findReferences(value, sourceId, sourceFile, targetId, results, currentPath)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas focus helper
// ─────────────────────────────────────────────────────────────────────────────

export async function focusCanvasNodeForFile(filePath: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const nodes = useHomeCanvasStore.getState().nodes
    const fileName = filePath.split('/').pop() ?? ''
    const node = nodes.find(
      (n) =>
        n.data?.filePath === filePath ||
        (n.data?.file && (n.data.file === filePath || n.data.file === fileName)),
    )
    if (node) {
      window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: node.id } }))
    }
  } catch {
    // Non-critical
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TipTap JSON conversion
// ─────────────────────────────────────────────────────────────────────────────

export function textToTipTapJson(text: string): any {
  const paragraphs = text.split(/\n\n+/)

  const content = paragraphs
    .map((para) => {
      const trimmed = para.trim()
      if (!trimmed) return null

      const h1Match = trimmed.match(/^#\s+(.+)$/)
      if (h1Match) return { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: h1Match[1] }] }

      const h2Match = trimmed.match(/^##\s+(.+)$/)
      if (h2Match) return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: h2Match[1] }] }

      const h3Match = trimmed.match(/^###\s+(.+)$/)
      if (h3Match) return { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: h3Match[1] }] }

      if (trimmed.match(/^[-*]\s/m)) {
        const items = trimmed.split(/\n/).filter((line) => line.match(/^[-*]\s/))
        return {
          type: 'bulletList',
          content: items.map((item) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: item.replace(/^[-*]\s+/, '') }] }],
          })),
        }
      }

      const lines = trimmed.split(/\n/)
      if (lines.length === 1) return { type: 'paragraph', content: [{ type: 'text', text: trimmed }] }

      const paraContent: any[] = []
      lines.forEach((line, i) => {
        if (i > 0) paraContent.push({ type: 'hardBreak' })
        if (line.trim()) paraContent.push({ type: 'text', text: line })
      })
      return { type: 'paragraph', content: paraContent }
    })
    .filter(Boolean)

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System info formatters
// ─────────────────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function formatUptime(secs: number): string {
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(' ') || '< 1m'
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity reference detection
// ─────────────────────────────────────────────────────────────────────────────

export function isEntityReference(value: string): boolean {
  return /^[a-z]+:[a-z0-9-]+(?::[0-9]+)?$/i.test(value)
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas agent activity wrapper
// ─────────────────────────────────────────────────────────────────────────────

export async function withAgentActivity<T>(action: string, nodeIds: string[], fn: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return fn()

  try {
    const { useAgentCanvasActivity } = await import('@/features/home/useAgentCanvasActivity')
    useAgentCanvasActivity.getState().startActivity(action, nodeIds)
    const result = await fn()
    await new Promise((r) => setTimeout(r, 500))
    useAgentCanvasActivity.getState().endActivity()
    return result
  } catch (err) {
    const { useAgentCanvasActivity } = await import('@/features/home/useAgentCanvasActivity')
    useAgentCanvasActivity.getState().endActivity()
    throw err
  }
}

export async function recordAgentAction(
  type: 'add_node' | 'remove_node' | 'update_node' | 'update_node_content' | 'add_edge' | 'remove_edge',
  description: string,
  nodeId?: string,
  edgeId?: string,
  before?: any,
  after?: any,
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const { useHomeCanvasHistory } = await import('@/features/home/useHomeCanvasHistory')
    useHomeCanvasHistory.getState().pushAction({
      type,
      actor: 'agent',
      description,
      nodeId,
      edgeId,
      before: before || {},
      after: after || {},
    })
  } catch (err) {
    console.warn('[Agent] Failed to record history:', err)
  }
}
