/**
 * Canvas Node Wrapper Component
 *
 * A generic wrapper that provides consistent toolbar behavior for all canvas nodes.
 * Includes hover toolbars, drag/resize handles, and connection handles.
 */

import * as React from 'react'
import { Position, NodeToolbar, useViewport } from 'reactflow'
import { Handle } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { X, Maximize, Minimize, GripHorizontal, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Custom Resize Handle Styles using SVG background
// ─────────────────────────────────────────────────────────────────────────────

const CORNER_ROTATIONS: Record<string, number> = {
  'top-left': 180,
  'top-right': 270,
  'bottom-left': 90,
  'bottom-right': 0,
}

const getHandleStyle = (corner: string, visible: boolean): React.CSSProperties => ({
  width: '16px',
  height: '16px',
  opacity: visible ? 1 : 0,
  transition: 'opacity 150ms ease',
  background: `url("data:image/svg+xml;utf8,<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' transform='rotate(${CORNER_ROTATIONS[corner]})'><path d='M1.5 14C8 14 14 14.5 14 1.5' stroke='%23888888' stroke-width='3' stroke-linecap='round'/></svg>") no-repeat center center`,
  backgroundSize: 'contain',
  border: 'none',
  transform: 'translate(-50%, -50%)',
})

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Center Drag Handle
// ─────────────────────────────────────────────────────────────────────────────

function DragHandle({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20',
        'w-8 h-4 flex items-center justify-center',
        'rounded-full bg-muted/80 border border-border/50 backdrop-blur-sm',
        'cursor-grab active:cursor-grabbing',
        'transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}>
      <GripHorizontal className="h-3 w-3 text-muted-foreground/60" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled Handle

function StyledHandle({
  type,
  position,
  id,
  visible = false,
}: {
  type: 'source' | 'target'
  position: Position
  id?: string
  visible?: boolean
}) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={cn(
        'w-3! h-3! border-2! border-background! transition-all duration-150 rounded-full',
        visible
          ? 'bg-muted-foreground/60! hover:bg-primary! hover:scale-125! opacity-100'
          : 'bg-transparent! opacity-0 pointer-events-none',
      )}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CanvasNodeWrapperProps {
  /** Node ID from ReactFlow */
  id: string
  /** Whether the node is selected */
  selected: boolean
  /** Whether the node is in editing mode (double-clicked) */
  isEditing?: boolean
  /** Callback when editing mode changes */
  onEditingChange?: (editing: boolean) => void
  /** Whether the node is maximized */
  isMaximized?: boolean
  /** Icon to display in the toolbar */
  icon: React.ReactNode
  /** Label to display in the toolbar */
  label: string
  /** Additional content for the left toolbar (e.g., loading indicator) */
  toolbarLeftExtra?: React.ReactNode
  /** Additional content for the right toolbar (e.g., extra buttons) */
  toolbarRightExtra?: React.ReactNode
  /** Minimum width for resizing */
  minWidth?: number
  /** Minimum height for resizing */
  minHeight?: number
  /** Whether the node is resizable (default: true) */
  resizable?: boolean
  /** Whether the node should auto-size to fit content (default: false) */
  autoSize?: boolean
  /** Whether to lock aspect ratio during resize (default: false) */
  keepAspectRatio?: boolean
  /** Additional class names for the wrapper */
  className?: string
  /** Children to render inside the node */
  children: React.ReactNode
  /** Whether to show connection handles */
  showHandles?: boolean
  /** Custom ring color class when selected (single-click) */
  selectedRingClass?: string
  /** Custom ring color class when editing (double-click) */
  editingRingClass?: string
  /** Custom border class */
  borderClass?: string
  /** Custom background class */
  bgClass?: string
  /** Group color for visual indicator */
  groupColor?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CanvasNodeWrapper({
  id,
  selected,
  isEditing = false,
  onEditingChange,
  isMaximized = false,
  icon,
  label,
  toolbarLeftExtra,
  toolbarRightExtra,
  minWidth = 200,
  minHeight = 150,
  resizable = true,
  autoSize = false,
  keepAspectRatio = false,
  className,
  children,
  showHandles = false,
  selectedRingClass = 'ring-1 ring-muted-foreground/40',
  editingRingClass = 'ring-2 ring-primary/70',
  borderClass,
  bgClass = 'bg-card',
  groupColor,
}: CanvasNodeWrapperProps) {
  // Hover state with delay to prevent flicker
  const [isHovered, setIsHovered] = React.useState(false)
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const leftToolbarRef = React.useRef<HTMLDivElement | null>(null)
  const rightToolbarRef = React.useRef<HTMLDivElement | null>(null)
  const [isToolbarCompact, setIsToolbarCompact] = React.useState(false)
  const [measuredNodeWidthPx, setMeasuredNodeWidthPx] = React.useState<number | null>(null)

  // Exit editing mode when node is deselected
  React.useEffect(() => {
    if (!selected && isEditing && onEditingChange) {
      onEditingChange(false)
    }
  }, [selected, isEditing, onEditingChange])

  const handleMouseEnter = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(true)
  }, [])

  const handleMouseLeave = React.useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 300) // Longer delay for smoother UX
  }, [])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Event handlers
  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  const handleMaximize = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
    },
    [id],
  )

  const handleDetails = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-details', { detail: { id } }))
    },
    [id],
  )

  // Toolbar visibility: show when hovered OR selected, but not when maximized
  const showToolbar = (isHovered || selected) && !isMaximized

  // Get zoom level to conditionally hide label when zoomed out
  const { zoom } = useViewport()
  const isZoomedOut = zoom < 0 // Threshold for hiding label

  const SINGLE_CLICK_INTERACT_ZOOM_THRESHOLD = 0.85

  const handleClickCapture = React.useCallback(
    (e: React.MouseEvent) => {
      // Enable node interactivity (pointer events) on *single click* only when:
      // - already selected (so it takes a deliberate second click)
      // - zoomed in enough to avoid accidental activation when zoomed out
      // - not clicking toolbar/buttons/resize handles
      if (!onEditingChange) return
      if (isMaximized) return
      if (!selected) return
      if (isEditing) return
      if (zoom < SINGLE_CLICK_INTERACT_ZOOM_THRESHOLD) return
      if (e.detail !== 1) return

      const target = e.target as HTMLElement
      if (target.closest('button')) return
      if (target.closest('.react-flow__resize-control')) return
      if (target.closest('.react-flow__handle')) return

      onEditingChange(true)
    },
    [isEditing, isMaximized, onEditingChange, selected, zoom],
  )

  React.useLayoutEffect(() => {
    if (!showToolbar) {
      setIsToolbarCompact(false)
      return
    }

    const measure = () => {
      const rootEl = rootRef.current
      const leftEl = leftToolbarRef.current
      const rightEl = rightToolbarRef.current

      if (!rootEl || !leftEl || !rightEl) return

      // Node scales with zoom, toolbars do not (NodeToolbar is viewport-anchored),
      // so compare *screen px* using getBoundingClientRect().
      const nodeWidth = rootEl.getBoundingClientRect().width
      const leftWidth = leftEl.getBoundingClientRect().width
      const rightWidth = rightEl.getBoundingClientRect().width

      setMeasuredNodeWidthPx((current) => (current === nodeWidth ? current : nodeWidth))

      const minGap = 12
      const nextCompact = nodeWidth > 0 && leftWidth + rightWidth + minGap > nodeWidth

      setIsToolbarCompact((current) => (current === nextCompact ? current : nextCompact))
    }

    measure()

    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        measure()
      })
    })
    if (rootRef.current) observer.observe(rootRef.current)
    if (leftToolbarRef.current) observer.observe(leftToolbarRef.current)
    if (rightToolbarRef.current) observer.observe(rightToolbarRef.current)

    return () => {
      observer.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [showToolbar, zoom])

  // Handle double-click to enter editing mode
  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger if clicking on toolbar buttons
      if ((e.target as HTMLElement).closest('button')) return
      if (onEditingChange) {
        e.preventDefault()
        e.stopPropagation()
        onEditingChange(true)
        // Dispatch event to zoom and center on this node
        window.dispatchEvent(
          new CustomEvent('canvas-node-focus', {
            detail: { id },
          }),
        )
      }
    },
    [onEditingChange, id],
  )

  return (
    <div
      ref={rootRef}
      className={cn(
        'canvas-node group relative flex flex-col overflow-hidden',
        bgClass,
        'border rounded-lg shadow-md transition-all duration-150',
        // Border styling: editing > selected > default
        borderClass || (isEditing ? 'border-primary' : selected ? 'border-muted-foreground/50' : 'border-border'),
        // Ring styling: editing gets prominent ring, selected gets subtle ring
        isEditing ? editingRingClass : selected && selectedRingClass,
        // Group ring: colored ring for grouped nodes
        groupColor && `ring-2 ring-${groupColor}/50`,
        isMaximized && 'canvas-node-maximized',
        autoSize && 'w-fit h-fit',
        // Enter animation: quick fade + scale (150ms)
        'animate-in fade-in-0 zoom-in-95 duration-150',
        // Exit animation: slow fade + scale (500ms)
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-500',
        className,
      )}
      style={autoSize ? { minWidth, minHeight } : { minWidth, minHeight, width: '100%', height: '100%' }}
      data-maximized={isMaximized}
      data-editing={isEditing}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClickCapture={handleClickCapture}
      onDoubleClickCapture={handleDoubleClick}>
      {/* NodeResizer with custom curved SVG handles */}
      {resizable && !isMaximized && (
        <NodeResizer
          isVisible={selected}
          minWidth={minWidth}
          minHeight={minHeight}
          keepAspectRatio={keepAspectRatio}
          handleStyle={getHandleStyle('bottom-right', selected)}
          lineStyle={{ borderColor: 'transparent' }}
        />
      )}
      {/* Bottom center drag handle - always available for dragging */}
      {!isMaximized && <DragHandle visible={selected || isHovered} />}
      {/* Node Toolbar - top-left: icon + label (hidden when zoomed out) */}
      <AnimatePresence>
        {!isZoomedOut && showToolbar && (
          <NodeToolbar
            isVisible={true}
            position={Position.Top}
            align="start"
            offset={8}
            className="flex items-center gap-1.5 px-2 py-1 bg-transparent rounded-md -translate-x-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <motion.div
              ref={leftToolbarRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex items-center gap-1.5">
              {icon}
              <span
                className="text-xs font-medium text-foreground truncate"
                style={{
                  maxWidth:
                    measuredNodeWidthPx != null
                      ? Math.max(48, Math.min(150, measuredNodeWidthPx - (isToolbarCompact ? 44 : 96)))
                      : 150,
                }}>
                {label}
              </span>
              {toolbarLeftExtra}
            </motion.div>
          </NodeToolbar>
        )}
      </AnimatePresence>
      {/* Node Toolbar - top-right: controls */}
      <AnimatePresence>
        {showToolbar && (
          <NodeToolbar
            isVisible={true}
            position={Position.Top}
            align="end"
            offset={8}
            className={cn(
              'flex items-center gap-2 px-1 py-1 bg-transparent rounded-md',
              isToolbarCompact && 'pointer-events-none opacity-0',
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <motion.div
              ref={rightToolbarRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex items-center gap-2.5">
              {toolbarRightExtra}
              <button
                type="button"
                onClick={handleDetails}
                className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Details">
                <Info className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleMaximize}
                className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Maximize">
                <Maximize className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </NodeToolbar>
        )}
      </AnimatePresence>
      {/* Children (node content) */}
      {children}
      {/* Connection Handles - always render for edge connections to work */}
      {!isMaximized && (
        <>
          <StyledHandle
            type="target"
            position={Position.Top}
            id="top"
            visible={showHandles && (isHovered || selected)}
          />
          <StyledHandle
            type="source"
            position={Position.Bottom}
            id="bottom"
            visible={showHandles && (isHovered || selected)}
          />
          <StyledHandle
            type="target"
            position={Position.Left}
            id="left"
            visible={showHandles && (isHovered || selected)}
          />
          <StyledHandle
            type="source"
            position={Position.Right}
            id="right"
            visible={showHandles && (isHovered || selected)}
          />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Maximized Header Component (for use inside nodes when maximized)
// ─────────────────────────────────────────────────────────────────────────────

export interface MaximizedHeaderProps {
  icon: React.ReactNode
  label: string
  extra?: React.ReactNode
  onExit: () => void
}

export function MaximizedHeader({ icon, label, extra, onExit }: MaximizedHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-0 border-b border-border bg-muted/30 shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-foreground opacity-50">{label}</span>
        {extra}
      </div>
      <button
        type="button"
        onClick={onExit}
        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Exit fullscreen (Esc)">
        <Minimize className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the group color for a node based on its ID
 */
export function getGroupColorForNode(
  nodeId: string,
  groups: { nodeIds: string[]; color?: string }[],
): string | undefined {
  for (const group of groups) {
    if (group.nodeIds.includes(nodeId)) {
      return group.color
    }
  }
  return undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Group-Aware Node Wrapper HOC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Higher-order component that wraps a node component and injects groupColor
 * This allows nodes to display visual indicators when they're in a group
 */
export function withGroupColor<T extends { id: string }>(
  NodeComponent: React.ComponentType<T>,
  groups: { nodeIds: string[]; color?: string }[],
) {
  return function GroupAwareNode(props: T) {
    const groupColor = getGroupColorForNode(props.id, groups)
    return <NodeComponent {...props} groupColor={groupColor} />
  }
}
