/**
 * Federated Graph Builders
 *
 * Produces per-namespace `_graph_.data` files and a global `@system/_graph_.data`.
 *
 * Current implementation federates the *filesystem-level* graph (file/folder nodes + links).
 * A future step can extend this to semantic entity graphs (e.g. nodes inside `.data` files).
 */

import type { EAVStore } from './eav-store'
import type { EntityIdManager } from './entity-ids'

/**
 * Node in the global graph
 */
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  file: string;
  namespace: string;
  metadata?: Record<string, any>;
}

/**
 * Edge in the global graph
 */
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  namespace: string;
  metadata?: Record<string, any>;
}

/**
 * Global graph structure
 */
export interface GlobalGraph {
  '@context': Record<string, string>;
  '@id': string;
  '@type': 'GlobalGraph';
  description: string;
  federates: string[]; // list of namespace graph files
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
    namespaces: string[];
    lastUpdated: string;
  };
}

export interface FederatedGraphNode {
  id: string
  type: string
  file: string
  label: string
}

export interface FederatedGraphEdge {
  source: string
  target: string
  label: string
}

export interface FederatedGraph {
  '@context': Record<string, string>
  '@id': string
  '@type': 'FederatedGraph'
  namespace: string
  description: string
  nodes: FederatedGraphNode[]
  edges: FederatedGraphEdge[]
  stats: {
    totalNodes: number
    totalEdges: number
    nodesByType: Record<string, number>
    edgesByType: Record<string, number>
    lastUpdated: string
  }
}

/**
 * Aggregates facts and links from EAV store into a global graph
 */
export class GlobalGraphAggregator {
  constructor(
    private store: EAVStore,
    private idManager: EntityIdManager,
  ) {}

  /**
   * Build global graph from current EAV store state
   */
  async build(): Promise<GlobalGraph> {
    const nodes = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []
    const namespaces = new Set<string>()
    const nodeTypeCount = new Map<string, number>()
    const edgeTypeCount = new Map<string, number>()

    // Create nodes from indexed file entities
    for (const id of this.idManager.getAllIds()) {
      const path = this.idManager.getPath(id)
      if (!path) continue
      const namespace = this.extractNamespace(path)
      namespaces.add(namespace)

      const facts = this.store.getFactsByEntity(id)
      const typeFact = facts.find((f) => f.a === 'type')
      const nameFact = facts.find((f) => f.a === 'name')

      const nodeType = (typeFact?.v as string) || 'file'
      const label = (nameFact?.v as string) || this.getBasename(path)
      const file = this.relativeToNamespace(path, namespace)

      nodes.set(id, {
        id,
        type: nodeType,
        label,
        file,
        namespace,
      })

      nodeTypeCount.set(nodeType, (nodeTypeCount.get(nodeType) || 0) + 1)
    }

    // Extract all links as edges
    const allLinks = this.store.getAllLinks()
    for (const link of allLinks) {
      const sourcePath = this.idManager.getPath(link.source)
      if (!sourcePath) continue

      const sourceNamespace = this.extractNamespace(sourcePath)
      const edgeType = link.type || 'link'

      edges.push({
        source: link.source,
        target: link.target,
        label: edgeType,
        namespace: sourceNamespace,
      })

      edgeTypeCount.set(edgeType, (edgeTypeCount.get(edgeType) || 0) + 1)
    }

    // Build stats
    const stats = {
      totalNodes: nodes.size,
      totalEdges: edges.length,
      nodesByType: Object.fromEntries(nodeTypeCount),
      edgesByType: Object.fromEntries(edgeTypeCount),
      namespaces: Array.from(namespaces).sort(),
      lastUpdated: new Date().toISOString(),
    }

    return {
      '@context': { fg: 'https://filegraph.local/graph/' },
      '@id': 'fg:system:graph',
      '@type': 'GlobalGraph',
      description: 'Federated graph of entire system state - aggregates all namespace graphs',
      federates: this.generateFederatesList(Array.from(namespaces)),
      nodes: Array.from(nodes.values()),
      edges,
      stats,
    }
  }

  /**
   * Extract namespace from file path
   * e.g. "@entities/people.data" -> "@entities"
   */
  private extractNamespace(path: string): string {
    const parts = path.split('/').filter(Boolean)
    const ns = parts.find((p) => p.startsWith('@'))
    return ns || '@system'
  }

  private relativeToNamespace(path: string, namespace: string): string {
    const parts = path.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === namespace)
    if (idx === -1) return this.getBasename(path)
    const rel = parts.slice(idx + 1).join('/')
    return rel || '_'
  }

  private getBasename(path: string): string {
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || path
  }

  /**
   * Generate list of namespace graph files
   */
  private generateFederatesList(namespaces: string[]): string[] {
    return namespaces
      .filter((ns) => ns !== '@system')
      .map((ns) => `${ns}/_graph_.data`)
      .sort()
  }

  /**
   * Serialize graph to JSON for persistence
   */
  serialize(graph: GlobalGraph): string {
    return JSON.stringify(graph, null, 2)
  }

  /**
   * Compute graph metrics
   */
  computeMetrics(graph: GlobalGraph) {
    const metrics = {
      averageDegree: graph.edges.length / graph.nodes.length || 0,
      densityRatio: graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1)) || 0,
      nodesByNamespace: new Map<string, number>(),
      edgesByNamespace: new Map<string, number>(),
    }

    // Count nodes by namespace
    for (const node of graph.nodes) {
      metrics.nodesByNamespace.set(node.namespace, (metrics.nodesByNamespace.get(node.namespace) || 0) + 1)
    }

    // Count edges by namespace
    for (const edge of graph.edges) {
      metrics.edgesByNamespace.set(edge.namespace, (metrics.edgesByNamespace.get(edge.namespace) || 0) + 1)
    }

    return metrics
  }
}

/**
 * Builds per-namespace federated graphs ("_graph_.data" files)
 */
export class FederatedGraphBuilder {
  constructor(
    private store: EAVStore,
    private idManager: EntityIdManager,
  ) {}

  detectNamespaces(): string[] {
    const namespaces = new Set<string>()
    for (const id of this.idManager.getAllIds()) {
      const path = this.idManager.getPath(id)
      if (!path) continue
      const ns = this.extractNamespace(path)
      if (!ns) continue
      namespaces.add(ns)
    }
    return Array.from(namespaces).sort()
  }

  buildNamespaceGraph(namespace: string): FederatedGraph {
    const nodes: FederatedGraphNode[] = []
    const edges: FederatedGraphEdge[] = []
    const nodesByType = new Map<string, number>()
    const edgesByType = new Map<string, number>()

    const idsInNamespace = new Set<string>()

    for (const id of this.idManager.getAllIds()) {
      const path = this.idManager.getPath(id)
      if (!path) continue
      const ns = this.extractNamespace(path)
      if (ns !== namespace) continue

      const facts = this.store.getFactsByEntity(id)
      const typeFact = facts.find((f) => f.a === 'type')
      const nameFact = facts.find((f) => f.a === 'name')

      const nodeType = (typeFact?.v as string) || 'file'
      const label = (nameFact?.v as string) || this.getBasename(path)
      const file = this.relativeToNamespace(path, namespace)

      nodes.push({ id, type: nodeType, file, label })
      idsInNamespace.add(id)
      nodesByType.set(nodeType, (nodesByType.get(nodeType) || 0) + 1)
    }

    // Add edges where both endpoints are within the namespace
    for (const sourceId of idsInNamespace) {
      const outgoing = this.store.getOutgoingLinks(sourceId)
      for (const link of outgoing) {
        if (!idsInNamespace.has(link.e2)) continue
        edges.push({ source: link.e1, target: link.e2, label: link.a })
        edgesByType.set(link.a, (edgesByType.get(link.a) || 0) + 1)
      }
    }

    const lastUpdated = new Date().toISOString()

    return {
      '@context': { fg: 'https://filegraph.local/graph/' },
      '@id': `fg:${namespace.replace(/^@/, '')}:graph`,
      '@type': 'FederatedGraph',
      namespace,
      description: `Federated graph of ${namespace}`,
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodesByType: Object.fromEntries(nodesByType),
        edgesByType: Object.fromEntries(edgesByType),
        lastUpdated,
      },
    }
  }

  async buildGlobalGraph(): Promise<GlobalGraph> {
    const aggregator = new GlobalGraphAggregator(this.store, this.idManager)
    return aggregator.build()
  }

  private extractNamespace(path: string): string | null {
    const parts = path.split('/').filter(Boolean)
    const ns = parts.find((p) => p.startsWith('@'))
    return ns || null
  }

  private relativeToNamespace(path: string, namespace: string): string {
    const parts = path.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === namespace)
    if (idx === -1) return this.getBasename(path)
    const rel = parts.slice(idx + 1).join('/')
    return rel || '_'
  }

  private getBasename(path: string): string {
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || path
  }
}
