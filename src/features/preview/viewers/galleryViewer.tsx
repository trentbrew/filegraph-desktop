/**
 * Gallery Viewer
 * Displays @media folder as a masonry image gallery
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'
import { Image as ImageIcon, RefreshCw, Grid3X3, LayoutGrid, Search, X, FolderOpen, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileStore } from '@/stores'
import { getFileIcon } from '@/lib/fileIcons'
import type { FileItem } from '@/components/app/fileStructure'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTabStore } from '@/stores/useTabStore'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { toast } from 'sonner'

interface ImageFile {
  path: string
  name: string
  size: number
  modifiedAt: string
  src: string
}

interface GalleryViewerProps {
  filePath: string
  fileName: string
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'heif', 'avif']

export function GalleryViewer({ filePath, fileName }: GalleryViewerProps) {
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)

  const [images, setImages] = React.useState<ImageFile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedImage, setSelectedImage] = React.useState<ImageFile | null>(null)
  const [gridSize, setGridSize] = React.useState<'small' | 'large'>('large')

  // Get the directory path from the file path
  const dirPath = React.useMemo(() => {
    // If filePath points to a file (like _graph_.data), get parent directory
    if (filePath.includes('_graph_.data') || filePath.endsWith('.data')) {
      return filePath.substring(0, filePath.lastIndexOf('/'))
    }
    return filePath
  }, [filePath])

  // Scan directory for images
  const loadImages = React.useCallback(async () => {
    setLoading(true)
    const foundImages: ImageFile[] = []

    const scanDirectory = async (path: string) => {
      try {
        const files = await invoke<any[]>('list_directory', { path })
        for (const file of files) {
          if (file.file_type === 'folder') {
            await scanDirectory(file.path)
          } else {
            const ext = file.extension?.toLowerCase()
            if (ext && IMAGE_EXTENSIONS.includes(ext)) {
              foundImages.push({
                path: file.path,
                name: file.name,
                size: file.size || 0,
                modifiedAt: file.modified_at || '',
                src: convertFileSrc(file.path),
              })
            }
          }
        }
      } catch (e) {
        console.warn(`[GalleryViewer] Failed to scan ${path}:`, e)
      }
    }

    await scanDirectory(dirPath)

    // Sort by modified date, newest first
    foundImages.sort((a, b) => {
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    })

    setImages(foundImages)
    setLoading(false)
  }, [dirPath])

  React.useEffect(() => {
    loadImages()
  }, [loadImages])

  // Filter images by search
  const filteredImages = React.useMemo(() => {
    if (!searchQuery.trim()) return images
    const query = searchQuery.toLowerCase()
    return images.filter((img) => img.name.toLowerCase().includes(query))
  }, [images, searchQuery])

  // Open image in editor
  const handleOpenImage = (image: ImageFile) => {
    const fileItem = {
      id: image.path,
      name: image.name,
      path: image.path,
      extension: getEffectiveExtension(image.name) || '',
      file_type: 'file' as const,
      size: image.size,
      date_modified: image.modifiedAt,
    }
    openEditorPinned(fileItem)
    setSelectedImage(null)
  }

  // Import images
  const handleImport = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: IMAGE_EXTENSIONS,
          },
        ],
      })

      if (!selected) return

      const files = Array.isArray(selected) ? selected : [selected]
      let successCount = 0

      for (const sourcePath of files) {
        try {
          const fileName = sourcePath.split('/').pop() || sourcePath.split('\\').pop() || 'image'
          const destPath = `${dirPath}/${fileName}`
          await invoke('copy_file', { sourcePath, destPath })
          successCount++
        } catch (err) {
          console.error(`[GalleryViewer] Failed to copy file:`, err)
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} image${successCount > 1 ? 's' : ''}!`)
        loadImages()
      }
    } catch (err) {
      console.error('[GalleryViewer] Import failed:', err)
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Gallery</h2>
            <p className="text-sm text-muted-foreground">
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={loadImages} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setGridSize(gridSize === 'small' ? 'large' : 'small')}>
            {gridSize === 'small' ? <LayoutGrid className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search images..."
            className="pl-9 h-8"
          />
        </div>
      </div>

      {/* Image Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No images found</p>
              {searchQuery ? (
                <p className="text-xs mt-1">Try a different search term</p>
              ) : (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Images
                </Button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-3',
                gridSize === 'small'
                  ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              )}>
              {filteredImages.map((image) => (
                <div
                  key={image.path}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setSelectedImage(image)}>
                  <img src={image.src} alt={image.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs text-white truncate font-medium">{image.name}</p>
                      <p className="text-[10px] text-white/70">{formatSize(image.size)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.src}
              alt={selectedImage.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
              <p className="text-white font-medium">{selectedImage.name}</p>
              <p className="text-white/70 text-sm">{formatSize(selectedImage.size)}</p>
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleOpenImage(selectedImage)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedImage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
