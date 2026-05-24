import * as React from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'
import '@reactflow/node-resizer/dist/style.css'

import { FilePreviewNode } from './FilePreviewNode'
import { getFileTypeFromExtension, DEFAULT_VIEWPORT } from './types'
import type { UnifiedPreviewCanvasProps, FilePreviewNodeData } from './types'

import './UnifiedPreviewCanvas.css'

// Node types for the canvas
const nodeTypes = {
  filePreview: FilePreviewNode,
}

interface UnifiedPreviewCanvasInnerProps extends UnifiedPreviewCanvasProps {
  /** For single-file mode, renders content directly without canvas */
  singleFileMode?: boolean
}

/**
 * Direct viewer mode - renders the viewer without canvas wrapper
 * This is more performant for single-file viewing
 */
function DirectViewer({
  filePath,
  fileName,
  extension,
  onClose,
}: Pick<UnifiedPreviewCanvasProps, 'filePath' | 'fileName' | 'extension' | 'onClose'>) {
  const fileType = React.useMemo(() => {
    if (!extension) return 'text'
    return getFileTypeFromExtension(extension)
  }, [extension])

  return (
    <div className="h-full w-full">
      <FilePreviewNode
        id="direct-preview"
        data={{
          filePath,
          fileName,
          fileType,
          extension,
          label: fileName,
        }}
        selected={false}
        hideHeader
        hideResizer
        hideHandles
        onClose={onClose ? () => onClose() : undefined}
      />
    </div>
  )
}

function UnifiedPreviewCanvasInner({
  filePath,
  fileName,
  extension,
  showControls = false,
  interactive = true,
  className = '',
  onClose,
  singleFileMode = true,
}: UnifiedPreviewCanvasInnerProps) {
  const { fitView } = useReactFlow()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = React.useState({ width: 800, height: 600 })

  // Track container size for proper node sizing
  React.useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width || 800, height: rect.height || 600 })
      }
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // Determine file type from extension
  const fileType = React.useMemo(() => {
    if (!extension) return 'text'
    return getFileTypeFromExtension(extension)
  }, [extension])

  // Create a single node for the file preview
  const nodes = React.useMemo<Node<FilePreviewNodeData>[]>(() => {
    // For canvas mode, use a reasonable default size that fits well
    const nodeWidth = Math.max(400, containerSize.width * 0.8)
    const nodeHeight = Math.max(300, containerSize.height * 0.8)

    return [
      {
        id: 'preview-node',
        type: 'filePreview',
        position: { x: 0, y: 0 },
        data: {
          filePath,
          fileName,
          fileType,
          extension,
          label: fileName,
        },
        style: {
          width: nodeWidth,
          height: nodeHeight,
        },
      },
    ]
  }, [filePath, fileName, fileType, extension, containerSize])

  // Fit view on mount and when file changes
  React.useEffect(() => {
    // Small delay to ensure the node is rendered
    const timer = setTimeout(() => {
      fitView({ padding: 0.05, duration: 200 })
    }, 100)
    return () => clearTimeout(timer)
  }, [filePath, fitView, containerSize])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Custom node types - show header in canvas mode for context
  const customNodeTypes = React.useMemo(() => {
    return {
      filePreview: (props: any) => (
        <FilePreviewNode
          {...props}
          hideHeader={false}
          hideResizer={false}
          hideHandles={true} // Hide connection handles for single-file preview
          onClose={onClose ? () => onClose() : undefined}
        />
      ),
    }
  }, [onClose])

  return (
    <div ref={containerRef} className={`unified-preview-canvas h-full w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={customNodeTypes}
        onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
        fitView
        fitViewOptions={{ padding: 0.05 }}
        defaultViewport={DEFAULT_VIEWPORT}
        // Enable pan/zoom for interactive canvas
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        nodesDraggable={interactive}
        nodesConnectable={false}
        nodesFocusable={true}
        edgesFocusable={false}
        elementsSelectable={interactive}
        // Hide attribution
        proOptions={{ hideAttribution: true }}
        // Zoom limits
        minZoom={0.1}
        maxZoom={4}>
        {/* Subtle dot background */}
        <Background color="var(--muted-foreground)" gap={20} size={1} style={{ opacity: 0.3 }} />

        {/* Optional controls */}
        {showControls && (
          <>
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={() => 'var(--primary)'}
              maskColor="var(--background)"
              className="bg-card border-border"
            />
          </>
        )}
      </ReactFlow>
    </div>
  )
}

/**
 * UnifiedPreviewCanvas - A unified canvas-based preview component
 *
 * This component renders file previews, with two modes:
 * - Direct mode (default): Renders viewer directly for best performance
 * - Canvas mode: Renders in xyflow canvas for pan/zoom and multi-file support
 *
 * @example
 * // Single file preview (default) - direct rendering
 * <UnifiedPreviewCanvas
 *   filePath="/path/to/image.png"
 *   fileName="image.png"
 *   extension="png"
 * />
 *
 * @example
 * // Canvas mode with controls and interaction
 * <UnifiedPreviewCanvas
 *   filePath="/path/to/file.pdf"
 *   fileName="file.pdf"
 *   extension="pdf"
 *   showControls
 *   interactive
 * />
 */
export function UnifiedPreviewCanvas({
  filePath,
  fileName,
  extension,
  showControls = false,
  interactive = false, // Default to direct rendering mode
  className = '',
  onClose,
}: UnifiedPreviewCanvasProps) {
  // Use direct rendering unless canvas features are explicitly requested
  const useDirectRendering = !showControls && !interactive

  if (useDirectRendering) {
    return (
      <div className={`h-full w-full ${className}`}>
        <DirectViewer filePath={filePath} fileName={fileName} extension={extension} onClose={onClose} />
      </div>
    )
  }

  // For canvas mode, wrap in ReactFlow
  return (
    <ReactFlowProvider>
      <UnifiedPreviewCanvasInner
        filePath={filePath}
        fileName={fileName}
        extension={extension}
        showControls={showControls}
        interactive={interactive}
        className={className}
        onClose={onClose}
        singleFileMode={false}
      />
    </ReactFlowProvider>
  )
}

// Export types and utilities
export { getFileTypeFromExtension } from './types'
export type { UnifiedPreviewCanvasProps, FilePreviewNodeData } from './types'
