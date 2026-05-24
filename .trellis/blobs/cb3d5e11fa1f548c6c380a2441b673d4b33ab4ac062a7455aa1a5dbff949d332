import * as React from 'react'
import { FileItem } from '@/components/app/fileStructure'
import { TextViewer } from '../viewers/textViewer'
import { TableViewer } from '../viewers/tableViewer'
import { ImageViewer } from '../viewers/imageViewer'
import { MediaViewer } from '../viewers/mediaViewer'
import { FontViewer } from '../viewers/fontViewer'
import { useTQL } from '@/hooks/useTQL'
import { captionImageWithLlava } from '@/lib/ollama'
import { AIDescriptionPanel } from '@/components/app/AIDescriptionPanel'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { useFileStore } from '@/stores'
import { useTabStore } from '@/stores/useTabStore'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { MarkdownViewer } from '../viewers/markdownViewer'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WebPreview, WebUrlInput } from './WebPreview'
import { LoadingState, LargeFileWarning, UnsupportedState } from './PreviewStates'

// Lazy load heavy viewers
const CodeViewer = React.lazy(() =>
  import('../viewers/codeViewer').then((module) => ({
    default: module.CodeViewer,
  })),
)

const HtmlPreview = React.lazy(() =>
  import('../viewers/htmlPreview').then((module) => ({
    default: module.HtmlPreview,
  })),
)

const ComponentPreview = React.lazy(() =>
  import('../viewers/componentPreview').then((module) => ({
    default: module.ComponentPreview,
  })),
)

const PdfViewer = React.lazy(() =>
  import('../viewers/pdfViewer').then((module) => ({
    default: module.PdfViewer,
  })),
)

const DocxViewer = React.lazy(() =>
  import('../viewers/docxViewer').then((module) => ({
    default: module.DocxViewer,
  })),
)

const CanvasViewer = React.lazy(() =>
  import('../viewers/canvasViewer').then((module) => ({
    default: module.CanvasViewer,
  })),
)

const MarkdownEditor = React.lazy(() =>
  import('../viewers/markdownEditor').then((module) => ({
    default: module.MarkdownEditor,
  })),
)

const SettingsViewer = React.lazy(() =>
  import('../viewers/SettingsViewer').then((module) => ({
    default: module.SettingsViewer,
  })),
)

const DataViewer = React.lazy(() =>
  import('../viewers/dataViewer').then((module) => ({
    default: module.DataViewer,
  })),
)

const NoteViewer = React.lazy(() =>
  import('../viewers/noteViewer/index').then((module) => ({
    default: module.NoteViewer,
  })),
)

const WhiteboardViewer = React.lazy(() =>
  import('../viewers/whiteboardViewer').then((module) => ({
    default: module.WhiteboardViewer,
  })),
)

const CalendarViewer = React.lazy(() =>
  import('../viewers/calendarViewer').then((module) => ({
    default: module.CalendarViewer,
  })),
)

const GalleryViewer = React.lazy(() =>
  import('../viewers/galleryViewer').then((module) => ({
    default: module.GalleryViewer,
  })),
)

const AudioViewer = React.lazy(() =>
  import('../viewers/audioViewer').then((module) => ({
    default: module.AudioViewer,
  })),
)

interface PreviewContentProps {
  activeItem: FileItem
  webPreviewUrl?: string | null
  previewMode?: 'code' | 'preview'
}

const ENTITY_PROJECTION_TYPE_HINTS: Record<string, string> = {
  person: 'Person',
  org: 'Organization',
  proj: 'Project',
  task: 'Task',
  ms: 'Milestone',
  cycle: 'Cycle',
  collection: 'Collection',
  acc: 'Account',
  tx: 'Transaction',
  bill: 'Bill',
  goal: 'Goal',
  inc: 'Income',
  ins: 'Insurance',
  exp: 'Expense',
  tax: 'Tax',
  sub: 'Subscription',
  cat: 'Category',
  annual: 'Annual',
  agent: 'Agent',
  persona: 'Persona',
  prompt: 'Prompt',
  skill: 'Skill',
  tool: 'Tool',
  event: 'Event',
  reminder: 'Reminder',
  email: 'Email',
  dm: 'DM',
  channel: 'Channel',
  thread: 'Thread',
}

const ENTITY_PROJECTION_EXTENSIONS = new Set(Object.keys(ENTITY_PROJECTION_TYPE_HINTS))

export function PreviewContent({ activeItem, webPreviewUrl, previewMode = 'code' }: PreviewContentProps) {
  const extension = React.useMemo(() => {
    const fromItem = activeItem.extension?.toLowerCase() ?? null
    const fromName = getEffectiveExtension(activeItem.name)

    if (!fromItem) return fromName?.toLowerCase() ?? null
    if (fromItem === 'trellis' && fromName) return fromName.toLowerCase()

    return fromItem
  }, [activeItem.extension, activeItem.name])
  const [, tql] = useTQL()
  const [meta, setMeta] = React.useState<any>(null)
  const [busy, setBusy] = React.useState(false)
  const [forceLoad, setForceLoad] = React.useState(false)
  const [, { resolve }] = useLinkIndex()

  const handleNavigate = React.useCallback(
    async (target: string) => {
      try {
        const result = await resolve(target)

        if (result.status === 'resolved') {
          const path = result.filePath
          const name = path.split(/[/\\]/).pop() || ''
          const extension = getEffectiveExtension(name)

          // Construct a temporary FileItem
          // In a real app we might want to verify file stats, but this is enough for navigation
          const item: FileItem = {
            id: path,
            name,
            file_type: 'file',
            size: 0,
            date_modified: new Date().toISOString(),
            extension,
            path,
          }

          useFileStore.getState().setActiveItem(item)
        } else {
          toast.error(`Could not resolve: ${target}`)
        }
      } catch (error) {
        console.error('Navigation error:', error)
        toast.error('Failed to navigate')
      }
    },
    [resolve],
  )

  // Large file threshold: 1MB
  const LARGE_FILE_THRESHOLD = 1024 * 1024
  const isLargeFile = activeItem.size && activeItem.size > LARGE_FILE_THRESHOLD

  React.useEffect(() => {
    const r = tql.getRuntime?.()
    setMeta(r?.getImageMetadata(activeItem.path) ?? null)
    // Reset force load when file changes
    setForceLoad(false)
  }, [activeItem.path, tql])

  // Web files
  if (activeItem.file_type === 'web') {
    if (webPreviewUrl) {
      return (
        <WebPreview
          url={webPreviewUrl}
          onUrlUpdate={async (newUrl) => {
            try {
              await invoke('write_text_file', {
                filePath: activeItem.path,
                content: newUrl,
              })
              useFileStore.getState().setWebPreviewUrl(newUrl)
              toast.success('Bookmark updated')
            } catch (error) {
              toast.error(`Failed to update bookmark: ${error}`)
            }
          }}
        />
      )
    }
    return <WebUrlInput activeItem={activeItem} />
  }

  // Namespace-based viewers (check path for special folders)
  const pathParts = activeItem.path.split('/')
  // const isCalendarNamespace = pathParts.some((p) => p === '@calendar')
  const isMediaNamespace = pathParts.some((p) => p === '@media')

  // Calendar namespace -> CalendarViewer
  // DISABLED: In workspace mode, show DataViewer for .data files so users can edit them
  // The Calendar app in the dock provides the full calendar experience
  // if (isCalendarNamespace && extension === 'data') {
  //   return (
  //     <div className="h-full">
  //       <React.Suspense fallback={<LoadingState />}>
  //         <CalendarViewer filePath={activeItem.path} fileName={activeItem.name} />
  //       </React.Suspense>
  //     </div>
  //   )
  // }

  // Media namespace -> GalleryViewer (for _graph_.data or any .data file in @media)
  if (isMediaNamespace && extension === 'data') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <GalleryViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Check if we need to show large file warning for text-based files
  const needsWarning =
    isLargeFile &&
    !forceLoad &&
    // Code files
    ((extension &&
      [
        'js',
        'ts',
        'tsx',
        'jsx',
        'html',
        'astro',
        'css',
        'scss',
        'sass',
        'vue',
        'svelte',
        'py',
        'java',
        'cpp',
        'c',
        'h',
        'cs',
        'go',
        'rs',
        'php',
        'rb',
        'swift',
        'json',
        'xml',
        'yml',
        'yaml',
        'toml',
        'sh',
        'bash',
        'zsh',
        'sql',
      ].includes(extension)) ||
      // Text files
      (extension && ['txt', 'log', 'ini', 'conf', 'gitignore', 'env', 'dockerignore'].includes(extension)) ||
      // Markdown & Notes
      extension === 'md' ||
      extension === 'note' ||
      // CSV
      extension === 'csv' ||
      // No extension
      !extension)

  if (needsWarning) {
    return <LargeFileWarning size={activeItem.size || 0} onLoadAnyway={() => setForceLoad(true)} />
  }

  // Image files
  if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension)) {
    const quickHash = `${activeItem.size ?? 0}-${activeItem.date_modified ?? ''}`
    const handleDescribe = async () => {
      try {
        setBusy(true)
        const { description, model } = await captionImageWithLlava(activeItem.path)
        const r = tql.getRuntime?.()
        await r?.addImageMetadata(activeItem.path, {
          description,
          model,
          fileHash: quickHash,
          generatedAt: Date.now(),
          contentType: 'image',
        })
        setMeta(
          r?.getImageMetadata(activeItem.path) ?? {
            description,
            model,
            fileHash: quickHash,
          },
        )
      } finally {
        setBusy(false)
      }
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <ImageViewer filePath={activeItem.path} fileName={activeItem.name} />
        </div>
        <div className="border-t border-border/50 p-3">
          <AIDescriptionPanel
            description={meta?.description}
            loading={busy}
            hideDescriptionWhileLoading
            emptyMessage="No description yet."
            actions={
              <Button variant="secondary" size="sm" onClick={handleDescribe} disabled={busy}>
                {busy ? 'Describing…' : meta?.description ? 'Regenerate' : 'Generate'}
              </Button>
            }
            note={meta?.model}
          />
        </div>
      </div>
    )
  }

  // Video files
  if (extension && ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension)) {
    return (
      <div className="h-full">
        <MediaViewer filePath={activeItem.path} fileName={activeItem.name} mediaType="video" />
      </div>
    )
  }

  // Audio files
  if (extension && ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <AudioViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Font files
  if (extension && ['ttf', 'otf', 'woff', 'woff2', 'ttc', 'otc', 'font'].includes(extension)) {
    return (
      <div className="h-full">
        <FontViewer filePath={activeItem.path} extension={extension} />
      </div>
    )
  }

  // Canvas files
  if (extension === 'canvas') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <CanvasViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Whiteboard files (Excalidraw)
  if (extension === 'whiteboard') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <WhiteboardViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // PDF files
  if (extension === 'pdf') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <PdfViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Word documents
  if (extension && ['doc', 'docx'].includes(extension)) {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <DocxViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Table files (CSV and Excel)
  if (extension === 'csv') {
    return (
      <div className="h-full">
        <TableViewer filePath={activeItem.path} fileType="csv" fileName={activeItem.name} />
      </div>
    )
  }

  if (extension && ['xlsx', 'xls'].includes(extension)) {
    return (
      <div className="h-full">
        <TableViewer filePath={activeItem.path} fileType="xlsx" fileName={activeItem.name} />
      </div>
    )
  }

  // Data files (JSON-LD based)
  if (extension === 'data') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <DataViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Entity trellis projections (e.g., *.person.trellis, *.proj.trellis)
  if (extension && ENTITY_PROJECTION_EXTENSIONS.has(extension)) {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <DataViewer
            filePath={activeItem.path}
            fileName={activeItem.name}
            typeHint={ENTITY_PROJECTION_TYPE_HINTS[extension]}
          />
        </React.Suspense>
      </div>
    )
  }

  // Settings files - VSCode-like settings editor
  const isSettingsFile =
    activeItem.name === 'settings.json' ||
    (extension && extension === 'settings') ||
    activeItem.name.endsWith('.settings')

  if (isSettingsFile) {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <SettingsViewer filePath={activeItem.path} />
        </React.Suspense>
      </div>
    )
  }

  // Code files with syntax highlighting
  const codeExtensions = [
    'js',
    'ts',
    'tsx',
    'jsx',
    'html',
    'astro',
    'css',
    'scss',
    'sass',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'json',
    'xml',
    'yml',
    'yaml',
    'toml',
    'sh',
    'bash',
    'zsh',
    'sql',
    'vue',
    'svelte',
    'astro',
    'graphql',
    'prisma',
    'lua',
    'dart',
    'kt',
    'gradle',
    'properties',
    'bat',
    'cmd',
    'ps1',
    'mdx',
  ]

  // Check for specific filenames that should be treated as code
  const isCodeFilename = ['Dockerfile', 'Makefile', 'Jenkinsfile', 'Gemfile'].includes(activeItem.name)

  if ((extension && codeExtensions.includes(extension)) || isCodeFilename) {
    // Check if this is an HTML file and preview mode is enabled
    if (extension === 'html' && previewMode === 'preview') {
      return (
        <div className="h-full">
          <React.Suspense fallback={<LoadingState />}>
            <HtmlPreview filePath={activeItem.path} />
          </React.Suspense>
        </div>
      )
    }

    // Check if this is a component file and preview mode is enabled
    const componentExtensions = ['tsx', 'vue', 'svelte']
    if (extension && componentExtensions.includes(extension) && previewMode === 'preview') {
      return (
        <div className="h-full">
          <React.Suspense fallback={<LoadingState />}>
            <ComponentPreview filePath={activeItem.path} extension={extension} />
          </React.Suspense>
        </div>
      )
    }

    // Default to code viewer
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <CodeViewer filePath={activeItem.path} extension={extension || activeItem.name.toLowerCase()} />
        </React.Suspense>
      </div>
    )
  }

  // Plain text files (no syntax highlighting needed)
  const textExtensions = ['txt', 'log', 'ini', 'conf', 'gitignore', 'env', 'dockerignore']

  // Note files - Notion-style block editor
  if (extension === 'note') {
    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <NoteViewer filePath={activeItem.path} fileName={activeItem.name} />
        </React.Suspense>
      </div>
    )
  }

  // Markdown files - use Novel/shadcn editor
  if (extension === 'md') {
    if (previewMode === 'preview') {
      return (
        <div className="h-full">
          <React.Suspense fallback={<LoadingState />}>
            <MarkdownViewer filePath={activeItem.path} onNavigate={handleNavigate} />
          </React.Suspense>
        </div>
      )
    }

    return (
      <div className="h-full">
        <React.Suspense fallback={<LoadingState />}>
          <MarkdownEditor filePath={activeItem.path} />
        </React.Suspense>
      </div>
    )
  }

  if (extension && textExtensions.includes(extension)) {
    return (
      <div className="h-full">
        <TextViewer filePath={activeItem.path} />
      </div>
    )
  }

  // Files without extension - try as text
  if (!extension) {
    return (
      <div className="h-full">
        <TextViewer filePath={activeItem.path} />
      </div>
    )
  }

  // Unsupported file type
  return <UnsupportedState extension={extension} />
}
