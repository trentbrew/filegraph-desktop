# Tauri Backend (Rust)

Rust backend for Filegraph Desktop using Tauri v2. Exposes filesystem, PTY terminal, OAuth, and AI token provisioning to the frontend via `invoke()` commands.

---

## Files

| File | Purpose |
|------|---------|
| `main.rs` | Entry point — calls `lib::run()` |
| `lib.rs` | All Tauri command registrations + vault initialization |
| `terminal.rs` | PTY terminal: spawn, write, resize, kill, shell_exec |
| `oauth.rs` | Google OAuth callback server (local HTTP server for PKCE flow) |
| `ephemeral_token.rs` | Gemini ephemeral token provisioning (secure API key relay) |
| `preview.rs` | File preview helpers (base64 encoding, metadata) |
| `proxy.rs` | HTTP proxy for cross-origin requests |

---

## Key Commands (`lib.rs`)

### Filesystem
- `read_text_file(path)` → `{ content: String, ... }` — **returns object, not string**
- `write_text_file(path, content)`
- `read_file_base64(path)` → base64 string (for binary files: PDF, images, DOCX)
- `list_directory(path)` → directory entries
- `create_directory(path)`
- `delete_file(path)` / `trash_items(paths)` — trash goes to `.filegraph/.trash`
- `file_exists(path)` → bool
- `watch_file(path)` / `unwatch_file(path)` — file watcher events
- `get_file_metadata(path)` → size, modified, created, etc.
- `open_in_finder(path)` — opens macOS Finder / Linux file manager
- `read_file_as_bytes(path)`

### Terminal (`terminal.rs`)
- `terminal_spawn(cwd?, shell?)` → PTY process ID
- `terminal_write(id, data)`
- `terminal_resize(id, cols, rows)`
- `terminal_kill(id)`
- `shell_exec(command, cwd?)` → `{ stdout, stderr, exit_code }`

### Auth (`oauth.rs`)
- `start_oauth_server()` → starts local callback server
- `stop_oauth_server()`

### AI (`ephemeral_token.rs`)
- `get_ephemeral_token()` → Gemini ephemeral token for Live API

---

## Vault Initialization (`lib.rs`)

On first launch, `initialize_vault(path)` creates the vault directory structure:
```
@entities/  @finance/  @calendar/  @email/  @inbox/
@ai/  @notes/  @home/  @system/
```

Entity type directories inside `@entities/` are **not** created (RFC-002: `.data` files are flat in `@entities/`).

---

## Invariants

1. **`read_text_file` returns `{ content: String }`** — frontend must destructure `.content`
2. **Shell fallback** — `terminal.rs` checks `$SHELL` env first, then `/bin/zsh`, then `/bin/sh` (works on NixOS/Linux)
3. **Trash** — Files are moved to `.filegraph/.trash` (custom), not the system trash, for vault consistency
4. **Cross-platform** — `dirs::home_dir()` works on macOS/Linux/Windows; `open::that()` uses `xdg-open` on Linux
