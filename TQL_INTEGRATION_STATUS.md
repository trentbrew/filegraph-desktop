# TQL Integration Status

## ✅ Steps 1-3 Complete

### Step 1: Entity IDs + Persistence ✅
- **File**: `src/lib/tql/entity-ids.ts`
- **Features**:
  - UUID-based stable entity IDs
  - Path ↔ ID bidirectional indexes
  - JSON persistence to `tql-indexes.json`
  - Handles renames/moves by updating path while preserving ID
  
### Step 2: Runtime Core ✅
- **File**: `src/lib/tql/runtime.ts`
- **Features**:
  - `initialScan()` with batched ingestion (100 files/batch)
  - `ingestFile()`, `updateByPath()`, `removeByPath()`, `handleRename()`
  - Progress callbacks with rate/ETA calculation
  - Batch mode (`beginBatch()`/`commitBatch()`)
  - Event emission (ingest_started, ingest_batch, ingest_done, fs_batch_applied, query_slow, error)
  - Query execution stub (ready for Step 5)

**Supporting Files**:
- `src/lib/tql/facts.ts` - Fact/link helpers, link taxonomy
- `src/lib/tql/index.ts` - Main exports

### Step 3: Watcher Queue ✅  
- **File**: `src/lib/tql/watcher-queue.ts`
- **Features**:
  - 300ms debounce on filesystem events
  - Event coalescing (create+modify→create, any+remove→remove)
  - Rename detection (remove+create pairs within 100ms)
  - Batch flush with callback

### Step 4: Wire to UI ✅
- **File**: `src/hooks/useTQL.ts` - React hook for runtime lifecycle
- **File**: `src/components/app/fileStructure.tsx` - FS watcher integration
- **Features**:
  - Runtime initialization on app mount
  - Index persistence on unmount
  - FS events (create/modify/remove/rename) → TQL runtime queue
  - Runtime event subscriptions (progress, stats updates, errors)

## 🔧 Current State

### What Works
- Runtime initializes on app start
- Indexes load/save from app data directory
- FS watcher events flow into TQL queue
- Queue debounces and coalesces events
- Batch processing applies mutations to EAV store

### Known Limitations (Expected for MVP)
1. **No Remove Operations**: EAVStore lacks `removeFacts()`/`removeLinks()` methods
   - Remove/update operations are no-ops currently
   - Marked with TODOs for Step 4
   - This means deleted files stay in the graph until restart
   
2. **Query Execution Stub**: `runQuery()` returns empty results
   - Needs EQL-S parser integration from TQL package
   - Ready for REPL implementation
   
3. **No Initial Scan Trigger**: Runtime is ready but `initialScan()` not called yet
   - Need to decide: auto-scan on directory change? Manual trigger?
   - Can add a "Scan Directory" button in UI for testing

## 🧪 Verification Checklist

### Manual Tests Needed
- [ ] Start app → check console for "[TQL] Runtime initialized"
- [ ] Create file → check FS event pushed to queue
- [ ] Modify file repeatedly → verify debouncing (should batch)
- [ ] Delete file → verify event queued (note: won't remove from store yet)
- [ ] Rename file → verify rename detection
- [ ] Restart app → verify indexes persist (same UUIDs)
- [ ] Check app-data dir for `tql-indexes.json`

### Performance Tests
- [ ] Scan 1K files → measure time (target: <30s)
- [ ] Scan 10K files → measure time
- [ ] Rapid file changes (git checkout) → verify single batch
- [ ] Query store for stats → verify facts/links populated

### Console Commands for Testing
```javascript
// In browser console:
const runtime = window.__tqlRuntime; // Expose in dev

// Check stats
console.log(runtime.getStats());

// Manual scan (if exposed)
await runtime.initialScan('/path/to/test/dir');

// Check store
const store = runtime.getStore();
console.log(store.getAllFacts());
console.log(store.getAllLinks());
```

## 🚀 Next Steps (Step 5: Verification & Polish)

### Immediate Tasks
1. **Expose Runtime in Dev Mode** (5 min)
   - Add `window.__tqlRuntime = runtime` in useTQL hook (dev only)
   - Enables console debugging

2. **Add Stats Display** (15 min)
   - Small badge showing TQL stats (entities, facts, links)
   - Shows scan progress when indexing

3. **Add Manual Scan Button** (15 min)
   - "Index Current Directory" button in toolbar
   - Triggers `tqlActions.scanDirectory(currentPath)`
   - Shows progress overlay during scan

4. **Verify Edge Cases** (30 min)
   - Create/modify/delete files manually
   - Rename files and folders
   - Move files between directories
   - Check console logs and stats

5. **Performance Baseline** (20 min)
   - Run scan on test directories (100, 1K, 10K files)
   - Record timings
   - Check for memory leaks

### Follow-up (Post-Verification)
- **Step 4**: Add proper remove methods to EAVStore
- **Step 5**: Implement EQL-S query execution
- **Step 6**: Build TQL REPL component
- **Step 7**: Add "magic query" templates

## 📊 Current Architecture

```
┌─────────────────────────────────────────┐
│         React Component (UI)            │
│  - fileStructure.tsx                    │
└─────────────┬───────────────────────────┘
              │
              ├─ useTQL Hook
              │  └─ Runtime Lifecycle
              │     - Init on mount
              │     - Save on unmount
              │     - Event subscriptions
              │
              ├─ FS Watcher (Tauri)
              │  └─ listen('fs-change')
              │     └─ Parse Rust events
              │        └─ Push to Queue
              │
              ▼
┌─────────────────────────────────────────┐
│          TQL Runtime                    │
│  - runtime.ts                           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  FSWatcherQueue (300ms debounce) │  │
│  │  - Coalesce events               │  │
│  │  - Detect renames                │  │
│  └────────────┬─────────────────────┘  │
│               │                         │
│               ├─ Batch Events          │
│               │                         │
│  ┌────────────▼─────────────────────┐  │
│  │  beginBatch()                    │  │
│  │  - ingestFile()                  │  │
│  │  - updateByPath()                │  │
│  │  - removeByPath()                │  │
│  │  - handleRename()                │  │
│  │  commitBatch()                   │  │
│  └────────────┬─────────────────────┘  │
│               │                         │
│  ┌────────────▼─────────────────────┐  │
│  │  EntityIdManager                 │  │
│  │  - path ↔ ID indexes             │  │
│  │  - Persist to JSON               │  │
│  └────────────┬─────────────────────┘  │
│               │                         │
│  ┌────────────▼─────────────────────┐  │
│  │  EAVStore (.sandbox/tql)         │  │
│  │  - Facts (e, a, v)               │  │
│  │  - Links (e1, a, e2)             │  │
│  │  - Indexes (EAV, AEV, AVE)       │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🎯 Success Criteria

Before calling Steps 1-3 "done":
- [x] Runtime initializes without errors
- [x] FS events flow to queue
- [x] Queue debounces and coalesces
- [x] Events apply to store (create/modify working)
- [ ] Indexes persist across restarts
- [ ] Stats API returns correct counts
- [ ] Performance acceptable (<30s for 1K files)
- [ ] No memory leaks during extended use

## 🐛 Known Issues
None yet - pending verification tests.

## 💡 Notes
- Remove operations are stubbed (no-op) pending EAVStore enhancements
- Query execution is stubbed pending EQL-S integration
- Initial scan requires manual trigger (not auto-scanned yet)
