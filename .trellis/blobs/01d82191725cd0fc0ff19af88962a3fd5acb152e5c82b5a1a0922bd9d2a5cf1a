# Filegraph

**A local-first semantic workspace where your files are a queryable knowledge graph and a Gemini-powered AI agent navigates your UI by voice.**

Filegraph is a desktop application — part Obsidian, part Notion, part VSCode — where every file, note, entity, and calendar event is a node in a semantic graph. A built-in AI agent with 50+ tools can observe, navigate, and directly manipulate every surface of the UI through natural voice conversation, powered by the Gemini Live API.

Your data never leaves your machine. Backup is `cp -r`. Version control is `git`.

<img width="4884" height="3412" alt="image" src="https://github.com/user-attachments/assets/089ced2d-c642-4e40-838a-2bf75075b42b" />

---

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-backend-orange?logo=rust)
![Gemini](https://img.shields.io/badge/Gemini-Live_API-4285F4?logo=google)
![License](https://img.shields.io/badge/License-AGPL--3.0-green)

---

## What it does

### Vault & Knowledge Graph
- **Index any folder** — every file becomes a node with facts and typed edges (`fs:contains`, `ref:links`, `data:ref`)
- **Entity system** — structured data lives as JSON-LD files (`@entities/`, `@calendar/`, `@finance/`) with human-readable IDs (`person:sarah:001`, `proj:website:001`). No database, no lock-in.
- **Bidirectional linking** — `[[wikilinks]]` and entity ID references in any file create automatic backlinks across your vault
- **TQL graph engine** — EAV-based query runtime for relationship traversal, full-text search, and graph statistics

### Spatial Canvas
- **ReactFlow-powered Home canvas** — arrange files, notes, images, embeds, terminals, and code into a visual workspace
- **File-backed nodes** — `.canvas`, `.web`, `.sketch`, `.whiteboard` nodes persist to disk as plain files
- **Voice-manipulable** — add, remove, align, group, and connect canvas nodes by voice

### AI Agent (Text + Voice)
- **50+ tool functions** across 10 domains: vault, canvas, shell, calendar, UI, media, system, memory, search, widgets
- **Multi-provider LLM** — Gemini, OpenAI, Anthropic, Groq, Ollama (local); one tool definition works across all providers
- **Trellis Document Format (TDF)** — structured rich responses with code blocks, mermaid diagrams, charts, tables, callouts, and more
- **Agent sketchpad** — `.sketch` files give the agent a visual canvas for diagrams and spatial explanations
- **Long-term memory** — agent saves and retrieves memories; user profile drives personalized behavior
- **Personality settings** — tune warmth, verbosity, formality, and enthusiasm via sliders

### Live Mode (Gemini Live API)
- **Real-time voice conversation** — press `⌘⇧L` to activate; speak naturally and interrupt at any time
- **Voice-driven UI control** — "Switch to calendar", "Open my project notes", "Lay the canvas out in a grid" — executed instantly
- **VAD interruption** — voice activity detection lets you cut off the agent mid-sentence
- **Hybrid text + voice** — type commands during a live session; both channels coexist
- **Transcript overlay** — real-time input/output transcription
- **Ephemeral tokens** — API keys never touch the frontend; the Rust backend provisions short-lived tokens

### Rich File Viewers
- **Code** — syntax highlighting for 100+ languages (Shiki)
- **Markdown / `.note`** — rendered with wikilink support and preview mode
- **PDF** — in-app viewer (pdf.js)
- **Images** — JPEG, PNG, GIF, WebP, SVG, HEIC
- **Audio / Video** — waveform (WaveSurfer) and media player
- **XLSX / DOCX** — spreadsheet grid and Word document rendering (mammoth)
- **CSV** — editable data grid
- **Mermaid** — diagrams rendered inline
- **Excalidraw** — `.whiteboard` files open in the Excalidraw canvas

### Apps & Integrations
- **Calendar** — month, week, kanban views; items have labels, urgency, and a 10-state status workflow
- **Terminal** — xterm.js shell with per-workspace persistence
- **Google OAuth** — Calendar, Gmail, Drive sync via PKCE flow
- **Settings** — appearance, connected accounts, layout preferences
- **Profile** — user identity and agent memory management

### Custom File Formats
| Extension | Purpose |
|-----------|----------|
| `.data` | JSON-LD entity collections (people, projects, tasks, finance…) |
| `.note` | Markdown with frontmatter and wikilink support |
| `.canvas` | ReactFlow workspace canvas (nodes + edges + viewport) |
| `.sketch` | Agent's ephemeral visual sketchpad |
| `.web` | Web bookmark / embed (`{ url, title, favicon }`) |
| `.whiteboard` | Excalidraw drawing |
| `.trellis` | Structured bug/task artifact for the agent |

### Why Filegraph vs.
- **vs. Obsidian / Logseq** — fact-centric (triples), not document-centric. All file types are first-class nodes.
- **vs. Notion** — local-first and file-native. The filesystem is the database; no server, no lock-in.
- **vs. RAG chatbots** — durable queryable structure with inspectable graph traversals. You can ask "Why?" and see the exact query path.
- **vs. AI agent platforms** — semantic graph layer makes the agent's reasoning explicit, not generated text.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher) — **enforced; npm/yarn will not work**
- [Rust](https://rustup.rs/) (latest stable)
- [Git](https://git-scm.com/)
- **Linux only**: WebKitGTK 4.1, GTK 3, and related system libraries (see below)

### Installation (macOS / Generic Linux)

1. **Clone the repository**

   ```bash
   git clone https://github.com/trentbrew/filegraph-desktop.git
   cd filegraph-desktop
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm tauri dev
   ```

4. **Build for production**
   ```bash
   pnpm tauri build
   ```

### Installation (NixOS)

A `flake.nix` is included with all Tauri v2 build dependencies pre-configured.

1. **Clone and enter the dev shell**

   ```bash
   git clone https://github.com/trentbrew/filegraph-desktop.git
   cd filegraph-desktop
   nix develop          # or: nix develop --impure  if needed
   ```

2. **Install JS dependencies and run**

   ```bash
   pnpm install
   pnpm tauri dev
   ```

3. **Build for production**
   ```bash
   pnpm tauri build     # produces .deb and .AppImage in src-tauri/target/release/bundle/
   ```

> **Note for non-flake NixOS setups**: You can also use `nix-shell` with the flake's `devShells.default` or manually install the dependencies listed in `flake.nix`.

### Linux System Dependencies (non-NixOS)

If you're on Ubuntu/Debian or another non-NixOS Linux distro:

```bash
sudo apt install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev libappindicator3-dev \
  librsvg2-dev patchelf pkg-config build-essential \
  libssl-dev libdbus-1-dev
```

### First-Time Setup

1. **Launch Filegraph** — an onboarding dialog guides you through vault setup
2. **Choose vault location** — defaults to `~/.filegraph`, or pick a custom directory
3. **Click "Create Vault"** — sets up the folder structure and copies demo files
4. **Start exploring** — you'll land on the Home canvas with demo data pre-loaded

**Default vault path**: `~/.filegraph` (created automatically)

## Technology Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| **Canvas** | ReactFlow, Excalidraw, D3 |
| **Editor** | Tiptap, Monaco Editor, Shiki |
| **AI / Voice** | Gemini 2.5 Flash Native Audio, `@google/genai` SDK, Web Audio API, AudioWorklet |
| **LLM Providers** | Gemini, OpenAI, Anthropic, Groq, Ollama (local) |
| **Desktop** | Tauri 2.0 (Rust), Tokio async runtime |
| **State** | Zustand with persistence |
| **File Parsing** | mammoth (DOCX), xlsx, pdf.js, WaveSurfer, Mermaid |
| **Linking** | Custom remark plugin, EAV graph store, `mdast-util-find-and-replace` |
| **Testing** | Vitest, Playwright |
| **Build** | pnpm, Cargo |

## Project Structure

```
filegraph-desktop/
├── src/
│   ├── components/
│   │   ├── app/
│   │   │   ├── apps/               # App views (Calendar, Profile, Settings…)
│   │   │   ├── settings/           # Settings dialog sections
│   │   │   ├── titleBar.tsx        # Custom window chrome
│   │   │   └── fileStructure.tsx   # File browser + app router
│   │   └── ui/                     # shadcn/ui primitives
│   ├── features/
│   │   ├── agent/
│   │   │   ├── components/         # AgentSidebar, LiveMode, AudioVisualizer…
│   │   │   ├── hooks/              # useChatStore, useModelProvider…
│   │   │   ├── live/               # LiveSession, AudioEngine, toolBridge
│   │   │   ├── tools/              # 10 domain files + barrel index
│   │   │   └── trellis/            # TDF types + renderer
│   │   ├── home/                   # Home canvas (ReactFlow spatial view)
│   │   └── preview/
│   │       └── viewers/            # Per-extension file viewers
│   ├── lib/
│   │   ├── apps/                   # App registry + router
│   │   ├── calendar/               # Calendar types + helpers
│   │   ├── google/                 # OAuth, Calendar API, sync engine
│   │   ├── links/                  # Link parser, indexer, resolver (RFC-001)
│   │   ├── markdown/               # remarkWikiLinks plugin
│   │   ├── namespaces.ts           # Single source of truth for all namespaces
│   │   └── providers/              # LLM provider adapters
│   └── stores/                     # Zustand stores
├── src-tauri/
│   └── src/
│       ├── lib.rs                  # Tauri commands (file I/O, shell, OAuth)
│       ├── ephemeral_token.rs      # Gemini ephemeral token provisioning
│       └── oauth.rs                # Google OAuth callback server
├── docs/
│   └── architecture/               # RFCs and design docs
├── scripts/                        # Dev scripts (evals, data CLI, edge synthesis)
├── public/
│   └── audio-worklet-processor.js  # PCM mic capture (runs in audio thread)
└── flake.nix                       # NixOS dev shell
```

## Vault Structure

The default vault at `~/.filegraph` follows a predictable namespace layout:

```
~/.filegraph/
├── @system/
│   ├── config.data           # Vault configuration
│   ├── user-profile.data     # User identity & preferences
│   ├── memories.data         # Agent long-term memory
│   └── agent-sketch.sketch   # Agent's visual sketchpad
├── @entities/
│   ├── people.data
│   ├── organizations.data
│   ├── projects.data
│   ├── tasks.data
│   └── milestones.data
├── @calendar/
│   └── events.data
├── @finance/
│   ├── accounts.data
│   ├── bills.data
│   └── subscriptions.data
└── @notes/
    └── *.note
```

Entity IDs follow `namespace:slug:index` format (e.g. `person:sarah:001`, `proj:filegraph:001`). All namespace definitions live in `src/lib/namespaces.ts`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘⇧L` | Toggle Live Mode (voice conversation) |
| `⌘K` | Open command bar |
| `Escape` | Close modals / dismiss panels |
| `Enter` | Confirm dialogs |

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) or [Windsurf](https://windsurf.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Scripts

```bash
pnpm dev              # Start frontend dev server only
pnpm tauri dev        # Start full Tauri app with hot reload
pnpm build            # Build frontend for production
pnpm tauri build      # Build complete desktop app
pnpm test             # Run Vitest unit tests
pnpm typecheck        # TypeScript type checking
pnpm agent:eval       # Run agent tool evaluation suite
pnpm data:validate    # Validate demo .data file references
pnpm edge:sync        # Run edge synthesis (apply AI-derived edges)
```

### Adding an Agent Tool

1. Find the appropriate domain file in `src/features/agent/tools/` (e.g. `vault-tools.ts`)
2. Add a `ToolDefinition` entry to `definitions` and a handler to `handlers`
3. The tool is automatically available in text chat (all providers) and Live Mode (Gemini)
4. Run `pnpm test` — `tools/registry.test.ts` validates handler/definition parity

### Architecture Docs

- `docs/architecture/RFC-001-Universal-Linking.md` — bidirectional linking system
- `docs/architecture/RFC-002-Vault-Ontology.md` — namespace & entity architecture
- `GEMINI-HACKATHON.md` — full Devpost submission with architecture diagram

## Troubleshooting

1. **macOS "app is damaged"** — Right-click `Filegraph.app` → **Open** → click **Open** in the dialog. This is required once because the app is not notarized with Apple. If that doesn't work, run: `xattr -cr /Applications/Filegraph.app`
2. **App won't start** — run `pnpm install`, check Rust is installed, clear Vite cache: `rm -rf node_modules/.vite`
3. **Build fails** — `rustup update`, then `pnpm tauri info` to check prerequisites
4. **Live Mode not connecting** — ensure a Gemini API key is set in agent settings or `VITE_GEMINI_API_KEY` env var
5. **Vault not loading** — check that `~/.filegraph` exists; re-run onboarding if needed
6. **npm/yarn blocked** — this project enforces `pnpm` via `preinstall` script; always use `pnpm`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

**Guidelines:** follow existing patterns, run `pnpm test` before committing, use `pnpm` exclusively.

## License

This project is licensed under the **AGPL-3.0-only** license — see the [LICENSE](LICENSE) file for details.

---

**Built by [@trentbrew](https://github.com/trentbrew)**

*A local-first semantic workspace. Your files are the database. The graph is the index. The agent is the interface.*
