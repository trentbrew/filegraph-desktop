import * as React from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { Braces, GripHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeViewer } from './codeViewer'
import '@excalidraw/excalidraw/index.css'

interface TextFileContent {
  content: string
  truncated: boolean
  totalBytes: number
}

interface WhiteboardViewerProps {
  filePath: string
  fileName: string
}

export function WhiteboardViewer({ filePath, fileName }: WhiteboardViewerProps) {
  const [initialData, setInitialData] = React.useState<any>(null)
  const [sourceValue, setSourceValue] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showSource, setShowSource] = React.useState(() => {
    const stored = localStorage.getItem('whiteboardViewer.showSource')
    return stored === 'true'
  })
  const [sourcePanelHeight, setSourcePanelHeight] = React.useState(() => {
    const stored = localStorage.getItem('whiteboardViewer.sourcePanelHeight')
    return stored ? parseInt(stored, 10) : 250
  })
  const [isResizing, setIsResizing] = React.useState(false)
  const excalidrawAPIRef = React.useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const suppressSourceSyncRef = React.useRef(false)

  // Load whiteboard data
  React.useEffect(() => {
    async function loadWhiteboard() {
      try {
        setLoading(true)
        setError(null)
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes: 10 * 1024 * 1024, // 10MB limit
        })
        const content = result.content

        if (content.trim()) {
          const data = JSON.parse(content)
          setInitialData(data)
          setSourceValue(content)
        } else {
          // Empty file, start with blank canvas
          const emptyData = {
            type: 'excalidraw',
            version: 2,
            source: 'filegraph',
            elements: [],
            appState: { viewBackgroundColor: '#ffffff' },
            files: {},
          }
          setInitialData(emptyData)
          setSourceValue(JSON.stringify(emptyData, null, 2))
        }
      } catch (err) {
        console.error('Failed to load whiteboard:', err)
        setError(`Failed to load whiteboard: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    loadWhiteboard()
  }, [filePath])

  // Auto-save on changes
  const handleChange = React.useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Debounce saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const data = {
            type: 'excalidraw',
            version: 2,
            source: 'filegraph',
            elements: elements.filter((el) => !el.isDeleted),
            appState: {
              gridSize: appState.gridSize,
              viewBackgroundColor: appState.viewBackgroundColor,
            },
            files: files || {},
          }

          const serialized = JSON.stringify(data, null, 2)

          await invoke('write_text_file', {
            filePath,
            content: serialized,
          })

          // Sync source view if not suppressed
          if (!suppressSourceSyncRef.current) {
            setSourceValue(serialized)
          }
        } catch (err) {
          console.error('Failed to save whiteboard:', err)
          toast.error('Failed to save whiteboard')
        }
      }, 1000)
    },
    [filePath],
  )

  const handleToggleSource = React.useCallback(() => {
    setShowSource((prev) => {
      const next = !prev
      localStorage.setItem('whiteboardViewer.showSource', String(next))
      return next
    })
  }, [])

  const handleSourceChange = React.useCallback(
    (newContent: string) => {
      try {
        const parsed = JSON.parse(newContent)
        suppressSourceSyncRef.current = true
        setSourceValue(newContent)

        // Update Excalidraw with new data
        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({
            elements: parsed.elements || [],
            appState: parsed.appState,
          })
        }

        // Save to file
        invoke('write_text_file', {
          filePath,
          content: newContent,
        }).catch((err) => {
          console.error('Failed to save whiteboard:', err)
          toast.error('Failed to save whiteboard')
        })

        requestAnimationFrame(() => {
          suppressSourceSyncRef.current = false
        })
      } catch (err) {
        console.warn('Invalid JSON in source editor:', err)
      }
    },
    [filePath],
  )

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
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading whiteboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">{fileName}</span>
        <Button
          variant={showSource ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 gap-1.5"
          onClick={handleToggleSource}>
          <Braces className="h-3.5 w-3.5" />
          Source
        </Button>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 min-h-0">
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawAPIRef.current = api
          }}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: true,
            },
          }}
        />
      </div>

      {/* Source panel */}
      {showSource && (
        <div className="border-t border-border/60 flex flex-col" style={{ height: sourcePanelHeight }}>
          {/* Resize handle */}
          <div
            className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-accent/50 transition-colors group"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsResizing(true)
              const startY = e.clientY
              const startHeight = sourcePanelHeight

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = startY - moveEvent.clientY
                const newHeight = Math.max(100, Math.min(500, startHeight + delta))
                setSourcePanelHeight(newHeight)
              }

              const handleMouseUp = () => {
                setIsResizing(false)
                localStorage.setItem('whiteboardViewer.sourcePanelHeight', String(sourcePanelHeight))
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}>
            <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
          </div>

          {/* Code viewer */}
          <div className="flex-1 overflow-hidden">
            <CodeViewer
              filePath={filePath}
              extension="json"
              maxBytes={10 * 1024 * 1024}
              content={sourceValue || undefined}
              onContentChange={handleSourceChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
