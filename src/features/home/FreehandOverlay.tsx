import * as React from 'react'

type FreehandPoint = [number, number, number]

interface FreehandOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  getFreehandPath: (points: FreehandPoint[], scale?: number) => string
  getZoom: () => number
  onComplete: (points: FreehandPoint[]) => void
}

const FreehandOverlay = React.memo(function FreehandOverlay({
  containerRef,
  getFreehandPath,
  getZoom,
  onComplete,
}: FreehandOverlayProps) {
  const pointsRef = React.useRef<FreehandPoint[]>([])
  const boundsRef = React.useRef<DOMRect | null>(null)
  const pathRef = React.useRef<SVGPathElement | null>(null)
  const rafRef = React.useRef<number | null>(null)

  const updatePreviewPath = React.useCallback(() => {
    rafRef.current = null
    const pathEl = pathRef.current
    if (!pathEl) return

    const pts = pointsRef.current
    if (pts.length < 2) {
      pathEl.setAttribute('d', '')
      return
    }

    pathEl.setAttribute('d', getFreehandPath(pts, getZoom()))
  }, [getFreehandPath, getZoom])

  const scheduleUpdate = React.useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = window.requestAnimationFrame(updatePreviewPath)
  }, [updatePreviewPath])

  const addPoint = React.useCallback(
    (x: number, y: number, pressure: number) => {
      const pts = pointsRef.current
      const last = pts[pts.length - 1]
      if (last) {
        const dx = x - last[0]
        const dy = y - last[1]
        // Basic point decimation to keep point count reasonable.
        // (Points are in screen px, so this stays stable across zoom.)
        if (dx * dx + dy * dy < 4) return
      }
      pts.push([x, y, pressure])
      scheduleUpdate()
    },
    [scheduleUpdate],
  )

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      if (!containerRef.current) return
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      boundsRef.current = containerRef.current.getBoundingClientRect()

      pointsRef.current = []
      addPoint(event.clientX - boundsRef.current.left, event.clientY - boundsRef.current.top, event.pressure)
    },
    [addPoint, containerRef],
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.buttons !== 1) return
      const bounds = boundsRef.current
      if (!bounds) return
      addPoint(event.clientX - bounds.left, event.clientY - bounds.top, event.pressure)
    },
    [addPoint],
  )

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent) => {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)

      const completed = pointsRef.current
      pointsRef.current = []
      boundsRef.current = null

      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (pathRef.current) pathRef.current.setAttribute('d', '')

      if (completed.length >= 2) {
        onComplete(completed)
      }
    },
    [onComplete],
  )

  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div
      className="freehand-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}>
      <svg>
        <path ref={pathRef} />
      </svg>
    </div>
  )
})

export { FreehandOverlay, type FreehandOverlayProps, type FreehandPoint }
