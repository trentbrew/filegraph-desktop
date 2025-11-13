# TQL Integration Verification Tests

Run these console tests to verify the TQL pipeline before building UI.

## Setup

1. Start the dev server: `bun run dev`
2. Open the app
3. Open browser DevTools console (Cmd+Option+I)
4. Look for initialization logs:
   ```
   [TQL] Runtime initialized { totalFacts: 0, totalLinks: 0, ... }
   [TQL Hook] Runtime exposed to window.__tqlRuntime
   [TQL] Debugger exposed to window.tql
   [TQL] Type tql.help() for available commands
   ```

## Quick Commands

```javascript
// Get help
tql.help()

// Check stats
tql.stats()

// View facts
tql.facts(10)

// View links
tql.links(10)

// View schema
tql.catalog()
```

## Test 1: Runtime Initialization ✅

**Goal**: Verify runtime loads and exposes APIs

```javascript
// Check runtime exists
window.__tqlRuntime
// Should return: TQLRuntime instance

// Check initial stats
tql.stats()
// Should show:
// {
//   totalFacts: 0,
//   totalLinks: 0,
//   uniqueEntities: 0,
//   uniqueAttributes: 0,
//   totalEntities: 0,
//   dirty: false,
//   queueSize: 0,
//   queueProcessing: false
// }
```

**Expected**: Runtime initialized, stats show zeros (no files indexed yet)

**If fails**: Check console for initialization errors

---

## Test 2: Manual File Ingestion ✅

**Goal**: Verify `ingestFile()` adds facts to store

```javascript
// Get the runtime
const runtime = window.__tqlRuntime;

// Create a test file
await window.__TAURI__.core.invoke('write_text_file', {
  filePath: '/tmp/tql-test-file.txt',
  content: 'hello world'
});

// Manually ingest (bypassing watcher)
// Note: We need to provide FileItem structure
const testFile = {
  name: 'tql-test-file.txt',
  path: '/tmp/tql-test-file.txt',
  file_type: 'file',
  size: 11,
  modified: Date.now(),
  created: Date.now(),
  extension: 'txt'
};

await runtime.ingestFile('/tmp/tql-test-file.txt', testFile);

// Check stats
tql.stats()
// Should show:
// - totalEntities: 1
// - totalFacts: 6-8 (path, name, type, size, modified, created, ext, hidden)
// - totalLinks: 0 (no parent in /tmp)

// View the facts
tql.facts()
// Should show facts for the file entity

// Query by attribute
tql.attribute('type')
// Should show: [{ e: "file:...", a: "type", v: "file" }]

// Save indexes
await tql.save()
```

**Expected**: 
- Stats increment correctly
- Facts visible in store
- No errors thrown

**If fails**:
- Check if `ingestFile()` calls `store.addFacts()`
- Check if facts array is properly formatted
- Verify EAVStore is accepting facts

---

## Test 3: Watcher Pipeline ✅

**Goal**: Verify FS events → queue → ingestion

```javascript
// Navigate to a test directory in the UI
// (Use the path input or navigate normally)

// Watch console for:
// [FS Event Raw] { kind: "...", paths: [...] }
// [FS Event Parsed] { eventKind: "create", paths: [...] }

// Create a file in the watched directory
// Use Finder or terminal:
// touch /path/to/watched/dir/test-watcher.txt

// Wait 500ms for debounce
await new Promise(r => setTimeout(r, 500));

// Check stats
tql.stats()
// Should show totalEntities increased

// View recent facts
tql.facts(20)
// Should include facts for test-watcher.txt
```

**Expected**:
- Raw FS event logged
- Parsed event logged
- Stats increment after debounce
- New file appears in facts

**If fails**:
- Check if FS watcher is started (`start_watch` called)
- Check event parsing logic (kind string format)
- Check if `pushFSEvent` is called
- Check if queue flushes after debounce

---

## Test 4: Event Coalescing ✅

**Goal**: Verify rapid changes batch into single update

```javascript
// Rapid fire file modifications
const testPath = '/tmp/tql-rapid-test.txt';

for (let i = 0; i < 10; i++) {
  await window.__TAURI__.core.invoke('write_text_file', {
    filePath: testPath,
    content: `version ${i}`
  });
}

// Check queue stats immediately
tql.queue()
// Should show: { size: 10, processing: false }

// Wait for debounce
await new Promise(r => setTimeout(r, 500));

// Check queue again
tql.queue()
// Should show: { size: 0, processing: false } (flushed)

// Check console logs
// Should see: [TQL] Applied X FS events in Yms
// Where X < 10 (events were coalesced)
```

**Expected**:
- Multiple events coalesced into fewer batches
- Only 1-2 batch applications, not 10
- No errors during rapid changes

**If fails**:
- Check `mergeEvents()` logic in watcher-queue
- Check debounce timer reset logic
- Verify batch is applied only once

---

## Test 5: Rename Detection ✅

**Goal**: Verify entity ID preserved across renames

```javascript
const runtime = window.__tqlRuntime;

// Create a file
const originalPath = '/tmp/tql-rename-test.txt';
await window.__TAURI__.core.invoke('write_text_file', {
  filePath: originalPath,
  content: 'test content'
});

// Wait for ingestion
await new Promise(r => setTimeout(r, 500));

// Get entity ID (need to access idManager - not exposed yet)
// For now, verify via facts
const factsBefore = tql.attribute('path').filter(f => f.v === originalPath);
console.log('Entity before rename:', factsBefore[0]?.e);
const entityIdBefore = factsBefore[0]?.e;

// Rename the file
const newPath = '/tmp/tql-renamed-test.txt';
// Note: Tauri might not have a rename_file command, use system command
// Or manually test by renaming in Finder

// Wait for rename detection
await new Promise(r => setTimeout(r, 500));

// Get entity ID after
const factsAfter = tql.attribute('path').filter(f => f.v === newPath);
console.log('Entity after rename:', factsAfter[0]?.e);
const entityIdAfter = factsAfter[0]?.e;

// Verify IDs match
console.assert(
  entityIdBefore === entityIdAfter,
  'Entity ID should be preserved across renames!'
);
```

**Expected**:
- Entity ID stays the same
- Path fact updated to new path
- Name fact updated to new name

**If fails**:
- Check rename detection in `detectRenames()`
- Check `handleRename()` implementation
- Verify `updatePath()` in EntityIdManager
- Check if remove+create pairs are detected

---

## Test 6: Directory Scan ✅

**Goal**: Verify `initialScan()` indexes entire directory

```javascript
const runtime = window.__tqlRuntime;

// Scan a test directory (adjust path)
const testDir = '/Users/trentbrew/TURTLE/Projects/Apps/filegraph/src/lib/tql';

console.log('Starting scan...');
await runtime.initialScan(testDir, (progress) => {
  console.log(`Progress: ${progress.processed}/${progress.total} (${progress.phase})`);
});

console.log('Scan complete!');

// Check stats
tql.stats()
// Should show many entities now

// View some facts
tql.facts(50)

// View links (parent→child)
tql.links(20)

// Check catalog
tql.catalog()
// Should show attributes: type, path, name, size, modified, created, ext, hidden
```

**Expected**:
- All files in directory indexed
- Progress callbacks fire
- Facts and links populated
- No errors during scan

**If fails**:
- Check `scanDirectoryRecursive()` logic
- Verify `list_directory` Tauri command works
- Check batching logic
- Look for memory issues with large scans

---

## Debugging Tips

### Check Raw Rust Events
```javascript
// Events are logged automatically in dev mode
// Look for: [FS Event Raw] { kind: "Create(File)", paths: [...] }
// This shows exact format from Rust
```

### Inspect Store Directly
```javascript
const store = window.__tqlRuntime.getStore();

// All facts
store.getAllFacts()

// All links
store.getAllLinks()

// Facts for specific entity
store.getFactsByEntity('file:abc-123-...')

// Facts by attribute
store.getFactsByAttribute('type')

// Catalog (schema)
store.getCatalog()
```

### Force Queue Flush
```javascript
// Not exposed yet, but you can trigger by:
// 1. Wait 300ms after last event
// 2. Or create a test event that forces flush
```

### Check Indexes
```javascript
// Path → ID index (not exposed to window yet)
// Would need to add to debugger

// For now, verify via facts:
tql.attribute('path')
// Each unique 'e' (entity) should have one path
```

---

## Success Criteria

Before proceeding to UI:

- ✅ Runtime initializes without errors
- ✅ Manual ingestion adds facts correctly
- ✅ FS watcher events trigger ingestion
- ✅ Rapid changes coalesce into batches
- ✅ Rename preserves entity IDs
- ✅ Directory scan indexes all files
- ✅ No memory leaks during operations
- ✅ Stats API returns correct counts

---

## Common Issues

### Issue: "Cannot read properties of undefined (reading 'getStats')"
**Fix**: Runtime not initialized yet. Wait for console log "[TQL Hook] Runtime initialized"

### Issue: Stats stay at 0 after file operations
**Fix**: Events not reaching store. Check:
1. Is watcher started? (look for `start_watch` call)
2. Are events logged? (look for `[FS Event Raw]`)
3. Is queue flushing? (wait 500ms, check `tql.queue()`)

### Issue: Rename creates new entity instead of preserving ID
**Fix**: Rename detection not working. Check:
1. What events does Rust send? (single rename or remove+create?)
2. Is `detectRenames()` logic correct?
3. Are timestamps within 100ms threshold?

### Issue: App crashes on file operations
**Fix**: Rust event format mismatch. Check:
1. Log raw events: `[FS Event Raw]`
2. Compare to expected format in `fileStructure.tsx`
3. Adjust parsing logic

---

## Next Steps

Once all tests pass:
1. Add stats badge to UI
2. Add "Scan Directory" button
3. Build TQL REPL component
4. Add magic query templates
5. Implement proper remove operations (Step 4)
