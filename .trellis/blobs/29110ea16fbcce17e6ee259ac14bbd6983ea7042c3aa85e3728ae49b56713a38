/**
 * Import Photos Component
 * Import images from filesystem into vault @media folder
 * (Camera capture not available in Tauri desktop webview)
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'
import { X, Upload, Check, Image as ImageIcon, FolderOpen, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useVault } from '@/contexts/VaultContext'
import { useUIStore } from '@/stores/useUIStore'
import { useTabStore } from '@/stores/useTabStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SelectedFile {
  path: string
  name: string
  previewSrc: string
}

export function Camera() {
  const { vaultPath } = useVault()
  const { cameraOpen, setCameraOpen } = useUIStore()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)

  const [selectedFiles, setSelectedFiles] = React.useState<SelectedFile[]>([])
  const [importing, setImporting] = React.useState(false)

  // Open the gallery viewer
  const openGallery = React.useCallback(async () => {
    if (!vaultPath) return
    const filePath = `${vaultPath}/@media/_graph_.data`

    // Ensure directory and file exist
    try {
      await invoke('create_directory', { path: `${vaultPath}/@media` })
    } catch {}
    try {
      await invoke('read_text_file', { filePath })
    } catch {
      await invoke('write_text_file', {
        filePath,
        content: JSON.stringify({ '@context': { '@vocab': 'https://schema.org/' }, '@graph': [] }, null, 2),
      })
    }

    openEditorPinned({
      id: filePath,
      name: '_graph_.data',
      path: filePath,
      extension: 'data',
      file_type: 'file',
      size: 0,
      date_modified: new Date().toISOString(),
    })
  }, [vaultPath, openEditorPinned])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!cameraOpen) {
      setSelectedFiles([])
    }
  }, [cameraOpen])

  // Select files via dialog
  const handleSelectFiles = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif', 'avif'],
          },
        ],
      })

      if (selected && Array.isArray(selected)) {
        const newFiles: SelectedFile[] = selected.map((path) => ({
          path,
          name: path.split('/').pop() || path.split('\\').pop() || 'image',
          previewSrc: convertFileSrc(path),
        }))
        setSelectedFiles((prev) => [...prev, ...newFiles])
      } else if (selected) {
        // Single file selected
        const path = selected as string
        setSelectedFiles((prev) => [
          ...prev,
          {
            path,
            name: path.split('/').pop() || path.split('\\').pop() || 'image',
            previewSrc: convertFileSrc(path),
          },
        ])
      }
    } catch (err) {
      console.error('[ImportPhotos] Failed to select files:', err)
    }
  }

  // Remove a file from selection
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Import selected files to vault
  const handleImport = async () => {
    if (!vaultPath || selectedFiles.length === 0) return

    setImporting(true)
    let successCount = 0

    try {
      // Create @media folder if it doesn't exist
      const mediaPath = `${vaultPath}/@media`
      try {
        await invoke('create_directory', { path: mediaPath })
      } catch {
        // Directory may already exist
      }

      // Copy each file
      for (const file of selectedFiles) {
        try {
          const destPath = `${mediaPath}/${file.name}`
          await invoke('copy_file', {
            sourcePath: file.path,
            destPath,
          })
          successCount++
        } catch (err) {
          console.error(`[ImportPhotos] Failed to copy ${file.name}:`, err)
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} photo${successCount > 1 ? 's' : ''}!`, {
          description: `Saved to @media/`,
        })
        setCameraOpen(false)
        openGallery()
      } else {
        toast.error('Failed to import photos')
      }
    } catch (err) {
      console.error('[ImportPhotos] Import failed:', err)
      toast.error('Failed to import photos', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setImporting(false)
    }
  }

  if (!cameraOpen) return null

  return (
    <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Photos
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCameraOpen(false)
                openGallery()
              }}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Gallery
            </Button>
          </div>
        </DialogHeader>

        {/* Selected Files Preview */}
        <ScrollArea className="h-[400px]">
          <div className="p-4">
            {selectedFiles.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={handleSelectFiles}>
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Select images to import</p>
                <p className="text-xs text-muted-foreground mt-1">Click to browse files</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.path}-${index}`}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={file.previewSrc} alt={file.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveFile(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-[10px] text-white truncate">{file.name}</p>
                      </div>
                    </div>
                  ))}
                  {/* Add more button */}
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={handleSelectFiles}>
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSelectFiles}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse
            </Button>
            <Button onClick={handleImport} disabled={importing || selectedFiles.length === 0}>
              {importing ? (
                <>Importing...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import to @media
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
