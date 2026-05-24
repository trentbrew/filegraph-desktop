// Core link types for the Universal Bi-directional Linking System
// RFC-001: docs/architecture/RFC-001-Universal-Linking.md

export const LinkTypes = {
  // Filesystem (existing)
  FS_CONTAINS: 'fs:contains',

  // User-defined references (new)
  REFERENCES: 'ref:links', // [[link]] in body text
  MENTIONS: 'ref:mentions', // Casual inline mentions
  RELATES_TO: 'ref:relates', // Semantic relationship

  // Data file references
  DATA_REF: 'data:references', // @id property references

  // Code relationships (future)
  IMPORTS: 'code:imports',
  EXPORTS: 'code:exports',
} as const

export type LinkType = (typeof LinkTypes)[keyof typeof LinkTypes]
