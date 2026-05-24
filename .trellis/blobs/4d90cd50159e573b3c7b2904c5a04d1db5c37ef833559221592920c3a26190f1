/**
 * Shape Node for Canvas
 * Basic shapes: rectangle, circle, diamond, triangle
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { X } from 'lucide-react'

// Shape types
export type ShapeType = 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'hexagon'

// Shape colors
export const SHAPE_COLORS = [
  { name: 'Gray', fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))' },
  { name: 'Blue', fill: '#dbeafe', stroke: '#3b82f6' },
  { name: 'Green', fill: '#dcfce7', stroke: '#22c55e' },
  { name: 'Yellow', fill: '#fef9c3', stroke: '#eab308' },
  { name: 'Red', fill: '#fee2e2', stroke: '#ef4444' },
  { name: 'Purple', fill: '#f3e8ff', stroke: '#a855f7' },
  { name: 'Pink', fill: '#fce7f3', stroke: '#ec4899' },
  { name: 'Orange', fill: '#ffedd5', stroke: '#f97316' },
] as const

export interface ShapeNodeData {
  shape?: ShapeType
  color?: (typeof SHAPE_COLORS)[number]['name']
  label?: string
  isMaximized?: boolean
}

// Styled handle that positions correctly for shapes
function ShapeHandle({
  type,
  position,
  id,
  style,
}: {
  type: 'source' | 'target'
  position: Position
  id?: string
  style?: React.CSSProperties
}) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={style}
      className="w-2.5! h-2.5! bg-muted-foreground/40! border-2! border-background! hover:bg-primary! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

export function ShapeNode({ id, data, selected }: NodeProps<ShapeNodeData>) {
  const shape = data?.shape || 'rectangle'
  const colorName = data?.color || 'Gray'
  const colorConfig = SHAPE_COLORS.find((c) => c.name === colorName) || SHAPE_COLORS[0]
  const label = data?.label || ''
  const isMaximized = data?.isMaximized || false

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  // Render shape SVG
  const renderShape = () => {
    const commonProps = {
      fill: colorConfig.fill,
      stroke: colorConfig.stroke,
      strokeWidth: 2,
    }

    switch (shape) {
      case 'circle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />
          </svg>
        )

      case 'diamond':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="50,2 98,50 50,98 2,50" {...commonProps} />
          </svg>
        )

      case 'triangle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="50,5 95,95 5,95" {...commonProps} />
          </svg>
        )

      case 'hexagon':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="25,5 75,5 98,50 75,95 25,95 2,50" {...commonProps} />
          </svg>
        )

      case 'rectangle':
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="96" rx="4" {...commonProps} />
          </svg>
        )
    }
  }

  // Get handle positions based on shape
  const getHandleStyle = (position: Position): React.CSSProperties => {
    if (shape === 'diamond') {
      // Adjust handles for diamond shape
      switch (position) {
        case Position.Top:
          return { top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }
        case Position.Bottom:
          return { bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' }
        case Position.Left:
          return { left: '0%', top: '50%', transform: 'translate(-50%, -50%)' }
        case Position.Right:
          return { right: '0%', top: '50%', transform: 'translate(50%, -50%)' }
      }
    }
    return {}
  }

  return (
    <div
      className={`
        canvas-node group relative
        min-w-[60px] min-h-[60px] h-full w-full
        ${selected ? 'ring-2 ring-primary/30 ring-offset-2' : ''}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Resizer */}
      {!isMaximized && (
        <NodeResizer
          color={colorConfig.stroke}
          isVisible={selected}
          minWidth={60}
          minHeight={60}
          keepAspectRatio={shape === 'circle'}
          handleClassName="w-2! h-2! border-0! rounded-sm!"
          handleStyle={{ backgroundColor: colorConfig.stroke }}
        />
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute -top-2 -right-2 p-0.5 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-all z-10"
        title="Remove">
        <X className="h-3 w-3" />
      </button>

      {/* Shape */}
      <div className="w-full h-full relative">
        {renderShape()}

        {/* Label overlay */}
        {label && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-xs font-medium text-center px-2 max-w-[80%] truncate"
              style={{ color: colorConfig.stroke }}>
              {label}
            </span>
          </div>
        )}
      </div>

      {/* Handles */}
      {!isMaximized && (
        <>
          <ShapeHandle type="target" position={Position.Top} id="top" style={getHandleStyle(Position.Top)} />
          <ShapeHandle type="source" position={Position.Bottom} id="bottom" style={getHandleStyle(Position.Bottom)} />
          <ShapeHandle type="target" position={Position.Left} id="left" style={getHandleStyle(Position.Left)} />
          <ShapeHandle type="source" position={Position.Right} id="right" style={getHandleStyle(Position.Right)} />
        </>
      )}
    </div>
  )
}
