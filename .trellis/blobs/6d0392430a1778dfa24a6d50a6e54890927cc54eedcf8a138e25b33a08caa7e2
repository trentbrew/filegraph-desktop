import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, WrapText, Copy, Check, Edit, Save, Map } from 'lucide-react'
import Editor, { OnMount } from '@monaco-editor/react'
import { useTheme } from '@/components/themeProvider'
import { formatHex, parse } from 'culori'
import type { ThemeStyleProps } from '@/lib/themes/schema'

type MonacoInstance = Parameters<OnMount>[1]

const toHexColor = (color: string) => {
  try {
    const parsed = parse(color)
    return parsed ? formatHex(parsed) : color
  } catch (error) {
    console.warn('Failed to parse color:', color, error)
    return color
  }
}

const CUSTOM_MONACO_THEME_ID = 'filegraph-theme'

const toRuleColor = (value?: string) => {
  if (!value) return 'cccccc'
  return toHexColor(value).replace('#', '') || 'cccccc'
}

interface RgbColor {
  r: number
  g: number
  b: number
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6 && normalized.length !== 3) return null

  const expand =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const value = Number.parseInt(expand, 16)
  if (Number.isNaN(value)) return null

  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255

  return {
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
  }
}

const toRgbColor = (color: string | undefined): RgbColor | null => {
  if (!color) return null
  const parsed = parse(color)
  if (!parsed) return null

  // Prefer direct rgb components if available
  if ('r' in parsed && 'g' in parsed && 'b' in parsed) {
    return {
      r: clamp01((parsed as any).r ?? 0),
      g: clamp01((parsed as any).g ?? 0),
      b: clamp01((parsed as any).b ?? 0),
    }
  }

  return hexToRgb(toHexColor(color))
}

const relativeLuminance = ({ r, g, b }: RgbColor) => {
  const transform = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)

  const R = transform(r)
  const G = transform(g)
  const B = transform(b)

  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

const contrastRatio = (colorA: RgbColor, colorB: RgbColor) => {
  const lumA = relativeLuminance(colorA)
  const lumB = relativeLuminance(colorB)
  const [lighter, darker] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA]
  return (lighter + 0.05) / (darker + 0.05)
}

const mixColors = (color: RgbColor, target: RgbColor, amount: number): RgbColor => ({
  r: clamp01(color.r + (target.r - color.r) * amount),
  g: clamp01(color.g + (target.g - color.g) * amount),
  b: clamp01(color.b + (target.b - color.b) * amount),
})

const ensureReadableColor = (color: string, background: string, minRatio = 4.5) => {
  const rgbColor = toRgbColor(color)
  const backgroundRgb = toRgbColor(background)

  if (!rgbColor || !backgroundRgb) {
    return color
  }

  let adjusted = rgbColor
  let ratio = contrastRatio(adjusted, backgroundRgb)

  if (ratio >= minRatio) {
    return formatHex({ mode: 'rgb', ...adjusted })
  }

  const backgroundLum = relativeLuminance(backgroundRgb)
  const target: RgbColor = backgroundLum < 0.5 ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 }

  for (let i = 0; i < 10 && ratio < minRatio; i += 1) {
    adjusted = mixColors(adjusted, target, 0.2)
    ratio = contrastRatio(adjusted, backgroundRgb)
  }

  return formatHex({ mode: 'rgb', ...adjusted })
}

const buildSyntaxRules = (styles: ThemeStyleProps) => {
  const background = styles.background
  const usedColors = new Set<string>()
  const backgroundRgb = toRgbColor(background)

  const registerColor = (candidates: string[], fallback?: string) => {
    const source = candidates.find((candidate) => Boolean(candidate)) ?? fallback ?? styles.foreground
    let readable = ensureReadableColor(source, background)
    let rgbReadable = toRgbColor(readable)

    if (rgbReadable && backgroundRgb) {
      let attempt = 0
      while (usedColors.has(readable.toLowerCase()) && attempt < 5) {
        const adjustTarget = attempt % 2 === 0 ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 }
        rgbReadable = mixColors(rgbReadable, adjustTarget, 0.1 * (attempt + 1))
        readable = formatHex({ mode: 'rgb', ...rgbReadable })
        attempt += 1
      }
    }

    usedColors.add(readable.toLowerCase())
    return readable
  }

  const tokenConfigs = [
    {
      token: 'comment',
      colors: [styles.mutedForeground, styles.chart5, styles.accentForeground],
      fontStyle: 'italic',
    },
    {
      token: 'string',
      colors: [styles.accent, styles.chart2, styles.primaryForeground],
    },
    {
      token: 'number',
      colors: [styles.secondary, styles.chart3, styles.secondaryForeground],
    },
    {
      token: 'keyword',
      colors: [styles.primary, styles.chart1, styles.accent],
      fontStyle: 'bold',
    },
    {
      token: 'type.identifier',
      colors: [styles.primaryForeground, styles.chart4, styles.secondary],
    },
    {
      token: 'function',
      colors: [styles.secondaryForeground, styles.chart1, styles.accentForeground],
    },
    {
      token: 'variable',
      colors: [styles.foreground, styles.chart5, styles.sidebarForeground],
    },
    {
      token: 'delimiter',
      colors: [styles.accentForeground, styles.chart4, styles.primary],
    },
    {
      token: 'operator',
      colors: [styles.chart5, styles.secondary, styles.accent],
    },
    {
      token: 'tag',
      colors: [styles.chart1, styles.primary, styles.accentForeground],
      fontStyle: 'bold',
    },
    {
      token: 'metatag',
      colors: [styles.chart2, styles.secondary, styles.primaryForeground],
    },
    {
      token: 'attribute.name',
      colors: [styles.chart3, styles.accent, styles.secondaryForeground],
    },
    {
      token: 'attribute.value',
      colors: [styles.chart4, styles.secondary, styles.accentForeground],
    },
  ]

  return tokenConfigs.map(({ token, colors, fontStyle }) => {
    const color = registerColor(colors, styles.foreground)
    return {
      token,
      foreground: toRuleColor(color),
      ...(fontStyle ? { fontStyle } : {}),
    }
  })
}

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

interface CodeViewerProps {
  filePath: string
  extension: string
  maxBytes?: number
  targetCursorLine?: number | null
  onCursorChange?: (lineNumber: number) => void
  /** Optional: pass content directly instead of loading from file */
  content?: string
  /** Callback when content changes (for controlled mode) */
  onContentChange?: (content: string) => void
}

// Map file extensions to Monaco language identifiers
const getLanguageFromExtension = (ext: string): string => {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    vue: 'html',
    svelte: 'html',
    astro: 'html',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'ini', // Monaco doesn't have toml by default, ini is close
    sql: 'sql',
    md: 'markdown',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    makefile: 'makefile', // Monaco might not have makefile, fallback to text or shell
    gitignore: 'shell',
    graphql: 'graphql',
    prisma: 'graphql', // Fallback
    lua: 'lua',
    dart: 'dart',
    bat: 'bat',
    cmd: 'bat',
    ps1: 'powershell',
    gradle: 'groovy', // Gradle is groovy
    properties: 'ini',
    mdx: 'markdown',
  }

  return languageMap[ext.toLowerCase()] || 'plaintext'
}

const EDIT_SIZE_THRESHOLD_BYTES = 1024 * 1024 // 1MB limit for editing to be safe

export function CodeViewer({
  filePath,
  extension,
  maxBytes = 4 * 1024 * 1024,
  targetCursorLine,
  onCursorChange,
  content: controlledContent,
  onContentChange,
}: CodeViewerProps) {
  const isControlled = controlledContent !== undefined
  const [data, setData] = React.useState<TextFileContent | null>(
    isControlled
      ? { content: controlledContent, truncated: false, encoding: 'utf-8', size: controlledContent.length }
      : null,
  )
  const [loading, setLoading] = React.useState(!isControlled)
  const [error, setError] = React.useState<string | null>(null)
  const [wordWrap, setWordWrap] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(() => {
    const stored = localStorage.getItem('codeViewer.isEditing')
    return stored === 'true'
  })
  const [editedContent, setEditedContent] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [showMinimap, setShowMinimap] = React.useState(true)
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [editorKey, setEditorKey] = React.useState(0)

  const { mode, themeId, availableThemes } = useTheme()
  const [monacoTheme, setMonacoTheme] = React.useState('vs-dark')
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null)
  const monacoInstanceRef = React.useRef<MonacoInstance | null>(null)
  const isEditingRef = React.useRef(isEditing)
  const editingDisabledRef = React.useRef(true)
  const hasThemeHydratedRef = React.useRef(false)

  const editingDisabled = React.useMemo(() => {
    if (!data) return true
    return data.truncated || data.size > EDIT_SIZE_THRESHOLD_BYTES
  }, [data])

  const effectiveIsDark = React.useMemo(() => {
    if (mode === 'dark') return true
    if (mode === 'light') return false
    return systemPrefersDark
  }, [mode, systemPrefersDark])

  React.useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  React.useEffect(() => {
    editingDisabledRef.current = editingDisabled
  }, [editingDisabled])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    setSystemPrefersDark(mediaQuery.matches)

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Safari fallback
      // @ts-ignore - addListener exists in older browsers
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // @ts-ignore - removeListener exists in older browsers
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  const applyMonacoTheme = React.useCallback(
    (monaco?: MonacoInstance | null) => {
      if (!monaco) return

      const currentTheme = availableThemes.find((t) => t.id === themeId)
      const styles = currentTheme?.styles[effectiveIsDark ? 'dark' : 'light']

      if (!styles) {
        const fallbackTheme = effectiveIsDark ? 'vs-dark' : 'vs'
        monaco.editor.setTheme(fallbackTheme)
        setMonacoTheme(fallbackTheme)
        return
      }

      try {
        monaco.editor.defineTheme(CUSTOM_MONACO_THEME_ID, {
          base: effectiveIsDark ? 'vs-dark' : 'vs',
          inherit: true,
          rules: buildSyntaxRules(styles),
          colors: {
            'editor.background': toHexColor(styles.background),
            'editor.foreground': toHexColor(styles.foreground),
            'editor.lineHighlightBackground': effectiveIsDark ? '#ffffff10' : '#00000010',
            'editorLineNumber.foreground': toHexColor(styles.mutedForeground),
            'editorCursor.foreground': toHexColor(styles.primary),
            'editor.selectionBackground': toHexColor(styles.accent),
            'editor.inactiveSelectionBackground': toHexColor(styles.muted),
          },
        })

        monaco.editor.setTheme(CUSTOM_MONACO_THEME_ID)
        setMonacoTheme(CUSTOM_MONACO_THEME_ID)
      } catch (error) {
        console.error('Failed to set custom monaco theme:', error)
        const fallbackTheme = effectiveIsDark ? 'vs-dark' : 'vs'
        monaco.editor.setTheme(fallbackTheme)
        setMonacoTheme(fallbackTheme)
      }
    },
    [availableThemes, themeId, effectiveIsDark],
  )

  React.useEffect(() => {
    applyMonacoTheme(monacoInstanceRef.current)
  }, [applyMonacoTheme])

  React.useEffect(() => {
    if (!hasThemeHydratedRef.current) {
      hasThemeHydratedRef.current = true
      return
    }
    setEditorKey((prev) => prev + 1)
  }, [effectiveIsDark, themeId])

  // Track if we've received initial content (to force first update even if editing)
  const hasReceivedInitialContent = React.useRef(false)
  // Track if user is actively typing (vs just viewing)
  const isActivelyEditingRef = React.useRef(false)
  const editingTimeoutRef = React.useRef<number | null>(null)

  // Update data when controlledContent changes (for real-time sync)
  React.useEffect(() => {
    if (controlledContent !== undefined && controlledContent !== '') {
      setData({ content: controlledContent, truncated: false, encoding: 'utf-8', size: controlledContent.length })
      setLoading(false)

      // Update editedContent if:
      // 1. First content received, OR
      // 2. User is not actively typing (allow live updates from canvas)
      if (!hasReceivedInitialContent.current || !isActivelyEditingRef.current) {
        setEditedContent(controlledContent)
        hasReceivedInitialContent.current = true
      }
    }
  }, [controlledContent])

  // Load file from disk (skip if controlled)
  React.useEffect(() => {
    if (isControlled) return // Skip file loading in controlled mode

    let cancelled = false

    const loadFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes,
        })

        if (!cancelled) {
          setData(result)
          setEditedContent(result.content)
          setIsEditing(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
    }
  }, [filePath, maxBytes, isControlled])

  // Cleanup editing timeout on unmount
  React.useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current)
      }
    }
  }, [])

  const handleCopy = React.useCallback(() => {
    const contentToCopy = isEditing ? editedContent : data?.content
    if (contentToCopy) {
      navigator.clipboard
        .writeText(contentToCopy)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          // Silently fail
        })
    }
  }, [data, isEditing, editedContent])

  const handleSave = React.useCallback(async () => {
    if (!data || data.truncated) return

    setIsSaving(true)
    setError(null)

    try {
      await invoke('write_text_file', {
        filePath,
        content: editedContent,
      })

      setData({ ...data, content: editedContent })
      // Don't exit edit mode after saving - keep it persistent
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }, [data, editedContent, filePath])

  const hasChanges = isEditing && editedContent !== data?.content

  // Ref for handleSave to be used in editor command
  const handleSaveRef = React.useRef(handleSave)
  React.useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoInstanceRef.current = monaco

    editor.onKeyDown((event) => {
      if (
        event.browserEvent.key.toLowerCase() === 'i' &&
        !event.browserEvent.metaKey &&
        !event.browserEvent.ctrlKey &&
        !event.browserEvent.altKey &&
        !isEditingRef.current &&
        !editingDisabledRef.current
      ) {
        event.preventDefault()
        setIsEditing(true)
        localStorage.setItem('codeViewer.isEditing', 'true')
      }
    })

    // Track cursor position changes
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange(e.position.lineNumber)
      })
    }

    // Add Cmd+S / Ctrl+S binding
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (handleSaveRef.current) {
        handleSaveRef.current()
      }
    })
    applyMonacoTheme(monaco)
  }

  // Jump to target line when it changes
  React.useEffect(() => {
    if (targetCursorLine && editorRef.current) {
      editorRef.current.revealLineInCenter(targetCursorLine)
      editorRef.current.setPosition({ lineNumber: targetCursorLine, column: 1 })
      editorRef.current.focus()
    }
  }, [targetCursorLine])

  // Re-apply theme when it changes
  React.useEffect(() => {
    // We can't easily access the monaco instance here without storing it
    // But the editor will re-render if we change the theme prop,
    // so we might need to trigger a re-definition.
    // For now, let's just rely on the initial mount or a full re-mount if needed.
    // A better way is to use the `beforeMount` prop or store the monaco instance.
  }, [themeId, mode, availableThemes])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load file</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{data.encoding}</span>
          <span>•</span>
          <span>{formatFileSize(data.size)}</span>
          <span>•</span>
          <span className="capitalize">{extension}</span>
          {data.truncated && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-medium">Truncated</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!editingDisabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={() => {
                if (isEditing && hasChanges) {
                  if (confirm('You have unsaved changes. Discard them?')) {
                    setEditedContent(data.content)
                    const nextIsEditing = !isEditing
                    setIsEditing(nextIsEditing)
                    localStorage.setItem('codeViewer.isEditing', String(nextIsEditing))
                  }
                } else {
                  const nextIsEditing = !isEditing
                  setIsEditing(nextIsEditing)
                  localStorage.setItem('codeViewer.isEditing', String(nextIsEditing))
                }
              }}
              title={isEditing ? 'Cancel editing' : 'Edit file'}>
              <Edit className="h-3.5 w-3.5" />
              <span className="text-xs">{isEditing ? 'Cancel' : 'Edit'}</span>
            </Button>
          )}
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              title="Save changes (Cmd+S)">
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => setWordWrap(!wordWrap)}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}>
            <WrapText className="h-3.5 w-3.5" />
            <span className="text-xs">Wrap</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => setShowMinimap((prev) => !prev)}
            title={showMinimap ? 'Hide minimap' : 'Show minimap'}>
            <Map className="h-3.5 w-3.5" />
            <span className="text-xs">Minimap</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleCopy} title="Copy all">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">Copy</span>
          </Button>
          {hasChanges && <span className="text-xs text-amber-500 font-medium ml-2">Unsaved</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          key={editorKey}
          height="100%"
          language={getLanguageFromExtension(extension)}
          value={isEditing ? editedContent : data.content}
          theme={monacoTheme}
          options={{
            readOnly: !isEditing,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: showMinimap },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            contextmenu: true,
          }}
          onChange={(value) => {
            if (isEditing) {
              setEditedContent(value || '')

              // Mark as actively editing to prevent live updates from overwriting
              isActivelyEditingRef.current = true
              if (editingTimeoutRef.current) {
                clearTimeout(editingTimeoutRef.current)
              }
              // Clear active editing flag after 2 seconds of no typing
              editingTimeoutRef.current = window.setTimeout(() => {
                isActivelyEditingRef.current = false
              }, 2000)

              // Notify parent of content changes in controlled mode
              if (onContentChange && value !== undefined) {
                onContentChange(value)
              }
            }
          }}
          onMount={handleEditorDidMount}
          loading={<Skeleton className="h-full w-full" />}
        />
      </div>

      {/* Truncation notice */}
      {data.truncated && (
        <div className="shrink-0 border-t border-amber-500/50 bg-amber-500/10 px-3 py-2">
          <p className="text-xs! text-amber-700 dark:text-amber-400">
            This file has been truncated to {formatFileSize(maxBytes)} for preview. Open externally to view the full
            content.
          </p>
        </div>
      )}
    </div>
  )
}

const formatFileSize = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
