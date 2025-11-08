# Window Drag Functionality Fix

## Implementation

### Tauri's Recommended Approach
Used `data-tauri-drag-region` attribute instead of relying solely on CSS classes for more reliable drag behavior.

### Changes Made

#### 1. TitleBar Component (`src/components/app/titleBar.tsx`)

**Parent Container:**
```tsx
<div data-tauri-drag-region className="flex flex-row items-center justify-between h-12 px-3 bg-background/95 backdrop-blur-xl border-b border-border/50 rounded-t-[12px]">
```
- Added `data-tauri-drag-region` to make entire titlebar draggable by default

**Traffic Light Controls:**
```tsx
<div data-tauri-drag-region="false" className="flex items-center gap-2 shrink-0">
  {/* Buttons and FileEx text */}
</div>
```
- Added `data-tauri-drag-region="false"` to make buttons clickable (not draggable)

**Center Spacer:**
```tsx
<div className="flex-1"></div>
```
- Simplified to just a flex spacer (no longer needs `drag` class since parent handles it)

**Theme Toggle:**
```tsx
<div data-tauri-drag-region="false" className="shrink-0">
  <ThemeToggle />
</div>
```
- Added `data-tauri-drag-region="false"` to keep button clickable

#### 2. App Container (`src/App.tsx`)

**Restored Padding:**
```tsx
<div className="h-screen w-screen p-1 m-0 overflow-hidden bg-transparent">
  <div className="h-full flex flex-col overflow-hidden rounded-[12px] bg-background shadow-2xl">
```
- Changed `p-0` back to `p-1` for proper rounded corner visibility
- Restored explicit `rounded-[12px]` on inner container

---

## How It Works

### Drag Region Hierarchy
```
┌─────────────────────────────────────────────────┐
│ data-tauri-drag-region (DRAGGABLE)             │
│ ┌─────────────┐         ┌───────────────────┐ │
│ │ CLICKABLE   │         │ CLICKABLE         │ │
│ │ (false)     │ DRAG ✓  │ (false)          │ │
│ │ 🔴 🟡 🟢    │         │ 🌓               │ │
│ │ FileEx      │         │                  │ │
│ └─────────────┘         └───────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Interaction Zones

**Draggable Areas** (move window):
- Entire titlebar background
- Empty space between controls
- Space above/below controls (within titlebar height)

**Non-Draggable Areas** (clickable):
- 🔴 Close button
- 🟡 Minimize button  
- 🟢 Fullscreen button
- "FileEx" text
- 🌓 Theme toggle button

---

## Technical Details

### `data-tauri-drag-region` Attribute

This is Tauri's official way to define drag regions. It:
- Works at the HTML element level
- Overrides CSS-based drag regions
- More reliable across different platforms
- Supports hierarchical override with `="false"`

### Why This Approach?

**Previous Method** (CSS only):
```css
.drag {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
```
- Required manual class management
- Separate drag `<div>` needed
- Potential for CSS specificity issues

**Current Method** (data attribute):
```tsx
data-tauri-drag-region         // Makes element draggable
data-tauri-drag-region="false"  // Makes element clickable (overrides parent)
```
- Declarative at component level
- No extra DOM elements needed
- Clear hierarchy and overrides
- Recommended by Tauri team

---

## Testing Checklist

- [x] Entire titlebar area is draggable
- [x] Traffic light buttons are clickable (not draggable)
- [x] FileEx text area doesn't interfere with dragging
- [x] Theme toggle button is clickable (not draggable)
- [x] Rounded corners visible with 1px padding
- [x] Empty space between elements is draggable
- [x] Cursor changes appropriately over interactive elements

---

## User Experience

### Expected Behavior

**Click and Drag**:
- Click anywhere on titlebar (gray area)
- Drag to reposition window
- Window follows cursor smoothly

**Click Buttons**:
- Hover over traffic lights → icons appear
- Click → button action executes
- No dragging initiated on button areas

**Theme Toggle**:
- Click toggle → theme switches
- No accidental window dragging

---

## macOS Native Behavior Match

✅ Entire titlebar draggable (like Safari, Finder, etc.)  
✅ Interactive elements remain clickable  
✅ Cursor doesn't change to drag cursor over buttons  
✅ Natural feel for macOS users  

---

_Window drag fix completed: November 8, 2025_  
_Method: Tauri data attributes (recommended approach)_  
_Result: Native macOS drag behavior_
