'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

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

const defaultState: CursorState = {
  variant: 'default',
  message: null,
  isPressed: false,
  isVisible: true,
}

const CursorContext = createContext<CursorContextType | null>(null)

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

function detectVariantFromElement(el: HTMLElement | null): { variant?: CursorVariant; message?: string | null } {
  if (!el) return {}

  const withData = el.closest('[data-cursor-variant],[data-cursor-message]') as HTMLElement | null
  const target = withData || el

  const dataVariant = target.getAttribute('data-cursor-variant') as CursorVariant | null
  const dataMessage = target.getAttribute('data-cursor-message')
  if (dataVariant) {
    return { variant: dataVariant, message: dataMessage || null }
  }

  for (const cls of Array.from(el.classList)) {
    if (tailwindCursorMap[cls]) {
      return { variant: tailwindCursorMap[cls], message: dataMessage || null }
    }
  }

  return { message: dataMessage || null }
}

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

  // Global hover + press listeners so the cursor reacts without explicit triggers
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      const { variant, message } = detectVariantFromElement(target)
      if (variant) {
        setVariant(variant)
      }
      if (message !== undefined) {
        setMessage(message)
      }
    }

    const handlePointerDown = () => setPressed(true)
    const handlePointerUp = () => setPressed(false)
    const handlePointerLeave = () => setPressed(false)

    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [setVariant, setMessage, setPressed])

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
