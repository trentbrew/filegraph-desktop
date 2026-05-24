import * as React from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { useChatStore } from '@/features/agent/hooks/useChatStore'
import { getAdapter, PROVIDERS } from '@/lib/providers'

function sanitizeMermaidCode(input: string): string {
  let s = input || ''

  // If fences leaked into the node text, strip them.
  // ```mermaid\n...\n```
  s = s.replace(/^\s*```(?:mermaid)?\s*\n?/i, '')
  s = s.replace(/\n?\s*```\s*$/i, '')

  // Mermaid parser is sensitive to leading blank lines/whitespace.
  s = s.replace(/^\s*\n+/, '')

  return s.trimEnd()
}

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

export function MermaidNodeView({ node, editor, getPos }: NodeViewProps) {
  // ProseMirror stores text as child text nodes; prefer textContent for robustness.
  const code = sanitizeMermaidCode(node.textContent ?? '')
  const isDark = useIsDarkMode()

  const renderTargetRef = React.useRef<HTMLDivElement>(null)

  const idRef = React.useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`)
  const [svg, setSvg] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)
  const [showSource, setShowSource] = React.useState(false)
  const [isFixing, setIsFixing] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setError(null)

        if (!code.trim()) {
          setSvg('')
          setError('Empty Mermaid diagram')
          return
        }

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'default',
          suppressErrorRendering: true,
          flowchart: {
            htmlLabels: false,
          },
          themeVariables: isDark
            ? {
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                textColor: '#e5e7eb',
                primaryTextColor: '#e5e7eb',
                lineColor: '#9ca3af',
              }
            : {
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                textColor: '#111827',
                primaryTextColor: '#111827',
                lineColor: '#374151',
              },
        })
        mermaid.setParseErrorHandler(() => {})

        await mermaid.parse(code)
        const { svg } = await mermaid.render(idRef.current, code, renderTargetRef.current ?? undefined)
        if (cancelled) return

        // Mermaid outputs SVG markup; sanitize before injecting.
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true, html: false },
        })

        setSvg(sanitized)
      } catch (e) {
        if (cancelled) return
        setSvg('')
        setError(e instanceof Error ? e.message : 'Failed to render Mermaid diagram')
      }
    }

    // Small debounce for typing.
    const t = window.setTimeout(run, 200)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [code, isDark])

  const applyFixedCode = React.useCallback(
    (fixed: string) => {
      const pos = typeof getPos === 'function' ? getPos() : null
      if (typeof pos !== 'number') return

      const from = pos + 1
      const to = pos + node.nodeSize - 1
      const tr = editor.state.tr.replaceWith(from, to, editor.schema.text(fixed))
      editor.view.dispatch(tr)
    },
    [editor, getPos, node.nodeSize],
  )

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
      applyFixedCode(fixed)
      setShowSource(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsFixing(false)
    }
  }, [applyFixedCode, code, error, isFixing])

  const header = (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="text-xs font-medium text-muted-foreground">Mermaid</div>
      <div className="flex items-center gap-2">
        {error && (
          <button
            type="button"
            onClick={handleFix}
            disabled={isFixing}
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
    <NodeViewWrapper className="mermaid-block">
      {header}

      <div className={showSource ? '' : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'}>
        <pre className="mermaid-block__code" data-language="mermaid">
          <code>
            <NodeViewContent />
          </code>
        </pre>
      </div>

      <div className="mermaid-block__render" aria-label="Mermaid diagram" role="img">
        {error ? (
          <div className="mermaid-block__error">{error}</div>
        ) : svg ? (
          <div className="mermaid-block__svg" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="mermaid-block__loading">Rendering diagram…</div>
        )}
      </div>

      <div ref={renderTargetRef} className="sr-only" />
    </NodeViewWrapper>
  )
}

export default MermaidNodeView
