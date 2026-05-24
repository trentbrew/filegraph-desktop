import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, AlertCircle, RefreshCw, Bot, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { useTQL } from '@/hooks/useTQL'
import { summarizePdfText, isPdfPath } from '@/lib/ollama'
import { AIDescriptionPanel } from '@/components/app/AIDescriptionPanel'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  filePath: string
  fileName: string
}

export function PdfViewer({ filePath, fileName: _fileName }: PdfViewerProps) {
  const [error, setError] = React.useState<string | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // TQL and AI summary state
  const [tqlState, tqlActions] = useTQL()
  const [summary, setSummary] = React.useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = React.useState(true)
  const [pageCount, setPageCount] = React.useState(0)
  const [scale, setScale] = React.useState(1.5)
  const canvasRefs = React.useRef<Map<number, HTMLCanvasElement>>(new Map())
  const pdfDocRef = React.useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTasksRef = React.useRef<Map<number, any>>(new Map())

  // Render a single page to its canvas
  const renderPage = React.useCallback(async (pageNum: number, currentScale: number) => {
    const pdfDoc = pdfDocRef.current
    const canvas = canvasRefs.current.get(pageNum)
    if (!pdfDoc || !canvas) return

    // Cancel any in-progress render for this page
    const existingTask = renderTasksRef.current.get(pageNum)
    if (existingTask) {
      existingTask.cancel()
      renderTasksRef.current.delete(pageNum)
    }

    try {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: currentScale })
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const renderTask = page.render({ canvasContext: ctx, viewport })
      renderTasksRef.current.set(pageNum, renderTask)
      await renderTask.promise
      renderTasksRef.current.delete(pageNum)
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`[PdfViewer] Failed to render page ${pageNum}:`, err)
      }
    }
  }, [])

  // Load PDF via Tauri and render with PDF.js
  React.useEffect(() => {
    let mounted = true

    const loadPdf = async () => {
      setPdfLoading(true)
      setError(null)
      setPageCount(0)

      // Cleanup previous document
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }

      try {
        const base64Data = await invoke<string>('read_pdf_as_base64', { filePath })
        if (!mounted) return

        // Decode base64 to Uint8Array
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise
        if (!mounted) {
          pdfDoc.destroy()
          return
        }

        pdfDocRef.current = pdfDoc
        setPageCount(pdfDoc.numPages)
        setPdfLoading(false)

        // Render all pages
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (!mounted) break
          await renderPage(i, scale)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load PDF')
          setPdfLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      mounted = false
      // Cancel all render tasks
      for (const task of renderTasksRef.current.values()) {
        task.cancel()
      }
      renderTasksRef.current.clear()
    }
  }, [filePath]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render all pages when scale changes
  React.useEffect(() => {
    if (!pdfDocRef.current || pageCount === 0) return

    const rerender = async () => {
      for (let i = 1; i <= pageCount; i++) {
        await renderPage(i, scale)
      }
    }
    rerender()
  }, [scale, pageCount, renderPage])

  // Pinch-to-zoom support
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 4))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const handleOpenExternal = async () => {
    try {
      const result = await invoke<string>('open_file_with_default_app', { filePath })
      toast.success(result)
    } catch (error) {
      toast.error(`Failed to open PDF: ${error}`)
    }
  }

  // Reset summary state when PDF changes
  React.useEffect(() => {
    setSummary(null)
    setSummaryLoading(false)
    setSummaryError(null)
  }, [filePath])

  // Check cache immediately when TQL initializes or file changes
  React.useEffect(() => {
    if (!isPdfPath(filePath) || !tqlState.initialized) return

    const runtime = tqlActions.getRuntime()
    if (!runtime) return

    // Check if summary already exists in cache
    const store = runtime.getStore()
    const fileId = runtime.getEntityId(filePath)

    if (fileId) {
      const links = store.getLinksByEntityAndAttribute(fileId as any, 'meta:has')
      for (const link of links) {
        const facts = store.getFactsByEntity(link.e2)
        const summaryFact = facts.find((f) => f.a === 'summary' || f.a === 'description')
        if (summaryFact) {
          setSummary(String(summaryFact.v))
          return
        }
      }
    }
  }, [filePath, tqlState.initialized, tqlActions])

  // Generate summary on demand (called when user clicks button)
  const loadSummary = React.useCallback(async () => {
    if (!isPdfPath(filePath) || !tqlState.initialized || summaryLoading) return

    const runtime = tqlActions.getRuntime()
    if (!runtime) return

    try {
      // Generate new summary
      setSummaryLoading(true)
      setSummaryError(null)

      const { summary: generatedSummary, model } = await summarizePdfText(filePath)

      // Store in TQL for caching (reuse image metadata structure)
      await runtime.addImageMetadata(filePath, {
        description: generatedSummary,
        model,
        fileHash: `${Date.now()}`,
        generatedAt: Date.now(),
        contentType: 'pdf',
      })

      setSummary(generatedSummary)
      await runtime.save()
    } catch (err: any) {
      console.error('[PdfViewer] Summary generation failed:', err)
      setSummaryError(err?.message || 'Failed to generate summary')
    } finally {
      setSummaryLoading(false)
    }
  }, [filePath, tqlState.initialized, tqlActions, summaryLoading])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }
    }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load PDF</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>PDF Document</span>
          {pageCount > 0 && <span>· {pageCount} page{pageCount !== 1 ? 's' : ''}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setScale((s) => Math.min(s + 0.25, 4))}
            title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleOpenExternal}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="text-xs">Open External</span>
          </Button>
        </div>
      </div>

      {/* PDF Content - Scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-muted/20">
        {pdfLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
              <canvas
                key={pageNum}
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el)
                  else canvasRefs.current.delete(pageNum)
                }}
                className="shadow-md bg-white"
                style={{ maxWidth: '100%' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Summary Footer - Always Visible */}
      <div className="shrink-0 border-t border-border/50 p-4 bg-muted/20">
        <AIDescriptionPanel
          description={summary}
          loading={summaryLoading}
          error={summaryError}
          icon={Bot}
          hideDescriptionWhileLoading
          emptyContent={
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground flex-1">Generate an AI summary for this PDF document.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadSummary()}
                disabled={summaryLoading || !tqlState.initialized}>
                {summaryLoading ? 'Generating...' : 'Generate summary'}
              </Button>
            </div>
          }
          actions={
            summary && !summaryLoading ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => loadSummary()}
                disabled={summaryLoading}
                title="Regenerate summary">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  )
}
