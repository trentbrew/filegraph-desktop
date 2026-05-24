/**
 * useLinkIndex Hook
 *
 * React hook for accessing the link indexer and performing reference queries.
 * Provides backlinks, outgoing links, and broken reference detection.
 * Integrates with TQL runtime's EAV store for persistence.
 *
 * Canonical location: src/lib/links/useLinkIndex.ts
 * Old location (re-exports from here): src/hooks/useLinkIndex.ts
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useVault } from '@/contexts/VaultContext'
import { useTQL } from '@/lib/tql/useTQL'
import {
  getLinkIndexer,
  getLinkResolver,
  type LinkIndexerStats,
  type ParsedReference,
  type IndexProgress,
  type ResolutionResult,
  type LinkResolver,
} from '@/lib/links'

export interface UseLinkIndexState {
  /** Whether the index is being built */
  indexing: boolean
  /** Current indexing progress */
  progress: IndexProgress | null
  /** Statistics about the index */
  stats: LinkIndexerStats | null
  /** Any error that occurred */
  error: string | null
}

export interface UseLinkIndexActions {
  /** Rebuild the entire index */
  reindex: () => Promise<void>
  /** Get backlinks for a target ID */
  getBacklinks: (targetId: string) => ParsedReference[]
  /** Get outgoing links from a source file */
  getOutgoingLinks: (sourceFile: string) => ParsedReference[]
  /** Get all broken references */
  getBrokenReferences: () => ParsedReference[]
  /** Notify the indexer that a file was modified */
  onFileModified: (filePath: string) => Promise<void>
  /** Notify the indexer that a file was created */
  onFileCreated: (filePath: string) => Promise<void>
  /** Notify the indexer that a file was deleted */
  onFileDeleted: (filePath: string) => void
  /** Resolve a reference target to its file/entity */
  resolve: (target: string) => Promise<ResolutionResult>
  /** Check if a target can be resolved */
  canResolve: (target: string) => Promise<boolean>
  /** Get the link resolver instance */
  getResolver: () => LinkResolver | null
}

/**
 * Hook to manage the link index lifecycle and queries
 */
export function useLinkIndex(): [UseLinkIndexState, UseLinkIndexActions] {
  const { vaultPath } = useVault()
  const [, tqlActions] = useTQL()
  const indexerRef = useRef(getLinkIndexer())

  const [state, setState] = useState<UseLinkIndexState>({
    indexing: false,
    progress: null,
    stats: null,
    error: null,
  })

  useEffect(() => {
    const indexer = getLinkIndexer({
      onProgress: (progress) => {
        setState((prev) => ({ ...prev, progress }))
      },
    })

    const runtime = tqlActions.getRuntime()
    if (runtime) {
      const store = runtime.getStore()
      indexer.setStore(store)
      console.log('[useLinkIndex] Connected to TQL EAV store')
    }

    indexerRef.current = indexer
  }, [tqlActions])

  useEffect(() => {
    if (!vaultPath) return

    const doIndex = async () => {
      setState((prev) => ({ ...prev, indexing: true, error: null }))
      try {
        const stats = await indexerRef.current.indexVault(vaultPath)
        setState((prev) => ({ ...prev, stats, indexing: false, progress: null }))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error during indexing'
        setState((prev) => ({ ...prev, error: message, indexing: false, progress: null }))
      }
    }

    doIndex()
  }, [vaultPath])

  const reindex = useCallback(async () => {
    if (!vaultPath) return
    setState((prev) => ({ ...prev, indexing: true, error: null }))
    try {
      const stats = await indexerRef.current.indexVault(vaultPath)
      setState((prev) => ({ ...prev, stats, indexing: false, progress: null }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error during indexing'
      setState((prev) => ({ ...prev, error: message, indexing: false, progress: null }))
    }
  }, [vaultPath])

  const getBacklinks = useCallback((targetId: string): ParsedReference[] => {
    return indexerRef.current.getBacklinks(targetId)
  }, [])

  const getOutgoingLinks = useCallback((sourceFile: string): ParsedReference[] => {
    return indexerRef.current.getOutgoingLinks(sourceFile)
  }, [])

  const getBrokenReferences = useCallback((): ParsedReference[] => {
    return indexerRef.current.getBrokenReferences()
  }, [])

  const onFileModified = useCallback(async (filePath: string): Promise<void> => {
    await indexerRef.current.onFileModified(filePath)
    setState((prev) => ({ ...prev, stats: indexerRef.current.getStats() }))
  }, [])

  const onFileCreated = useCallback(async (filePath: string): Promise<void> => {
    await indexerRef.current.onFileCreated(filePath)
    setState((prev) => ({ ...prev, stats: indexerRef.current.getStats() }))
  }, [])

  const onFileDeleted = useCallback((filePath: string): void => {
    indexerRef.current.onFileDeleted(filePath)
    setState((prev) => ({ ...prev, stats: indexerRef.current.getStats() }))
  }, [])

  const resolverRef = useRef<LinkResolver | null>(null)

  useEffect(() => {
    if (vaultPath) {
      resolverRef.current = getLinkResolver(vaultPath)
    }
  }, [vaultPath])

  const resolve = useCallback(async (target: string): Promise<ResolutionResult> => {
    if (!resolverRef.current) return { status: 'error', target, error: 'Resolver not initialized' }
    return resolverRef.current.resolve(target)
  }, [])

  const canResolve = useCallback(async (target: string): Promise<boolean> => {
    if (!resolverRef.current) return false
    return resolverRef.current.canResolve(target)
  }, [])

  const getResolver = useCallback((): LinkResolver | null => {
    return resolverRef.current
  }, [])

  const actions: UseLinkIndexActions = useMemo(
    () => ({
      reindex, getBacklinks, getOutgoingLinks, getBrokenReferences,
      onFileModified, onFileCreated, onFileDeleted, resolve, canResolve, getResolver,
    }),
    [reindex, getBacklinks, getOutgoingLinks, getBrokenReferences, onFileModified, onFileCreated, onFileDeleted, resolve, canResolve, getResolver],
  )

  return [state, actions]
}
