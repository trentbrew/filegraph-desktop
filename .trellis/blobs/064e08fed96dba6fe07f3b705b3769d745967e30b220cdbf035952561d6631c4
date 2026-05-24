// @ts-nocheck
// TODO: Plate editor not yet integrated - missing @udecode/plate dependencies
import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Copy, Check, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Plate, createPlateEditor } from '@udecode/plate-common'
import { createPlugins } from '@udecode/plate-common'
import { createParagraphPlugin } from '@udecode/plate-paragraph'
import { createHeadingPlugin } from '@udecode/plate-heading'
import { createBasicMarksPlugin } from '@udecode/plate-basic-marks'
import { createListPlugin, createTodoListPlugin } from '@udecode/plate-list'
import { createBlockquotePlugin } from '@udecode/plate-block-quote'
import { createCodeBlockPlugin } from '@udecode/plate-code-block'
import { createLinkPlugin } from '@udecode/plate-link'
import { Descendant } from 'slate'
import { markdownToPlate, plateToMarkdown } from '@/lib/plateMarkdownConverter'

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

interface PlateMarkdownEditorProps {
  filePath: string
  maxBytes?: number
}

export function PlateMarkdownEditor({ filePath, maxBytes = 4 * 1024 * 1024 }: PlateMarkdownEditorProps) {
  const [data, setData] = React.useState<TextFileContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [lastSavedContent, setLastSavedContent] = React.useState('')
  const [editorValue, setEditorValue] = React.useState<Descendant[]>([])

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Create Plate editor with basic plugins
  const plugins = React.useMemo(
    () =>
      createPlugins([
        createParagraphPlugin(),
        createHeadingPlugin(),
        createBasicMarksPlugin(),
        createListPlugin(),
        createTodoListPlugin(),
        createBlockquotePlugin(),
        createCodeBlockPlugin(),
        createLinkPlugin(),
      ]),
    [],
  )

  const editor = React.useMemo(() => {
    return createPlateEditor({
      plugins,
    })
  }, [plugins])

  // Load file content
  React.useEffect(() => {
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
          setLastSavedContent(result.content)

          // Convert markdown to Plate format using proper converter
          const content = markdownToPlate(result.content)

          setEditorValue(content)
          setHasUnsavedChanges(false)
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
  }, [filePath, maxBytes])

  // Auto-save with debounce
  const handleEditorChange = React.useCallback(
    (value: Descendant[]) => {
      setEditorValue(value)
      setHasUnsavedChanges(true)

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce auto-save for 500ms
      saveTimeoutRef.current = setTimeout(async () => {
        if (!data || data.truncated) return

        // Convert Plate value to markdown using proper converter
        const currentContent = plateToMarkdown(value)

        if (currentContent !== lastSavedContent) {
          try {
            setIsSaving(true)
            await invoke('write_text_file', {
              filePath,
              content: currentContent,
            })
            setLastSavedContent(currentContent)
            setHasUnsavedChanges(false)
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          } finally {
            setIsSaving(false)
          }
        }
      }, 500)
    },
    [data, filePath, lastSavedContent],
  )

  // Manual save
  const handleManualSave = React.useCallback(async () => {
    if (!data || data.truncated) return

    // Clear debounce timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setIsSaving(true)
    setError(null)

    try {
      // Convert Plate value to markdown using proper converter
      const currentContent = plateToMarkdown(editorValue)

      await invoke('write_text_file', {
        filePath,
        content: currentContent,
      })

      setLastSavedContent(currentContent)
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }, [data, editorValue, filePath])

  // Copy to clipboard
  const handleCopy = React.useCallback(() => {
    const currentContent = plateToMarkdown(editorValue)

    navigator.clipboard
      .writeText(currentContent)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        // Silently fail
      })
  }, [editorValue])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges && !isSaving) {
          handleManualSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, isSaving, handleManualSave])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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
          <span>Markdown Editor</span>
          <span>•</span>
          <span>{formatFileSize(data.size)}</span>
          {data.truncated && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-medium">Truncated</span>
            </>
          )}
          {isSaving && (
            <>
              <span>•</span>
              <span className="text-blue-500 font-medium">Saving...</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!data.truncated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={handleManualSave}
              disabled={!hasUnsavedChanges || isSaving}
              title="Save changes (⌘S)">
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleCopy} title="Copy all">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">Copy</span>
          </Button>
          {hasUnsavedChanges && !isSaving && <span className="text-xs text-amber-500 font-medium ml-2">Unsaved</span>}
        </div>
      </div>

      {/* Plate Editor */}
      {!data.truncated ? (
        <div className="flex-1 overflow-auto">
          <div className="py-4 px-4 plate-editor">
            <Plate editor={editor} value={editorValue} onChange={handleEditorChange} plugins={plugins} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">File is too large to edit</p>
            <p className="text-xs mt-2 opacity-70">Open externally to edit this file</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
