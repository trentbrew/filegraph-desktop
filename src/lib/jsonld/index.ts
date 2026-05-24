import { NAMESPACES } from '../namespaces'

export const FILEGRAPH_CONTEXT_URL = 'https://filegraph.dev/context.jsonld'
export const FILEGRAPH_ONTOLOGY_URL = 'https://filegraph.dev/ontology#'

export interface JSONLDDocument {
  '@context': string | object
  '@id': string
  '@type': string | string[]
  [key: string]: any
}

const NAMESPACE_TO_TYPE: Record<string, string> = {
  person: 'Person',
  org: 'Organization',
  proj: 'Project',
  task: 'Task',
  ms: 'Milestone',
  acc: 'Account',
  tx: 'Transaction',
  bill: 'Bill',
  sub: 'Subscription',
  goal: 'Goal',
  note: 'Note',
  event: 'CalendarEvent',
  reminder: 'Reminder',
  cat: 'Category',
  inc: 'Income',
  ins: 'Insurance',
  annual: 'AnnualExpense',
}

export function getEntityType(namespace: string): string {
  return NAMESPACE_TO_TYPE[namespace] || 'Entity'
}

export function getEntityNamespace(type: string): string | null {
  const entry = Object.entries(NAMESPACE_TO_TYPE).find(([_, t]) => t === type)
  return entry ? entry[0] : null
}

export function entityIdToIRI(entityId: string): string {
  return `fg:${entityId}`
}

export function filePathToIRI(filePath: string): string {
  return `fg:file:${filePath}`
}

export function addJSONLDContext(entity: any): JSONLDDocument {
  const { id, slug, ...rest } = entity

  if (!id) {
    throw new Error('Entity must have an id field')
  }

  const namespace = id.split(':')[0]
  const entityType = getEntityType(namespace)

  const jsonld: JSONLDDocument = {
    '@context': FILEGRAPH_CONTEXT_URL,
    '@id': entityIdToIRI(id),
    '@type': ['Entity', entityType],
    slug,
    ...rest,
  }

  return jsonld
}

export function removeJSONLDContext(jsonld: JSONLDDocument): any {
  const { '@context': context, '@id': iri, '@type': type, ...rest } = jsonld

  const id = iri.startsWith('fg:') ? iri.slice(3) : iri

  return {
    id,
    ...rest,
  }
}

export function isJSONLD(obj: any): obj is JSONLDDocument {
  return typeof obj === 'object' && obj !== null && ('@context' in obj || '@id' in obj || '@type' in obj)
}

export function validateJSONLD(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!obj || typeof obj !== 'object') {
    errors.push('Document must be an object')
    return { valid: false, errors }
  }

  if (!('@context' in obj)) {
    errors.push('Missing @context')
  }

  if (!('@id' in obj)) {
    errors.push('Missing @id')
  }

  if (!('@type' in obj)) {
    errors.push('Missing @type')
  }

  if ('@id' in obj && typeof obj['@id'] !== 'string') {
    errors.push('@id must be a string')
  }

  return { valid: errors.length === 0, errors }
}

export function migrateEntityToJSONLD(entity: any, filePath?: string): JSONLDDocument {
  const jsonld = addJSONLDContext(entity)

  if (filePath) {
    jsonld.storedIn = filePathToIRI(filePath)
  }

  if (entity.created_at) {
    jsonld.created = entity.created_at
    delete jsonld.created_at
  }

  if (entity.updated_at) {
    jsonld.modified = entity.updated_at
    delete jsonld.updated_at
  }

  return jsonld
}

export function extractMentions(jsonld: JSONLDDocument): string[] {
  const mentions: string[] = []

  function traverse(obj: any) {
    if (typeof obj === 'string' && obj.startsWith('fg:') && obj.includes(':')) {
      const parts = obj.split(':')
      if (parts.length >= 3) {
        mentions.push(obj.slice(3))
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse)
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(traverse)
    }
  }

  traverse(jsonld)
  return [...new Set(mentions)]
}

export function addMentionsToJSONLD(jsonld: JSONLDDocument, mentions: string[]): JSONLDDocument {
  return {
    ...jsonld,
    mentions: mentions.map(entityIdToIRI),
  }
}

export async function loadContext(): Promise<object> {
  try {
    const response = await fetch('/context.jsonld')
    return await response.json()
  } catch (error) {
    console.warn('Failed to load JSON-LD context, using URL reference')
    return { '@context': FILEGRAPH_CONTEXT_URL }
  }
}

export function compactIRI(iri: string): string {
  if (iri.startsWith(FILEGRAPH_ONTOLOGY_URL)) {
    return 'fg:' + iri.slice(FILEGRAPH_ONTOLOGY_URL.length)
  }
  if (iri.startsWith('https://schema.org/')) {
    return 'schema:' + iri.slice('https://schema.org/'.length)
  }
  return iri
}

export function expandIRI(compact: string): string {
  if (compact.startsWith('fg:')) {
    return FILEGRAPH_ONTOLOGY_URL + compact.slice(3)
  }
  if (compact.startsWith('schema:')) {
    return 'https://schema.org/' + compact.slice(7)
  }
  return compact
}
