'use client'

import type React from 'react'
import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react'
import { useCursor, type CursorVariant } from './CursorContext'
import { cn } from '@/lib/utils'

// Map Tailwind cursor classes to our variants
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

  // Detect cursor variant from className if not explicitly provided
  const detectedVariant = variant || detectCursorFromClass(className || '')

  const handleMouseEnter = () => {
    if (detectedVariant) {
      setVariant(detectedVariant)
    }
    if (message) {
      setMessage(message)
    }
  }

  const handleMouseLeave = () => {
    reset()
  }

  const handleMouseDown = () => {
    setPressed(true)
    // Auto-switch to grabbing when pressing on grab
    if (detectedVariant === 'grab') {
      setVariant('grabbing')
    }
  }

  const handleMouseUp = () => {
    setPressed(false)
    // Switch back from grabbing to grab
    if (detectedVariant === 'grab') {
      setVariant('grab')
    }
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

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
  }, [detectedVariant, message])

  return (
    <Component ref={elementRef} className={cn(className)} {...props}>
      {children}
    </Component>
  )
}

// Helper to detect cursor type from Tailwind classes
function detectCursorFromClass(className: string): CursorVariant | undefined {
  const classes = className.split(' ')
  for (const cls of classes) {
    if (cls in tailwindCursorMap) {
      return tailwindCursorMap[cls]
    }
  }
  return undefined
}
