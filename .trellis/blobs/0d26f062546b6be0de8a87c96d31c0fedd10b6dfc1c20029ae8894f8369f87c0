/**
 * Federated graph runtime validation
 *
 * Covers edge cases around:
 * - initial scan persistence
 * - debounced rebuild scheduling
 * - avoiding filesystem watcher feedback loops on `_graph_.data`
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { TQLRuntime } from './runtime'

type InvokeFn = typeof invoke

interface WriteTextCall {
  filePath: string
  content: string
}

interface MockFileItem {
  name: string
  path: string
  file_type: 'file' | 'folder'
  size: number
  modified: number
  created: number
}

function folder(path: string): MockFileItem {
  const name = path.split('/').filter(Boolean).pop() || path
  return { name, path, file_type: 'folder', size: 0, modified: 0, created: 0 }
}

function file(path: string): MockFileItem {
  const name = path.split('/').filter(Boolean).pop() || path
  return { name, path, file_type: 'file', size: 1, modified: 1, created: 1 }
}

function getWriteCalls(inv: { mock: { calls: any[][] } }): WriteTextCall[] {
  return inv.mock.calls
    .filter((call) => call[0] === 'write_text_file' && call[1] && typeof call[1].filePath === 'string')
    .map((call) => ({ filePath: String(call[1].filePath), content: String(call[1].content ?? '') }))
}

describe('TQLRuntime federated graph persistence', () => {
  const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initialScan writes per-namespace graphs and global @system graph', async () => {
    const runtime = new TQLRuntime()

    // Directory structure:
    // /vault
    //   /@a/foo.txt
    //   /@b/bar.md
    const listDirectory = async ({ path }: { path: string }): Promise<MockFileItem[]> => {
      switch (path) {
        case '/vault':
          return [folder('/vault/@a'), folder('/vault/@b')]
        case '/vault/@a':
          return [file('/vault/@a/foo.txt')]
        case '/vault/@b':
          return [file('/vault/@b/bar.md')]
        default:
          return []
      }
    }

    invokeMock.mockImplementation(async (command: string, args?: any) => {
      switch (command) {
        case 'read_text_file':
          // No indexes on disk
          throw new Error('not found')
        case 'list_directory':
          return listDirectory(args)
        case 'create_file':
          return null
        case 'write_text_file':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`) 
      }
    })

    await runtime.initialize('/app')
    await runtime.initialScan('/vault')

    const graphWrites = getWriteCalls(invokeMock).filter((c: WriteTextCall) => c.filePath.endsWith('/_graph_.data'))
    const writtenPaths = graphWrites.map((c) => c.filePath).sort()

    expect(writtenPaths).toEqual(['/vault/@a/_graph_.data', '/vault/@b/_graph_.data', '/vault/@system/_graph_.data'])

    const globalWrite = graphWrites.find((c: WriteTextCall) => c.filePath === '/vault/@system/_graph_.data')
    expect(globalWrite).toBeTruthy()

    const parsed = JSON.parse(globalWrite!.content)
    expect(parsed['@type']).toBe('GlobalGraph')
    expect(Array.isArray(parsed.nodes)).toBe(true)
    expect(Array.isArray(parsed.edges)).toBe(true)
  })

  it('ignores fs batches that only touch `_graph_.data` (prevents feedback loop)', async () => {
    const runtime = new TQLRuntime()

    invokeMock.mockImplementation(async (command: string) => {
      switch (command) {
        case 'read_text_file':
          throw new Error('not found')
        case 'create_file':
        case 'write_text_file':
        case 'list_directory':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`) 
      }
    })

    await runtime.initialize('/app')
    // Avoid going through initialScan; just set vaultRoot for scheduling
    ;(runtime as any).vaultRootPath = '/vault'

    vi.clearAllMocks()

    runtime.pushFSEvent({ kind: 'modify', path: '/vault/@system/_graph_.data', timestamp: Date.now() })
    await runtime.flushQueue()

    // Nothing should have been written and no directory stat calls needed
    expect(getWriteCalls(invokeMock)).toHaveLength(0)
    expect(invokeMock.mock.calls.some((c: any[]) => c[0] === 'list_directory')).toBe(false)
  })

  it('debounces federated graph rebuilds and writes exactly once per burst', async () => {
    const runtime = new TQLRuntime()

    invokeMock.mockImplementation(async (command: string, args?: any) => {
      switch (command) {
        case 'read_text_file':
          throw new Error('not found')
        case 'list_directory':
          // runtime.modify handling lists the parent directory and searches for matching item
          if (args?.path === '/vault/@a') {
            return [file('/vault/@a/foo.txt'), file('/vault/@a/bar.txt')]
          }
          return []
        case 'create_file':
        case 'write_text_file':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`) 
      }
    })

    await runtime.initialize('/app')
    ;(runtime as any).vaultRootPath = '/vault'

    vi.useFakeTimers()
    vi.clearAllMocks()

    runtime.pushFSEvent({ kind: 'modify', path: '/vault/@a/foo.txt', timestamp: Date.now() })
    runtime.pushFSEvent({ kind: 'modify', path: '/vault/@a/bar.txt', timestamp: Date.now() })

    await runtime.flushQueue()

    // No write until debounce fires
    expect(getWriteCalls(invokeMock)).toHaveLength(0)

    await vi.runAllTimersAsync()

    const graphWrites = getWriteCalls(invokeMock).filter((c: WriteTextCall) => c.filePath.endsWith('/_graph_.data'))
    const writtenPaths = graphWrites.map((c) => c.filePath).sort()

    expect(writtenPaths).toEqual(['/vault/@a/_graph_.data', '/vault/@system/_graph_.data'])
  })

  it('rebuild includes both namespaces on rename (fromPath + path) and always updates @system', async () => {
    const runtime = new TQLRuntime()

    invokeMock.mockImplementation(async (command: string) => {
      switch (command) {
        case 'read_text_file':
          throw new Error('not found')
        case 'create_file':
        case 'write_text_file':
        case 'list_directory':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`) 
      }
    })

    await runtime.initialize('/app')
    ;(runtime as any).vaultRootPath = '/vault'

    // Seed id-manager so rename doesn't warn about unknown path
    await runtime.ingestFile('/vault/@a/old.txt', file('/vault/@a/old.txt') as any)

    vi.useFakeTimers()
    vi.clearAllMocks()

    runtime.pushFSEvent({
      kind: 'rename',
      path: '/vault/@b/new.txt',
      fromPath: '/vault/@a/old.txt',
      timestamp: Date.now(),
    })

    await runtime.flushQueue()
    await vi.runAllTimersAsync()

    const graphWrites = getWriteCalls(invokeMock).filter((c: WriteTextCall) => c.filePath.endsWith('/_graph_.data'))
    const writtenPaths = graphWrites.map((c) => c.filePath).sort()

    expect(writtenPaths).toEqual(['/vault/@a/_graph_.data', '/vault/@b/_graph_.data', '/vault/@system/_graph_.data'])
  })

  it('changes outside any namespace only update global @system graph', async () => {
    const runtime = new TQLRuntime()

    invokeMock.mockImplementation(async (command: string) => {
      switch (command) {
        case 'read_text_file':
          throw new Error('not found')
        case 'create_file':
        case 'write_text_file':
        case 'list_directory':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`)
      }
    })

    await runtime.initialize('/app')
    ;(runtime as any).vaultRootPath = '/vault'

    vi.useFakeTimers()
    vi.clearAllMocks()

    runtime.pushFSEvent({ kind: 'remove', path: '/vault/loose-file.txt', timestamp: Date.now() })
    await runtime.flushQueue()
    await vi.runAllTimersAsync()

    const graphWrites = getWriteCalls(invokeMock).filter((c: WriteTextCall) => c.filePath.endsWith('/_graph_.data'))
    const writtenPaths = graphWrites.map((c) => c.filePath).sort()

    expect(writtenPaths).toEqual(['/vault/@system/_graph_.data'])
  })

  it('does not overwrite existing non-TQL namespace _graph_.data (falls back to _tql_graph_.data)', async () => {
    const runtime = new TQLRuntime()

    invokeMock.mockImplementation(async (command: string, args?: any) => {
      switch (command) {
        case 'read_text_file': {
          // Simulate an existing unrelated graph file in @notes
          if (args?.filePath === '/vault/@notes/_graph_.data') {
            return { content: JSON.stringify({ '@type': 'NoteCollection', version: 1 }) }
          }
          // No global file yet
          throw new Error('not found')
        }
        case 'create_file':
        case 'write_text_file':
        case 'list_directory':
          return null
        default:
          throw new Error(`Unexpected invoke(${command}) in test`)
      }
    })

    await runtime.initialize('/app')
    ;(runtime as any).vaultRootPath = '/vault'

    // Seed entities so the builder sees @notes as a namespace
    await runtime.ingestFile('/vault/@notes/welcome.note', file('/vault/@notes/welcome.note') as any)

    await runtime.persistFederatedGraphs()

    const graphWrites = getWriteCalls(invokeMock).filter((c: WriteTextCall) => c.filePath.endsWith('/_graph_.data') || c.filePath.endsWith('/_tql_graph_.data'))
    const writtenPaths = graphWrites.map((c) => c.filePath).sort()

    // Namespace graph should be written to the fallback name, not overwriting the existing _graph_.data
    expect(writtenPaths).toContain('/vault/@notes/_tql_graph_.data')
    expect(writtenPaths).toContain('/vault/@system/_graph_.data')

    const globalWrite = graphWrites.find((c) => c.filePath === '/vault/@system/_graph_.data')
    expect(globalWrite).toBeTruthy()
    const parsed = JSON.parse(globalWrite!.content)
    expect(parsed.federates).toContain('@notes/_tql_graph_.data')
  })
})
