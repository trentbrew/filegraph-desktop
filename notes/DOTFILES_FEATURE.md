# Dotfiles Toggle Feature

## Overview
Added ability to show/hide dotfiles (files and folders starting with `.`) with visual differentiation through reduced opacity.

## Implementation

### 1. State Management

```tsx
const [showDotfiles, setShowDotfiles] = React.useState(false);
```

**Default:** Hidden (false) - matches common file explorer behavior

### 2. Data Filtering

```tsx
const filteredData = React.useMemo(() => {
  if (showDotfiles) return data;
  return data.filter(item => !item.name.startsWith('.'));
}, [data, showDotfiles]);
```

**Performance:** Uses `useMemo` to avoid re-filtering on every render
**Logic:** Filters out items starting with `.` when toggle is off

### 3. Visual Styling

```tsx
cell: ({ row }) => {
  const fileItem = row.original;
  const isDotfile = fileItem.name.startsWith('.');
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
      <div className="shrink-0">
        {getFileIcon(fileItem.file_type, fileItem.extension)}
      </div>
      <span className={`truncate font-medium text-sm ${
        isDotfile ? 'opacity-50' : ''
      }`}>
        {fileItem.name}
      </span>
    </div>
  );
}
```

**Opacity:** 50% for dotfile labels (subtle but clear distinction)
**Applied to:** File/folder name text only, not icon

### 4. UI Toggle Button

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowDotfiles(!showDotfiles)}
  className="gap-2"
>
  {showDotfiles ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
  Dotfiles
</Button>
```

**Location:** Between Search input and Columns dropdown
**Icons:** 
- 👁️ Eye (visible) when dotfiles are shown
- 🙈 EyeOff (hidden) when dotfiles are hidden

---

## User Experience

### Default State (Dotfiles Hidden)
```
Folder listing:
- Documents/
- Downloads/
- Projects/
[.git is hidden]
[.DS_Store is hidden]
```

### Toggle ON (Dotfiles Visible)
```
Folder listing:
- Documents/
- Downloads/
- Projects/
- .git          ← 50% opacity
- .DS_Store     ← 50% opacity
```

---

## Visual Design Rationale

### Why 50% Opacity?

**Visibility:** Still readable but clearly de-emphasized
**Hierarchy:** Shows dotfiles are "secondary" content
**Convention:** Matches common UI pattern for "less important" items
**Accessibility:** 50% maintains sufficient contrast for readability

### Icon Choice

**Eye (visible):** Universal symbol for "visible/shown"
**EyeOff (hidden):** Universal symbol for "hidden/invisible"
**Consistency:** Matches macOS/Linux terminal conventions

---

## Common Dotfiles in macOS

Will be hidden by default:
- `.git/` - Git repository folder
- `.gitignore` - Git ignore rules
- `.DS_Store` - macOS folder metadata
- `.vscode/` - VS Code settings
- `.env` - Environment variables
- `.cache/` - Cache directories
- `.config/` - Configuration files

---

## Keyboard Shortcut (Future Enhancement)

Could add:
```tsx
// Cmd+Shift+. (macOS Finder standard)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.shiftKey && e.key === '.') {
      e.preventDefault();
      setShowDotfiles(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Technical Details

### Filter Performance

**useMemo Optimization:**
```tsx
const filteredData = React.useMemo(() => {
  if (showDotfiles) return data;
  return data.filter(item => !item.name.startsWith('.'));
}, [data, showDotfiles]);
```

**Dependency Array:** `[data, showDotfiles]`
- Re-filters only when data changes OR toggle changes
- Prevents unnecessary filtering on other state updates

**Early Return:** If showing dotfiles, skip filter entirely

### Dotfile Detection

```tsx
item.name.startsWith('.')
```

**Simple & Efficient:** String prefix check
**Universal:** Works for both files and folders
**Standard:** Matches Unix/Linux/macOS convention

---

## Integration Points

### Commands Palette
Future enhancement could add "Show/Hide Dotfiles" action to commands palette.

### Context Menu
Could add right-click option to toggle dotfiles visibility.

### Persistence
Could save preference to localStorage:
```tsx
const [showDotfiles, setShowDotfiles] = React.useState(() => {
  return localStorage.getItem('showDotfiles') === 'true';
});

useEffect(() => {
  localStorage.setItem('showDotfiles', String(showDotfiles));
}, [showDotfiles]);
```

---

## Testing Checklist

- [x] Toggle button displays correct icon
- [x] Clicking toggle shows/hides dotfiles
- [x] Dotfiles have 50% opacity when visible
- [x] Regular files maintain 100% opacity
- [x] Filter performance is optimal (useMemo)
- [x] Button state reflects current visibility
- [ ] Keyboard shortcut (future)
- [ ] Preference persistence (future)

---

## Examples

### Hidden State (Default)
```
User sees:
Applications/
Desktop/
Documents/
Downloads/

Hidden from view:
.Trash/
.CFUserTextEncoding
.DS_Store
```

### Visible State
```
User sees:
Applications/
Desktop/
Documents/
Downloads/
.CFUserTextEncoding    ← dimmed
.DS_Store              ← dimmed
.Trash/                ← dimmed
```

---

_Feature completed: November 8, 2025_  
_Default state: Dotfiles hidden_  
_Visual treatment: 50% opacity when shown_  
_Toggle location: Next to search bar_
