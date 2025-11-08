# macOS Design Updates

## Overview
Transformed FileEx from Windows-style to macOS-flavored design with native-feeling UI elements and styling.

## Key Changes

### 1. **Title Bar (`titleBar.tsx`)**
- ✅ Replaced Windows-style controls (minimize/maximize/close on right) with macOS traffic lights on left
- ✅ Added authentic macOS traffic light colors:
  - 🔴 Red (Close): `#FF5F57`
  - 🟡 Yellow (Minimize): `#FFBD2E`
  - 🟢 Green (Maximize): `#28C840`
- ✅ Hover states reveal control icons (×, −, ⌃)
- ✅ Glassmorphic effect with `backdrop-blur-xl` and semi-transparent background
- ✅ Subtle shadows and smooth transitions

### 2. **Window Configuration (`tauri.conf.json`)**
- ✅ Changed `titleBarStyle` from `"Transparent"` to `"Overlay"`
- ✅ Added `hiddenTitle: true` for cleaner look
- ✅ Increased default size to 1000x700
- ✅ Added minimum window dimensions (800x600)

### 3. **Color Palette (`App.css`)**
#### Light Mode
- Softer, warmer neutrals typical of macOS Big Sur/Monterey/Ventura
- Background: `oklch(0.98 0 0)` - near-white with subtle warmth
- Primary accent: Blue-tinted `oklch(0.5 0.15 250)`
- Refined borders with low opacity: `oklch(0.88 0.005 250)`

#### Dark Mode
- True dark theme inspired by macOS dark mode
- Background: `oklch(0.18 0.005 250)` - deep blue-tinted gray
- Muted elements with subtle blue undertones
- Softer contrast ratios for reduced eye strain

### 4. **UI Components**
- ✅ Increased border radius from `0.625rem` to `0.75rem` for softer corners
- ✅ Added backdrop blur effects to toolbar and titlebar
- ✅ Refined table borders with transparency: `border-border/60`
- ✅ Added subtle shadows: `shadow-sm`
- ✅ Rounded table container to `rounded-xl`

### 5. **Typography & Details**
- ✅ Added `antialiased` class for smoother text rendering
- ✅ macOS-style scrollbars with rounded, semi-transparent thumbs
- ✅ Smooth scroll behavior
- ✅ Optimized Tailwind classes (e.g., `flex-shrink-0` → `shrink-0`)

### 6. **Layout Structure (`App.tsx`)**
- ✅ Integrated TitleBar component
- ✅ Proper overflow handling with flexbox layout
- ✅ Maintained file explorer functionality

## Visual Features

### Traffic Light Buttons
```tsx
- Red (Close): Shows × on hover
- Yellow (Minimize): Shows − on hover  
- Green (Maximize/Restore): Shows ⌃ on hover
- Smooth 150ms transitions
- Shadow effects on hover
```

### Glassmorphism
- Titlebar: 95% opacity with blur
- Toolbar: 80% opacity with subtle blur
- Creates depth and modern macOS feel

### Scrollbars
- Transparent track
- Semi-transparent rounded thumb (10px)
- Appears only when scrolling (macOS behavior)
- Different opacity for light/dark modes

## Design Principles Applied

1. **Native macOS Feel**: Traffic lights, colors, and spacing match macOS design language
2. **Subtle Depth**: Layered backgrounds with blur and transparency
3. **Consistent Spacing**: Refined padding and margins throughout
4. **Soft Corners**: Increased border radius for modern look
5. **Smooth Interactions**: 150ms transitions, hover states, shadow effects

## Before vs After

### Before (Windows-style)
- Window controls on right (X, □, −)
- Sharp corners and high contrast borders
- Generic light/dark theme
- Flat design

### After (macOS-style)
- Traffic lights on left (🔴 🟡 🟢)
- Rounded corners and subtle borders
- macOS-inspired color palette
- Layered glassmorphic design
- Native-feeling scrollbars

## Browser Preview
The app runs in Tauri with native-like window decorations while maintaining web technologies (React, Vite, TailwindCSS).

## Color Reference

### Light Mode
```css
--background: oklch(0.98 0 0)
--foreground: oklch(0.2 0 0)
--primary: oklch(0.5 0.15 250)
--border: oklch(0.88 0.005 250)
```

### Dark Mode
```css
--background: oklch(0.18 0.005 250)
--foreground: oklch(0.92 0.005 250)
--primary: oklch(0.6 0.18 250)
--border: oklch(0.32 0.01 250)
```

## Technologies
- **Tauri v2**: Native macOS window management
- **React 19**: UI framework
- **TailwindCSS 4**: Styling with custom theme
- **Vite 7**: Build tooling with HMR
- **shadcn/ui**: Component library adapted for macOS aesthetic

---

*Design completed on November 8, 2025*
