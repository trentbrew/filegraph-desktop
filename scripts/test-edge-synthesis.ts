#!/usr/bin/env tsx
/**
 * Quick Test - Edge Synthesis
 *
 * Simple test to verify the orchestrator works with the demo data
 */

import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

const VAULT_PATH = join(process.cwd(), 'src', 'data', 'demo-files')
const ENTITIES_PATH = join(VAULT_PATH, '@entities')
const GRAPH_FILE = join(ENTITIES_PATH, '_graph_.data')

console.log('🔍 Testing Edge Synthesis')
console.log(`Vault: ${VAULT_PATH}`)
console.log(`Graph: ${GRAPH_FILE}\n`)

async function loadDataFile<T = any>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`)
    return null
  }
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err)
    return null
  }
}

async function main() {
  // Load existing graph
  const graph = await loadDataFile(GRAPH_FILE)

  if (!graph) {
    console.log('❌ Could not load graph file')
    process.exit(1)
  }

  console.log(`✅ Loaded graph`)
  console.log(`   Nodes: ${graph.nodes?.length || 0}`)
  console.log(`   Edges: ${graph.edges?.length || 0}`)

  // Load people
  const people = await loadDataFile(join(ENTITIES_PATH, 'people.data'))
  console.log(`\n✅ Loaded people: ${people?.items?.length || 0}`)

  // Load projects
  const projects = await loadDataFile(join(ENTITIES_PATH, 'projects.data'))
  console.log(`✅ Loaded projects: ${projects?.items?.length || 0}`)

  // Count potential edges from projects
  let potentialEdges = 0
  for (const proj of projects?.items || []) {
    if (proj.client) potentialEdges++
    if (proj.lead) potentialEdges++
    if (proj.team) potentialEdges += proj.team.length
  }

  console.log(`\n📊 Analysis:`)
  console.log(`   Potential project edges: ${potentialEdges}`)
  console.log(`   Current edges: ${graph.edges?.length || 0}`)

  // Sample edge from graph
  if (graph.edges && graph.edges.length > 0) {
    console.log(`\n📝 Sample edge:`)
    const sample = graph.edges[0]
    console.log(`   ${sample.source} --[${sample.label}]--> ${sample.target}`)
  }

  console.log(`\n✅ Test complete!`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
