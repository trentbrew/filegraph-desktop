import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AlertCircle, LayoutGrid, MoonStar, RefreshCcw, Sparkles, SunMedium } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../utils'
import { useTheme } from '@/components/themeProvider'

interface BinaryFileContent {
  data: string
  truncated: boolean
  size: number
}

interface FontViewerProps {
  filePath: string
  extension?: string | null
}

const FONT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB safety cap
const DEFAULT_SAMPLE = 'Sphinx of black quartz, judge my vow. 0123456789'
const ALT_SAMPLE = 'Grumpy wizards make toxic brew for the evil queen and jack.'
const WEIGHT_OPTIONS = [300, 400, 500, 600, 700] as const

const SURFACES = {
  paper: {
    label: 'Paper',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--card-foreground))',
  },
  dusk: {
    label: 'Dusk',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--card-foreground))',
  },
  grid: {
    label: 'Grid',
    background: '#0b1224',
    color: '#e2e8f0',
  },
} as const

type SurfaceKey = keyof typeof SURFACES

const glyphSets = [
  { label: 'Uppercase', text: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z' },
  { label: 'Lowercase', text: 'a b c d e f g h i j k l m n o p q r s t u v w x y z' },
  { label: 'Numbers', text: '0 1 2 3 4 5 6 7 8 9' },
  { label: 'Symbols', text: '! ? @ # % & * ( ) - _ / + =' },
]

const getMimeType = (extension?: string | null) => {
  switch (extension?.toLowerCase()) {
    case 'font':
      return 'font/otf'
    case 'otf':
      return 'font/otf'
    case 'ttf':
      return 'font/ttf'
    case 'woff':
      return 'font/woff'
    case 'woff2':
      return 'font/woff2'
    case 'ttc':
    case 'otc':
      return 'font/collection'
    default:
      return 'font/otf'
  }
}

const getFontFormat = (extension?: string | null) => {
  switch (extension?.toLowerCase()) {
    case 'font':
      return 'opentype'
    case 'otf':
      return 'opentype'
    case 'ttf':
      return 'truetype'
    case 'woff':
      return 'woff'
    case 'woff2':
      return 'woff2'
    case 'ttc':
    case 'otc':
      return 'truetype-collection'
    default:
      return 'opentype'
  }
}

export function FontViewer({ filePath, extension }: FontViewerProps) {
  const { mode } = useTheme()

  // Calculate the effective mode (resolve 'system' to actual light/dark)
  const effectiveMode = React.useMemo(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
  }, [mode])

  // Set default surface based on theme
  const defaultSurface: SurfaceKey = effectiveMode === 'dark' ? 'dusk' : 'paper'

  const [sampleText, setSampleText] = React.useState(DEFAULT_SAMPLE)
  const [fontSize, setFontSize] = React.useState(48)
  const [fontWeight, setFontWeight] = React.useState<(typeof WEIGHT_OPTIONS)[number]>(400)
  const [surface, setSurface] = React.useState<SurfaceKey>(defaultSurface)
  const [fontDataUrl, setFontDataUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [fontLoaded, setFontLoaded] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)
  const fontFaceRef = React.useRef<HTMLStyleElement | null>(null)

  const fontFamily = React.useMemo(() => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    return `font-preview-${id}`
  }, [filePath])

  const mimeType = React.useMemo(() => getMimeType(extension), [extension])
  const fontFormat = React.useMemo(() => getFontFormat(extension), [extension])

  React.useEffect(() => {
    let canceled = false

    const loadFont = async () => {
      setLoading(true)
      setError(null)
      setFontDataUrl(null)
      setFontLoaded(false)

      try {
        const response = await invoke<BinaryFileContent>('read_file_base64', {
          filePath,
          maxBytes: FONT_MAX_BYTES,
        })

        if (canceled) return

        if (response.truncated) {
          setError(`Font is larger than ${formatFileSize(FONT_MAX_BYTES)}. Open externally to inspect the full file.`)
          return
        }

        setFontDataUrl(`data:${mimeType};base64,${response.data}`)
      } catch (err) {
        if (canceled) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    loadFont()

    return () => {
      canceled = true
    }
  }, [filePath, mimeType, reloadKey])

  React.useEffect(() => {
    if (fontFaceRef.current) {
      fontFaceRef.current.remove()
      fontFaceRef.current = null
    }

    if (!fontDataUrl) return

    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-font-preview', fontFamily)
    styleEl.textContent = `@font-face { font-family: '${fontFamily}'; src: url(${fontDataUrl}) format('${fontFormat}'); font-display: swap; }`
    document.head.appendChild(styleEl)
    fontFaceRef.current = styleEl

    const loadPromise = (document as any).fonts?.load(`400 1em ${fontFamily}`)

    if (loadPromise && typeof loadPromise.then === 'function') {
      loadPromise.then(() => setFontLoaded(true)).catch(() => setFontLoaded(true))
    } else {
      setFontLoaded(true)
    }

    return () => {
      if (fontFaceRef.current) {
        fontFaceRef.current.remove()
        fontFaceRef.current = null
      }
      setFontLoaded(false)
    }
  }, [fontDataUrl, fontFamily, fontFormat])

  // Update surface when theme changes
  React.useEffect(() => {
    setSurface(defaultSurface)
  }, [defaultSurface])

  const previewSurface = SURFACES[surface]
  const previewStyle: React.CSSProperties =
    surface === 'grid'
      ? {
          backgroundColor: previewSurface.background,
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          color: previewSurface.color,
        }
      : { background: previewSurface.background, color: previewSurface.color }

  const specimenSizes = React.useMemo(
    () => [fontSize, 32, 24, 18, 14].filter((size, idx, arr) => arr.indexOf(size) === idx),
    [fontSize],
  )

  const displayExt = extension ? `.${extension.toLowerCase()}` : 'Font file'

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !fontDataUrl) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium">Unable to preview this font</p>
          <p className="text-xs">{error ?? 'Unknown error loading font'}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError(null)
              setReloadKey((key) => key + 1)
            }}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="border-b border-border/60 bg-card/70 px-4 py-3 flex flex-col gap-4">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Sample text</div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Type to preview the font"
              className="h-10 min-w-[240px] flex-1"
            />
            <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setSampleText(DEFAULT_SAMPLE)}>
              Reset
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setSampleText(ALT_SAMPLE)}>
              Alt
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Size</div>
            <input
              type="range"
              min={16}
              max={128}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="h-2 w-36 cursor-pointer"
              style={{ accentColor: 'var(--primary)' }}
            />
            <div className="w-14 text-right text-sm tabular-nums">{fontSize}px</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Weight</div>
            {WEIGHT_OPTIONS.map((weight) => (
              <Button
                key={weight}
                size="sm"
                variant={fontWeight === weight ? 'default' : 'outline'}
                className="h-8 px-3"
                onClick={() => setFontWeight(weight)}>
                {weight}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto p-6">
        <div
          className="rounded-xl border border-border/70 shadow-lg p-6 space-y-6 transition-colors duration-200"
          style={previewStyle}>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{fontLoaded ? 'Live specimen' : 'Loading font...'}</span>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase">
              {displayExt}
            </span>
          </div>

          <div
            className="leading-[1.08] drop-shadow-sm"
            style={{
              fontFamily,
              fontSize,
              fontWeight,
              letterSpacing: '0.01em',
            }}>
            {sampleText || 'Start typing to preview this font'}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {specimenSizes.map((size) => (
              <div
                key={size}
                className={cn(
                  'rounded-lg border px-3 py-3 space-y-1 transition-colors',
                  surface === 'paper' ? 'border-black/5 bg-white/70' : 'border-white/10 bg-black/10',
                )}>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                  <span>{size}px</span>
                  <span className="text-[10px]">{fontWeight}</span>
                </div>
                <div
                  className="leading-tight"
                  style={{
                    fontFamily,
                    fontWeight,
                    fontSize: size,
                    letterSpacing: size >= 48 ? '0em' : '0.02em',
                  }}>
                  {sampleText || DEFAULT_SAMPLE}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {glyphSets.map((set) => (
              <div
                key={set.label}
                className={cn(
                  'rounded-md border px-3 py-2',
                  surface === 'paper' ? 'border-black/5 bg-white/60' : 'border-white/10 bg-black/20',
                )}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80 mb-1">{set.label}</div>
                <div
                  className="text-sm leading-snug"
                  style={{
                    fontFamily,
                    fontWeight,
                    letterSpacing: '0.08em',
                  }}>
                  {set.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
