'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface CustomPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface CustomPopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface CustomPopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const CustomPopoverContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
} | null>(null)

export function CustomPopover({ open, onOpenChange, children }: CustomPopoverProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <CustomPopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>{children}</CustomPopoverContext.Provider>
  )
}

export function CustomPopoverTrigger({ children, asChild }: CustomPopoverTriggerProps) {
  const context = React.useContext(CustomPopoverContext)
  if (!context) throw new Error('CustomPopoverTrigger must be used within CustomPopover')

  const { open, onOpenChange, triggerRef } = context

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenChange(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': open,
    })
  }

  return (
    <button ref={triggerRef} onClick={handleClick} aria-expanded={open}>
      {children}
    </button>
  )
}

export function CustomPopoverContent({
  children,
  className,
  align = 'start',
  sideOffset = 4,
}: CustomPopoverContentProps) {
  const context = React.useContext(CustomPopoverContext)
  if (!context) throw new Error('CustomPopoverContent must be used within CustomPopover')

  const { open, onOpenChange, triggerRef } = context
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  // Calculate position based on trigger element
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()

    let left = rect.left
    if (align === 'center') {
      left = rect.left + rect.width / 2
    } else if (align === 'end') {
      left = rect.right
    }

    setPosition({
      top: rect.bottom + sideOffset,
      left,
    })
  }, [open, align, sideOffset, triggerRef])

  // Close on click outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        contentRef.current &&
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onOpenChange(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange, triggerRef])

  if (!open) return null

  const content = (
    <div
      ref={contentRef}
      className={cn(
        'fixed bg-popover text-popover-foreground rounded-md border shadow-md outline-none',
        'animate-in fade-in-0 zoom-in-95',
        align === 'start' && 'origin-top-left',
        align === 'center' && 'origin-top -translate-x-1/2',
        align === 'end' && 'origin-top-right -translate-x-full',
        className,
      )}
      style={{
        top: position.top,
        left: position.left,
        zIndex: 99999, // Very high z-index to ensure it's on top
      }}>
      {children}
    </div>
  )

  return createPortal(content, document.body)
}
