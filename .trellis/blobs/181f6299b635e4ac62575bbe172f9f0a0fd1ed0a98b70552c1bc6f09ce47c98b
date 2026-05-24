# TQL — Turtlestack Query Layer

EAV (Entity-Attribute-Value) triple store that indexes vault `.data` files. Provides the semantic layer on top of raw files: entity resolution, backlink queries, federation across namespaces.

---

## Directory Structure

```
tql/
├── runtime.ts              # TQLRuntime — main class; scan(), query(), watch()
├── eav-store.ts            # In-memory EAV store (entity, attribute, value, file)
├── entity-ids.ts           # EntityIdManager — namespace:slug:index generation + validation
├── facts.ts                # Fact types and LinkTypes constants
├── global-graph.ts         # FederatedGraphBuilder — cross-namespace graph assembly
├── watcher-queue.ts        # FSWatcherQueue — debounced file-change events
├── status-types.ts         # ItemStatus type and STATUS_LIST (for calendar/kanban)
├── linkTypes.ts            # Link type enum
├── index.ts                # Barrel export
├── *.test.ts               # Colocated tests (eav-store, entity-ids, facts, watcher-queue, federation)
└── validation-tests.ts.backup  # (backup — can be deleted)
```

---

## Key Types

```typescript
// runtime.ts
class TQLRuntime {
  scan(vaultPath: string): Promise<void>
  query(tql: string): QueryResult[]
  getEntity(id: string): Entity | null
  getBacklinks(targetId: string): BacklinkResult[]
  addLinks(links: Link[]): void
}

// eav-store.ts
interface EAVFact {
  entity: string      // e.g., "person:sarah:001"
  attribute: string   // e.g., "name"
  value: unknown      // e.g., "Sarah Chen"
  sourceFile: string  // Absolute path to .data file
}

// entity-ids.ts
class EntityIdManager {
  generate(namespace: string, slug: string): string   // "person:sarah:001"
  validate(id: string): boolean
  nextIndex(namespace: string, slug: string): number
}
```

---

## Usage

```typescript
import { useTQL } from '@/hooks/useTQL'

function MyComponent() {
  const { runtime, isReady } = useTQL()

  if (!isReady) return <Loading />

  const entity = runtime.getEntity('person:sarah:001')
  const backlinks = runtime.getBacklinks('proj:filegraph:001')
}
```

---

## Invariants

1. **Source of truth is files** — TQL store is derived from `.data` files. Never write to the EAV store directly; write to files and let the watcher re-index.
2. **Namespaces** — Entity IDs must use a namespace from `src/lib/namespaces.ts`. The `EntityIdManager` validates this.
3. **Federation** — `FederatedGraphBuilder` merges `_graph_.data` files from each namespace into a global graph. Each namespace can have its own `_graph_.data`.
4. **File changes** — `FSWatcherQueue` debounces rapid file changes (e.g., saves) before triggering re-index. Default debounce: 300ms.

---

## Running Tests

```bash
pnpm vitest run src/lib/tql
```
