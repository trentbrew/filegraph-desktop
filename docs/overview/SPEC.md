I'm working on something relevant to LifeOS and would love to get your thoughts & impressions.

It's called FileGraph, and it is a local-first desktop app that scans the user's file system to enrich files with embeddings & semantic metadata + synthesize relationships/edges between files represented as a JSON-LD graph. The file system can be queried using TQL (https://github.com/trentbrew/tql).

I already have a basic file explorer working working in macos, built with tauri and react:

```
.
├── App.css
├── App.tsx
├── assets
│   └── react.svg
├── components
│   ├── app
│   │   ├── commandsPallet.tsx
│   │   ├── fileStructure.tsx
│   │   ├── themeToggle.tsx
│   │   └── titleBar.tsx
│   ├── themeProvider.tsx
│   └── ui
│       ├── alert.tsx
│       ├── button.tsx
│       ├── checkbox.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── table.tsx
│       └── tooltip.tsx
├── hooks
│   └── use-mobile.ts
├── lib
│   └── utils.ts
├── main.tsx
└── vite-env.d.ts

7 directories, 28 files
```

The app will support an integrated terminal with two modes. The first mode is a traditional bash terminal, and the second mode is a TQL-native terminal that supports a modified bash-esque EAV language for navigating and interacting with the graph.

The app will be agent-native powered by the openai sdk. Think cursor, but optimized for interacting with & understanding the entire system. More of an OS than an IDE. This tauri app is an MCP targeting MacOS, but our telos is to eventually bake this into a custom NixOS distro that treats the tauri app as the main GUI for interacting with the system (there are obvious caveats. happy to answer any questions you have about the roadmap, but for now just bare with me).

What's kinda odd about this app is that in addition to the file-explorer, it will also support a notion/obsidian style workspace or personal knowledge mgmt system (left sidebar will house system entities + custom collections of arbitrary data defined by the user).

Brief overview of the PKM layer:

```
FileGraph type system - a sophisticated semantic graph structure with:
- Nodes (entities with embeddings, metadata, contextual relevance)
- Edges (typed relationships)
- Semantic queries
- Context-aware relevance scoring

The insight: (semantic graphs, agent-native, local-first) could power a complete Personal Operating System.

Expanded Scope (Later conversation)
Handles 30-40+ entity types:
- Core: Notes, Journal, Goals, People, Files
- Communication: Emails, Text Messages, Calendar
- Content: Blog Posts, YouTube Videos, Social Media
- Finance: Transactions, Budgets, Investments
- Knowledge: Articles, Books, Research
- Health: Workouts, Meals, Sleep, Biometrics
- Professional: Opportunities, Projects (code-hq integration)
And more...

This is not a note-taking app - it is moreso akin to Notion + Obsidian + Linear + RescueTime + Mint combined.

Storage Strategy: Hybrid approach
- JSON-LD for semantic graph (queryable via TQL)
- SQLite for large datasets (performance, FTS)
- Local filesystem for media

Integration Strategy: Adapter pattern
- Each data source (Gmail, Calendar, iMessage, etc.) = one adapter
- Incremental sync (not full rescan)
- Background sync worker
- OAuth/API key authentication

Security: Encryption from day one
- Master password
- Selective encryption by entity type (emails, messages, finance)
- AES-256-GCM
```

---

The app will need to support webviews for previewing files, custom integrated editor interfaces for plain text, markdown, code, and multimedia incuding video, audio, images, etc. Unlike Finder, these are not just read-only previews. The preview pane will double as a suite for editing any kind of media or text-based file type.

The app will support many kinds of view types including standard options (columns, nested tree, grid, etc) as well as a spatial canvas/graph which behaves like like a spatial window manager. Webview nodes for previewing content will play the role of tabs.

I'm keen on baking in web browsing as well, but this is much further down the line.

I'm currently putting together an implementation plan for integrating the TQL core package into this app, thinking about how to approach the architecture + ui/ux, tagging system, semantic metadata, ai agent integration,,, basically trying to define what the MVP should be and what features I should include/prioritize.
