// @ts-nocheck
// TODO: Custom cursor feature - needs useRef type fix
'use client'

import type React from 'react'
import { createPortal } from 'react-dom'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import {
  MousePointer2,
  Hand,
  Type,
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

// ============================================================================
// Types
// ============================================================================

export type CursorVariant =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'zoom-in'
  | 'zoom-out'
  | 'move'
  | 'crosshair'
  | 'not-allowed'
  | 'wait'
  | 'help'
  | 'copy'
  | 'cell'
  | 'alias'
  | 'col-resize'
  | 'row-resize'
  | 'n-resize'
  | 'e-resize'
  | 's-resize'
  | 'w-resize'
  | 'ne-resize'
  | 'nw-resize'
  | 'se-resize'
  | 'sw-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'none'

interface CursorState {
  variant: CursorVariant
  message: string | null
  isPressed: boolean
  isVisible: boolean
}

interface CursorContextType {
  state: CursorState
  setVariant: (variant: CursorVariant) => void
  setMessage: (message: string | null) => void
  setPressed: (pressed: boolean) => void
  setVisible: (visible: boolean) => void
  reset: () => void
}

// ============================================================================
// Context
// ============================================================================

const defaultState: CursorState = {
  variant: 'default',
  message: null,
  isPressed: false,
  isVisible: true,
}

const CursorContext = createContext<CursorContextType | null>(null)

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CursorState>(defaultState)

  const setVariant = useCallback((variant: CursorVariant) => {
    setState((prev) => ({ ...prev, variant }))
  }, [])

  const setMessage = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, message }))
  }, [])

  const setPressed = useCallback((isPressed: boolean) => {
    setState((prev) => ({ ...prev, isPressed }))
  }, [])

  const setVisible = useCallback((isVisible: boolean) => {
    setState((prev) => ({ ...prev, isVisible }))
  }, [])

  const reset = useCallback(() => {
    setState(defaultState)
  }, [])

  return (
    <CursorContext.Provider value={{ state, setVariant, setMessage, setPressed, setVisible, reset }}>
      {children}
    </CursorContext.Provider>
  )
}

export function useCursor() {
  const context = useContext(CursorContext)
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider')
  }
  return context
}

// ============================================================================
// Cursor Config
// ============================================================================

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
  text: { icon: Type, size: 20, offset: { x: -10, y: -10 }, label: 'Select' },
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

// Tailwind cursor class mapping
const tailwindCursorMap: Record<string, CursorVariant> = {
  'cursor-auto': 'default',
  'cursor-default': 'default',
  'cursor-pointer': 'pointer',
  'cursor-wait': 'wait',
  'cursor-text': 'text',
  'cursor-move': 'move',
  'cursor-help': 'help',
  'cursor-not-allowed': 'not-allowed',
  'cursor-none': 'none',
  'cursor-context-menu': 'default',
  'cursor-progress': 'wait',
  'cursor-cell': 'cell',
  'cursor-crosshair': 'crosshair',
  'cursor-vertical-text': 'text',
  'cursor-alias': 'alias',
  'cursor-copy': 'copy',
  'cursor-no-drop': 'not-allowed',
  'cursor-grab': 'grab',
  'cursor-grabbing': 'grabbing',
  'cursor-all-scroll': 'move',
  'cursor-col-resize': 'col-resize',
  'cursor-row-resize': 'row-resize',
  'cursor-n-resize': 'n-resize',
  'cursor-e-resize': 'e-resize',
  'cursor-s-resize': 's-resize',
  'cursor-w-resize': 'w-resize',
  'cursor-ne-resize': 'ne-resize',
  'cursor-nw-resize': 'nw-resize',
  'cursor-se-resize': 'se-resize',
  'cursor-sw-resize': 'sw-resize',
  'cursor-ew-resize': 'ew-resize',
  'cursor-ns-resize': 'ns-resize',
  'cursor-nesw-resize': 'nesw-resize',
  'cursor-nwse-resize': 'nwse-resize',
  'cursor-zoom-in': 'zoom-in',
  'cursor-zoom-out': 'zoom-out',
}

// ============================================================================
// Helpers
// ============================================================================

function extractRgb(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) }
  }
  return null
}

function getContrastInfo(x: number, y: number): { mode: 'light' | 'dark'; bgColor: string } {
  try {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      if (el === document.documentElement || el === document.body) continue
      if (el.classList.contains('custom-cursor')) continue
      const style = getComputedStyle(el)
      const bg = style.backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const rgb = extractRgb(bg)
        if (rgb) {
          const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
          return { mode: luminance > 0.5 ? 'dark' : 'light', bgColor: bg }
        }
      }
    }
    const bodyStyle = getComputedStyle(document.body)
    const bodyBg = bodyStyle.backgroundColor
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') {
      const rgb = extractRgb(bodyBg)
      if (rgb) {
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
        return { mode: luminance > 0.5 ? 'dark' : 'light', bgColor: bodyBg }
      }
    }
  } catch {
    // Fallback
  }
  return { mode: 'dark', bgColor: 'rgb(255, 255, 255)' }
}

function detectCursorFromClass(className: string): CursorVariant | undefined {
  const classes = className.split(' ')
  for (const cls of classes) {
    if (cls in tailwindCursorMap) {
      return tailwindCursorMap[cls]
    }
  }
  return undefined
}

// ============================================================================
// CustomCursor Component
// ============================================================================

interface CustomCursorProps {
  zoneRef: React.RefObject<HTMLDivElement | null>
}

function CustomCursor({ zoneRef }: CustomCursorProps) {
  const { state } = useCursor()
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [contrastInfo, setContrastInfo] = useState<{ mode: 'light' | 'dark'; bgColor: string }>({
    mode: 'dark',
    bgColor: 'rgb(255, 255, 255)',
  })
  const [isInZone, setIsInZone] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const rafRef = useRef<number>()
  const contrastRafRef = useRef<number>()
  const lastContrastCheck = useRef<number>(0)

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const updatePosition = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY })
        setHasMoved(true)
        const now = Date.now()
        if (now - lastContrastCheck.current > 100) {
          lastContrastCheck.current = now
          if (contrastRafRef.current) cancelAnimationFrame(contrastRafRef.current)
          contrastRafRef.current = requestAnimationFrame(() => {
            setContrastInfo(getContrastInfo(e.clientX, e.clientY))
          })
        }
      })
    }

    const handleMouseEnter = () => setIsInZone(true)
    const handleMouseLeave = () => setIsInZone(false)

    zone.addEventListener('mousemove', updatePosition, { passive: true })
    zone.addEventListener('mouseenter', handleMouseEnter)
    zone.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      zone.removeEventListener('mousemove', updatePosition)
      zone.removeEventListener('mouseenter', handleMouseEnter)
      zone.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (contrastRafRef.current) cancelAnimationFrame(contrastRafRef.current)
    }
  }, [zoneRef])

  if (!state.isVisible || state.variant === 'none' || !isInZone || !hasMoved) return null

  const config = cursorConfig[state.variant]
  const Icon = config.icon
  const displayMessage = state.message || config.label
  const isLight = contrastInfo.mode === 'light'

  const centerX = config.size / 2
  const centerY = config.size / 2

  // Portal to document.body to avoid being affected by parent zoom transforms
  return createPortal(
    <div
      className="custom-cursor pointer-events-none fixed left-0 top-0 z-[9999] flex items-start gap-2"
      style={{
        transform: `translate3d(${position.x + config.offset.x}px, ${position.y + config.offset.y}px, 0)`,
        willChange: 'transform',
      }}
      role="presentation"
      aria-hidden="true">
      <div
        className="relative flex items-center justify-center"
        style={{
          width: config.size,
          height: config.size,
          transform: state.isPressed ? 'scale(0.9)' : 'scale(1)',
          transformOrigin: `${centerX}px ${centerY}px`,
          transition: 'transform 90ms ease-out',
        }}>
        <Icon
          size={config.size}
          className={cn(
            'relative transition-all duration-90',
            isLight ? 'text-white' : 'text-neutral-900',
            state.variant === 'wait' && 'animate-spin',
          )}
          strokeWidth={state.isPressed ? 2.5 : 2}
        />
      </div>
      {displayMessage && (
        <div
          className={cn(
            'mt-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all duration-100',
            isLight ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white',
          )}
          style={{
            transform: state.isPressed ? 'scale(0.95)' : 'scale(1)',
            transformOrigin: 'left center',
          }}>
          {displayMessage}
        </div>
      )}
    </div>,
    document.body,
  )
}

// ============================================================================
// CursorTrigger Component
// ============================================================================

interface CursorTriggerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: CursorVariant
  message?: string
  className?: string
  as?: React.ElementType
}

export function CursorTrigger({
  children,
  variant,
  message,
  className,
  as: Component = 'div',
  ...props
}: CursorTriggerProps) {
  const { setVariant, setMessage, setPressed, reset } = useCursor()
  const elementRef = useRef<HTMLDivElement>(null)
  const detectedVariant = variant || detectCursorFromClass(className || '')

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleMouseEnter = () => {
      if (detectedVariant) setVariant(detectedVariant)
      if (message) setMessage(message)
    }

    const handleMouseLeave = () => reset()

    const handleMouseDown = () => {
      setPressed(true)
      if (detectedVariant === 'grab') setVariant('grabbing')
    }

    const handleMouseUp = () => {
      setPressed(false)
      if (detectedVariant === 'grab') setVariant('grab')
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseup', handleMouseUp)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mouseup', handleMouseUp)
    }
  }, [detectedVariant, message, setVariant, setMessage, setPressed, reset])

  return (
    <Component ref={elementRef} className={cn(className)} {...props}>
      {children}
    </Component>
  )
}

// ============================================================================
// CursorZone Component
// ============================================================================

interface CursorZoneProps {
  children: ReactNode
  className?: string
}

export function CursorZone({ children, className }: CursorZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null)

  return (
    <CursorProvider>
      <div ref={zoneRef} className={cn('custom-cursor-zone relative', className)} style={{ cursor: 'none' }}>
        {children}
        <CustomCursor zoneRef={zoneRef} />
      </div>
    </CursorProvider>
  )
}
