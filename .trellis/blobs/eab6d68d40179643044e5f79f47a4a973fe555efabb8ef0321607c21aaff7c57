/**
 * Agent Tools — System Domain
 *
 * Tools for querying system state, device info, and graph traversal.
 */

import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { getVaultPath, formatBytes, formatUptime, isEntityReference } from './helpers'
import { getSystemContext } from '../context/systemContext'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_system_state',
    description: `Get the current state of the Filegraph application. Returns comprehensive information about:
- Active file being previewed (path, name, type, size)
- Current directory and file count
- Workspace tabs (open folders, active workspace)
- Editor tabs (open files, pinned vs preview, unsaved changes)
- Active app (files, calendar, graph, etc.)
- UI state (layout mode, zoom, panels open/closed)
- Theme (mode, preset, available themes)
- Terminal status

Use this to understand what the user is currently looking at and the state of their workspace.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_device_info',
    description: `Get information about the user's device and system. Returns:
- **OS**: Name, version, kernel version, hostname
- **CPU**: Brand/model, core count, current usage %
- **Memory**: Total RAM, used, available, usage %
- **Storage**: Disk names, mount points, capacity, free space, usage %
- **Battery**: Charge level, charging status, time remaining
- **Uptime**: How long the system has been running

Use this when the user asks about their system specs, storage space, battery level, or system performance.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'explore_entity',
    description: `Explore an entity and its relationships by traversing the knowledge graph. Use this for complex queries that require following links between entities.

**Examples:**
- "Who's attending the standup?" → explore event:standup:001, expand participants
- "What projects is Sarah working on?" → explore person:sarah:001, expand projects/tasks
- "Show me everything about this meeting" → explore with depth 2

**Expandable relationships:**
- participants → resolves person IDs to full person entities
- projects, tasks → resolves to project/task entities
- notes → resolves note file paths to note content
- organization → resolves org reference
- accounts, bills → resolves financial entities

Returns the entity with expanded relationships up to the specified depth.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Entity ID to explore (e.g., "event:standup:001", "person:sarah:001")' },
        expand: { type: 'array', description: 'Relationships to expand (e.g., ["participants", "notes"]). Empty array expands all.', items: { type: 'string' } },
        depth: { type: 'number', description: 'How many levels deep to traverse (default: 1, max: 3)' },
        filter: { type: 'object', description: 'Filter expanded entities (e.g., {"status": "overdue"} or {"dueDate_lt": "2025-12-17"})' },
      },
      required: ['entityId'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface SystemInfoResponse {
  os_name: string; os_version: string; kernel_version: string; hostname: string
  cpu_brand: string; cpu_cores: number; cpu_usage_percent: number
  total_memory_bytes: number; used_memory_bytes: number; available_memory_bytes: number; memory_usage_percent: number
  total_swap_bytes: number; used_swap_bytes: number
  disks: Array<{ name: string; mount_point: string; total_bytes: number; available_bytes: number; used_bytes: number; usage_percent: number }>
  battery: { percentage: number; is_charging: boolean; time_to_empty_mins?: number; time_to_full_mins?: number } | null
  uptime_secs: number
}

const REFERENCE_FIELDS = [
  'participants', 'attendees', 'members', 'assignee', 'assignees', 'owner', 'creator',
  'organization', 'project', 'projects', 'tasks', 'milestones', 'accounts', 'bills',
  'subscriptions', 'notes', 'note', 'relatedTo', 'references',
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export function getSystemState() {
  return getSystemContext()
}

export async function getDeviceInfo(): Promise<any> {
  try {
    const info = await invoke<SystemInfoResponse>('get_system_info')
    return {
      os: { name: info.os_name, version: info.os_version, kernel: info.kernel_version, hostname: info.hostname },
      cpu: { model: info.cpu_brand, cores: info.cpu_cores, usage: `${info.cpu_usage_percent.toFixed(1)}%` },
      memory: {
        total: formatBytes(info.total_memory_bytes), used: formatBytes(info.used_memory_bytes),
        available: formatBytes(info.available_memory_bytes), usage: `${info.memory_usage_percent.toFixed(1)}%`,
      },
      storage: info.disks.map((disk) => ({
        name: disk.name || disk.mount_point, mountPoint: disk.mount_point,
        total: formatBytes(disk.total_bytes), available: formatBytes(disk.available_bytes),
        used: formatBytes(disk.used_bytes), usage: `${disk.usage_percent.toFixed(1)}%`,
      })),
      battery: info.battery ? {
        level: `${info.battery.percentage.toFixed(0)}%`, charging: info.battery.is_charging,
        timeRemaining: info.battery.is_charging
          ? (info.battery.time_to_full_mins ? `${info.battery.time_to_full_mins}m to full` : null)
          : (info.battery.time_to_empty_mins ? `${info.battery.time_to_empty_mins}m remaining` : null),
      } : null,
      uptime: formatUptime(info.uptime_secs),
    }
  } catch (err) {
    return { error: `Failed to get system info: ${err}` }
  }
}

export async function exploreEntity(
  entityId: string,
  expand?: string[],
  depth?: number,
  filter?: Record<string, any>,
): Promise<any> {
  const maxDepth = Math.min(depth || 1, 3)
  const fieldsToExpand = expand && expand.length > 0 ? expand : REFERENCE_FIELDS

  try {
    const { getEntity } = await import('./vault-tools')
    const baseEntity = await getEntity(entityId)
    if (baseEntity.error) return baseEntity

    const expanded = await expandEntityRelationships(baseEntity, fieldsToExpand, maxDepth, filter || null, new Set())
    return {
      entity: expanded,
      entityId,
      expansionDepth: maxDepth,
      expandedFields: fieldsToExpand.filter((f) => expanded[f] !== undefined && expanded[`_expanded_${f}`]),
    }
  } catch (err) {
    return { error: `Failed to explore entity: ${err}` }
  }
}

async function expandEntityRelationships(
  entity: any,
  fieldsToExpand: string[],
  remainingDepth: number,
  filter: Record<string, any> | null,
  visited: Set<string>,
): Promise<any> {
  if (remainingDepth <= 0) return entity

  const entityId = entity.id || entity['@id']
  if (entityId && visited.has(entityId)) return entity
  if (entityId) visited.add(entityId)

  const expanded = { ...entity }

  for (const field of fieldsToExpand) {
    const value = entity[field]
    if (!value) continue

    if (Array.isArray(value)) {
      const expandedItems = []
      for (const item of value) {
        if (typeof item === 'string' && isEntityReference(item)) {
          const resolved = await resolveReference(item, fieldsToExpand, remainingDepth - 1, filter, visited)
          if (resolved && !resolved.error) {
            if (!filter || matchesFilter(resolved, filter)) expandedItems.push(resolved)
          }
        } else if (typeof item === 'object') {
          expandedItems.push(item)
        }
      }
      if (expandedItems.length > 0) {
        expanded[field] = expandedItems
        expanded[`_expanded_${field}`] = true
      }
    } else if (typeof value === 'string' && isEntityReference(value)) {
      const resolved = await resolveReference(value, fieldsToExpand, remainingDepth - 1, filter, visited)
      if (resolved && !resolved.error) {
        if (!filter || matchesFilter(resolved, filter)) {
          expanded[field] = resolved
          expanded[`_expanded_${field}`] = true
        }
      }
    } else if (typeof value === 'string' && value.endsWith('.note')) {
      const noteContent = await readNoteFile(value)
      if (noteContent) {
        expanded[field] = noteContent
        expanded[`_expanded_${field}`] = true
      }
    }
  }

  return expanded
}

async function resolveReference(
  ref: string,
  fieldsToExpand: string[],
  remainingDepth: number,
  filter: Record<string, any> | null,
  visited: Set<string>,
): Promise<any> {
  const { getEntity } = await import('./vault-tools')
  const entity = await getEntity(ref)
  if (entity.error) return null
  if (remainingDepth > 0) return await expandEntityRelationships(entity, fieldsToExpand, remainingDepth, filter, visited)
  return entity
}

async function readNoteFile(notePath: string): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = notePath.startsWith('@') ? await join(vaultPath, notePath) : notePath
    const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
    const note = JSON.parse(result.content)
    return { path: notePath, title: note.title, summary: note.description || extractNotePreview(note) }
  } catch {
    return null
  }
}

function extractNotePreview(note: any): string {
  if (!note.blocks) return ''
  const text = note.blocks.slice(0, 3).map((b: any) => b.content?.map((c: any) => c.text).join('') || '').join(' ')
  return text.slice(0, 200) + (text.length > 200 ? '...' : '')
}

function matchesFilter(entity: any, filter: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (key.endsWith('_lt')) { if (!(entity[key.slice(0, -3)] < value)) return false }
    else if (key.endsWith('_gt')) { if (!(entity[key.slice(0, -3)] > value)) return false }
    else if (key.endsWith('_lte')) { if (!(entity[key.slice(0, -4)] <= value)) return false }
    else if (key.endsWith('_gte')) { if (!(entity[key.slice(0, -4)] >= value)) return false }
    else if (key === 'status' && value === 'overdue') {
      const dueDate = entity.dueDate || entity.endDate || entity.deadline
      if (!dueDate || new Date(dueDate) >= new Date()) return false
    } else {
      if (entity[key] !== value) return false
    }
  }
  return true
}
