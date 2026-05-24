import * as React from 'react'
import type { NodeProps } from 'reactflow'
import { AlertTriangle, FileText } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { FilePreviewNode } from '@/features/preview/components/UnifiedPreviewCanvas/FilePreviewNode'
import { getFileTypeFromExtension } from '@/features/preview/components/UnifiedPreviewCanvas/types'
import { Button } from '@/components/ui/button'
import { invoke } from '@tauri-apps/api/core'
import { useTabStore } from '@/stores/useTabStore'
import type { FileItem } from '@/components/app/fileStructure'

import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'
import { EmptyFileNode } from './EmptyFileNode'

export interface HomeFilePreviewNodeData {
  file?: string
  filePath?: string
  fileName?: string
  label?: string
  isMaximized?: boolean
}

export function HomeFilePreviewNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<HomeFilePreviewNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const filePath = data?.filePath || data?.file
  const fallbackName = filePath ? filePath.split(/[/\\]/).pop() : undefined
  const fileName = data?.fileName || fallbackName || data?.label || 'File'

  const extension = getEffectiveExtension(fileName)
  const fileType = extension ? getFileTypeFromExtension(extension) : 'text'

  const label = data?.label || fileName

  const [isEditing, setIsEditing] = React.useState(false)

  // Exit editing mode when node is deselected
  React.useEffect(() => {
    if (!selected) setIsEditing(false)
  }, [selected])

  // Only allow interaction when maximized OR double-clicked (isEditing)
  const canInteract = isMaximized || isEditing

  // Handle opening file sidebar to select a file for this node
  const handleOpenSidebar = React.useCallback(() => {
    // Open the files sidebar
    window.dispatchEvent(new CustomEvent('canvas-open-sidebar', { detail: { nodeId: id } }))
  }, [id])

  const openEditorPinned = useTabStore((s) => s.openEditorPinned)

  const [fileSize, setFileSize] = React.useState<number | null>(null)
  const [fileSizeLoading, setFileSizeLoading] = React.useState(false)
  const [forcePreviewLoad, setForcePreviewLoad] = React.useState(false)

  const extensionLower = (extension ?? '').toLowerCase()
  const isDataFile = extensionLower === 'data'

  // 2MB is where text rendering tends to start getting janky in-node.
  // We still allow loading a truncated preview explicitly.
  const LARGE_CANVAS_PREVIEW_THRESHOLD = 2 * 1024 * 1024

  React.useEffect(() => {
    let cancelled = false

    const loadSize = async () => {
      if (!filePath) return
      if (!isDataFile) return

      setFileSizeLoading(true)
      try {
        const result = await invoke<{ content: string; truncated: boolean; encoding: string; size: number }>(
          'read_text_file',
          {
            filePath,
            maxBytes: 1,
          },
        )

        if (!cancelled) {
          setFileSize(result.size)
        }
      } catch {
        if (!cancelled) {
          setFileSize(null)
        }
      } finally {
        if (!cancelled) {
          setFileSizeLoading(false)
        }
      }
    }

    void loadSize()

    return () => {
      cancelled = true
    }
  }, [filePath, isDataFile])

  React.useEffect(() => {
    setForcePreviewLoad(false)
  }, [filePath])

  const handleOpenFile = React.useCallback(() => {
    if (!filePath) return
    const item: FileItem = {
      id: filePath,
      name: fileName,
      file_type: 'file',
      size: fileSize,
      date_modified: new Date().toISOString(),
      extension,
      path: filePath,
    }
    openEditorPinned(item)
  }, [extension, fileName, filePath, fileSize, openEditorPinned])

  const shouldBlockPreview =
    isDataFile && !forcePreviewLoad && (fileSizeLoading ? false : (fileSize ?? 0) >= LARGE_CANVAS_PREVIEW_THRESHOLD)

  const canvasTextMaxBytes = isDataFile ? 256 * 1024 : undefined

  const preview = filePath ? (
    shouldBlockPreview ? (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <p className="text-sm font-medium text-foreground">Large .data file</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Preview is disabled to keep the canvas responsive.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setForcePreviewLoad(true)}>
            Load preview
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenFile}>
            Open file
          </Button>
        </div>
      </div>
    ) : (
      <FilePreviewNode
        data={{
          filePath,
          fileName,
          fileType,
          extension,
          label,
          fit: fileType === 'image' || fileType === 'video' ? 'cover' : 'contain',
          textMaxBytes: canvasTextMaxBytes,
        }}
        hideHeader
        hideResizer
        hideHandles
      />
    )
  ) : (
    <EmptyFileNode onOpenSidebar={handleOpenSidebar} />
  )

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          label={label}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        <div className={cn('flex-1 min-h-0', canInteract ? 'nodrag nowheel' : 'pointer-events-none')}>{preview}</div>
      </div>
    )
  }

  const isMedia = fileType === 'image' || fileType === 'video'

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      minWidth={isMedia ? 200 : 400}
      minHeight={isMedia ? 150 : 300}
      keepAspectRatio={isMedia}>
      <div className={cn('flex-1 min-h-0', canInteract ? 'nodrag nowheel' : 'pointer-events-none')}>{preview}</div>
    </CanvasNodeWrapper>
  )
}
