# Links Library

RFC-001 Universal Bi-directional Linking System. Parses `[[wikilinks]]` and `namespace:slug:index` entity references from vault files, builds a backlink index, and resolves references to file paths.

---

## Directory Structure

```
links/
├── linkParser.ts       # Parse references from file content
├── linkIndexer.ts      # Vault-wide indexer (full scan + incremental updates)
├── linkResolver.ts     # Resolve entity IDs → vault file paths
├── index.ts            # Barrel export
├── linkParser.test.ts  # Parser tests (9 cases)
└── linkResolver.test.ts # Resolver tests
```

---

## Key Types

```typescript
// linkParser.ts
interface ParsedReference {
  value: string           // Raw reference text
  targetId: string        // Normalized target ID
  type: 'entity-id' | 'wikilink' | 'file-path' | 'url'
  linkType: LinkType
  sourceFile: string      // Absolute path
  lineNumber?: number     // For markdown files
  propertyPath?: string   // JSON path for .data files
  displayText?: string    // For [[id|Display Text]]
}
```

---

## Usage

```typescript
import { useLinkIndex } from '@/hooks/useLinkIndex'

function MyComponent() {
  const { getBacklinks, resolveLink } = useLinkIndex()
  const backlinks = getBacklinks('person:sarah:001')
  const filePath = resolveLink('person:sarah:001')  // → '/vault/@entities/people.data'
}
```

---

## Patterns Recognized

| Pattern | Example | Type |
|---------|---------|------|
| Entity ID | `person:sarah:001` | `entity-id` |
| Wikilink | `[[person:sarah:001]]` | `wikilink` |
| Wikilink with display | `[[person:sarah:001\|Sarah]]` | `wikilink` |
| Backtick mention | `` `acc:checking:001` `` | `entity-id` |

**Skipped fields** (metadata, not references): `@context`, `@type`, `@id`, `id`, `slug`

---

## Invariants

1. **`NAMESPACE_REGISTRY`** re-exported from `linkResolver.ts` points to `NAMESPACE_FILES` from `namespaces.ts`. Single source of truth.
2. **`read_text_file` returns object** — `invoke<{ content: string }>('read_text_file', ...)`. Access `.content`, not the raw return value.
3. **Incremental updates** — `LinkIndexer` supports `onFileModified/Created/Deleted` for live updates without full re-scan.

---

## Running Tests

```bash
pnpm vitest run src/lib/links
```
