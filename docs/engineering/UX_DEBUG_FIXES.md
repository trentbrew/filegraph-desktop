# UX & Debug Fixes - Vault Scoping + Zero Metrics Investigation

## 🎯 Issues Fixed

### Issue 1: Vault Scope & Navigation (UX)
**Problem:** After indexing `~/.filegraph`, file browser still showed `/Users/trentbrew` (system home) and users could navigate outside vault boundaries.

**Root Cause:** 
- FileStructure component initialized to system home directory
- Home button navigated to system home, not vault root
- No concept of "vault" in the file browser

**Solution Implemented:**
1. **Created VaultContext** (`src/contexts/VaultContext.tsx`)
   - Persists vault path in localStorage
   - Provides `vaultPath`, `setVaultPath`, and `isWithinVault` to all components
   
2. **Updated VaultSelector** (`src/components/app/vaultSelector.tsx`)
   - Calls `setVaultPath(inputPath)` after successful indexing
   - Adds debug logging for stats investigation
   
3. **Updated FileStructure** (`src/components/app/fileStructure.tsx`)
   - Uses `vaultPath` for initial directory (instead of system home)
   - Home button now navigates to vault root (or system home if no vault)
   - Reloads automatically when vault path changes
   - Added debug logging for vault awareness

4. **Updated App** (`src/App.tsx`)
   - Wrapped with `VaultProvider` to make vault context available globally

---

### Issue 2: Zero Metrics (Debug)
**Problem:** Status bar shows `"0 files • 0 facts"` even after successful indexing.

**Debugging Added:**
- VaultSelector now logs stats immediately after indexing completes
- FileStructure logs initial path and vault awareness
- Console logs will help identify where stats get lost

**Check Console For:**
```
[VaultSelector] Indexing complete. Stats: { uniqueEntities: X, totalFacts: Y, ... }
[VaultSelector] Vault path set to: /path/to/vault
[FileStructure] Loading initial directory: /path/to/vault (vault: /path/to/vault)
```

**Possible Root Causes:**
1. **Stats not generated** - indexing didn't actually process files
2. **Stats not persisted** - TQL runtime has stats but they're not reaching StatusBar
3. **Stats reset** - Something is clearing stats after indexing

---

## 🧪 Testing Instructions

### Test 1: Vault Scoping
1. **Open app** - Should start in system home or last vault
2. **Click Database icon** (bottom right) - Modal opens
3. **Enter vault path** (e.g., `/Users/trentbrew/.filegraph`)
4. **Click Index** - Indexing starts
5. **Wait for completion** - Modal closes after 1s
6. **Verify file browser** - Should now show vault contents, NOT system home
7. **Click home icon** (next to search) - Should navigate to vault root, not `/Users/trentbrew`

**Expected Console Output:**
```
[VaultSelector] Indexing complete. Stats: {...}
[VaultSelector] Vault path set to: /Users/trentbrew/.filegraph
[FileStructure] Loading initial directory: /Users/trentbrew/.filegraph (vault: /Users/trentbrew/.filegraph)
```

---

### Test 2: Stats Investigation
1. **Index a non-empty vault** (folder with files)
2. **Open browser console** (⌘⌥I)
3. **Check for stats log**:
   ```
   [VaultSelector] Indexing complete. Stats: {
     uniqueEntities: 247,  // ← Should be > 0
     totalFacts: 891,      // ← Should be > 0
     ...
   }
   ```
4. **Check status bar** - Should now show `"247 files • 891 facts"`

**If stats are still 0:**
- Check console for `Stats: { uniqueEntities: 0, totalFacts: 0 }`
- This means indexing didn't process any files (bug in TQL runtime or file filtering)

**If stats are non-zero in console but 0 in UI:**
- Check `useTQL` hook state management
- Verify `StatusBar` is reading from correct `useTQL` instance

---

## 📋 Files Modified

### Created:
- `src/contexts/VaultContext.tsx` - Vault state management

### Modified:
- `src/App.tsx` - Wrapped with VaultProvider
- `src/components/app/vaultSelector.tsx` - Sets vault path, adds debug logs
- `src/components/app/fileStructure.tsx` - Uses vault path for nav, home button, initial dir

---

## 🚀 Expected Behavior After Fixes

**Before:**
```
1. Index ~/.filegraph
2. Browser still shows /Users/trentbrew
3. Home button goes to /Users/trentbrew
4. Can navigate anywhere on system
5. Stats show "0 files • 0 facts"
```

**After:**
```
1. Index ~/.filegraph
2. Browser automatically shows ~/.filegraph contents
3. Home button goes to ~/.filegraph
4. Navigation scoped to vault (future: add boundary enforcement)
5. Stats show "X files • Y facts" (if indexing worked)
```

---

## 🐛 Debug Checklist

If issues persist, check:

### Vault Path:
- [ ] Console shows `[VaultContext] Setting vault path: ...`
- [ ] localStorage has `filegraph_vault_path` key
- [ ] FileStructure receives vault path in `useVault()` hook

### Stats:
- [ ] Console shows non-zero stats after indexing
- [ ] `useTQL` hook updates state on `ingest_done` event
- [ ] StatusBar reads from same `useTQL` instance as VaultSelector
- [ ] TQL runtime actually processed files (check for ingest logs)

### Navigation:
- [ ] FileStructure's initial `currentPath` matches `vaultPath`
- [ ] Home button calls `navigateHome()` with vault path
- [ ] Effect dependency `[vaultPath]` triggers reload

---

## 🔍 Next Steps

### If Vault Scoping Works:
1. **Add boundary enforcement** - Prevent navigation outside vault
2. **Add visual indicator** - Show vault root in breadcrumb/title
3. **Add vault switching** - UI to change vaults without re-indexing

### If Stats Still Zero:
1. **Check TQL runtime logs** - Is `ingestFile()` being called?
2. **Verify file filtering** - Are files being skipped (dotfiles, gitignore)?
3. **Test with simple folder** - Create `/tmp/test` with 3 .txt files
4. **Add breakpoints** - In `handleRuntimeEvent` case `'ingest_done'`

---

## 💡 Additional Notes

**Vault Persistence:**
- Vault path survives app restarts (stored in localStorage)
- Clearing localStorage resets to system home

**Home Button Behavior:**
- No vault set → goes to `/Users/username`
- Vault set → goes to vault root (e.g., `~/.filegraph`)

**Stats Update Flow:**
```
1. VaultSelector calls actions.scanDirectory()
2. TQL runtime processes files
3. Runtime emits 'ingest_done' event
4. useTQL hook updates state.stats
5. StatusBar re-renders with new stats
```

**Why This Matters (UX):**
- Users expect scoped navigation in vault-based apps
- Home button should be contextual to current workspace
- Stats validate that indexing actually worked
- Clear boundaries improve user confidence and trust
