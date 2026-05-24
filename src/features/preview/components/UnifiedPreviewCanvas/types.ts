import type { Viewport } from 'reactflow'

export type FileType =
  | 'text'
  | 'code'
  | 'markdown'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'docx'
  | 'table'
  | 'font'
  | 'data'

export interface UnifiedPreviewCanvasProps {
  filePath: string
  fileName: string
  extension?: string | null
  showControls?: boolean
  interactive?: boolean
  className?: string
  onClose?: () => void
}

export interface FilePreviewNodeData {
  filePath: string
  fileName: string
  fileType: FileType
  extension?: string | null
  textMaxBytes?: number
  fit?: 'contain' | 'cover'
  label: string
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

export function getFileTypeFromExtension(extension: string): FileType {
  const ext = extension.toLowerCase().replace(/^\./, '')

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'm4v', 'webm', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio'

  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (['md', 'markdown'].includes(ext)) return 'markdown'

  if (ext === 'data') return 'data'
  if (['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) return 'table'
  if (['otf', 'ttf', 'woff', 'woff2', 'ttc', 'otc', 'font'].includes(ext)) return 'font'

  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'yaml',
      'yml',
      'toml',
      'rs',
      'py',
      'go',
      'java',
      'kt',
      'swift',
      'c',
      'h',
      'cpp',
      'hpp',
      'css',
      'html',
      'xml',
      'sh',
      'zsh',
      'sql',
    ].includes(ext)
  )
    return 'code'

  return 'text'
}
