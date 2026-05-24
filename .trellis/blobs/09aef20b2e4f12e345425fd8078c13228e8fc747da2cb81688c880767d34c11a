#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type BenchJson = {
  meta?: {
    timestamp?: string
    vaultPath?: string
    nodeVersion?: string
    platform?: string
  }
  scan?: {
    durationMs?: number
    entities?: number
    files?: number
    folders?: number
    entitiesPerSec?: number
  }
  store?: {
    entityCount?: number
    factCount?: number
    linkCount?: number
  }
  memory?: {
    after?: {
      rss?: number
      heapUsed?: number
    }
  }
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue

    if (a === '--in') {
      const v = argv[i + 1]
      if (!v) throw new Error('--in requires a value')
      args.in = v
      i++
      continue
    }

    if (a === '--out') {
      const v = argv[i + 1]
      if (!v) throw new Error('--out requires a value')
      args.out = v
      i++
      continue
    }

    if (a === '--help' || a === '-h') {
      args.help = true
      continue
    }
  }
  return args
}

function help() {
  console.log('Usage: pnpm tsx scripts/bench-to-mermaid.ts --in <bench.json> [--out <snippet.md>]')
  console.log('')
  console.log('Emits Mermaid snippets (flowchart + pie) based on bench JSON output.')
}

function safeNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || typeof args.in !== 'string') {
    help()
    process.exit(args.help ? 0 : 1)
  }

  const inPath = path.resolve(process.cwd(), args.in)
  const raw = await readFile(inPath, 'utf-8')
  const data = JSON.parse(raw) as BenchJson

  const files = safeNum(data.scan?.files)
  const folders = safeNum(data.scan?.folders)
  const scanMs = safeNum(data.scan?.durationMs)
  const eps = safeNum(data.scan?.entitiesPerSec)
  const rssBytes = safeNum(data.memory?.after?.rss)

  const md =
    `## Benchmark snapshot (auto-generated)\n\n` +
    `**Vault:** ${data.meta?.vaultPath ?? '[unknown]'}\n\n` +
    '```mermaid\n' +
    'flowchart LR\n' +
    `  V[Vault\\nfiles=${files}\\nfolders=${folders}] --> S[Scan → EAV build\\n${fmt(scanMs, 2)}ms\\n${fmt(eps, 2)} entities/sec]\n` +
    `  S --> M[Memory (after)\\nRSS=${rssBytes ? Math.round(rssBytes / (1024 * 1024)) : 0}MB]\n` +
    '```\n\n' +
    '```mermaid\n' +
    `pie title "Entities"\n` +
    `  "Files" : ${files}\n` +
    `  "Folders" : ${folders}\n` +
    '```\n\n' +
    `**RSS (after):** ${rssBytes ? Math.round(rssBytes / (1024 * 1024)) : '[unknown]'} MB\n`

  if (typeof args.out === 'string') {
    const outPath = path.resolve(process.cwd(), args.out)
    await writeFile(outPath, md, 'utf-8')
    console.log(`Wrote: ${outPath}`)
  } else {
    process.stdout.write(md)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
