# Schema Library

Vault schema analysis — introspects `.data` files to derive entity types, field names, and type information.

---

## Files

| File | Purpose |
|------|---------|
| `analyzer.ts` | `analyzeVaultSchema(path)` — scans vault data files and extracts schema |
| `useSchemaIndex.ts` | React hook — auto-refreshes schema when active workspace changes |
| `index.ts` | Barrel export |

## Key Types

```typescript
interface VaultSchema {
  namespaces: Record<string, NamespaceSchema>
}

interface NamespaceSchema {
  name: string
  fileCount: number
  entityCount: number
  fields: Record<string, FieldSchema>
}

interface FieldSchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'unknown'
  occurrences: number
  examples: unknown[]
}
```

## Usage

```typescript
// Hook (preferred)
import { useSchemaIndex } from '@/lib/schema'

function MyComponent() {
  const { schema, isLoading, refreshSchema } = useSchemaIndex()
  // schema is refreshed automatically when the active workspace changes
}

// Direct function
import { analyzeVaultSchema } from '@/lib/schema'
const schema = await analyzeVaultSchema('/path/to/vault')
```

## Old import location

`src/hooks/useSchemaIndex.ts` re-exports from here for backwards compatibility.
