/**
 * Global Graph Explorer
 *
 * Displays statistics and relationships from the global federated graph.
 */

import React, { useEffect, useState } from 'react'
import { useTQL } from '@/hooks/useTQL'
import type { GlobalGraph } from '@/lib/tql'
import { Network } from 'lucide-react'

export const GlobalGraphExplorer: React.FC = () => {
  const [, tqlActions] = useTQL()
  const [graph, setGraph] = useState<GlobalGraph | null>(null)
  const [loading, setLoading] = useState(false)

  // Load graph on mount
  useEffect(() => {
    loadGraph()
  }, [])

  const loadGraph = async () => {
    try {
      setLoading(true)
      const runtime = tqlActions.getRuntime()
      if (runtime) {
        const builtGraph = await runtime.buildGlobalGraph()
        setGraph(builtGraph)
      }
    } catch (err) {
      console.error('Failed to load global graph:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
        <Network className="h-4 w-4 mr-2 animate-spin" />
        Building graph...
      </div>
    )
  }

  if (!graph) {
    return (
      <div className="p-4 text-sm text-gray-500">
        <p>No global graph data available.</p>
        <button onClick={loadGraph} className="mt-2 text-blue-500 hover:text-blue-700 underline text-xs">
          Reload
        </button>
      </div>
    )
  }

  const { stats } = graph

  return (
    <div className="p-4 text-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-blue-500" />
        <h2 className="font-semibold text-base">Global Graph</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Nodes */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Nodes</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalNodes}</div>
        </div>

        {/* Edges */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Edges</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalEdges}</div>
        </div>
      </div>

      {/* Namespaces */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Namespaces ({stats.namespaces.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {stats.namespaces.map((ns) => (
            <span
              key={ns}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
              {ns}
            </span>
          ))}
        </div>
      </div>

      {/* Node Types */}
      {Object.keys(stats.nodesByType).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Node Types</h3>
          <div className="space-y-1">
            {Object.entries(stats.nodesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{type}</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Edge Types */}
      {Object.keys(stats.edgesByType).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Edge Types</h3>
          <div className="space-y-1">
            {Object.entries(stats.edgesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{type}</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(stats.lastUpdated).toLocaleString()}
        </p>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadGraph}
        className="w-full px-2 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors font-medium">
        Refresh Graph
      </button>
    </div>
  )
}
