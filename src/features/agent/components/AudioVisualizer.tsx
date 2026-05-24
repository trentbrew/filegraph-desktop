/**
 * AudioVisualizer - Animated orb for Live Mode
 *
 * Canvas-based gradient orb that pulses with audio levels.
 * Shows input (mic) levels when listening, output (speaker) levels when model is speaking.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LiveSessionState } from '../live/types'

interface AudioVisualizerProps {
  state: LiveSessionState
  inputLevel: number
  outputLevel: number
  className?: string
  size?: number
}

export function AudioVisualizer({
  state,
  inputLevel,
  outputLevel,
  className,
  size = 160,
}: AudioVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const animFrameRef = React.useRef<number | null>(null)
  const smoothedLevelRef = React.useRef(0)

  // Determine which level to display based on state
  const targetLevel = state === 'speaking' ? outputLevel : inputLevel

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const center = size / 2
    const baseRadius = size * 0.25
    const maxExpand = size * 0.12

    const draw = () => {
      // Smooth the level for natural animation
      const target = targetLevel
      smoothedLevelRef.current += (target - smoothedLevelRef.current) * 0.15

      const level = smoothedLevelRef.current
      const radius = baseRadius + level * maxExpand
      const glowRadius = radius + 20 + level * 30

      ctx.clearRect(0, 0, size, size)

      // Outer glow
      if (state !== 'idle' && state !== 'error') {
        const glowGradient = ctx.createRadialGradient(center, center, radius, center, center, glowRadius)
        glowGradient.addColorStop(0, getGlowColor(state, 0.3 + level * 0.3))
        glowGradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(center, center, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()
      }

      // Main orb gradient
      const orbGradient = ctx.createRadialGradient(
        center - radius * 0.3,
        center - radius * 0.3,
        0,
        center,
        center,
        radius,
      )

      if (state === 'idle') {
        orbGradient.addColorStop(0, '#a78bfa')
        orbGradient.addColorStop(1, '#6d28d9')
      } else if (state === 'connecting') {
        orbGradient.addColorStop(0, '#c4b5fd')
        orbGradient.addColorStop(1, '#7c3aed')
      } else if (state === 'listening') {
        orbGradient.addColorStop(0, '#a78bfa')
        orbGradient.addColorStop(1, '#7c3aed')
      } else if (state === 'speaking') {
        orbGradient.addColorStop(0, '#c084fc')
        orbGradient.addColorStop(1, '#9333ea')
      } else if (state === 'tooling') {
        orbGradient.addColorStop(0, '#67e8f9')
        orbGradient.addColorStop(1, '#0891b2')
      } else if (state === 'error') {
        orbGradient.addColorStop(0, '#fca5a5')
        orbGradient.addColorStop(1, '#dc2626')
      }

      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.fillStyle = orbGradient
      ctx.fill()

      // Inner highlight
      const highlightGradient = ctx.createRadialGradient(
        center - radius * 0.2,
        center - radius * 0.3,
        0,
        center,
        center,
        radius * 0.6,
      )
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      highlightGradient.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.fillStyle = highlightGradient
      ctx.fill()

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [size, state, targetLevel])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none', className)}
      style={{ width: size, height: size }}
    />
  )
}

function getGlowColor(state: LiveSessionState, alpha: number): string {
  switch (state) {
    case 'listening':
      return `rgba(139, 92, 246, ${alpha})`
    case 'speaking':
      return `rgba(168, 85, 247, ${alpha})`
    case 'tooling':
      return `rgba(6, 182, 212, ${alpha})`
    case 'connecting':
      return `rgba(139, 92, 246, ${alpha * 0.5})`
    default:
      return 'transparent'
  }
}
