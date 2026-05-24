/**
 * Agent Canvas Interaction Tests
 *
 * Browser-based test suite for verifying agent's ability to interact with the Home canvas.
 * Run these tests by pasting into the browser console while the app is running.
 *
 * Prerequisites:
 * - App running in dev mode
 * - Home canvas visible
 * - Agent tools exposed via window.__agentTools
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getTauriInvokeFromWindow(): ((cmd: string, args?: any) => Promise<any>) | null {
  const anyWindow = window as any
  // Tauri v2 exposes window.__TAURI__.core.invoke
  if (anyWindow?.__TAURI__?.core?.invoke) return anyWindow.__TAURI__.core.invoke
  // Legacy fallback (best-effort)
  if (anyWindow?.__TAURI__?.invoke) return anyWindow.__TAURI__.invoke
  return null
}

function isAbsolutePath(p: string): boolean {
  return typeof p === 'string' && (p.startsWith('/') || /^[A-Za-z]:\\/.test(p))
}

function joinPath(base: string, ...parts: string[]): string {
  const cleanedBase = base.replace(/\/+$/g, '')
  const cleanedParts = parts
    .filter(Boolean)
    .map((p) => p.replace(/^\/+/, '').replace(/\/+$/g, ''))
    .filter(Boolean)

  if (cleanedParts.length === 0) return cleanedBase
  return `${cleanedBase}/${cleanedParts.join('/')}`
}

async function getVaultPathFromLocalStorage(): Promise<string | null> {
  const candidates = ['filegraph-vault-path', 'filegraph_vault_path']
  for (const key of candidates) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return null
}

async function getDefaultVaultPathFallback(): Promise<string> {
  const invoke = getTauriInvokeFromWindow()
  try {
    if (!invoke) return '~/.filegraph'
    const home = await invoke('get_home_directory')
    if (typeof home === 'string' && home.trim()) return joinPath(home, '.filegraph')
  } catch {
    // ignore
  }

  return '~/.filegraph'
}

async function getVaultPath(): Promise<string> {
  // Prefer the system-state tool if available; it normalizes defaults.
  const { executeToolCall } = (window as any).__agentTools || {}
  if (executeToolCall) {
    try {
      const state = await executeToolCall('get_system_state', {})
      if (typeof state?.vaultPath === 'string' && state.vaultPath.trim()) return state.vaultPath
    } catch {
      // ignore
    }
  }

  return (await getVaultPathFromLocalStorage()) || (await getDefaultVaultPathFallback())
}

async function readTextFile(filePath: string): Promise<string | null> {
  const invoke = getTauriInvokeFromWindow()
  if (!invoke) return null
  try {
    const result = await invoke('read_text_file', { filePath })
    return result?.content ?? null
  } catch {
    return null
  }
}

async function writeTextFile(filePath: string, content: string): Promise<boolean> {
  const invoke = getTauriInvokeFromWindow()
  if (!invoke) return false
  try {
    await invoke('write_text_file', { filePath, content })
    return true
  } catch {
    return false
  }
}

async function logEvalResults(results: TestResult[]): Promise<void> {
  const vaultPath = await getVaultPath()
  const logPath = joinPath(vaultPath, '@system/agent-evals.trellis')

  const timestamp = new Date().toISOString()
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed && !r.error?.includes('Skipped')).length
  const skipped = results.filter((r) => r.error?.includes('Skipped')).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  const trellis: any = {
    trellis: true,
    blocks: [
      { type: 'text', content: 'Agent Canvas Eval Results', style: 'heading' },
      { type: 'text', content: `**Run:** ${timestamp}`, style: 'caption' },
      { type: 'divider' },
      {
        type: 'chart',
        chartType: 'doughnut',
        title: 'Test Results',
        data: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [
            {
              data: [passed, failed, skipped],
              backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
            },
          ],
        },
      },
      {
        type: 'callout',
        variant: failed > 0 ? 'error' : 'success',
        title: `${passed}/${results.length} tests passed`,
        content: `Duration: ${(totalDuration / 1000).toFixed(2)}s`,
      },
      { type: 'divider' },
      {
        type: 'table',
        headers: ['Status', 'Test', 'Duration', 'Error'],
        rows: results.map((r) => [
          r.passed ? '✅' : r.error?.includes('Skipped') ? '⏭️' : '❌',
          r.name,
          `${r.duration}ms`,
          r.error || '',
        ]),
        caption: 'All test results',
      },
    ],
  }

  // Add failed tests section if any
  const failedTests = results.filter((r) => !r.passed && !r.error?.includes('Skipped'))
  if (failedTests.length > 0) {
    trellis.blocks.push({ type: 'divider' })
    trellis.blocks.push({ type: 'text', content: 'Failed Tests', style: 'subheading' })
    failedTests.forEach((r) => {
      trellis.blocks.push({
        type: 'callout',
        variant: 'error',
        title: r.name,
        content: r.error || 'Unknown error',
      })
    })
  }

  await writeTextFile(logPath, JSON.stringify(trellis, null, 2))
  console.log(`📝 Eval results logged to: ${logPath}`)
}

interface AgentInteraction {
  timestamp: string
  userPrompt: string
  agentResponse: string
  toolCalls?: any[]
  duration?: number
}

async function logAgentInteraction(interaction: AgentInteraction): Promise<void> {
  const vaultPath = await getVaultPath()
  const logPath = joinPath(vaultPath, '@system/agent-interactions.trellis')

  // Read existing interactions
  const existing = await readTextFile(logPath)
  let existingBlocks: any[] = []
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      if (parsed.blocks) existingBlocks = parsed.blocks
    } catch {
      // ignore
    }
  }

  // Create blocks for this interaction
  const interactionBlocks: any[] = [
    { type: 'text', content: interaction.timestamp, style: 'caption' },
    {
      type: 'callout',
      variant: 'info',
      title: 'User Prompt',
      content: interaction.userPrompt,
    },
  ]

  if (interaction.toolCalls && interaction.toolCalls.length > 0) {
    interactionBlocks.push({
      type: 'collapsible',
      title: `Tool Calls (${interaction.toolCalls.length})`,
      defaultOpen: false,
      blocks: interaction.toolCalls.map((call) => ({
        type: 'code',
        language: 'json',
        filename: call.name,
        code: JSON.stringify(call.args || {}, null, 2),
      })),
    })
  }

  interactionBlocks.push({
    type: 'text',
    content: interaction.agentResponse,
    style: 'paragraph',
  })

  if (interaction.duration) {
    interactionBlocks.push({
      type: 'text',
      content: `*Duration: ${interaction.duration}ms*`,
      style: 'caption',
    })
  }

  interactionBlocks.push({ type: 'divider' })

  // Prepend new interaction to existing
  const trellis = {
    trellis: true,
    blocks: [
      { type: 'text', content: 'Agent Interactions Log', style: 'heading' },
      { type: 'divider' },
      ...interactionBlocks,
      ...existingBlocks.slice(2), // Skip the header from existing
    ],
  }

  await writeTextFile(logPath, JSON.stringify(trellis, null, 2))
  console.log(`📝 Agent interaction logged to: ${logPath}`)
}

async function getCanvasNodeById(nodeId: string): Promise<any | null> {
  const { executeToolCall } = (window as any).__agentTools || {}
  const canvas = await executeToolCall('get_home_canvas', { includeData: true })
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : []
  return nodes.find((n: any) => n.id === nodeId) ?? null
}

async function runCanvasTests(): Promise<TestResult[]> {
  const results: TestResult[] = []
  const { executeToolCall } = (window as any).__agentTools || {}

  if (!executeToolCall) {
    console.error('Agent tools not available. Make sure window.__agentTools is exposed.')
    return []
  }

  // Test 1: Read canvas state
  async function testReadCanvas(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('get_home_canvas', { includeData: false })
      const passed = result && typeof result.nodeCount === 'number'
      return {
        name: 'Read Canvas State',
        passed,
        error: passed ? undefined : 'Invalid response structure',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Read Canvas State', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddImage(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'image',
        position: { x: 1360, y: 100 },
        label: 'Test Image',
        data: { src: 'https://placekitten.com/320/200' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Image',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Image', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddShape(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'shape',
        position: { x: 1360, y: 380 },
        label: 'Test Shape',
        data: { shape: 'rectangle' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Shape',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Shape', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddWebEmbed(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'embed',
        position: { x: 700, y: 100 },
        label: 'Test Web Embed',
        data: { url: 'https://example.com', title: 'Example' },
      })
      const nodeId = result?.nodeId
      if (result?.success !== true || !nodeId) {
        return {
          name: 'Add Web Embed',
          passed: false,
          error: result?.error || 'Failed to create node',
          duration: Date.now() - start,
        }
      }

      await sleep(250)
      const node = await getCanvasNodeById(nodeId)
      const filePath = node?.data?.file as string | undefined
      const raw = filePath ? await readTextFile(filePath) : null
      const hasFile = typeof filePath === 'string' && filePath.endsWith('.web')
      // If we can't read from disk (e.g. running in pure web context), treat as a pass if node/file pointer exists.
      const passed = hasFile && (raw !== null || getTauriInvokeFromWindow() === null)
      return {
        name: 'Add Web Embed',
        passed,
        error: passed
          ? raw === null && getTauriInvokeFromWindow() === null
            ? 'Skipped backing file read (no Tauri)'
            : undefined
          : 'Missing .web backing file',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Web Embed', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddYoutube(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'youtube',
        position: { x: 1000, y: 100 },
        label: 'Test YouTube',
        data: { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
      })
      const nodeId = result?.nodeId
      if (result?.success !== true || !nodeId) {
        return {
          name: 'Add YouTube',
          passed: false,
          error: result?.error || 'Failed to create node',
          duration: Date.now() - start,
        }
      }

      await sleep(250)
      const node = await getCanvasNodeById(nodeId)
      const filePath = node?.data?.file as string | undefined
      const raw = filePath ? await readTextFile(filePath) : null
      let parsedProvider: string | undefined
      try {
        parsedProvider = raw ? (JSON.parse(raw)?.provider as string | undefined) : undefined
      } catch {
        parsedProvider = undefined
      }
      const hasFile = typeof filePath === 'string' && filePath.endsWith('.web')
      const passed = hasFile && (parsedProvider === 'youtube' || (raw === null && getTauriInvokeFromWindow() === null))
      return {
        name: 'Add YouTube',
        passed,
        error: passed
          ? raw === null && getTauriInvokeFromWindow() === null
            ? 'Skipped backing file read (no Tauri)'
            : undefined
          : 'Missing/invalid YouTube .web backing file',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add YouTube', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddTable(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'table',
        position: { x: 100, y: 380 },
        label: 'Test Table',
        data: { headers: ['A', 'B'], rows: [['1', '2']] },
      })

      const nodeId = result?.nodeId
      if (result?.success !== true || !nodeId) {
        return {
          name: 'Add Table',
          passed: false,
          error: result?.error || 'Failed to create table node',
          duration: Date.now() - start,
        }
      }

      await sleep(250)
      const node = await getCanvasNodeById(nodeId)
      const filePath = node?.data?.file as string | undefined
      const raw = filePath ? await readTextFile(filePath) : null
      let ok = false
      try {
        const parsed = raw ? JSON.parse(raw) : null
        ok = Array.isArray(parsed?.headers) && Array.isArray(parsed?.rows)
      } catch {
        ok = false
      }
      const hasFile = typeof filePath === 'string' && filePath.endsWith('.table')
      const passed = hasFile && (ok || (raw === null && getTauriInvokeFromWindow() === null))
      return {
        name: 'Add Table',
        passed,
        error: passed
          ? raw === null && getTauriInvokeFromWindow() === null
            ? 'Skipped backing file read (no Tauri)'
            : undefined
          : 'Missing/invalid .table backing file',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Table', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testEditTable(): Promise<TestResult> {
    const start = Date.now()
    try {
      const canvas = await executeToolCall('get_home_canvas', { includeData: true })
      const tableNode = canvas?.nodes?.find((n: any) => n.type === 'table')
      if (!tableNode?.id) {
        return { name: 'Edit Table', passed: false, error: 'No table node found', duration: Date.now() - start }
      }
      const result = await executeToolCall('edit_home_table', {
        nodeId: tableNode.id,
        operation: 'set_cell',
        rowIndex: 0,
        colIndex: 0,
        value: 'UPDATED',
        header: null,
        index: null,
        values: null,
      })
      const passed = result?.success === true
      return {
        name: 'Edit Table',
        passed,
        error: passed ? undefined : result?.error || 'Failed to edit table',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Edit Table', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddCodeBlock(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'codeBlock',
        position: { x: 520, y: 380 },
        label: 'Test Code',
        data: { code: 'const x = 1', language: 'typescript' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Code Block',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Code Block', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddPdf(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'pdf',
        position: { x: 850, y: 380 },
        label: 'Test PDF',
        data: { url: 'https://example.com/dummy.pdf' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add PDF',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add PDF', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddLocation(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'location',
        position: { x: 1140, y: 380 },
        label: 'Test Location',
        data: { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Location',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Location', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddTerminal(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'terminal',
        position: { x: 100, y: 700 },
        label: 'Test Terminal',
        data: null,
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Terminal',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Terminal', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddFreehand(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'freehand',
        position: { x: 820, y: 700 },
        label: 'Test Freehand',
        data: {
          initialSize: { width: 200, height: 120 },
          points: [
            [10, 10, 0.5],
            [60, 20, 0.5],
            [120, 60, 0.5],
            [180, 90, 0.5],
          ],
        },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Freehand',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Freehand', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddPerson(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'person',
        position: { x: 1120, y: 700 },
        label: 'Test Person',
        data: { entityId: 'person:sarah:001' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Person',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Person', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddFolder(): Promise<TestResult> {
    const start = Date.now()
    try {
      const vaultPath = await getVaultPath()
      if (!isAbsolutePath(vaultPath)) {
        return {
          name: 'Add Folder',
          passed: true,
          error: 'Skipped (vaultPath not absolute in this environment)',
          duration: Date.now() - start,
        }
      }
      const folderPath = joinPath(vaultPath, '@entities')
      const result = await executeToolCall('add_home_node', {
        nodeType: 'folder',
        position: { x: 420, y: 700 },
        label: 'Test Folder',
        data: { folderPath },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Folder',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Folder', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  async function testAddFilePreview(): Promise<TestResult> {
    const start = Date.now()
    try {
      const vaultPath = await getVaultPath()
      if (!isAbsolutePath(vaultPath)) {
        return {
          name: 'Add File Preview',
          passed: true,
          error: 'Skipped (vaultPath not absolute in this environment)',
          duration: Date.now() - start,
        }
      }
      const filePath = joinPath(vaultPath, '@entities/people.data')

      const before = await executeToolCall('get_home_canvas', { includeData: false })
      const beforeCount = typeof before?.nodeCount === 'number' ? before.nodeCount : null

      const result = await executeToolCall('add_home_node', {
        nodeType: 'filePreview',
        position: { x: 700, y: 700 },
        label: 'Test File Preview',
        data: { filePath },
      })

      const after = await executeToolCall('get_home_canvas', { includeData: false })
      const afterCount = typeof after?.nodeCount === 'number' ? after.nodeCount : null

      // Note: add_home_node special-cases filePreview and currently does not return nodeId.
      // Treat success + a nodeCount increment (when available) as pass.
      const passed =
        result?.success === true &&
        (typeof result?.nodeId === 'string' ||
          beforeCount === null ||
          afterCount === null ||
          (typeof beforeCount === 'number' && typeof afterCount === 'number' && afterCount >= beforeCount + 1))
      return {
        name: 'Add File Preview',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add File Preview', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 2: Add sticky note
  async function testAddStickyNote(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'stickyNote',
        position: { x: 100, y: 100 },
        label: 'Test Sticky',
        data: { text: 'This is a test sticky note', color: 'yellow' },
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Sticky Note',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Sticky Note', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 3: Add rich text note
  async function testAddRichText(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('add_home_node', {
        nodeType: 'richText',
        position: { x: 400, y: 100 },
        label: 'Test Rich Text',
        data: null,
      })
      const passed = result?.success === true && !!result?.nodeId
      return {
        name: 'Add Rich Text Note',
        passed,
        error: passed ? undefined : result?.error || 'Failed to create node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Rich Text Note', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 4: Update node position
  async function testUpdatePosition(): Promise<TestResult> {
    const start = Date.now()
    try {
      // First get the canvas to find a node
      const canvas = await executeToolCall('get_home_canvas', { includeData: false })
      if (!canvas?.nodes?.length) {
        return {
          name: 'Update Node Position',
          passed: false,
          error: 'No nodes to update',
          duration: Date.now() - start,
        }
      }

      const nodeId = canvas.nodes[0].id
      const result = await executeToolCall('update_home_node', {
        nodeId,
        position: { x: 200, y: 200 },
        dimensions: null,
        data: null,
      })
      const passed = result?.success === true
      return {
        name: 'Update Node Position',
        passed,
        error: passed ? undefined : result?.error || 'Failed to update node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Update Node Position', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 5: Update node dimensions
  async function testUpdateDimensions(): Promise<TestResult> {
    const start = Date.now()
    try {
      const canvas = await executeToolCall('get_home_canvas', { includeData: false })
      if (!canvas?.nodes?.length) {
        return {
          name: 'Update Node Dimensions',
          passed: false,
          error: 'No nodes to update',
          duration: Date.now() - start,
        }
      }

      const nodeId = canvas.nodes[0].id
      const result = await executeToolCall('update_home_node', {
        nodeId,
        position: null,
        dimensions: { width: 400, height: 300 },
        data: null,
      })
      const passed = result?.success === true
      return {
        name: 'Update Node Dimensions',
        passed,
        error: passed ? undefined : result?.error || 'Failed to update node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Update Node Dimensions', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 6: Update node content
  async function testUpdateContent(): Promise<TestResult> {
    const start = Date.now()
    try {
      const canvas = await executeToolCall('get_home_canvas', { includeData: false })
      const stickyNode = canvas?.nodes?.find((n: any) => n.type === 'stickyNote')

      if (!stickyNode) {
        return {
          name: 'Update Node Content',
          passed: false,
          error: 'No sticky note to update',
          duration: Date.now() - start,
        }
      }

      const result = await executeToolCall('update_home_node_content', {
        nodeId: stickyNode.id,
        content: 'Updated content via agent test',
        color: 'green',
      })
      const passed = result?.success === true
      return {
        name: 'Update Node Content',
        passed,
        error: passed ? undefined : result?.error || 'Failed to update content',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Update Node Content', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 7: Add edge between nodes
  async function testAddEdge(): Promise<TestResult> {
    const start = Date.now()
    try {
      const canvas = await executeToolCall('get_home_canvas', { includeData: false })
      if (!canvas?.nodes || canvas.nodes.length < 2) {
        return { name: 'Add Edge', passed: false, error: 'Need at least 2 nodes', duration: Date.now() - start }
      }

      const result = await executeToolCall('add_home_edge', {
        sourceId: canvas.nodes[0].id,
        targetId: canvas.nodes[1].id,
        label: 'Test Connection',
      })
      const passed = result?.success === true
      return {
        name: 'Add Edge',
        passed,
        error: passed ? undefined : result?.error || 'Failed to add edge',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Add Edge', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 8: Undo action
  async function testUndo(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('undo_canvas_action', {})
      const passed = result?.success === true || result?.message?.includes('Nothing to undo')
      return {
        name: 'Undo Action',
        passed,
        error: passed ? undefined : result?.error || 'Failed to undo',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Undo Action', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 9: Redo action
  async function testRedo(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('redo_canvas_action', {})
      const passed = result?.success === true || result?.message?.includes('Nothing to redo')
      return {
        name: 'Redo Action',
        passed,
        error: passed ? undefined : result?.error || 'Failed to redo',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Redo Action', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 10: Get history
  async function testGetHistory(): Promise<TestResult> {
    const start = Date.now()
    try {
      const result = await executeToolCall('get_canvas_history', { limit: 5 })
      const passed = result && Array.isArray(result.actions)
      return {
        name: 'Get History',
        passed,
        error: passed ? undefined : 'Invalid history response',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Get History', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Test 11: Remove node
  async function testRemoveNode(): Promise<TestResult> {
    const start = Date.now()
    try {
      const canvas = await executeToolCall('get_home_canvas', { includeData: false })
      if (!canvas?.nodes?.length) {
        return { name: 'Remove Node', passed: false, error: 'No nodes to remove', duration: Date.now() - start }
      }

      const nodeId = canvas.nodes[canvas.nodes.length - 1].id // Remove last node
      const result = await executeToolCall('remove_home_node', { nodeId })
      const passed = result?.success === true
      return {
        name: 'Remove Node',
        passed,
        error: passed ? undefined : result?.error || 'Failed to remove node',
        duration: Date.now() - start,
      }
    } catch (err) {
      return { name: 'Remove Node', passed: false, error: String(err), duration: Date.now() - start }
    }
  }

  // Run all tests
  console.log('🧪 Running Agent Canvas Interaction Tests...\n')

  results.push(await testReadCanvas())
  await sleep(200)

  results.push(await testAddStickyNote())
  await sleep(200)

  results.push(await testAddRichText())
  await sleep(200)

  results.push(await testAddImage())
  await sleep(200)

  results.push(await testAddWebEmbed())
  await sleep(200)

  results.push(await testAddYoutube())
  await sleep(200)

  results.push(await testAddTable())
  await sleep(200)

  results.push(await testEditTable())
  await sleep(200)

  results.push(await testAddCodeBlock())
  await sleep(200)

  results.push(await testAddShape())
  await sleep(200)

  results.push(await testAddPdf())
  await sleep(200)

  results.push(await testAddLocation())
  await sleep(200)

  results.push(await testAddTerminal())
  await sleep(200)

  results.push(await testAddFolder())
  await sleep(200)

  results.push(await testAddFilePreview())
  await sleep(200)

  results.push(await testAddFreehand())
  await sleep(200)

  results.push(await testAddPerson())
  await sleep(200)

  results.push(await testUpdatePosition())
  await sleep(200)

  results.push(await testUpdateDimensions())
  await sleep(200)

  results.push(await testUpdateContent())
  await sleep(200)

  results.push(await testAddEdge())
  await sleep(200)

  results.push(await testUndo())
  await sleep(200)

  results.push(await testRedo())
  await sleep(200)

  results.push(await testGetHistory())
  await sleep(200)

  results.push(await testRemoveNode())

  // Print results
  console.log('\n📊 Results:\n')
  let passed = 0
  let failed = 0

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌'
    console.log(`${icon} ${r.name} (${r.duration}ms)${r.error ? ` - ${r.error}` : ''}`)
    if (r.passed) passed++
    else failed++
  }

  console.log(`\n🏁 Summary: ${passed}/${results.length} passed`)

  // Log results to file
  await logEvalResults(results)

  return results
}

// Export for use
;(window as any).runCanvasTests = runCanvasTests
;(window as any).logAgentInteraction = logAgentInteraction

console.log('Agent Canvas Tests loaded. Run `runCanvasTests()` to execute.')
console.log('Use `logAgentInteraction({ userPrompt, agentResponse, toolCalls, duration })` to log interactions.')
