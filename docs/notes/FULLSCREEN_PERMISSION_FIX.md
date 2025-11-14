# Fullscreen Permission Fix

## Issue
Green button (fullscreen) failed with error:
```
Unhandled Promise Rejection: window.set_fullscreen not allowed. 
Permissions associated with this command: core:window:allow-set-fullscreen
```

## Root Cause
Missing Tauri permissions in capabilities configuration file.

## Solution

### File: `src-tauri/capabilities/default.json`

Added two required permissions:

```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "core:window:default", 
    "core:window:allow-start-dragging",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-set-fullscreen",     // ← Added
    "core:window:allow-is-fullscreen"       // ← Added
  ]
}
```

### Permissions Explained

**`core:window:allow-set-fullscreen`**
- Allows calling `appWindow.setFullscreen(true/false)`
- Required for entering/exiting fullscreen mode

**`core:window:allow-is-fullscreen`**
- Allows calling `appWindow.isFullscreen()`
- Required for checking current fullscreen state
- Needed for toggle functionality

---

## Tauri v2 Security Model

Tauri v2 uses a **secure-by-default** permission system. Every API call requires explicit permission.

### Why This Matters

**Before (Tauri v1):**
- All window APIs available by default
- Security through obscurity

**Now (Tauri v2):**
- Every API requires explicit opt-in
- Better security posture
- Clear audit trail of permissions

### Permission Format

```
core:window:allow-<api-name>
│    │      │      └─ API function name
│    │      └─ allow/deny prefix
│    └─ API module (window, path, etc.)
└─ Core or plugin namespace
```

---

## Complete Window Permissions

Current permissions for FileEx window control:

```json
"core:window:allow-start-dragging"   // Drag to reposition
"core:window:allow-close"            // Red button (close)
"core:window:allow-minimize"         // Yellow button (minimize)
"core:window:allow-maximize"         // Not used (have fullscreen instead)
"core:window:allow-unmaximize"       // Not used (have fullscreen instead)
"core:window:allow-set-fullscreen"   // Green button (enter/exit fullscreen)
"core:window:allow-is-fullscreen"    // Check fullscreen state
```

---

## Testing Fullscreen

### Expected Behavior

**First Click (Enter Fullscreen):**
1. Click green button 🟢
2. Window slides to separate space (macOS animation)
3. Titlebar and menu bar hidden
4. Content fills entire screen

**Second Click (Exit Fullscreen):**
1. Click green button 🟢 (or press Esc)
2. Window slides back to original space
3. Titlebar and menu bar return
4. Window returns to previous size

### Keyboard Shortcuts

- **Enter Fullscreen**: Green button or `Cmd+Ctrl+F` (if native)
- **Exit Fullscreen**: Green button or `Esc` key

---

## Code Flow

```tsx
// titleBar.tsx
const handleFullscreen = async () => {
  const isFullscreen = await appWindow.isFullscreen();  // ← needs allow-is-fullscreen
  await appWindow.setFullscreen(!isFullscreen);         // ← needs allow-set-fullscreen
};
```

Without permissions:
```
❌ Call isFullscreen() → Permission denied
❌ Call setFullscreen() → Permission denied
```

With permissions:
```
✅ Call isFullscreen() → returns true/false
✅ Call setFullscreen(false) → exits fullscreen
✅ Call setFullscreen(true) → enters fullscreen
```

---

## Additional Resources

- [Tauri v2 Permissions Guide](https://v2.tauri.app/security/permissions/)
- [Window API Permissions](https://v2.tauri.app/reference/config/#capabilities)
- [Security Best Practices](https://v2.tauri.app/security/overview/)

---

_Fix completed: November 8, 2025_  
_Issue: Missing window permissions_  
_Solution: Added fullscreen permissions to capabilities_  
_Result: Native macOS fullscreen now works_
