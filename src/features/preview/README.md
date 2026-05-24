# Preview Feature

File preview pane — renders any vault file in the appropriate viewer. Manages editor tabs (workspace-scoped), preview/edit mode toggle, and backlinks panel.

---

## Directory Structure

```
preview/
├── index.tsx               # PreviewPane — outer container with tab bar + content
├── components/
│   ├── PreviewContent.tsx      # Routes file extension → correct viewer (lazy imports)
│   ├── PreviewHeader.tsx       # Header: mode toggle (preview/edit), actions
│   ├── EditorTabs.tsx          # Editor tab strip (pinned vs preview tabs)
│   ├── FileTabBar.tsx          # Tab bar UI primitives
│   ├── BacklinksPanel.tsx      # Backlinks from link index
│   ├── PreviewStates.tsx       # Loading / error / empty states
│   ├── JsonGraph.tsx           # Mini graph view for .data files
│   ├── WebPreview.tsx          # Web URL preview (iframe)
│   └── UnifiedPreviewCanvas/   # Canvas-based unified preview (experimental)
├── viewers/                # One viewer per file type (lazy-loaded)
│   ├── dataViewer.tsx          # .data files — entity tables, finance views (145 KB, pending split)
│   ├── noteViewer/             # .note files — Tiptap rich text editor
│   ├── canvasViewer.tsx        # .canvas files — ReactFlow canvas (72 KB)
│   ├── sketchViewer.tsx        # .sketch files — Agent sketchpad (51 KB)
│   ├── markdownViewer.tsx      # .md / .note (preview mode) — ReactMarkdown + wikilinks
│   ├── markdownEditor.tsx      # .md (edit mode) — Tiptap
│   ├── codeViewer.tsx          # Code files — Monaco editor
│   ├── imageViewer.tsx         # Images (jpg, png, gif, webp, svg, ...)
│   ├── pdfViewer.tsx           # PDF files
│   ├── audioViewer.tsx         # Audio (mp3, wav, ogg, ...)
│   ├── mediaViewer.tsx         # Video files
│   ├── fontViewer.tsx          # Font files (.ttf, .otf, .woff)
│   ├── docxViewer.tsx          # Word documents (via mammoth)
│   ├── tableViewer.tsx         # Tabular .data files
│   ├── calendarViewer.tsx      # Calendar .data files
│   ├── galleryViewer.tsx       # Image directories as gallery
│   ├── whiteboardViewer.tsx    # .whiteboard files
│   ├── textViewer.tsx          # Plain text files
│   ├── htmlPreview.tsx         # .html files
│   ├── componentPreview.tsx    # React component preview (.tsx)
│   └── SettingsViewer.tsx      # Settings app viewer
└── utils/
    └── ...
```

---

## Key Types

```typescript
// From src/stores/useTabStore.ts
interface EditorTab {
  id: string
  fileId: string         // Absolute file path
  label: string
  isPinned: boolean      // true = permanent; false = preview (italic, replaced on next click)
  fileType?: string
}

interface TabData {
  id: string
  path: string           // Workspace root path
  editorTabs: EditorTab[]
  activeEditorTabId: string | null
}
```

---

## Tab Behavior

- **Single-click** a file → opens as **preview tab** (italic, `isPinned: false`) — replaces existing preview tab
- **Double-click** a file → opens as **pinned tab** (`isPinned: true`) — persists until explicitly closed
- **Sketch files** (`.sketch`) → always pinned to leftmost position; shows Bot icon

## Viewer Registration

`PreviewContent.tsx` routes by file extension using `React.lazy`:

```typescript
// To add a new viewer:
const MyViewer = React.lazy(() => import('./viewers/myViewer'))
// Add to switch/if-else in PreviewContent based on file extension
```

---

## Invariants

1. **Editor tabs are workspace-scoped** — stored inside `TabData`, not globally. Switching workspace shows that workspace's open files.
2. **Lazy loading** — All viewers are lazy-imported. Never import viewers directly at top of `PreviewContent.tsx`.
3. **Preview vs edit mode** — Toggle state lives in `usePreviewStore`. Viewers receive `isEditing` prop.
4. **`PREVIEWABLE_EXTENSIONS`** in `fileStructure.tsx` controls which extensions get double-click pinning.
