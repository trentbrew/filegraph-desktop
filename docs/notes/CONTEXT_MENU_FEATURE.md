# Context Menu Feature

## Overview
Added right-click context menu to file/folder rows with the same actions as the three-dot dropdown menu, appearing at cursor position.

## Implementation

### 1. Component Installation

**Package Added:**
```bash
npm install @radix-ui/react-context-menu
```

**Component Created:**
- `src/components/ui/context-menu.tsx`
- Based on Radix UI Context Menu primitive
- Styled to match shadcn/ui design system

### 2. Integration

**Location:** Table rows in `fileStructure.tsx`

```tsx
<ContextMenu key={row.id}>
  <ContextMenuTrigger asChild>
    <TableRow>
      {/* Row content */}
    </TableRow>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-48">
    {/* Menu items */}
  </ContextMenuContent>
</ContextMenu>
```

**Key Details:**
- Wrapped each `TableRow` with `ContextMenu`
- Used `asChild` prop to avoid extra DOM nodes
- Menu appears at cursor position on right-click

### 3. Menu Actions

All actions match the three-dot dropdown menu:

#### **Open**
- Folders: Navigate into folder
- Files: Open with default application

#### **Copy Path**
- Copies full file path to clipboard
- Shows success/error toast

#### **Copy Name**
- Copies just the filename to clipboard
- Shows success/error toast

#### **Rename**
- Opens native prompt dialog
- Validates input (non-empty, different from current)
- Updates file system via Tauri invoke
- Refreshes view on success

#### **Properties**
- Placeholder for future implementation
- Could show file details, permissions, etc.

#### **Delete**
- Opens native confirmation dialog
- Irreversible action warning
- Deletes via Tauri invoke
- Refreshes view on success

---

## User Experience

### Triggering Context Menu

**Desktop:**
- Right-click on any file or folder row
- Menu appears at cursor position

**Alternative Triggers:**
- Context menu key (Windows)
- Shift+F10 (Windows/Linux)
- Control+click (macOS with single-button mouse)

### Visual Behavior

**Menu Appearance:**
- Smooth fade-in animation
- Positioned at cursor
- Stays within viewport boundaries
- Closes on click outside or Esc key

**Menu Items:**
- Hover highlight on focus
- Delete item in red (destructive action)
- Separators group related actions
- Disabled state when applicable

---

## Code Structure

### Context Menu Component Structure

```tsx
ContextMenu                    // Root wrapper
├── ContextMenuTrigger        // What user right-clicks
│   └── TableRow              // Actual row (asChild)
└── ContextMenuContent        // Popup menu
    ├── ContextMenuItem       // Individual action
    ├── ContextMenuSeparator  // Visual divider
    └── ...more items
```

### Action Handlers

All actions inline within JSX:

```tsx
<ContextMenuItem onClick={() => {
  // Action logic
  invoke('tauri_command', { params })
    .then(() => toast.success('Success!'))
    .catch((error) => toast.error(`Failed: ${error}`));
}}>
  Action Label
</ContextMenuItem>
```

**Why Inline:**
- Each row needs its own `fileItem` context
- Closures capture correct file data
- Simpler than prop drilling or context

---

## Differences from Dropdown Menu

### Similarities
✅ Exact same actions  
✅ Same visual styling  
✅ Same success/error handling  
✅ Same confirmation dialogs  

### Differences

| Aspect | Context Menu | Dropdown Menu |
|--------|-------------|---------------|
| **Trigger** | Right-click anywhere on row | Click three-dot button |
| **Position** | At cursor | Below button |
| **Selection** | No selection required | No selection required |
| **Accessibility** | Keyboard context menu key | Keyboard + Enter |
| **Visual** | Appears instantly | Requires finding button |

---

## Accessibility

### Keyboard Support

**Open Menu:**
- Right-click (mouse)
- Context menu key
- Shift+F10
- Control+click (macOS)

**Navigate Menu:**
- Arrow keys (↑↓) - Move between items
- Enter - Activate item
- Esc - Close menu
- Tab - Focus next item (when open)

### Screen Readers

- **ARIA roles**: Menu items properly labeled
- **Focus management**: Focus moves to menu on open
- **Announcements**: Actions announced when triggered
- **Destructive actions**: "Delete" clearly indicated

---

## Radix UI Context Menu Features

Built on `@radix-ui/react-context-menu` which provides:

- **Auto-positioning**: Keeps menu within viewport
- **Collision detection**: Avoids screen edges
- **Portal rendering**: Renders outside DOM hierarchy
- **Focus management**: Traps focus within menu
- **Keyboard navigation**: Full arrow key support
- **Escape handling**: Closes on Esc key
- **Click outside**: Closes when clicking elsewhere
- **Animation support**: Smooth enter/exit transitions

---

## Menu Item Types Available

Currently using:

- **ContextMenuItem**: Standard clickable item
- **ContextMenuSeparator**: Visual divider line

Available for future use:

- **ContextMenuCheckboxItem**: Toggle on/off
- **ContextMenuRadioGroup**: Single selection
- **ContextMenuSub**: Nested submenu
- **ContextMenuLabel**: Non-interactive header
- **ContextMenuShortcut**: Keyboard shortcut display

---

## Future Enhancements

### Multiple Selection Support
```tsx
{selectedItems.length > 1 && (
  <>
    <ContextMenuItem onClick={handleDeleteMultiple}>
      Delete {selectedItems.length} items
    </ContextMenuItem>
    <ContextMenuSeparator />
  </>
)}
```

### Submenu Example
```tsx
<ContextMenuSub>
  <ContextMenuSubTrigger>Open With</ContextMenuSubTrigger>
  <ContextMenuSubContent>
    <ContextMenuItem>Text Editor</ContextMenuItem>
    <ContextMenuItem>Code Editor</ContextMenuItem>
    <ContextMenuItem>Choose Application...</ContextMenuItem>
  </ContextMenuSubContent>
</ContextMenuSub>
```

### Keyboard Shortcuts
```tsx
<ContextMenuItem>
  Rename
  <ContextMenuShortcut>F2</ContextMenuShortcut>
</ContextMenuItem>
```

### Properties Dialog
Replace placeholder with actual modal:
```tsx
<ContextMenuItem onClick={() => setPropertiesOpen(true)}>
  Properties
</ContextMenuItem>

<Dialog open={propertiesOpen} onOpenChange={setPropertiesOpen}>
  {/* File properties UI */}
</Dialog>
```

---

## Testing Checklist

- [x] Right-click opens menu at cursor
- [x] Menu items match dropdown menu
- [x] All actions work correctly
- [x] Toasts show on success/failure
- [x] Menu closes after action
- [x] Menu closes on Esc key
- [x] Menu closes on click outside
- [x] Delete shows confirmation
- [x] Rename validates input
- [x] Copy actions update clipboard
- [x] Menu respects viewport boundaries
- [ ] Keyboard navigation works
- [ ] Screen reader announces items
- [ ] Context menu key triggers menu

---

## Performance Considerations

### Render Optimization

**Challenge:** Context menu on every row could be expensive

**Solution:** Lazy rendering
- Context menu only renders when opened
- Menu content not in DOM until triggered
- Portal rendering keeps menu separate from table

**Memory:** Minimal overhead
- Each row has menu wrapper (lightweight)
- Menu content created on-demand
- Cleaned up when menu closes

---

## Platform-Specific Notes

### macOS
- Right-click works natively
- Control+click as alternative
- Context menu key not available (no key on keyboard)

### Windows
- Right-click works natively
- Context menu key works (key between Alt and Ctrl)
- Shift+F10 as alternative

### Linux
- Right-click works natively
- Context menu key works (most keyboards)
- Shift+F10 as alternative

---

## Design Rationale

### Why Context Menu?

**Efficiency:**
- Faster than finding three-dot button
- Works from anywhere on row
- Muscle memory for power users

**Discoverability:**
- Right-click is universal pattern
- Still have three-dot menu as fallback
- Both options better than just one

**Flexibility:**
- Can add row-specific actions
- Can show different items based on file type
- Room for multi-select actions

### Why Same Actions?

**Consistency:**
- Users expect same actions in both places
- No confusion about capabilities
- Familiar options regardless of trigger method

**Maintainability:**
- Single source of truth for actions
- Could refactor to shared component later
- Easier to add new actions to both

---

_Feature completed: November 8, 2025_  
_Package: @radix-ui/react-context-menu_  
_Component: context-menu.tsx_  
_Integration: Right-click on table rows_
