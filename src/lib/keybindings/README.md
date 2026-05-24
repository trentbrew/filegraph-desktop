# Keybindings Library

Keyboard shortcut management system. Supports chord sequences (e.g., `g h` = go home), context-aware bindings, and a user-configurable dialog.

---

## Directory Structure

```
keybindings/
├── manager.ts      # KeybindingManager — listens for keydown, dispatches commands
├── commands.ts     # CommandRegistry — maps command IDs to handler functions
├── defaults.ts     # DEFAULT_KEYBINDINGS — initial keybinding configuration
├── types.ts        # KeybindingContext, Keybinding, Command interfaces
├── parser.ts       # Key sequence parser ("g h" → ["g", "h"])
└── index.ts        # Barrel
```

## Key Types

```typescript
type KeybindingContext = 'global' | 'editor' | 'canvas' | 'terminal'

interface Keybinding {
  id: string           // Command ID
  keys: string         // Key sequence, e.g., "g h" or "cmd+k"
  context: KeybindingContext
  description: string
}
```

## How to Add a Keybinding

1. Add default in `defaults.ts`
2. Register handler in `src/lib/commands/modules/[module].ts`
3. Call `registerAllCommands()` in `App.tsx` picks it up automatically
