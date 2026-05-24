import * as React from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import WaveSurfer from 'wavesurfer.js'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface AudioViewerProps {
  filePath: string
  fileName: string
}

export function AudioViewer({ filePath, fileName }: AudioViewerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const wavesurferRef = React.useRef<WaveSurfer | null>(null)

  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [isMuted, setIsMuted] = React.useState(false)
  const [zoom, setZoom] = React.useState(1)
  const [waveformHeight, setWaveformHeight] = React.useState(200)

  const assetUrl = React.useMemo(() => {
    try {
      return convertFileSrc(filePath)
    } catch (err) {
      setError('Failed to load audio file')
      return ''
    }
  }, [filePath])

  // Initialize WaveSurfer
  React.useEffect(() => {
    if (!containerRef.current || !assetUrl) return

    setIsLoading(true)
    setIsReady(false)
    setError(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)

    // Calculate height based on container
    const containerHeight = wrapperRef.current?.clientHeight || 300
    const height = Math.max(150, containerHeight - 40) // Leave some padding
    setWaveformHeight(height)

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--muted-foreground) / 0.3)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      cursorWidth: 3,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: height,
      fillParent: true,
      normalize: true,
      backend: 'WebAudio',
      minPxPerSec: 1,
    })

    wavesurferRef.current = wavesurfer

    wavesurfer.on('ready', () => {
      setIsReady(true)
      setIsLoading(false)
      setDuration(wavesurfer.getDuration())
    })

    wavesurfer.on('play', () => setIsPlaying(true))
    wavesurfer.on('pause', () => setIsPlaying(false))
    wavesurfer.on('finish', () => setIsPlaying(false))

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time)
    })

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err)
      setError('Failed to decode audio file')
      setIsLoading(false)
    })

    wavesurfer.load(assetUrl)

    return () => {
      wavesurfer.destroy()
      wavesurferRef.current = null
    }
  }, [assetUrl])

  // Handle resize
  React.useEffect(() => {
    if (!wrapperRef.current || !wavesurferRef.current || !isReady) return

    let rafId: number | null = null
    const resizeObserver = new ResizeObserver((entries) => {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        for (const entry of entries) {
          const newHeight = Math.max(150, entry.contentRect.height - 40)
          setWaveformHeight((current) => {
            if (Math.abs(newHeight - current) > 20) {
              wavesurferRef.current?.setOptions({ height: newHeight })
              return newHeight
            }
            return current
          })
        }
      })
    })

    resizeObserver.observe(wrapperRef.current)
    return () => {
      resizeObserver.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [isReady])

  // Handle zoom changes
  React.useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoom * 50)
    }
  }, [zoom, isReady])

  // Handle volume changes
  React.useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted])

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const skipBackward = () => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, currentTime - 5)
      wavesurferRef.current.seekTo(newTime / duration)
    }
  }

  const skipForward = () => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, currentTime + 5)
      wavesurferRef.current.seekTo(newTime / duration)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (value[0] > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 5))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load audio</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Waveform Container */}
      <div ref={wrapperRef} className="flex-1 flex flex-col overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {/* Waveform */}
        <div
          ref={containerRef}
          className={cn(
            'flex-1 w-full transition-opacity cursor-pointer',
            '[&_wave]:!overflow-hidden',
            isLoading && 'opacity-0',
          )}
        />
        {/* Playhead indicator line */}
        {isReady && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.5)] pointer-events-none z-20 transition-opacity"
            style={{
              left: `${(currentTime / duration) * 100}%`,
              opacity: duration > 0 ? 1 : 0,
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border/50 bg-muted/20 p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Time display */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span className="truncate px-4 text-center text-foreground font-sans">{fileName}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" onClick={skipBackward} disabled={!isReady} className="h-9 w-9">
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={togglePlay}
              disabled={!isReady}
              className="h-12 w-12 rounded-full">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={skipForward} disabled={!isReady} className="h-9 w-9">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Secondary controls */}
          <div className="flex items-center justify-between">
            {/* Volume */}
            <div className="flex items-center gap-2 w-32">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-20"
              />
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 5} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
