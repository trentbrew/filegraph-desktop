# FileGraph - Query Your Files Like a Database

FileGraph transforms your file system into a queryable knowledge graph. Index local folders, then ask structured questions about your files using TQL (Text Query Language). Think of it as a personal search engine that understands file relationships, content, and metadata.

## 🎯 What Makes FileGraph Different?

Unlike traditional file explorers, FileGraph:
- **Indexes your files** into a local graph database
- **Understands relationships** between files, folders, and content
- **Answers natural questions** like "Show me all PDFs modified in the last week"
- **Tracks changes in real-time** with filesystem watching
- **Stays completely local** - your data never leaves your machine
- **Provides instant insights** with graph-based queries

---

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-WASM-orange?logo=rust)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-blue?logo=tailwindcss)

## ✨ Features

### 🔍 **TQL - Graph Query Language**
- **Structured queries**: Ask questions about your files naturally
- **Relationship traversal**: Navigate connections between files
- **Metadata filtering**: Search by type, size, date, content
- **Full-text search**: Find files by content, not just names
- **Graph statistics**: Get insights about your file structure

### 📊 **Vault-Based Indexing**
- **Index any folder**: Turn any directory into a queryable vault
- **Real-time updates**: Filesystem watching keeps the index fresh
- **Background processing**: Non-blocking indexing with progress tracking
- **Smart indexing**: Respects .gitignore and dotfile preferences
- **Persistent storage**: Indexes survive app restarts

### 📈 **VSCode-Style Status Bar**
- **Live indexing progress**: Phase, files processed, ETA
- **Queue monitoring**: See pending operations in real-time
- **Health indicators**: Connection status, errors, warnings
- **Interactive controls**: Pause, resume, throttle indexing
- **Metrics display**: Files, facts, edges at a glance

### 🗂️ **Vault-Scoped Navigation**
- **Context-aware browsing**: Navigate within indexed vaults
- **Home button**: Jump to vault root, not system home
- **Path boundaries**: Stay focused on your working vault
- **Multiple vaults**: Switch between indexed folders
- **Persistent state**: Remembers your last vault

### 🎨 **Modern UI/UX**
- **Modal vault selector**: Clean, focused indexing experience
- **File type icons**: Visual file type identification
- **Theme support**: Light and dark modes
- **Responsive layout**: Adapts to window size
- **Toast notifications**: Non-intrusive feedback
- **Error panels**: Actionable error drill-through with retry

### 🔧 **Advanced Features**
- **Zod schema validation**: Runtime type safety for all events
- **Heartbeat detection**: Automatic reconnection on failures
- **ETA smoothing**: Accurate time estimates with outlier filtering
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Privacy**: Redacted paths in localStorage
- **Telemetry**: Local analytics for UX optimization

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/trentbrew/filegraph-desktop.git
   cd filegraph-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

### First-Time Setup

1. **Launch FileGraph**
2. **Index your first vault**:
   - Click the **Database icon** (📊) in the bottom-right status bar
   - Enter a folder path (e.g., `~/.filegraph` or any project folder)
   - Click **Index** and watch the progress in the status bar
3. **Start querying**: Once indexed, your files are ready to query with TQL

**Default vault path**: `~/.filegraph` (created automatically if it doesn't exist)

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible UI components
- **TanStack Table**: Powerful table component with sorting, filtering
- **Lucide React**: Beautiful SVG icons
- **Sonner**: Toast notifications
- **Zod**: Runtime type validation

### TQL Runtime (Graph Engine)
- **Rust (WASM)**: High-performance graph indexing compiled to WebAssembly
- **In-memory graph**: Fast traversal and relationship queries
- **Full-text search**: Content indexing and search
- **Incremental updates**: Real-time filesystem watching
- **Persistent storage**: IndexedDB for durable indexes

### Backend
- **Tauri 2.0**: Rust-based desktop app framework
- **Rust**: Systems programming language for performance
- **Serde**: Serialization/deserialization
- **Notify**: Filesystem watching for real-time updates
- **Chrono**: Date and time handling
- **Tokio**: Async runtime

### State Management
- **React Context**: Vault state management
- **Custom hooks**: `useTQL` for graph runtime integration
- **LocalStorage**: Persisting vault paths and preferences

### UI Components
- **Dialogs**: Modal vault selector, confirmation dialogs
- **Status Bar**: VSCode-style progress monitoring
- **Error Panel**: Actionable error drill-through
- **File Browser**: Table/grid/tree/column views
- **Toast**: Non-intrusive notifications (Sonner)

## 📁 Project Structure

```
filegraph/
├── src/                              # React frontend
│   ├── components/
│   │   ├── app/
│   │   │   ├── fileStructure.tsx    # File browser with vault-scoped navigation
│   │   │   ├── vaultSelector.tsx    # Modal dialog for indexing vaults
│   │   │   ├── statusBar.tsx        # VSCode-style status bar with progress
│   │   │   ├── errorPanel.tsx       # Actionable error drill-through
│   │   │   ├── titleBar.tsx         # Custom window title bar
│   │   │   ├── commandsPallet.tsx   # File operations toolbar
│   │   │   ├── previewPane.tsx      # File preview sidebar
│   │   │   └── viewers/             # File type-specific viewers
│   │   └── ui/                      # shadcn/ui components
│   ├── contexts/
│   │   └── VaultContext.tsx         # Global vault state management
│   ├── hooks/
│   │   └── useTQL.ts                # TQL runtime integration hook
│   ├── lib/
│   │   ├── tql/                     # TQL runtime (Rust WASM)
│   │   │   ├── index.ts            # Runtime wrapper
│   │   │   ├── status-types.ts     # Status bar types & Zod schemas
│   │   │   └── debug.ts            # Dev console debugger
│   │   ├── fileIcons.ts            # File type icon mapping
│   │   └── utils.ts                # Utility functions
│   ├── App.tsx                      # Main app component
│   └── main.tsx                     # React entry point
├── src-tauri/                       # Rust backend
│   ├── src/
│   │   ├── lib.rs                  # Tauri commands & file operations
│   │   └── main.rs                 # Main Rust entry point
│   ├── Cargo.toml                  # Rust dependencies
│   └── tauri.conf.json             # Tauri configuration
├── public/                         # Static assets
├── SHIP_CHECKLIST.md              # Production readiness checklist
├── STATUSBAR_IMPLEMENTATION.md    # Status bar architecture docs
└── package.json                   # Node.js dependencies
```

## 🎮 Usage Guide

### Indexing Your First Vault

1. **Launch FileGraph** and click the **Database icon** (📊) in the bottom-right
2. **Enter a folder path** (e.g., `~/Documents`, `~/.filegraph`, or any project folder)
3. **Click "Index"** - Watch the status bar for:
   - **Phase**: Discovery → Full-text search → Embedding
   - **Progress**: Files processed and ETA
   - **Queue**: Pending operations
4. **Wait for completion** - Status shows `"Graph ready — X files • Y facts"`
5. **Start exploring** - Your vault is now queryable!

### Vault-Scoped Navigation

- **Browse vault files**: File browser shows indexed vault contents
- **Home button** (🏠): Jump to vault root, not system home
- **Vault switcher**: Click the green folder indicator (bottom-left) to switch vaults
- **Path boundaries**: Navigation stays within your indexed vault

### Status Bar Features

#### Left Side: Vault Info
- **Folder icon + name**: Current vault (click to switch)
- **Health indicator**: Connection status (green = healthy)

#### Center: Indexing Progress
- **Phase**: Current operation (discovering/fts/embedding)
- **Progress bar**: Visual completion indicator
- **Stats**: `"processed/total (XX%)"` with ETA
- **Queue**: Pending operations count

#### Right: Metrics & Controls
- **Files**: Total indexed files
- **Facts**: Extracted facts/metadata
- **Edges**: Relationships between entities
- **Errors**: Click badge to open error panel
- **Controls**: Pause/resume, settings
- **Index button**: Add new vaults

### File Operations

1. **Browse**: Table, grid, columns, or tree view
2. **Search**: Real-time filter by file name
3. **Preview**: Click file to see preview pane (code, images, PDFs)
4. **Sort**: Click column headers
5. **Multi-select**: Checkboxes for bulk operations

### TQL Queries (Coming Soon)

```tql
# Find recent PDFs
files.type == "pdf" AND files.modified > "2024-01-01"

# Search by content
files.content CONTAINS "typescript"

# Traverse relationships
files -> imports -> files
```

## 🔧 Configuration

### Vault Settings
- **Default path**: `~/.filegraph` (auto-created)
- **Storage**: LocalStorage for vault paths, IndexedDB for graph indexes
- **Dotfiles**: Hidden by default, toggle in settings
- **Gitignore**: Respects `.gitignore` files during indexing

### Status Bar Settings
- **Schema version**: Zod validation ensures compatibility
- **Heartbeat timeout**: 5s (with exponential backoff)
- **Progress updates**: 4Hz (250ms) with RAF batching
- **ETA smoothing**: 30s sliding window with outlier filtering
- **Error log**: Max 100 events

### Window Settings
- **Custom title bar**: macOS-style traffic lights
- **Resizable**: Yes, with minimum size 800x600
- **Theme**: Light/dark mode support
- **Transparency**: Background blur on macOS

### Keyboard Shortcuts
- `⌘I` - Toggle indexing panel (future)
- `⌘⇧I` - Cycle throttle modes (future)
- `Escape` - Close modals
- `Enter` - Confirm dialogs

## 🎨 Customization

### Themes
Customize colors and styling:
- `src/App.css` - Global styles and CSS variables
- `tailwind.config.js` - Tailwind configuration
- Theme toggle in title bar for light/dark modes

### Status Bar
Customize status bar behavior in:
- `src/lib/tql/status-types.ts` - Zod schemas and types
- `src/components/app/statusBar.tsx` - UI and event handling
- Adjust refresh rate, timeout values, ETA smoothing

### File Icons
File type detection and icons:
- `src/lib/fileIcons.ts` - Icon mapping by extension
- Based on Lucide icons
- Extend with new file types as needed

## 🐛 Troubleshooting

### Common Issues

1. **App won't start**
   - Ensure Rust and Node.js are installed
   - Run `npm install` to install dependencies
   - Check that ports 1420 and 1421 are available
   - Clear browser cache: `rm -rf node_modules/.vite`

2. **Indexing stuck or slow**
   - Check console for errors (⌘⌥I)
   - Large folders may take time (watch ETA in status bar)
   - Pause and resume from status bar controls
   - Check error panel (click error badge) for detailed issues

3. **Zero metrics after indexing**
   - Open console and check for `[VaultSelector] Stats: {...}`
   - If stats show 0, TQL runtime didn't process files
   - Try indexing a smaller test folder first
   - Check that folder contains actual files (not empty)

4. **File browser shows system home instead of vault**
   - Reload app after indexing completes
   - Check localStorage for `filegraph_vault_path`
   - Verify vault was indexed successfully (green "Graph ready" toast)

5. **Build fails**
   - Update Rust: `rustup update`
   - Clear node modules: `rm -rf node_modules && npm install`
   - Check Tauri prerequisites: `npm run tauri info`
   - Ensure WASM target: `rustup target add wasm32-unknown-unknown`

6. **Status bar not updating**
   - Check browser console for Zod validation errors
   - Verify TQL runtime is initialized: `window.__tqlRuntime`
   - Check heartbeat timeout (5s default)

## 📝 Development

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [TypeScript Hero](https://marketplace.visualstudio.com/items?itemName=rbbit.typescript-hero)

### Scripts
```bash
npm run dev          # Start frontend dev server only
npm run tauri dev    # Start full Tauri development with hot reload
npm run build        # Build frontend for production
npm run tauri build  # Build complete app for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Dev Console Debugging
Open browser console (⌘⌥I) and access:
```javascript
window.__tqlRuntime      // TQL runtime instance
window.runTQLTests()     // Run test suite
window.inspectGraph()    // Inspect graph structure
window.queryTQL(...)     // Execute TQL queries
```

### Architecture Docs
- `STATUSBAR_IMPLEMENTATION.md` - Status bar design & specs
- `SHIP_CHECKLIST.md` - Production readiness checklist
- `UX_DEBUG_FIXES.md` - Recent UX improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/tql-aggregations`)
3. Commit your changes (`git commit -m 'Add TQL aggregation functions'`)
4. Push to the branch (`git push origin feature/tql-aggregations`)
5. Open a Pull Request

**Development Guidelines:**
- Follow existing code patterns and architecture
- Add tests for new TQL features
- Update docs for user-facing changes
- Run `npm run lint` before committing
- Check Zod schemas for type safety

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework that makes this possible
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful, accessible UI components
- [Lucide](https://lucide.dev/) - Gorgeous icon library
- [TanStack Table](https://tanstack.com/table) - Powerful data table
- [Zod](https://zod.dev/) - Runtime type validation
- [Rust](https://www.rust-lang.org/) - Systems language for WASM runtime

## 🎯 Roadmap

### Near-term (v0.2)
- [ ] TQL query interface in UI
- [ ] Query history and saved queries
- [ ] Vault boundary enforcement
- [ ] Keyboard shortcuts for indexing controls
- [ ] Screen reader accessibility testing

### Mid-term (v0.3)
- [ ] Multiple vault management
- [ ] Graph visualization canvas
- [ ] Advanced TQL: aggregations, joins, subqueries
- [ ] Export query results (JSON, CSV)
- [ ] Cloud sync (optional, encrypted)

### Long-term (v1.0)
- [ ] Natural language to TQL translation (LLM)
- [ ] Collaborative vaults (shared indexes)
- [ ] Plugin system for custom file processors
- [ ] Mobile companion app
- [ ] Enterprise features (SSO, audit logs)

## 📞 Support

Need help? Here's how to get it:
1. **Check docs**: Read this README and `STATUSBAR_IMPLEMENTATION.md`
2. **Search issues**: Browse [existing issues](https://github.com/trentbrew/filegraph-desktop/issues)
3. **Open an issue**: Include logs, screenshots, and steps to reproduce
4. **Discussions**: Ask questions in [GitHub Discussions](https://github.com/trentbrew/filegraph-desktop/discussions)

**Include in bug reports:**
- OS and version (macOS Sonoma, Windows 11, etc.)
- FileGraph version (`npm run tauri info`)
- Console logs (⌘⌥I → Console tab)
- Steps to reproduce

---

**Built with ❤️ by [@trentbrew](https://github.com/trentbrew) using Tauri, React, Rust, and TypeScript**
