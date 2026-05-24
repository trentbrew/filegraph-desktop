import * as React from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { useChatStore } from '@/features/agent/hooks/useChatStore'
import { getAdapter, PROVIDERS } from '@/lib/providers'
import './mermaidDiagram.css'

interface MermaidDiagramProps {
  chart: string
  className?: string
  onFixApplied?: (fixedChart: string) => void
}

let mermaidInitialized = false

function useIsDarkMode() {
  const get = React.useCallback(() => document.documentElement.classList.contains('dark'), [])
  const [isDark, setIsDark] = React.useState(get)

  React.useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(get()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [get])

  return isDark
}

function sanitizeMermaidCode(input: string): string {
  let s = input || ''
  s = s.replace(/^\s*```(?:mermaid)?\s*\n?/i, '')
  s = s.replace(/\n?\s*```\s*$/i, '')
  s = s.replace(/^\s*\n+/, '')
  return s.trimEnd()
}

export function MermaidDiagram({ chart, className = '', onFixApplied }: MermaidDiagramProps) {
  const renderTargetRef = React.useRef<HTMLDivElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [svg, setSvg] = React.useState<string>('')
  const isDark = useIsDarkMode()
  const [showSource, setShowSource] = React.useState(false)
  const [isFixing, setIsFixing] = React.useState(false)

  const code = React.useMemo(() => sanitizeMermaidCode(chart), [chart])

  React.useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'var(--font-sans)',
        suppressErrorRendering: true,
      })
      mermaid.setParseErrorHandler(() => {})
      mermaidInitialized = true
    } else {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'var(--font-sans)',
        suppressErrorRendering: true,
      })
      mermaid.setParseErrorHandler(() => {})
    }
  }, [isDark])

  React.useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setError('Empty diagram')
        return
      }

      try {
        setError(null)
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        await mermaid.parse(code)
        const { svg: renderedSvg } = await mermaid.render(id, code, renderTargetRef.current ?? undefined)
        const sanitized = DOMPurify.sanitize(renderedSvg, {
          USE_PROFILES: { svg: true, svgFilters: true, html: false },
        })
        setSvg(sanitized)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    renderDiagram()
  }, [code, isDark])

  const handleFix = React.useCallback(async () => {
    if (isFixing) return

    try {
      setIsFixing(true)

      const { provider, model, apiKey: storedApiKey } = useChatStore.getState().modelConfig

      let apiKey = storedApiKey
      if (!apiKey) {
        if (provider === 'gemini') {
          apiKey = import.meta.env.VITE_GEMINI_API_KEY
        } else if (provider === 'openai' || provider === 'groq') {
          apiKey = import.meta.env.VITE_OPENAI_API_KEY
        }
      }

      const providerDef = PROVIDERS[provider]
      if (providerDef?.requiresApiKey && !apiKey) {
        setError(`${providerDef.name} API key not configured. Add it in Settings.`)
        return
      }

      const adapter = getAdapter(provider)
      const config = { provider, model, apiKey }

      const response = await adapter.chat(
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a Mermaid diagram repair assistant. Return ONLY the corrected Mermaid diagram source. No markdown fences, no explanation. Preserve the diagram intent and do the smallest fix that makes it valid.',
            },
            {
              role: 'user',
              content: `Mermaid error:\n${error || '(none)'}\n\nMermaid diagram to fix:\n\n${code}`,
            },
          ],
          stream: false,
        },
        config,
      )

      const fixed = sanitizeMermaidCode(response.content?.trim() || '')
      if (!fixed) {
        setError('Auto-fix returned an empty result')
        return
      }

      await mermaid.parse(fixed)
      setShowSource(false)
      onFixApplied?.(fixed)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsFixing(false)
    }
  }, [code, error, isFixing, onFixApplied])

  const header = (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="text-xs font-medium text-muted-foreground">Mermaid</div>
      <div className="flex items-center gap-2">
        {error && (
          <button
            type="button"
            onClick={handleFix}
            disabled={isFixing || !onFixApplied}
            className="text-xs px-2 py-1 rounded border border-border/60 bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
            {isFixing ? 'Fixing…' : 'Fix'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-border/60 bg-background hover:bg-muted">
          {showSource ? 'Hide source' : 'Source'}
        </button>
      </div>
    </div>
  )

  return (
    <div className={`mermaid-diagram border border-border/50 rounded-md p-4 overflow-auto ${className}`}>
      {header}
      {error ? (
        <div className="border border-destructive/50 bg-destructive/10 rounded-md p-3">
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">{error}</div>
        </div>
      ) : !svg ? (
        <div className="text-sm text-muted-foreground">Rendering diagram...</div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <div ref={renderTargetRef} className="sr-only" />
      <div className={showSource ? 'mt-3' : 'mt-3 max-h-0 overflow-hidden opacity-0 pointer-events-none'}>
        <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
