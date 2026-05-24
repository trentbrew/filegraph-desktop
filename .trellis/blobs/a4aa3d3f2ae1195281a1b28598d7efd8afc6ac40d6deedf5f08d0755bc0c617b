/**
 * Links Module - Universal Bi-directional Linking System
 * RFC-001: docs/architecture/RFC-001-Universal-Linking.md
 */

// Parser exports
export {
  // Types
  type ReferenceType,
  type ParsedReference,
  type ReferenceIndex,
  // Parsing functions
  parseFile,
  parseDataFile,
  parseMarkdownFile,
  extractEntityIdsFromObject,
  isSupportedFileType,
  // Index management
  createEmptyIndex,
  addFileToIndex,
  removeFileFromIndex,
  updateFileInIndex,
  // Query helpers
  getBacklinks,
  getOutgoingLinks,
  findBrokenReferences,
  getIndexStats,
} from './linkParser'

// Indexer exports
export {
  // Class
  LinkIndexer,
  // Singleton
  getLinkIndexer,
  resetLinkIndexer,
  // Types
  type LinkIndexerStats,
  type LinkIndexerOptions,
  type IndexProgress,
} from './linkIndexer'

// Hook export (canonical location)
export { useLinkIndex, type UseLinkIndexState, type UseLinkIndexActions } from './useLinkIndex'

// Resolver exports
export {
  // Class
  LinkResolver,
  // Singleton
  getLinkResolver,
  resetLinkResolver,
  // Namespace Registry (RFC-002)
  NAMESPACE_REGISTRY,
  getEntitySourceFile,
  // Types
  type ResolutionStatus,
  type ResolutionResult,
  type ResolvedReference,
  type NotFoundReference,
  type AmbiguousReference,
  type ErrorReference,
  type EntityLocation,
} from './linkResolver'
