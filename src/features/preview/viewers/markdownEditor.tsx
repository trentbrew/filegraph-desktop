import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Save, FileText, Bot, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { toast } from 'sonner'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { useTQL } from '@/hooks/useTQL'
import { summarizeMarkdownText } from '@/lib/ollama'
import { AIDescriptionPanel } from '@/components/app/AIDescriptionPanel'
import { MermaidBlock } from './noteViewer/MermaidBlock'
import './noteViewer/noteViewer.css'

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

interface MarkdownEditorProps {
  filePath: string
  maxBytes?: number
}

const lowlight = createLowlight(common)

const EDITOR_LOAD_THRESHOLD = 100 * 1024 // 100KB

export function MarkdownEditor({ filePath, maxBytes = 4 * 1024 * 1024 }: MarkdownEditorProps) {
  const [data, setData] = React.useState<TextFileContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [lastSavedContent, setLastSavedContent] = React.useState('')
  const [editorContent, setEditorContent] = React.useState('')
  const [summary, setSummary] = React.useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [lastSummarizedContent, setLastSummarizedContent] = React.useState('')
  const [forceLoad, setForceLoad] = React.useState(false)
  const [tqlState, tqlActions] = useTQL()
  const justSavedRef = React.useRef(false)

  const computeContentHash = React.useCallback((content: string) => {
    let hash = 0
    for (let i = 0; i < content.length; i += 1) {
      hash = (hash * 31 + content.charCodeAt(i)) >>> 0
    }
    return hash.toString(16)
  }, [])

  // Markdown <-> HTML converters
  const markdownParser = React.useMemo(() => {
    const md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
    })

    const defaultFence = md.renderer.rules.fence

    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const info = (token.info || '').trim()
      const lang = info.split(/\s+/)[0]?.toLowerCase() || ''

      if (lang === 'mermaid') {
        const code = (token.content || '').replace(/\n$/, '')
        return `<div data-type="mermaid-block" data-language="mermaid">${md.utils.escapeHtml(code)}</div>`
      }

      return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
    }

    return md
  }, [])

  const turndownService = React.useMemo(
    () =>
      new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      }),
    [],
  )

  React.useEffect(() => {
    turndownService.addRule('mermaidBlock', {
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return false
        return node.getAttribute('data-type') === 'mermaid-block'
      },
      replacement: (_content, node) => {
        if (!(node instanceof HTMLElement)) return ''
        const raw = (node.textContent || '').replace(/\n$/, '')
        const code = raw.trimEnd()
        return `\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`
      },
    })
  }, [turndownService])

  // Save function - define before handleContentChange
  const handleSave = async (contentToSave?: string) => {
    const content = contentToSave || editorContent
    try {
      setIsSaving(true)
      console.log('[MarkdownEditor] Saving file:', filePath)
      await invoke('write_text_file', {
        filePath,
        content,
      })
      console.log('[MarkdownEditor] File saved successfully')

      // Update data state with the saved content (but don't trigger editor reset)
      // The justSavedRef flag will prevent the effect from resetting editor
      justSavedRef.current = true
      if (data) {
        setData({ ...data, content })
      }

      setLastSavedContent(content)
      setHasUnsavedChanges(false)
      toast.success('Saved successfully')

      // Auto-regenerate summary if content has changed since last summary
      if (summary && content !== lastSummarizedContent && tqlState.initialized) {
        console.log('[MarkdownEditor] Content changed, regenerating summary')
        handleGenerateSummary(true)
      }
    } catch (err: any) {
      console.error('[MarkdownEditor] Save error:', err)
      toast.error(`Failed to save: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Track unsaved changes – manual save only
  const handleContentChange = React.useCallback(
    (content: string) => {
      setEditorContent(content)
      setHasUnsavedChanges(content !== lastSavedContent)
    },
    [lastSavedContent],
  )

  // Keyboard shortcut for Save (Cmd/Ctrl + S)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!isSaving && hasUnsavedChanges) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, hasUnsavedChanges, isSaving])

  // Reset force load when file changes
  React.useEffect(() => {
    setForceLoad(false)
  }, [filePath])

  // Initialize Tiptap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        MermaidBlock,
        Placeholder.configure({
          placeholder: 'Start writing...',
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
      ],
      content: '',
      editorProps: {
        attributes: {
          class: 'markdown-content prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-full p-4',
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        const markdown = turndownService.turndown(html)
        handleContentChange(markdown)
      },
    },
    [turndownService, handleContentChange],
  )

  // Load file content
  React.useEffect(() => {
    let mounted = true

    const loadFile = async () => {
      try {
        console.log('[MarkdownEditor] Loading file:', filePath)
        setLoading(true)
        setError(null)
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes,
        })
        console.log('[MarkdownEditor] File loaded successfully:', {
          size: result.size,
          truncated: result.truncated,
          contentLength: result.content.length,
        })
        if (mounted) {
          setData(result)
          setEditorContent(result.content)
          setLastSavedContent(result.content)
          setHasUnsavedChanges(false)
        }
      } catch (err: any) {
        console.error('[MarkdownEditor] Load error:', err)
        if (mounted) {
          setError(err?.message || err?.toString() || 'Failed to load file')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      mounted = false
    }
  }, [filePath, maxBytes])

  // Update editor content when file data loads (convert markdown -> HTML)
  // Skip update if content hasn't actually changed to prevent scroll jumps
  React.useEffect(() => {
    if (editor && data && !loading) {
      // Check for large file
      if (data.size > EDITOR_LOAD_THRESHOLD && !forceLoad) {
        return
      }

      console.log('[MarkdownEditor] Content sync effect triggered', {
        justSaved: justSavedRef.current,
        dataContentLength: data.content?.length,
      })

      // Skip update if we just saved (content is already in editor)
      if (justSavedRef.current) {
        console.log('[MarkdownEditor] Skipping content update - just saved')
        justSavedRef.current = false
        return
      }

      const currentMarkdown = turndownService.turndown(editor.getHTML())
      const contentMatches = currentMarkdown.trim() === data.content.trim()

      console.log('[MarkdownEditor] Content comparison:', {
        matches: contentMatches,
        currentLength: currentMarkdown.length,
        dataLength: data.content.length,
      })

      // Only update if the content is actually different (normalize whitespace)
      if (!contentMatches) {
        console.log('[MarkdownEditor] Content differs - updating editor')
        const html = markdownParser.render(data.content || '')
        editor.commands.setContent(html, false)
      } else {
        console.log('[MarkdownEditor] Content matches - skipping update')
      }
    }
  }, [editor, data, loading, markdownParser, turndownService, forceLoad])

  // Reset summary state when file changes
  React.useEffect(() => {
    setSummary(null)
    setSummaryError(null)
    setSummaryLoading(false)
  }, [filePath])

  // Load summary from cache when TQL is ready and content available
  React.useEffect(() => {
    if (!tqlState.initialized || !data) return
    const runtime = tqlActions.getRuntime()
    if (!runtime) return
    const meta = runtime.getImageMetadata(filePath)
    if (meta?.description && meta?.contentHash) {
      const currentHash = computeContentHash(data.content)
      if (meta.contentHash === currentHash) {
        setSummary(meta.description)
        setLastSummarizedContent(data.content)
        return
      }
    }
    // Cached summary does not match current content
    setSummary(null)
  }, [filePath, tqlState.initialized, tqlActions, data, computeContentHash])

  const handleGenerateSummary = React.useCallback(
    async (force = false) => {
      if (!data?.content || summaryLoading) return
      if (!tqlState.initialized) {
        setSummaryError('Metadata store is still initializing.')
        return
      }
      const runtime = tqlActions.getRuntime()
      if (!runtime) {
        setSummaryError('Unable to access metadata store.')
        return
      }

      try {
        setSummaryLoading(true)
        setSummaryError(null)
        setSummary('') // Clear previous summary for streaming
        const contentHash = computeContentHash(data.content)
        const { summary: generatedSummary, model } = await summarizeMarkdownText(data.content, (chunk) => {
          // Stream chunks as they arrive
          setSummary((prev) => (prev || '') + chunk)
        })

        await runtime.addImageMetadata(filePath, {
          description: generatedSummary,
          model,
          fileHash: `${data.size}-${Date.now()}`,
          generatedAt: Date.now(),
          contentType: 'markdown',
          contentHash,
        })
        setLastSummarizedContent(data.content)
        setSummary(generatedSummary)
        await runtime.save()
      } catch (err: any) {
        console.error('[MarkdownEditor] Summary generation failed:', err)
        setSummaryError(err?.message || 'Failed to generate summary')
        setSummary(null)
      } finally {
        setSummaryLoading(false)
      }
    },
    [data?.content, data?.size, computeContentHash, filePath, summaryLoading, tqlActions, tqlState.initialized],
  )

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load file</p>
          <p className="text-xs">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  // Large file warning
  if (data.size > EDITOR_LOAD_THRESHOLD && !forceLoad) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md space-y-4">
          <FileText className="h-16 w-16 mx-auto text-amber-500" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Large Markdown File</h3>
            <p className="text-sm text-muted-foreground mb-1">This file is {Math.round(data.size / 1024)} KB.</p>
            <p className="text-sm text-muted-foreground">
              Loading the rich text editor for large files may cause performance issues.
            </p>
          </div>
          <Button onClick={() => setForceLoad(true)} variant="default" className="gap-2">
            <FileText className="h-4 w-4" />
            Load Editor Anyway
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with save status */}
      <div className="shrink-0 border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3 bg-muted/25">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Markdown Editor</span>
          {data.truncated && <span className="text-amber-500">(Truncated to {Math.round(data.size / 1024)} KB)</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => handleSave()}
            disabled={isSaving || !hasUnsavedChanges}>
            <Save className="h-3.5 w-3.5" />
            <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-6">
        <EditorContent editor={editor} />
      </div>

      {/* AI Summary Footer */}
      {/* <div className="p-3">
        <AIDescriptionPanel
          description={summary}
          loading={summaryLoading}
          error={summaryError}
          icon={Bot}
          hideDescriptionWhileLoading
          emptyContent={
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground flex-1">
                Generate an AI description for this markdown file.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerateSummary()}
                disabled={!data?.content || summaryLoading}
              >
                {summaryLoading ? 'Generating...' : 'Generate description'}
              </Button>
            </div>
          }
          actions={
            summary && !summaryLoading ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleGenerateSummary(true)}
                disabled={summaryLoading}
                title="Regenerate summary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        />
      </div> */}
    </div>
  )
}
