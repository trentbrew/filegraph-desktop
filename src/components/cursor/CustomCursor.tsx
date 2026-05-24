// @ts-nocheck
// TODO: Custom cursor feature - needs useRef type fix
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useCursor, type CursorVariant } from './CursorContext'
import {
  MousePointer2,
  Hand,
  TextCursor,
  Grab,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Move,
  Crosshair,
  Ban,
  Loader2,
  HelpCircle,
  Copy,
  Grid3X3,
  Link2,
  GripHorizontal,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Position {
  x: number
  y: number
}

// Map cursor variants to their visual representations
const cursorConfig: Record<
  CursorVariant,
  {
    icon: typeof MousePointer2
    size: number
    offset: { x: number; y: number }
    label: string
  }
> = {
  default: { icon: MousePointer2, size: 20, offset: { x: 0, y: 0 }, label: '' },
  pointer: { icon: Hand, size: 24, offset: { x: -4, y: -2 }, label: 'Click' },
  text: { icon: TextCursor, size: 20, offset: { x: -10, y: -10 }, label: 'Select' },
  grab: { icon: Grab, size: 24, offset: { x: -12, y: -12 }, label: 'Drag' },
  grabbing: { icon: GripVertical, size: 24, offset: { x: -12, y: -12 }, label: 'Dragging' },
  'zoom-in': { icon: ZoomIn, size: 24, offset: { x: -12, y: -12 }, label: 'Zoom in' },
  'zoom-out': { icon: ZoomOut, size: 24, offset: { x: -12, y: -12 }, label: 'Zoom out' },
  move: { icon: Move, size: 24, offset: { x: -12, y: -12 }, label: 'Move' },
  crosshair: { icon: Crosshair, size: 24, offset: { x: -12, y: -12 }, label: 'Select area' },
  'not-allowed': { icon: Ban, size: 24, offset: { x: -12, y: -12 }, label: 'Not allowed' },
  wait: { icon: Loader2, size: 24, offset: { x: -12, y: -12 }, label: 'Loading...' },
  help: { icon: HelpCircle, size: 24, offset: { x: -12, y: -12 }, label: 'Help' },
  copy: { icon: Copy, size: 22, offset: { x: -11, y: -11 }, label: 'Copy' },
  cell: { icon: Grid3X3, size: 22, offset: { x: -11, y: -11 }, label: 'Select cell' },
  alias: { icon: Link2, size: 22, offset: { x: -11, y: -11 }, label: 'Create alias' },
  'col-resize': { icon: GripHorizontal, size: 24, offset: { x: -12, y: -12 }, label: 'Resize column' },
  'row-resize': { icon: GripVertical, size: 24, offset: { x: -12, y: -12 }, label: 'Resize row' },
  'n-resize': { icon: ArrowUp, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'e-resize': { icon: ArrowRight, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  's-resize': { icon: ArrowDown, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'w-resize': { icon: ArrowLeft, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'ne-resize': { icon: ArrowUpRight, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'nw-resize': { icon: ArrowUpLeft, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'se-resize': { icon: ArrowDownRight, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'sw-resize': { icon: ArrowDownLeft, size: 22, offset: { x: -11, y: -11 }, label: 'Resize' },
  'ew-resize': { icon: MoveHorizontal, size: 24, offset: { x: -12, y: -12 }, label: 'Resize' },
  'ns-resize': { icon: MoveVertical, size: 24, offset: { x: -12, y: -12 }, label: 'Resize' },
  'nesw-resize': { icon: MoveVertical, size: 24, offset: { x: -12, y: -12 }, label: 'Resize' },
  'nwse-resize': { icon: MoveVertical, size: 24, offset: { x: -12, y: -12 }, label: 'Resize' },
  none: { icon: MousePointer2, size: 0, offset: { x: 0, y: 0 }, label: '' },
}

// Sample colors at cursor position to determine contrast
function getContrastColor(x: number, y: number): 'light' | 'dark' {
  try {
    const elements = document.elementsFromPoint(x, y)

    // Helper to parse and evaluate color
    const getColorLuminance = (colorStr: string): number | null => {
      if (!colorStr || colorStr === 'rgba(0, 0, 0, 0)' || colorStr === 'transparent') {
        return null
      }

      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }
      return null
    }

    // Check elements from cursor position
    for (const el of elements) {
      if (el === document.documentElement || el === document.body) continue

      const style = getComputedStyle(el)
      const bg = style.backgroundColor
      const luminance = getColorLuminance(bg)

      if (luminance !== null) {
        return luminance > 0.5 ? 'dark' : 'light'
      }
    }

    // Fallback: check body background
    const bodyStyle = getComputedStyle(document.body)
    const bodyBg = bodyStyle.backgroundColor
    const bodyLuminance = getColorLuminance(bodyBg)

    if (bodyLuminance !== null) {
      return bodyLuminance > 0.5 ? 'dark' : 'light'
    }

    // Final fallback: check html/root background
    const htmlStyle = getComputedStyle(document.documentElement)
    const htmlBg = htmlStyle.backgroundColor
    const htmlLuminance = getColorLuminance(htmlBg)

    if (htmlLuminance !== null) {
      return htmlLuminance > 0.5 ? 'dark' : 'light'
    }
  } catch {
    // Fallback on error
  }

  // Ultimate fallback: assume light cursor for dark backgrounds
  return 'light'
}

export function CustomCursor() {
  const { state } = useCursor()
  const [position, setPosition] = useState<Position>({ x: -100, y: -100 })
  const [contrast, setContrast] = useState<'light' | 'dark'>('dark')
  const [isInWindow, setIsInWindow] = useState(false)
  const rafRef = useRef<number>()
  const contrastRafRef = useRef<number>()
  const lastContrastCheck = useRef<number>(0)

  const updatePosition = useCallback((e: MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(() => {
      setPosition({ x: e.clientX, y: e.clientY })

      // Throttle contrast checks to every 100ms for performance
      const now = Date.now()
      if (now - lastContrastCheck.current > 100) {
        lastContrastCheck.current = now
        if (contrastRafRef.current) {
          cancelAnimationFrame(contrastRafRef.current)
        }
        contrastRafRef.current = requestAnimationFrame(() => {
          setContrast(getContrastColor(e.clientX, e.clientY))
        })
      }
    })
  }, [])

  const handleMouseEnter = useCallback(() => setIsInWindow(true), [])
  const handleMouseLeave = useCallback(() => setIsInWindow(false), [])

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    document.addEventListener('mousemove', updatePosition, { passive: true })
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', updatePosition)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (contrastRafRef.current) cancelAnimationFrame(contrastRafRef.current)
    }
  }, [updatePosition, handleMouseEnter, handleMouseLeave])

  // Don't render if cursor should be hidden or variant is 'none'
  if (!state.isVisible || state.variant === 'none' || !isInWindow) {
    return null
  }

  const config = cursorConfig[state.variant]
  const Icon = config.icon
  const displayMessage = state.message || config.label

  const isLight = contrast === 'light'

  // Portal to document.body to avoid being affected by parent transforms
  // (e.g., app-zoom-container which uses transform: scale())
  return createPortal(
    <div
      className={cn(
        'custom-cursor pointer-events-none fixed z-[9999] flex items-start gap-2',
        'transition-transform duration-75 ease-out',
        state.isPressed && 'scale-90',
      )}
      style={{
        transform: `translate3d(${position.x + config.offset.x}px, ${position.y + config.offset.y}px, 0)`,
        willChange: 'transform',
      }}
      role="presentation"
      aria-hidden="true">
      {/* Cursor icon container */}
      <div className="relative flex items-center justify-center transition-all duration-150 ease-out">
        {/* Enhanced glow/shadow for visibility */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-md transition-opacity duration-150',
            // Light glow for dark cursors, dark glow for light cursors
            isLight ? 'bg-white/50' : 'bg-black/40',
          )}
          style={{ width: config.size + 8, height: config.size + 8, margin: -4 }}
        />

        {/* Main icon with inverted contrast logic */}
        <Icon
          size={config.size}
          className={cn(
            'relative transition-all duration-150',
            // Dark cursor on light backgrounds, light cursor on dark backgrounds
            isLight
              ? 'text-gray-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]'
              : 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]',
            state.variant === 'wait' && 'animate-spin',
            state.isPressed && 'opacity-80',
          )}
          strokeWidth={state.isPressed ? 2.5 : 2}
          style={{
            // Add a contrasting stroke for maximum visibility
            filter: isLight
              ? 'drop-shadow(0 0 1px white) drop-shadow(0 0 2px white)'
              : 'drop-shadow(0 0 1px black) drop-shadow(0 0 2px black)',
          }}
        />
      </div>

      {/* Message tooltip */}
      {displayMessage && (
        <div
          className={cn(
            'mt-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all duration-150',
            'backdrop-blur-sm border',
            // Dark text on light backgrounds, light text on dark backgrounds
            isLight
              ? 'bg-white/95 text-gray-900 border-gray-200 shadow-lg'
              : 'bg-gray-900/95 text-white border-gray-700 shadow-lg',
            state.isPressed && 'scale-95 opacity-90',
          )}>
          {displayMessage}
        </div>
      )}
    </div>,
    document.body,
  )
}
