/**
 * useSchemaIndex Hook
 *
 * React hook for analyzing vault schema (entity types, field names, etc.)
 *
 * Canonical location: src/lib/schema/useSchemaIndex.ts
 * Old location (re-exports from here): src/hooks/useSchemaIndex.ts
 */

import { useEffect, useState } from 'react'
import { analyzeVaultSchema, VaultSchema } from '@/lib/schema'
import { useTabStore } from '@/stores/useTabStore'

export function useSchemaIndex() {
  const [schema, setSchema] = useState<VaultSchema | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeTab = useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId))

  const refreshSchema = async () => {
    if (!activeTab?.path) return

    setIsLoading(true)
    setError(null)

    try {
      const vaultSchema = await analyzeVaultSchema(activeTab.path)
      setSchema(vaultSchema)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze schema')
      console.error('Schema analysis error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshSchema()
  }, [activeTab?.path])

  return { schema, isLoading, error, refreshSchema }
}
