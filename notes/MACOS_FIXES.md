# macOS Fixes Applied

## Issues Fixed

### 1. ✅ **Double Title Bar**
**Problem:** Two titlebars were appearing - one native and one custom.

**Solution:** 
- Removed duplicate TitleBar component from `main.tsx`
- Kept single TitleBar component in `App.tsx`
- Changed from rendering TitleBar in both places to rendering only once

**Files Modified:**
- `src/main.tsx` - Removed TitleBar wrapper and simplified structure

---

### 2. ✅ **Window Rounded Corners**
**Problem:** Window had sharp corners, not matching macOS design.

**Solution:**
- Enabled `transparent: true` in Tauri window config
- Added `macOSPrivateApi: true` to enable true window transparency
- Applied `rounded-[12px]` to main container
- Added 1px padding to outer container to show rounded corners
- Matched titlebar radius with `rounded-t-[12px]`

**Files Modified:**
- `src-tauri/tauri.conf.json` - Enabled transparency and macOS private API
- `src/App.tsx` - Added rounded container with padding
- `src/components/app/titleBar.tsx` - Matched top border radius
- `src/App.css` - Set transparent background

---

### 3. ✅ **Window Dragging**
**Problem:** Unable to click and drag window to move it around.

**Solution:**
- Removed `drag` class from entire titlebar (was blocking interactions)
- Added dedicated draggable center area with `flex-1` that fills space between controls
- Kept traffic light buttons and theme toggle as `no-drag` zones
- Title text remains in non-draggable zone with buttons

**Files Modified:**
- `src/components/app/titleBar.tsx` - Added `<div className="flex-1 drag h-full"></div>` center area

**Before:**
```tsx
<div className="... drag"> {/* Everything was draggable */}
```

**After:**
```tsx
<div className="..."> {/* No drag on wrapper */}
  <div className="no-drag">Buttons</div>
  <div className="flex-1 drag h-full"></div> {/* Draggable center */}
  <div className="no-drag">Theme Toggle</div>
</div>
```

---

### 4. ✅ **Native macOS Fullscreen**
**Problem:** Green button used maximize instead of native macOS fullscreen.

**Solution:**
- Changed from `maximize()/unmaximize()` to `setFullscreen()`
- Added `handleFullscreen` function that toggles fullscreen state
- Uses `isFullscreen()` to check current state
- Changed icon from ⌃ to ⤢ for better visual representation

**Files Modified:**
- `src/components/app/titleBar.tsx` - Updated green button functionality

**Code Changes:**
```tsx
// Before
onClick={async () => {
  if (await appWindow.isMaximized()) {
    await appWindow.unmaximize();
  } else {
    await appWindow.maximize();
  }
}}

// After
const handleFullscreen = async () => {
  const isFullscreen = await appWindow.isFullscreen();
  await appWindow.setFullscreen(!isFullscreen);
};
```

---

## Configuration Changes

### Tauri Config (`src-tauri/tauri.conf.json`)
```json
{
  "app": {
    "windows": [
      {
        "decorations": false,
        "transparent": true,      // ← Enabled
        "fullscreen": false       // ← Explicit default
      }
    ],
    "macOSPrivateApi": true      // ← Added for transparency
  }
}
```

### CSS Changes (`src/App.css`)
```css
body {
  @apply bg-transparent text-foreground antialiased;
}

html, body, #root {
  @apply h-full w-full m-0 p-0 overflow-hidden;
}
```

---

## Window Behavior

### Traffic Light Buttons
- 🔴 **Red (Close)**: Closes the application
- 🟡 **Yellow (Minimize)**: Minimizes to dock
- 🟢 **Green (Fullscreen)**: Toggles native macOS fullscreen (not maximize)

### Window Movement
- Click and drag anywhere in the **center area** of the titlebar
- Traffic light buttons are **clickable** (not draggable)
- Theme toggle button is **clickable** (not draggable)
- App name text area is **not draggable** to prevent accidents

### Visual Features
- 12px rounded corners on all sides
- Transparent outer container
- Shadow to lift window from desktop
- Backdrop blur on titlebar for depth
- 1px padding to show rounded corners clearly

---

## Testing Checklist

- [x] Only one titlebar appears
- [x] Window has rounded corners
- [x] Can drag window by clicking titlebar center
- [x] Traffic light buttons work correctly
- [x] Green button enters native fullscreen
- [x] Theme toggle remains clickable
- [x] Window transparency works with macOS desktop
- [x] Border radius matches on all corners

---

## Technical Notes

### macOS Private API
The `macOSPrivateApi` flag enables:
- True window transparency
- Proper layer handling for rounded corners
- Better integration with macOS compositor

**Note:** This is safe for distribution and only uses documented Tauri features.

### Fullscreen vs Maximize
- **Fullscreen**: Native macOS fullscreen mode (separate space, slide animation)
- **Maximize**: Fills screen but stays in current space
- macOS users expect fullscreen, not maximize

### Draggable Regions
- Use `-webkit-app-region: drag` CSS (via `drag` class)
- Must explicitly mark interactive elements as `no-drag`
- Fill entire area you want draggable (flex-1 trick)

---

*Fixes completed on November 8, 2025*
