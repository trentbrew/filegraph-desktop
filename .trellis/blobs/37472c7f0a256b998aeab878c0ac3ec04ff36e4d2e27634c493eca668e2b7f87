# Global Hooks

Shared React hooks that are either truly cross-cutting or pending migration to their owning feature.

> **Convention:** New hooks should be colocated with their owning feature/lib. This directory is for hooks that don't have a clear single owner, or for backwards-compatible re-export stubs.

---

## Hooks in this directory

| File | Canonical Location | Owner |
|------|--------------------|-------|
| `useLinkIndex.ts` | **`src/lib/links/useLinkIndex.ts`** | Links lib ✓ migrated |
| `useSchemaIndex.ts` | **`src/lib/schema/useSchemaIndex.ts`** | Schema lib ✓ migrated |
| `useTQL.ts` | `src/hooks/useTQL.ts` (implementation) | TQL lib — bridge at `src/lib/tql/useTQL.ts` |
| `usePersistence.ts` | `src/hooks/usePersistence.ts` | Cross-cutting |
| `useTabPersistence.ts` | `src/hooks/useTabPersistence.ts` | Preview feature |
| `useUIPersistence.ts` | `src/hooks/useUIPersistence.ts` | UI (global) |
| `useFileDragDrop.tsx` | `src/hooks/useFileDragDrop.tsx` | Home feature |
| `useGlobalTimer.ts` | `src/hooks/useGlobalTimer.ts` | Cross-cutting |
| `useMediaQuery.ts` | `src/hooks/useMediaQuery.ts` | Cross-cutting |
| `use-mobile.ts` | `src/hooks/use-mobile.ts` | Cross-cutting |

## Migrated hooks (re-export stubs)

- **`useLinkIndex.ts`** — re-exports from `@/lib/links/useLinkIndex`
- **`useSchemaIndex.ts`** — re-exports from `@/lib/schema/useSchemaIndex`

Import from the canonical location in new code:
```typescript
// Preferred (canonical):
import { useLinkIndex } from '@/lib/links'
import { useSchemaIndex } from '@/lib/schema'

// Also works (backwards compat re-export):
import { useLinkIndex } from '@/hooks/useLinkIndex'
```

## Key hooks

### `useTQL` — TQL runtime hook
Manages the TQL runtime lifecycle (initialize, scan, handle FS events). Also exposed at `src/lib/tql/useTQL.ts` via re-export.

### `usePersistence` — File-based store persistence
Generic hook for persisting Zustand store state to disk via Tauri `write_text_file`.

### `useFileDragDrop` — Canvas drag-and-drop
Handles drag-and-drop of files from the OS into the Home canvas.
