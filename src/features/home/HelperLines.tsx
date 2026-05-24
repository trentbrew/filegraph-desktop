/**
 * HelperLines Component
 *
 * Renders alignment guide lines when dragging nodes
 */

import { useReactFlow } from 'reactflow'
import type { HelperLines as HelperLinesType } from './canvasUtils'

interface HelperLinesProps extends HelperLinesType {}

export function HelperLines({ horizontal, vertical }: HelperLinesProps) {
  const { getViewport } = useReactFlow()
  const viewport = getViewport()

  if (horizontal === null && vertical === null) {
    return null
  }

  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`

  return (
    <svg
      className="react-flow__helper-lines"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1000,
      }}>
      <g style={{ transform }}>
        {horizontal !== null && (
          <line
            x1={-10000}
            y1={horizontal}
            x2={10000}
            y2={horizontal}
            stroke="hsl(var(--primary))"
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${4 / viewport.zoom}`}
            opacity={0.8}
          />
        )}
        {vertical !== null && (
          <line
            x1={vertical}
            y1={-10000}
            x2={vertical}
            y2={10000}
            stroke="hsl(var(--primary))"
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${4 / viewport.zoom}`}
            opacity={0.8}
          />
        )}
      </g>
    </svg>
  )
}

export default HelperLines
