import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { EntityTypeSchema } from '@/lib/schema'
import { NAMESPACES } from '@/lib/namespaces'

interface SchemaGraphProps {
  entityTypes: Map<string, EntityTypeSchema>
  onNodeClick?: (namespace: string) => void
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 300
const VERTICAL_SPACING = 150

function createSchemaNodes(entityTypes: Map<string, EntityTypeSchema>): Node[] {
  const nodes: Node[] = []
  const types = Array.from(entityTypes.values())

  const columns = Math.ceil(Math.sqrt(types.length))

  types.forEach((type, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    nodes.push({
      id: type.namespace,
      type: 'default',
      position: {
        x: col * HORIZONTAL_SPACING,
        y: row * VERTICAL_SPACING,
      },
      data: {
        label: (
          <div className="text-center">
            <div className="font-semibold text-sm">{type.label}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {type.count} {type.count === 1 ? 'entity' : 'entities'}
            </div>
            <div className="text-xs text-muted-foreground">{type.properties.size} properties</div>
          </div>
        ),
      },
      style: {
        background: 'hsl(var(--card))',
        border: '2px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '12px',
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      },
    })
  })

  return nodes
}

function createSchemaEdges(entityTypes: Map<string, EntityTypeSchema>): Edge[] {
  const edges: Edge[] = []
  const edgeMap = new Map<string, { relations: Set<string>; count: number }>()

  entityTypes.forEach((type) => {
    type.outgoingRelations.forEach((targetNamespaces, relationName) => {
      targetNamespaces.forEach((targetNs) => {
        const edgeKey = `${type.namespace}-${targetNs}`

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { relations: new Set(), count: 0 })
        }

        const edgeData = edgeMap.get(edgeKey)!
        edgeData.relations.add(relationName)
        edgeData.count++
      })
    })
  })

  edgeMap.forEach((data, key) => {
    const [source, target] = key.split('-')
    const relationsList = Array.from(data.relations).join(', ')

    edges.push({
      id: key,
      source,
      target,
      type: 'smoothstep',
      animated: true,
      label: relationsList,
      labelStyle: {
        fontSize: 10,
        fill: 'hsl(var(--muted-foreground))',
      },
      style: {
        stroke: 'hsl(var(--primary))',
        strokeWidth: Math.min(data.count, 3),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'hsl(var(--primary))',
      },
    })
  })

  return edges
}

export function SchemaGraph({ entityTypes, onNodeClick }: SchemaGraphProps) {
  const initialNodes = useMemo(() => createSchemaNodes(entityTypes), [entityTypes])
  const initialEdges = useMemo(() => createSchemaEdges(entityTypes), [entityTypes])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick],
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}>
        <Background />
        <Controls />
        <MiniMap nodeColor={(node) => 'hsl(var(--primary))'} maskColor="hsl(var(--background) / 0.8)" />
      </ReactFlow>
    </div>
  )
}
