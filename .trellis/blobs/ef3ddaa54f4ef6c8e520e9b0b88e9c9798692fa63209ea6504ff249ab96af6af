# Terminal Feature

PTY-backed terminal integration. Supports multiple terminal panes, tab management, and agent-controlled terminal access.

---

## Directory Structure

```
terminal/
├── Terminal.tsx          # Core terminal component (xterm.js + PTY)
├── TerminalPanel.tsx     # Panel wrapper with tab bar
├── TerminalPaneView.tsx  # Multi-pane split view
├── terminalRegistry.ts   # Registry of active terminal instances
├── terminalUtils.ts      # Shell detection, environment helpers
└── index.ts              # Barrel
```

## Stores (in `src/stores/`)

- `useTerminalStore.ts` — Simple terminal state
- `usePtyTerminalTabsStore.ts` — PTY terminal tab management (open/close/switch)
- `useTerminalPanesStore.ts` — Split-pane layout management

## Tauri Commands (`src-tauri/src/terminal.rs`)

| Command | Description |
|---------|-------------|
| `terminal_spawn` | Spawn a new PTY process |
| `terminal_write` | Write input to PTY |
| `terminal_resize` | Resize terminal dimensions |
| `terminal_kill` | Kill a PTY process |
| `shell_exec` | Execute a shell command and capture output |

## Invariants

1. **Shell detection order**: `$SHELL` env var → `/bin/zsh` (macOS) → `/bin/sh` (fallback, works on NixOS/Linux)
2. **Agent access**: The `run_command` agent tool calls `shell_exec` via Tauri; user must approve commands in `CommandApprovalDialog`
3. **Multiple panes**: Managed by `useTerminalPanesStore`; each pane has its own PTY instance
