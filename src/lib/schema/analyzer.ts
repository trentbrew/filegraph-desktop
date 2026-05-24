import { invoke } from '@tauri-apps/api/core'
import { NAMESPACES } from '../namespaces'
import { isJSONLD, validateJSONLD, type JSONLDDocument } from '../jsonld'

export interface PropertySchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'reference' | 'date'
  isRequired: boolean
  isArray: boolean
  referenceTypes?: string[] // For reference properties
  examples: Set<any>
  occurrences: number
}

export interface EntityTypeSchema {
  namespace: string
  label: string
  filePath: string
  count: number
  properties: Map<string, PropertySchema>
  outgoingRelations: Map<string, Set<string>> // relationName -> target namespaces
  incomingRelations: Map<string, Set<string>> // relationName -> source namespaces
  sampleIds: string[]
}

export interface VaultSchema {
  entityTypes: Map<string, EntityTypeSchema>
  totalEntities: number
  lastAnalyzed: string
  jsonLDCompliance: {
    totalFiles: number
    compliantFiles: number
    percentage: number
    issues: Array<{ file: string; errors: string[] }>
  }
}

const ENTITY_ID_PATTERN = /^(person|org|proj|task|ms|acc|tx|bill|goal|note|sub|annual|cat|inc|ins):[a-z0-9-]+:\d{3}$/

function inferPropertyType(value: any): PropertySchema['type'] {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'string') {
    if (ENTITY_ID_PATTERN.test(value)) return 'reference'
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    return 'string'
  }
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

function extractReferenceNamespace(value: any): string | null {
  if (typeof value !== 'string') return null

  // Handle JSON-LD IRI format: fg:namespace:slug:index
  if (value.startsWith('fg:')) {
    const parts = value.slice(3).split(':') // Remove 'fg:' prefix
    return parts[0] // Return namespace
  }

  // Handle plain entity ID format: namespace:slug:index
  if (ENTITY_ID_PATTERN.test(value)) {
    return value.split(':')[0]
  }

  return null
}

function analyzeProperty(name: string, value: any, existing?: PropertySchema): PropertySchema {
  const isArray = Array.isArray(value)
  const actualValue = isArray ? value[0] : value
  const type = inferPropertyType(actualValue)

  const schema: PropertySchema = existing || {
    name,
    type,
    isRequired: false,
    isArray,
    examples: new Set(),
    occurrences: 0,
  }

  schema.occurrences++

  if (type === 'reference') {
    schema.referenceTypes = schema.referenceTypes || []
    if (isArray) {
      value.forEach((v: any) => {
        const ns = extractReferenceNamespace(v)
        if (ns && !schema.referenceTypes!.includes(ns)) {
          schema.referenceTypes!.push(ns)
        }
      })
    } else {
      const ns = extractReferenceNamespace(value)
      if (ns && !schema.referenceTypes!.includes(ns)) {
        schema.referenceTypes!.push(ns)
      }
    }
  }

  if (schema.examples.size < 5) {
    schema.examples.add(isArray ? value.slice(0, 2) : value)
  }

  return schema
}

function analyzeRelations(entity: any, namespace: string, schema: EntityTypeSchema) {
  Object.entries(entity).forEach(([key, value]) => {
    if (key.startsWith('@') || key === 'id' || key === 'slug') return

    const values = Array.isArray(value) ? value : [value]
    values.forEach((v) => {
      const targetNs = extractReferenceNamespace(v)
      if (targetNs) {
        if (!schema.outgoingRelations.has(key)) {
          schema.outgoingRelations.set(key, new Set())
        }
        schema.outgoingRelations.get(key)!.add(targetNs)
      }
    })
  })
}

export async function analyzeVaultSchema(vaultPath: string): Promise<VaultSchema> {
  const schema: VaultSchema = {
    entityTypes: new Map(),
    totalEntities: 0,
    lastAnalyzed: new Date().toISOString(),
    jsonLDCompliance: {
      totalFiles: 0,
      compliantFiles: 0,
      percentage: 0,
      issues: [],
    },
  }

  for (const [namespace, config] of Object.entries(NAMESPACES)) {
    const filePath = `${vaultPath}/${config.file}`

    try {
      const response = await invoke<{ content: string }>('read_text_file', {
        filePath: filePath,
      })

      const entities = JSON.parse(response.content)
      if (!Array.isArray(entities)) continue

      schema.jsonLDCompliance.totalFiles++

      const fileIssues: string[] = []
      let compliantCount = 0

      entities.forEach((entity, index) => {
        if (isJSONLD(entity)) {
          const validation = validateJSONLD(entity)
          if (validation.valid) {
            compliantCount++
          } else {
            fileIssues.push(`Entity ${index}: ${validation.errors.join(', ')}`)
          }
        } else {
          fileIssues.push(`Entity ${index}: Missing JSON-LD context`)
        }
      })

      if (compliantCount === entities.length) {
        schema.jsonLDCompliance.compliantFiles++
      } else if (fileIssues.length > 0) {
        schema.jsonLDCompliance.issues.push({
          file: config.file,
          errors: fileIssues,
        })
      }

      const typeSchema: EntityTypeSchema = {
        namespace,
        label: config.label,
        filePath: config.file,
        count: entities.length,
        properties: new Map(),
        outgoingRelations: new Map(),
        incomingRelations: new Map(),
        sampleIds: entities.slice(0, 5).map((e) => e.id),
      }

      entities.forEach((entity) => {
        schema.totalEntities++

        Object.entries(entity).forEach(([key, value]) => {
          if (key.startsWith('@')) return

          const existing = typeSchema.properties.get(key)
          const propSchema = analyzeProperty(key, value, existing)
          typeSchema.properties.set(key, propSchema)
        })

        analyzeRelations(entity, namespace, typeSchema)
      })

      typeSchema.properties.forEach((prop) => {
        prop.isRequired = prop.occurrences === typeSchema.count
      })

      schema.entityTypes.set(namespace, typeSchema)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('File does not exist') || msg.includes('not exist') || msg.includes('ENOENT')) {
        continue
      }
      console.warn(`Failed to analyze ${filePath}:`, error)
    }
  }

  computeIncomingRelations(schema)

  if (schema.jsonLDCompliance.totalFiles > 0) {
    schema.jsonLDCompliance.percentage =
      (schema.jsonLDCompliance.compliantFiles / schema.jsonLDCompliance.totalFiles) * 100
  }

  return schema
}

function computeIncomingRelations(schema: VaultSchema) {
  schema.entityTypes.forEach((sourceType, sourceNs) => {
    sourceType.outgoingRelations.forEach((targetNamespaces, relationName) => {
      targetNamespaces.forEach((targetNs) => {
        const targetType = schema.entityTypes.get(targetNs)
        if (targetType) {
          if (!targetType.incomingRelations.has(relationName)) {
            targetType.incomingRelations.set(relationName, new Set())
          }
          targetType.incomingRelations.get(relationName)!.add(sourceNs)
        }
      })
    })
  })
}

export function serializeSchema(schema: VaultSchema): any {
  return {
    totalEntities: schema.totalEntities,
    lastAnalyzed: schema.lastAnalyzed,
    jsonLDCompliance: schema.jsonLDCompliance,
    entityTypes: Array.from(schema.entityTypes.entries()).map(([ns, type]) => ({
      namespace: ns,
      label: type.label,
      filePath: type.filePath,
      count: type.count,
      sampleIds: type.sampleIds,
      properties: Array.from(type.properties.entries()).map(([propName, prop]) => ({
        name: propName,
        type: prop.type,
        isRequired: prop.isRequired,
        isArray: prop.isArray,
        referenceTypes: prop.referenceTypes,
        occurrences: prop.occurrences,
        examples: Array.from(prop.examples),
      })),
      outgoingRelations: Array.from(type.outgoingRelations.entries()).map(([rel, targets]) => [
        rel,
        Array.from(targets),
      ]),
      incomingRelations: Array.from(type.incomingRelations.entries()).map(([rel, sources]) => [
        rel,
        Array.from(sources),
      ]),
    })),
  }
}

export function deserializeSchema(data: any): VaultSchema {
  return {
    totalEntities: data.totalEntities,
    lastAnalyzed: data.lastAnalyzed,
    jsonLDCompliance: data.jsonLDCompliance || {
      totalFiles: 0,
      compliantFiles: 0,
      percentage: 0,
      issues: [],
    },
    entityTypes: new Map(
      data.entityTypes.map((type: any) => [
        type.namespace,
        {
          ...type,
          properties: new Map(
            type.properties.map((prop: any) => [
              prop.name,
              {
                ...prop,
                examples: new Set(prop.examples),
              },
            ]),
          ),
          outgoingRelations: new Map(
            type.outgoingRelations.map(([rel, targets]: [string, string[]]) => [rel, new Set(targets)]),
          ),
          incomingRelations: new Map(
            type.incomingRelations.map(([rel, sources]: [string, string[]]) => [rel, new Set(sources)]),
          ),
        },
      ]),
    ),
  }
}
