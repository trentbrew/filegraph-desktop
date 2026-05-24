import * as React from 'react'
import type { NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { getStroke } from 'perfect-freehand'

type Point = [number, number, number]

export interface FreehandNodeData {
  points: Point[]
  initialSize: { width: number; height: number }
  label?: string
}

const strokeOptions = {
  size: 7,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: { taper: 0, easing: (t: number) => t, cap: true },
  end: { taper: 0.1, easing: (t: number) => t, cap: true },
}

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, ',', (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q'] as (string | number)[],
  )

  d.push('Z')
  return d.join(' ')
}

function getPath(points: Point[]) {
  const stroke = getStroke(points, strokeOptions)
  return getSvgPathFromStroke(stroke)
}

function FreehandNodeInner({ id, data, selected, dragging }: NodeProps<FreehandNodeData>) {
  const points = Array.isArray(data?.points) ? data.points : []
  const initialSize = data?.initialSize || { width: 1, height: 1 }

  const canRender = points.length > 1 && initialSize.width > 0 && initialSize.height > 0

  const pathD = React.useMemo(() => {
    if (!canRender) return ''
    if (dragging) return '' // Skip expensive computation during drag

    return getPath(points)
  }, [canRender, points, dragging])

  return (
    <>
      <NodeResizer isVisible={selected && !dragging} />
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${initialSize.width} ${initialSize.height}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: selected ? 'auto' : 'none' }}>
        <path style={{ pointerEvents: 'visiblePainted', cursor: 'pointer' }} d={pathD} />
      </svg>
    </>
  )
}

export const FreehandNode = React.memo(FreehandNodeInner)
