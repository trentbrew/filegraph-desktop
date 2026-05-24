#!/usr/bin/env tsx

import { stat, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { EAVStore } from '../src/lib/tql/eav-store'
import { createContainsLink, createFileFacts, type FileStats } from '../src/lib/tql/facts'

type BenchResult = {
  meta: {
    timestamp: string
    vaultPath: string
    nodeVersion: string
    platform: string
  }
  scan: {
    durationMs: number
    entities: number
    files: number
    folders: number
    entitiesPerSec: number
  }
  store: {
    entityCount: number
    factCount: number
    linkCount: number
  }
  queries: Record<string, { durationMs: number; iterations?: number; avgMs?: number }>
  memory: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
  }
}

function nowMs(): number {
  return Number(process.hrtime.bigint()) / 1e6
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue

    if (a === '--vault') {
      const v = argv[i + 1]
      if (!v) throw new Error('--vault requires a value')
      args.vault = v
      i++
      continue
    }

    if (a === '--json') {
      const v = argv[i + 1]
      if (!v) throw new Error('--json requires a value')
      args.json = v
      i++
      continue
    }

    if (a === '--include-derived-graphs') {
      args.includeDerivedGraphs = true
      continue
    }

    if (a === '--help' || a === '-h') {
      args.help = true
      continue
    }
  }
  return args
}

function printHelp() {
  console.log('Usage: pnpm tsx scripts/bench-tql.ts [--vault <path>] [--json <path>] [--include-derived-graphs]')
  console.log('')
  console.log('Defaults:')
  console.log('  --vault src/data/demo-files')
}

function shouldSkipEntry(name: string, includeDerivedGraphs: boolean): boolean {
  if (name === '.git' || name === 'node_modules' || name === 'dist') return true
  if (name === '.references' || name === '.sandbox') return true
  if (name === '.DS_Store') return true
  if (!includeDerivedGraphs && name === '_graph_.data') return true
  return false
}

async function scanVaultToEavStore(opts: {
  vaultPath: string
  includeDerivedGraphs: boolean
}): Promise<{ store: EAVStore; durationMs: number; files: number; folders: number; sampleIds: string[] }> {
  const store = new EAVStore()
  const t0 = nowMs()

  let nextId = 1
  const makeId = () => `file:${String(nextId++).padStart(8, '0')}`

  const rootAbs = path.resolve(opts.vaultPath)
  const rootId = makeId()

  const rootStats: FileStats = {
    path: rootAbs,
    name: path.basename(rootAbs) || rootAbs,
    file_type: 'folder',
    is_hidden: false,
  }
  store.addFacts(createFileFacts(rootId, rootStats))

  const idByAbsPath = new Map<string, string>()
  idByAbsPath.set(rootAbs, rootId)

  const stack: string[] = [rootAbs]
  let files = 0
  let folders = 1
  const sampleIds: string[] = [rootId]

  while (stack.length) {
    const dirAbs = stack.pop()
    if (!dirAbs) continue

    const parentId = idByAbsPath.get(dirAbs)
    if (!parentId) continue

    const entries = await readdir(dirAbs, { withFileTypes: true })
    for (const ent of entries) {
      if (shouldSkipEntry(ent.name, opts.includeDerivedGraphs)) continue

      const abs = path.join(dirAbs, ent.name)
      let st: Awaited<ReturnType<typeof stat>>
      try {
        st = await stat(abs)
      } catch {
        continue
      }

      const isDir = ent.isDirectory()
      const id = makeId()
      idByAbsPath.set(abs, id)

      const ext = isDir ? undefined : path.extname(ent.name) || undefined
      const fileStats: FileStats = {
        path: abs,
        name: ent.name,
        file_type: isDir ? 'folder' : 'file',
        size: isDir ? undefined : st.size,
        modified: st.mtimeMs,
        created: st.birthtimeMs,
        extension: ext,
        is_hidden: ent.name.startsWith('.'),
      }

      store.addFacts(createFileFacts(id, fileStats))
      store.addLinks([createContainsLink(parentId, id)])

      if (isDir) {
        folders++
        stack.push(abs)
      } else {
        files++
      }

      if (sampleIds.length < 200) sampleIds.push(id)
    }
  }

  const durationMs = nowMs() - t0
  return { store, durationMs, files, folders, sampleIds }
}

function bench(
  name: string,
  iterations: number,
  fn: () => void,
): { durationMs: number; iterations: number; avgMs: number } {
  const t0 = nowMs()
  for (let i = 0; i < iterations; i++) fn()
  const durationMs = nowMs() - t0
  return { durationMs, iterations, avgMs: iterations > 0 ? durationMs / iterations : durationMs }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const vaultArg = typeof args.vault === 'string' ? args.vault : 'src/data/demo-files'
  const vaultPath = path.resolve(process.cwd(), vaultArg)
  const includeDerivedGraphs = !!args.includeDerivedGraphs

  try {
    const s = await stat(vaultPath)
    if (!s.isDirectory()) throw new Error('not a directory')
  } catch {
    console.error(`Vault path not found or not a directory: ${vaultPath}`)
    process.exit(1)
  }

  const memBefore = process.memoryUsage()

  const { store, durationMs, files, folders, sampleIds } = await scanVaultToEavStore({
    vaultPath,
    includeDerivedGraphs,
  })

  const memAfter = process.memoryUsage()

  const storeStats = store.getStats()
  const entities = storeStats.entityCount
  const entitiesPerSec = durationMs > 0 ? (entities / durationMs) * 1000 : 0

  const sampleId = sampleIds.find((id) => id !== sampleIds[0]) || sampleIds[0]

  const queryResults: BenchResult['queries'] = {}

  queryResults.getStats = bench('getStats', 2000, () => {
    store.getStats()
  })
  queryResults.getFactsByEntity = bench('getFactsByEntity', 5000, () => {
    store.getFactsByEntity(sampleId)
  })

  queryResults.getLinksByEntity = bench('getLinksByEntity', 5000, () => {
    store.getLinksByEntity(sampleId)
  })

  queryResults.getBacklinks = bench('getBacklinks', 5000, () => {
    store.getBacklinks(sampleId)
  })

  queryResults.findByAttribute_type_file = bench('findByAttribute(type=file)', 50, () => {
    const all = store.getAllFacts()
    all.filter((f) => f.a === 'type' && f.v === 'file')
  })

  const result: BenchResult = {
    meta: {
      timestamp: new Date().toISOString(),
      vaultPath,
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
    },
    scan: {
      durationMs,
      entities,
      files,
      folders,
      entitiesPerSec,
    },
    store: {
      entityCount: storeStats.entityCount,
      factCount: storeStats.factCount,
      linkCount: storeStats.linkCount,
    },
    queries: Object.fromEntries(Object.entries(queryResults).map(([k, v]) => [k, v])),
    memory: {
      before: memBefore,
      after: memAfter,
    },
  }

  console.log('TQL Benchmark')
  console.log(`Vault: ${vaultPath}`)
  console.log(`Entities: ${entities} (files=${files}, folders=${folders})`)
  console.log(`Scan: ${durationMs.toFixed(2)}ms (${entitiesPerSec.toFixed(2)} entities/sec)`)
  console.log(`Memory RSS: ${formatBytes(memAfter.rss)} (heapUsed=${formatBytes(memAfter.heapUsed)})`)
  console.log('')
  console.log('Query timings:')
  for (const [k, v] of Object.entries(result.queries)) {
    const it = v.iterations ? ` (${v.iterations} iters)` : ''
    const avg = typeof v.avgMs === 'number' ? `, avg=${v.avgMs.toFixed(6)}ms` : ''
    console.log(`  ${k}: ${v.durationMs.toFixed(2)}ms${it}${avg}`)
  }

  if (typeof args.json === 'string' && args.json.trim().length) {
    const outPath = path.resolve(process.cwd(), args.json)
    await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8')
    console.log('')
    console.log(`Wrote JSON: ${outPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
