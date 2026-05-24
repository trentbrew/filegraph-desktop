/**
 * HomeCanvasSidebar Component
 *
 * Resizable sidebar for the home canvas with file browser
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Folder, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HomeCanvasSidebarProps {
  isOpen: boolean
  onToggle: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  /** If true, hides the built-in toggle button (for external control) */
  hideToggle?: boolean
  /** Callback when sidebar width changes during resize */
  onWidthChange?: (width: number) => void
}

const MIN_WIDTH = 280
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 420

export function HomeCanvasSidebar({
  isOpen,
  onToggle,
  title = 'Files',
  subtitle = 'Drag files onto the canvas',
  children,
  className,
  hideToggle = false,
  onWidthChange,
}: HomeCanvasSidebarProps) {
  const [width, setWidth] = React.useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = React.useState(false)
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const toggleRef = React.useRef<HTMLButtonElement>(null)

  // Handle resize
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = e.clientX
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth)
        onWidthChange?.(newWidth)
      }
    }

    const stopResizing = () => {
      setIsResizing(false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopResizing()
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResizing)
      window.addEventListener('mouseup', stopResizing)
      window.addEventListener('blur', stopResizing)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
      window.removeEventListener('mouseup', stopResizing)
      window.removeEventListener('blur', stopResizing)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Sidebar stays open during canvas interaction - no auto-close behavior needed

  return (
    <>
      {/* Toggle button - top left (can be hidden for external control) */}
      {!hideToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          ref={toggleRef}
          className={cn(
            'absolute border bg-card/50 h-8 w-8 backdrop-blur-sm hover:bg-background/90 z-40 transition-all duration-200 top-7 left-7',
          )}>
          {isOpen ? <X className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        </Button>
      )}

      {/* Sidebar drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -width, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -width, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            ref={sidebarRef}
            style={{ width }}
            className={cn(
              'absolute top-0 left-0 bottom-0 bg-transparent z-30 flex flex-col rounded-l-xl border-none',
              className,
            )}>
            <div className="bg-transparent h-full p-4 flex">
              <div className="bg-muted/90 border backdrop-blur-2xl h-full rounded-lg flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                {/* <div className="p-3 border-b flex items-center justify-between shrink-0">
                  <div className="min-w-0 pl-10">
                    <div className="text-sm font-semibold truncate">{title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
                  </div>
                </div> */}

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
              </div>

              {/* Resize handle */}
              <div
                onMouseDown={handleMouseDown}
                className={cn(
                  'w-2 h-full flex items-center justify-center cursor-col-resize group shrink-0',
                  isResizing && 'bg-primary/10',
                )}>
                <div
                  className={cn(
                    'w-1 h-16 rounded-full transition-colors',
                    isResizing ? 'bg-primary' : 'bg-border group-hover:bg-primary/50',
                  )}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize overlay to prevent pointer events on canvas during resize */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </>
  )
}

export default HomeCanvasSidebar
