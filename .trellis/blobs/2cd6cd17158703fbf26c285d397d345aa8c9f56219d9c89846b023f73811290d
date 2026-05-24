// @ts-nocheck
// TODO: JsonGraph not yet implemented - missing reaflow dependency
import * as React from 'react'
import { Canvas, Node, Edge, MarkerArrow, Label } from 'reaflow'
import { useTheme } from 'next-themes'
import { invoke } from '@tauri-apps/api/core'
import { Loader2 } from 'lucide-react'

interface JsonGraphProps {
  filePath: string
}

interface GraphData {
  nodes: any[]
  edges: any[]
}

export function JsonGraph({ filePath }: JsonGraphProps) {
  const { theme } = useTheme()
  const [data, setData] = React.useState<GraphData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const response = await invoke<{ content: string }>('read_text_file', { filePath })
        const json = JSON.parse(response.content)
        const graphData = parseJsonToGraph(json)
        setData(graphData)
      } catch (err) {
        console.error('Failed to parse JSON for graph:', err)
        setError('Failed to parse JSON or file is too large.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filePath])

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        {error || 'No data to display'}
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-background/50" style={{ cursor: 'grab' }}>
      <Canvas
        nodes={data.nodes}
        edges={data.edges}
        direction="RIGHT"
        readonly
        animated={false}
        fit={true}
        zoomable={true}
        pannable={true}
        arrow={<MarkerArrow style={{ fill: theme === 'dark' ? '#b1b1b1' : '#4b5563' }} />}
        node={(props) => (
          <Node
            {...props}
            style={{
              fill: theme === 'dark' ? '#1e1e1e' : '#ffffff',
              stroke: theme === 'dark' ? '#333' : '#e5e7eb',
              strokeWidth: 1,
              color: theme === 'dark' ? '#e5e5e5' : '#1f2937',
            }}
            label={<Label style={{ fill: theme === 'dark' ? '#e5e5e5' : '#1f2937' }} />}
          />
        )}
        edge={(props) => (
          <Edge
            {...props}
            style={{
              stroke: theme === 'dark' ? '#555' : '#9ca3af',
            }}
          />
        )}
      />
    </div>
  )
}

// --- Parsing Logic ---

function parseJsonToGraph(json: any): GraphData {
  const nodes: any[] = []
  const edges: any[] = []
  let idCounter = 0

  function traverse(obj: any, parentId: string | null = null, keyName: string = 'root') {
    const currentId = `n-${idCounter++}`
    const isObject = typeof obj === 'object' && obj !== null
    const isArray = Array.isArray(obj)

    let label = keyName
    if (!isObject) {
      label = `${keyName}: ${String(obj)}`
    } else if (isArray) {
      label = `${keyName} []`
    }

    // Create Node
    nodes.push({
      id: currentId,
      text: label,
      width: Math.max(150, label.length * 8),
      height: 50,
      data: {
        value: obj,
      },
    })

    // Create Edge from parent
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${currentId}`,
        from: parentId,
        to: currentId,
      })
    }

    // Recurse
    if (isObject) {
      Object.entries(obj).forEach(([key, value]) => {
        traverse(value, currentId, key)
      })
    }
  }

  traverse(json)
  return { nodes, edges }
}
