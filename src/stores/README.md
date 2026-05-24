# Global Stores

Zustand stores that are truly global (shared across multiple features) or are pending migration to their owning feature.

> **Note:** Feature-owned stores should eventually be colocated with their feature. See `ARCHITECTURE.md` § Store Ownership for the migration target for each store.

---

## Stores

| File | Owner | Purpose |
|------|-------|---------|
| `useUIStore.ts` | Global | Agent panel open/closed, sidebar widths, layout flags |
| `useAppStore.ts` | Global | Active app ID, app switching |
| `useFileStore.ts` | Global | Active file, file selection, watched paths |
| `useTabStore.ts` | Preview feature | Workspace tabs + workspace-scoped editor tabs |
| `usePreviewStore.ts` | Preview feature | Preview mode (preview vs edit), active viewer state |
| `useCalendarStore.ts` | Calendar app | Local calendar events, view mode |
| `useGoogleCalendarStore.ts` | Google integration | Google accounts, tokens, sync state |
| `usePtyTerminalTabsStore.ts` | Terminal feature | PTY terminal tab instances |
| `useTerminalPanesStore.ts` | Terminal feature | Split-pane terminal layout |
| `useTerminalStore.ts` | Terminal feature | Simple terminal state |
| `useWidgetStore.ts` | Widget system | Enabled widgets, widget state |
| `useHighlightStore.ts` | Global | Search result highlights |
| `clipboardStore.ts` | Global | Cross-feature clipboard (files, nodes) |
| `keybindingStore.ts` | Global | Active keybinding context |

## Barrel

`index.ts` re-exports all stores for convenience. Components may also import directly from the store file.

## Conventions

- All stores use `zustand` with `persist` middleware for state that should survive app restarts
- State keys in `localStorage` use hyphen-separated names (e.g., `tab-store`, `ui-store`)
- Never mutate state directly — always use the store's setter actions
