/**
 * File-Backed Canvas Node Components
 *
 * These node components load their content from files and auto-save changes.
 * Used by the home canvas for persistent node storage.
 */

import * as React from 'react'
import { NodeProps } from 'reactflow'
import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Mention from '@tiptap/extension-mention'
import { invoke } from '@tauri-apps/api/core'
import {
  Loader2,
  FileText,
  StickyNote,
  Table,
  Plus,
  Globe,
  Video,
  Music,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { createNodeFile, generateNodeFileName } from '@/features/home/utils'
import { useFileStore } from '@/stores/useFileStore'
import { createMentionSuggestion, type MentionItem } from '@/features/preview/viewers/noteViewer/suggestion'
import { Wikilink } from '@/features/preview/viewers/noteViewer/Wikilink'
import '@/features/preview/viewers/noteViewer/noteViewer.css'
import {
  DEFAULT_NOTE_CONTENT,
  DEFAULT_STICKY_CONTENT,
  DEFAULT_TABLE_CONTENT,
  DEFAULT_WEB_CONTENT,
  type WebEmbedContent,
  type StickyNoteContent,
  type TableContent,
} from '@/features/home/types'

const DEFAULT_YOUTUBE_WEB_CONTENT: WebEmbedContent = {
  ...DEFAULT_WEB_CONTENT,
  title: 'YouTube',
  provider: 'youtube',
}

const DEFAULT_SPOTIFY_WEB_CONTENT: WebEmbedContent = {
  ...DEFAULT_WEB_CONTENT,
  title: 'Spotify',
  provider: 'spotify',
}

// ─────────────────────────────────────────────────────────────────────────────
// File Content Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseFileContentOptions<T> {
  filePath: string | undefined
  defaultValue: T
  parse?: (content: string) => T
  serialize?: (value: T) => string
}

// Node types that contain scrollable embedded content (iframes)
export const EMBED_NODE_TYPES = ['embed', 'youtube', 'spotify'] as const
export type EmbedNodeType = (typeof EMBED_NODE_TYPES)[number]

function BrowserBar({
  value,
  onChange,
  onSubmit,
  onRefresh,
  isRefreshing,
  onOpenExternal,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  onSubmit: (e: React.FormEvent) => void
  onRefresh: () => void
  isRefreshing: boolean
  onOpenExternal: () => void
  placeholder: string
}) {
  return (
    <div className="flex items-center gap-1 px-1.5 h-9 bg-muted/40 backdrop-blur-sm border-b border-border/50">
      <button
        type="button"
        disabled
        className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground/40 cursor-not-allowed"
        title="Back (not available in embed)">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled
        className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground/40 cursor-not-allowed"
        title="Forward (not available in embed)">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title="Refresh">
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      </button>

      <form onSubmit={onSubmit} className="flex-1 flex items-center min-w-0">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-7 px-2 text-[11px] bg-background/0 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground"
          placeholder={placeholder}
        />
      </form>

      <button
        type="button"
        onClick={onOpenExternal}
        className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Open in browser">
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export interface FileWebEmbedNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
}

function parseWebEmbedContent(raw: string): WebEmbedContent {
  const trimmed = raw.trim()
  if (!trimmed) return { ...DEFAULT_WEB_CONTENT }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as WebEmbedContent
  }

  return { ...DEFAULT_WEB_CONTENT, url: trimmed }
}

export function FileWebEmbedNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileWebEmbedNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [resolvedFilePath, setResolvedFilePath] = React.useState<string | undefined>(data?.file)
  const [showBrowserBar, setShowBrowserBar] = React.useState(true)
  const [urlBarValue, setUrlBarValue] = React.useState('')
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [localhostReady, setLocalhostReady] = React.useState(false)
  const retryCountRef = React.useRef(0)

  React.useEffect(() => {
    setResolvedFilePath(data?.file)
  }, [data?.file])

  React.useEffect(() => {
    if (resolvedFilePath) return

    const legacyUrl = (data as unknown as Record<string, unknown> | undefined)?.url
    if (typeof legacyUrl !== 'string' || !legacyUrl.trim()) return

    let cancelled = false

    const migrate = async () => {
      try {
        const fileName = generateNodeFileName('embed', data?.label)
        const filePath = await createNodeFile('embed', fileName, { ...DEFAULT_WEB_CONTENT, url: legacyUrl.trim() })

        if (cancelled) return
        setResolvedFilePath(filePath)
        window.dispatchEvent(new CustomEvent('canvas-node-update', { detail: { id, data: { file: filePath } } }))
      } catch (err) {
        console.error('[FileWebEmbedNode] Failed to migrate legacy embed node:', err)
      }
    }

    migrate()
    return () => {
      cancelled = true
    }
  }, [data, id, resolvedFilePath])

  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const { content, setContent, isLoading, error } = useFileContent<WebEmbedContent>({
    filePath: resolvedFilePath,
    defaultValue: DEFAULT_WEB_CONTENT,
    parse: parseWebEmbedContent,
    serialize: (v) => JSON.stringify(v, null, 2),
  })

  React.useEffect(() => {
    setInputValue(content?.url || '')
    setUrlBarValue(content?.url || '')
  }, [content?.url])

  const normalizeUrl = (input: string) => {
    if (!input) return ''
    if (input.startsWith('http://') || input.startsWith('https://')) return input
    return `https://${input}`
  }

  const url = content?.url || ''

  const isLocalhostUrl = React.useMemo(() => {
    try {
      if (!url) return false
      const parsed = new URL(url)
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    } catch {
      return false
    }
  }, [url])

  // Auto-refresh iframe when agent writes project files (only for localhost previews)
  React.useEffect(() => {
    if (!isLocalhostUrl) return
    const handlePreviewReload = () => {
      if (iframeRef.current && url) {
        setIsRefreshing(true)
        iframeRef.current.src = url
      }
    }
    window.addEventListener('canvas-preview-reload', handlePreviewReload)
    return () => window.removeEventListener('canvas-preview-reload', handlePreviewReload)
  }, [isLocalhostUrl, url])

  // Auto-retry polling for localhost URLs (dev servers that take time to start)
  // Uses Tauri shell_exec lsof to silently check port availability without
  // flooding the browser console with "Failed to load resource" errors.
  React.useEffect(() => {
    if (!isLocalhostUrl || !url || localhostReady) return

    retryCountRef.current = 0
    const MAX_RETRIES = 30 // ~60 seconds at 2s intervals
    let cancelled = false

    let port: number | null = null
    try {
      port = new URL(url).port ? parseInt(new URL(url).port, 10) : null
    } catch {
      port = null
    }

    const poll = async () => {
      while (!cancelled && retryCountRef.current < MAX_RETRIES) {
        try {
          let isUp = false
          if (port) {
            const result = await invoke<{ stdout: string; exit_code: number }>('shell_exec', {
              cmd: `lsof -i :${port} -t 2>/dev/null`,
              cwd: null,
              timeoutMs: 3000,
              maxOutput: 500,
            })
            isUp = result.stdout.trim().length > 0
          }
          if (isUp) {
            if (cancelled) return
            setLocalhostReady(true)
            if (iframeRef.current) {
              setIsRefreshing(true)
              iframeRef.current.src = url
            }
            return
          }
        } catch {
          // lsof failed — treat as port not ready
        }
        retryCountRef.current++
        if (!cancelled) {
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [url, isLocalhostUrl, localhostReady])

  // Reset localhostReady when URL changes
  React.useEffect(() => {
    setLocalhostReady(false)
    retryCountRef.current = 0
  }, [url])

  const domain = React.useMemo(() => {
    try {
      return url ? new URL(url).hostname : ''
    } catch {
      return url
    }
  }, [url])

  const handleSubmit = () => {
    const nextUrl = normalizeUrl(inputValue.trim())
    setContent({ ...content, url: nextUrl })
    setIsInteractive(false)
  }

  const handleUrlBarSubmit = (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault()
    if (urlBarValue.trim()) {
      const normalized = normalizeUrl(urlBarValue.trim())
      setContent({ ...content, url: normalized })
    }
  }

  const handleRefresh = () => {
    if (iframeRef.current && url) {
      setIsRefreshing(true)
      iframeRef.current.src = url
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load: {error}</p>
      </div>
    )
  }

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          label={domain || content?.title || data?.label || 'Web'}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        {url && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="Enter URL..."
          />
        )}
        <div className="flex-1 overflow-hidden">
          {url && (
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setIsRefreshing(false)}
              onError={() => setIsRefreshing(false)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
      label={domain || content?.title || data?.label || 'Web'}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      toolbarRightExtra={
        url && (
          <button
            type="button"
            onClick={() => setShowBrowserBar(!showBrowserBar)}
            className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={showBrowserBar ? 'Hide URL bar' : 'Show URL bar'}>
            {showBrowserBar ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )
      }
      minWidth={300}
      minHeight={200}>
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden',
          // Interactive when: maximized OR double-clicked (isInteractive) - single-click selection allows dragging
          isMaximized || (isInteractive && url) ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {url && showBrowserBar && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="Enter URL..."
          />
        )}

        {/* Iframe content */}
        {url ? (
          <div className="flex-1 min-h-0 relative">
            {isLocalhostUrl && !localhostReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Waiting for server...</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={url}
                className="absolute inset-0 w-full h-full border-0"
                title={domain || 'Web'}
                onLoad={() => setIsRefreshing(false)}
                onError={() => setIsRefreshing(false)}
              />
            )}
          </div>
        ) : (
          /* Empty state / URL input */
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
            <Globe className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Embed a website</p>
            <div className="flex gap-2 w-full max-w-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://example.com"
                className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSubmit}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                Embed
              </button>
            </div>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

export interface FileYoutubeNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
}

export function FileYoutubeNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileYoutubeNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [resolvedFilePath, setResolvedFilePath] = React.useState<string | undefined>(data?.file)
  const [showBrowserBar, setShowBrowserBar] = React.useState(true)
  const [urlBarValue, setUrlBarValue] = React.useState('')
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  React.useEffect(() => {
    setResolvedFilePath(data?.file)
  }, [data?.file])

  React.useEffect(() => {
    if (resolvedFilePath) return

    const legacy = data as unknown as Record<string, unknown> | undefined
    const legacyUrl = legacy?.url
    const legacyVideoId = legacy?.videoId

    const url = typeof legacyUrl === 'string' ? legacyUrl.trim() : ''
    const videoId = typeof legacyVideoId === 'string' ? legacyVideoId.trim() : ''
    if (!url && !videoId) return

    let cancelled = false

    const migrate = async () => {
      try {
        const fileName = generateNodeFileName('youtube', data?.label)
        const filePath = await createNodeFile('youtube', fileName, {
          ...DEFAULT_WEB_CONTENT,
          title: 'YouTube',
          provider: 'youtube',
          url,
          videoId: videoId || undefined,
        })

        if (cancelled) return
        setResolvedFilePath(filePath)
        window.dispatchEvent(new CustomEvent('canvas-node-update', { detail: { id, data: { file: filePath } } }))
      } catch (err) {
        console.error('[FileYoutubeNode] Failed to migrate legacy youtube node:', err)
      }
    }

    migrate()
    return () => {
      cancelled = true
    }
  }, [data, id, resolvedFilePath])

  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const { content, setContent, isLoading, error } = useFileContent<WebEmbedContent>({
    filePath: resolvedFilePath,
    defaultValue: DEFAULT_YOUTUBE_WEB_CONTENT,
    parse: parseWebEmbedContent,
    serialize: (v) => JSON.stringify(v, null, 2),
  })

  const extractVideoId = (input: string): string | null => {
    const watchMatch = input.match(/[?&]v=([^&]+)/)
    if (watchMatch) return watchMatch[1]

    const shortMatch = input.match(/youtu\.be\/([^?]+)/)
    if (shortMatch) return shortMatch[1]

    const embedMatch = input.match(/youtube\.com\/embed\/([^?]+)/)
    if (embedMatch) return embedMatch[1]

    if (input.length === 11 && !input.includes('/') && !input.includes('?')) {
      return input
    }

    return null
  }

  const url = content?.url || ''
  const videoId = content?.videoId || (url ? extractVideoId(url) || '' : '')
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : ''

  React.useEffect(() => {
    setInputValue(url || videoId || '')
    setUrlBarValue(url || videoId || '')
  }, [url, videoId])

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const nextVideoId = extractVideoId(trimmed)
    if (!nextVideoId) return

    setContent({
      ...content,
      provider: 'youtube',
      title: content?.title || 'YouTube',
      url: trimmed,
      videoId: nextVideoId,
    })
    setIsInteractive(false)
  }

  const handleUrlBarSubmit = (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault()
    const trimmed = urlBarValue.trim()
    if (!trimmed) return

    const nextVideoId = extractVideoId(trimmed)
    if (!nextVideoId) return

    setContent({
      ...content,
      provider: 'youtube',
      title: content?.title || 'YouTube',
      url: trimmed,
      videoId: nextVideoId,
    })
  }

  const handleRefresh = () => {
    if (iframeRef.current && embedUrl) {
      setIsRefreshing(true)
      iframeRef.current.src = embedUrl
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank')
      return
    }
    if (videoId) {
      window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
    }
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load: {error}</p>
      </div>
    )
  }

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Video className="h-4 w-4 text-muted-foreground" />}
          label={content?.title || data?.label || 'YouTube'}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        {embedUrl && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="YouTube URL or video ID..."
          />
        )}
        <div className="flex-1 overflow-hidden">
          {embedUrl && (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
              onLoad={() => setIsRefreshing(false)}
              onError={() => setIsRefreshing(false)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Video className="h-3.5 w-3.5 text-muted-foreground" />}
      label={content?.title || data?.label || 'YouTube'}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      toolbarRightExtra={
        embedUrl && (
          <button
            type="button"
            onClick={() => setShowBrowserBar(!showBrowserBar)}
            className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={showBrowserBar ? 'Hide URL bar' : 'Show URL bar'}>
            {showBrowserBar ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )
      }
      minWidth={400}
      minHeight={225}>
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden',
          // Interactive when: maximized OR double-clicked (isInteractive) - single-click selection allows dragging
          isMaximized || (isInteractive && embedUrl) ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {embedUrl && showBrowserBar && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="YouTube URL or video ID..."
          />
        )}

        {embedUrl ? (
          <div className="flex-1 min-h-0 relative">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
              onLoad={() => setIsRefreshing(false)}
              onError={() => setIsRefreshing(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
            <Video className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Embed a YouTube video</p>
            <div className="flex gap-2 w-full max-w-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="YouTube URL or video ID..."
                className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSubmit}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 min-w-fit">
                Embed
              </button>
            </div>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

export interface FileSpotifyNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
}

export function FileSpotifyNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileSpotifyNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [resolvedFilePath, setResolvedFilePath] = React.useState<string | undefined>(data?.file)
  const [showBrowserBar, setShowBrowserBar] = React.useState(true)
  const [urlBarValue, setUrlBarValue] = React.useState('')
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  React.useEffect(() => {
    setResolvedFilePath(data?.file)
  }, [data?.file])

  React.useEffect(() => {
    if (resolvedFilePath) return

    const legacy = data as unknown as Record<string, unknown> | undefined
    const legacyUrl = legacy?.url
    const legacySpotifyId = legacy?.spotifyId

    const url = typeof legacyUrl === 'string' ? legacyUrl.trim() : ''
    const spotifyId = typeof legacySpotifyId === 'string' ? legacySpotifyId.trim() : ''
    if (!url && !spotifyId) return

    let cancelled = false

    const migrate = async () => {
      try {
        const fileName = generateNodeFileName('spotify', data?.label)
        const filePath = await createNodeFile('spotify', fileName, {
          ...DEFAULT_WEB_CONTENT,
          title: 'Spotify',
          provider: 'spotify',
          url,
          spotifyId: spotifyId || undefined,
        })

        if (cancelled) return
        setResolvedFilePath(filePath)
        window.dispatchEvent(new CustomEvent('canvas-node-update', { detail: { id, data: { file: filePath } } }))
      } catch (err) {
        console.error('[FileSpotifyNode] Failed to migrate legacy spotify node:', err)
      }
    }

    migrate()
    return () => {
      cancelled = true
    }
  }, [data, id, resolvedFilePath])

  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const { content, setContent, isLoading, error } = useFileContent<WebEmbedContent>({
    filePath: resolvedFilePath,
    defaultValue: DEFAULT_SPOTIFY_WEB_CONTENT,
    parse: parseWebEmbedContent,
    serialize: (v) => JSON.stringify(v, null, 2),
  })

  const extractSpotifyInfo = (input: string): { type: string; id: string } | null => {
    const trackMatch = input.match(/spotify\.com\/track\/([^?]+)/)
    if (trackMatch) return { type: 'track', id: trackMatch[1] }

    const albumMatch = input.match(/spotify\.com\/album\/([^?]+)/)
    if (albumMatch) return { type: 'album', id: albumMatch[1] }

    const playlistMatch = input.match(/spotify\.com\/playlist\/([^?]+)/)
    if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] }

    const artistMatch = input.match(/spotify\.com\/artist\/([^?]+)/)
    if (artistMatch) return { type: 'artist', id: artistMatch[1] }

    const episodeMatch = input.match(/spotify\.com\/episode\/([^?]+)/)
    if (episodeMatch) return { type: 'episode', id: episodeMatch[1] }

    const showMatch = input.match(/spotify\.com\/show\/([^?]+)/)
    if (showMatch) return { type: 'show', id: showMatch[1] }

    return null
  }

  const url = content?.url || ''
  const spotifyInfo = content?.spotifyId
    ? { type: content?.spotifyType || 'track', id: content.spotifyId }
    : url
      ? extractSpotifyInfo(url)
      : null
  const embedUrl = spotifyInfo ? `https://open.spotify.com/embed/${spotifyInfo.type}/${spotifyInfo.id}` : ''

  React.useEffect(() => {
    setInputValue(url || (spotifyInfo ? `${spotifyInfo.type}/${spotifyInfo.id}` : ''))
    setUrlBarValue(url || (spotifyInfo ? `${spotifyInfo.type}/${spotifyInfo.id}` : ''))
  }, [url, spotifyInfo])

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const nextSpotifyInfo = extractSpotifyInfo(trimmed)
    if (!nextSpotifyInfo) return

    setContent({
      ...content,
      provider: 'spotify',
      title: content?.title || 'Spotify',
      url: trimmed,
      spotifyId: nextSpotifyInfo.id,
      spotifyType: nextSpotifyInfo.type,
    })
    setIsInteractive(false)
  }

  const handleUrlBarSubmit = (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault()
    const trimmed = urlBarValue.trim()
    if (!trimmed) return

    const nextSpotifyInfo = extractSpotifyInfo(trimmed)
    if (!nextSpotifyInfo) return

    setContent({
      ...content,
      provider: 'spotify',
      title: content?.title || 'Spotify',
      url: trimmed,
      spotifyId: nextSpotifyInfo.id,
      spotifyType: nextSpotifyInfo.type,
    })
  }

  const handleRefresh = () => {
    if (iframeRef.current && embedUrl) {
      setIsRefreshing(true)
      iframeRef.current.src = embedUrl
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank')
      return
    }
    if (spotifyInfo) {
      window.open(`https://open.spotify.com/${spotifyInfo.type}/${spotifyInfo.id}`, '_blank')
    }
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load: {error}</p>
      </div>
    )
  }

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Music className="h-4 w-4 text-muted-foreground" />}
          label={content?.title || data?.label || 'Spotify'}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        {embedUrl && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="Spotify URL..."
          />
        )}
        <div className="flex-1 overflow-hidden">
          {embedUrl && (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify embed"
              onLoad={() => setIsRefreshing(false)}
              onError={() => setIsRefreshing(false)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Music className="h-3.5 w-3.5 text-muted-foreground" />}
      label={content?.title || data?.label || 'Spotify'}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      toolbarRightExtra={
        embedUrl && (
          <button
            type="button"
            onClick={() => setShowBrowserBar(!showBrowserBar)}
            className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={showBrowserBar ? 'Hide URL bar' : 'Show URL bar'}>
            {showBrowserBar ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )
      }
      minWidth={400}
      minHeight={152}>
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden',
          // Interactive when: maximized OR double-clicked (isInteractive) - single-click selection allows dragging
          isMaximized || (isInteractive && embedUrl) ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {embedUrl && showBrowserBar && (
          <BrowserBar
            value={urlBarValue}
            onChange={setUrlBarValue}
            onSubmit={handleUrlBarSubmit}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenExternal={handleOpenExternal}
            placeholder="Spotify URL..."
          />
        )}

        {embedUrl ? (
          <div className="flex-1 min-h-0 relative">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify embed"
              onLoad={() => setIsRefreshing(false)}
              onError={() => setIsRefreshing(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
            <Music className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Embed Spotify</p>
            <div className="flex gap-2 w-full max-w-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Spotify URL..."
                className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSubmit}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 min-w-fit">
                Embed
              </button>
            </div>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

function useFileContent<T>({
  filePath,
  defaultValue,
  parse = JSON.parse,
  serialize = (v) => JSON.stringify(v, null, 2),
}: UseFileContentOptions<T>) {
  const [content, setContent] = React.useState<T>(defaultValue)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = React.useRef(filePath)
  const fileVersion = useFileStore((state) => (filePath ? state.getFileVersion(filePath) : 0))

  // Keep ref updated
  React.useEffect(() => {
    filePathRef.current = filePath
  }, [filePath])

  // Load content from file
  React.useEffect(() => {
    if (!filePath) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        const result = await invoke<{ content: string }>('read_text_file', {
          filePath,
          maxBytes: 5 * 1024 * 1024,
        })

        if (cancelled) return

        if (result?.content?.trim()) {
          const parsed = parse(result.content)
          setContent(parsed)
        } else {
          setContent(defaultValue)
        }
      } catch (err) {
        if (cancelled) return
        console.error('[FileNode] Failed to load content:', err)
        setError(err instanceof Error ? err.message : 'Failed to load')
        setContent(defaultValue)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filePath, fileVersion, defaultValue, parse])

  // Save content to file (debounced)
  const saveContent = React.useCallback(
    (newContent: T) => {
      setContent(newContent)

      if (!filePathRef.current) return

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save
      saveTimeoutRef.current = setTimeout(async () => {
        if (!filePathRef.current) return

        try {
          await invoke('write_text_file', {
            filePath: filePathRef.current,
            content: serialize(newContent),
          })
        } catch (err) {
          console.error('[FileNode] Failed to save content:', err)
        }
      }, 500)
    },
    [serialize],
  )

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return { content, setContent: saveContent, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// File-Backed Rich Text Node
// ─────────────────────────────────────────────────────────────────────────────

export interface FileRichTextNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
  entities?: MentionItem[]
}

export function FileRichTextNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileRichTextNodeData> & { groupColor?: string }) {
  const label = data?.label || 'Text'
  const isMaximized = data?.isMaximized || false
  const entities = data?.entities || []
  const entitiesRef = React.useRef<MentionItem[]>([])
  const [isInteractive, setIsInteractive] = React.useState(false)

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  React.useEffect(() => {
    entitiesRef.current = entities
  }, [entities])

  const { content, setContent, isLoading, error } = useFileContent<unknown>({
    filePath: data?.file,
    defaultValue: DEFAULT_NOTE_CONTENT,
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Type here... Use @ to mention, [[ to link',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderText({ node }: { node: any }) {
          return `@${node.attrs.label || node.attrs.id}`
        },
        renderHTML({ options, node }: { options: any; node: any }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query: string) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 15)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 15)
          },
        }),
      }),
      Wikilink.configure({
        HTMLAttributes: { class: 'wikilink' },
        renderText({ node }: { node: any }) {
          return `[[${node.attrs.label || node.attrs.id}]]`
        },
        renderHTML({ options, node }: { options: any; node: any }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query: string) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 15)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 15)
          },
        }),
      }),
    ],
    content: content || DEFAULT_NOTE_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60px] px-3 py-2',
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement
        if (target.classList.contains('mention') || target.classList.contains('wikilink')) {
          const entityId = target.getAttribute('data-id')
          if (entityId) {
            // Dispatch custom event to add entity card to canvas
            window.dispatchEvent(new CustomEvent('canvas-entity-click', { detail: { entityId } }))
          }
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
    },
  })

  // Update editor when file content loads
  React.useEffect(() => {
    if (editor && content && !isLoading) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content as any)
      }
    }
  }, [content, isLoading, editor])

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load: {error}</p>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      minWidth={350}
      minHeight={250}>
      {/* Maximized header */}
      {isMaximized && (
        <MaximizedHeader
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          label={label}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
      )}

      {/* Editor Content */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-auto',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// File-Backed Sticky Note Node
// ─────────────────────────────────────────────────────────────────────────────

export interface FileStickyNoteNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
}

const STICKY_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-900 dark:text-yellow-100',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-900 dark:text-pink-100',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-900 dark:text-blue-100',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-900 dark:text-green-100',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-900 dark:text-purple-100',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-900 dark:text-orange-100',
  },
}

export function FileStickyNoteNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileStickyNoteNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [isInteractive, setIsInteractive] = React.useState(false)

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const { content, setContent } = useFileContent<StickyNoteContent>({
    filePath: data?.file,
    defaultValue: DEFAULT_STICKY_CONTENT,
  })

  const colorClasses = STICKY_COLOR_CLASSES[content.color || 'yellow'] || STICKY_COLOR_CLASSES.yellow

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent({ ...content, text: e.target.value })
    },
    [content, setContent],
  )

  const handleColorChange = React.useCallback(
    (newColor: string) => {
      setContent({ ...content, color: newColor })
    },
    [content, setContent],
  )

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<StickyNote className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'Sticky Note'}
      minWidth={200}
      minHeight={150}
      bgClass={colorClasses.bg}
      borderClass={colorClasses.border}>
      {/* Maximized header */}
      {isMaximized && (
        <MaximizedHeader
          icon={<StickyNote className="h-4 w-4 text-muted-foreground" />}
          label="Note"
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        <textarea
          value={content.text}
          onChange={handleTextChange}
          placeholder="Note..."
          className={cn(
            'w-full h-full p-2 bg-transparent resize-none focus:outline-none',
            colorClasses.text,
            'text-sm leading-relaxed placeholder:text-current/50',
          )}
        />
      </div>

      {/* Color picker - bottom right (only when selected) */}
      {selected && (
        <div className="flex items-center justify-end gap-1 px-2 py-1 shrink-0">
          {Object.keys(STICKY_COLOR_CLASSES).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              className={cn(
                'w-3 h-3 rounded-full transition-transform opacity-0 group-hover:opacity-100',
                content.color === color && 'ring-2 ring-offset-1 ring-foreground/50 scale-110 opacity-100!',
              )}
              style={{
                backgroundColor:
                  color === 'yellow'
                    ? '#fbbf24'
                    : color === 'pink'
                      ? '#f472b6'
                      : color === 'blue'
                        ? '#60a5fa'
                        : color === 'green'
                          ? '#4ade80'
                          : color === 'purple'
                            ? '#a78bfa'
                            : color === 'orange'
                              ? '#fb923c'
                              : color,
              }}
              title={color}
            />
          ))}
        </div>
      )}
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// File-Backed Table Node (CSV Format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse CSV string to TableContent
 * First row is treated as headers, remaining rows are data
 * Also handles JSON format for backwards compatibility
 */
function parseCSV(raw: string): TableContent {
  const trimmed = raw.trim()
  if (!trimmed) return { ...DEFAULT_TABLE_CONTENT }

  // Handle JSON format (backwards compatibility with old .data files)
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.headers && Array.isArray(parsed.headers) && parsed.rows && Array.isArray(parsed.rows)) {
        // Ensure each row is a string array
        const safeHeaders = parsed.headers.map((h: unknown) => (typeof h === 'string' ? h : String(h ?? '')))
        const safeRows = parsed.rows.map((row: unknown) =>
          Array.isArray(row)
            ? row.map((cell: unknown) => (typeof cell === 'string' ? cell : String(cell ?? '')))
            : safeHeaders.map(() => ''),
        )
        return { headers: safeHeaders, rows: safeRows.length > 0 ? safeRows : [safeHeaders.map(() => '')] }
      }
    } catch {
      // Not valid JSON, continue with CSV parsing
    }
  }

  const lines = trimmed.split(/\r?\n/)
  if (lines.length === 0) return { ...DEFAULT_TABLE_CONTENT }

  // Simple CSV parsing (handles quoted fields with commas)
  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip escaped quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)

  // Ensure all rows have same number of columns as headers
  const normalizedRows = rows.map((row) => {
    if (row.length < headers.length) {
      return [...row, ...Array(headers.length - row.length).fill('')]
    }
    return row.slice(0, headers.length)
  })

  return { headers, rows: normalizedRows.length > 0 ? normalizedRows : [headers.map(() => '')] }
}

/**
 * Serialize TableContent to CSV string
 */
function serializeCSV(content: TableContent): string {
  const escapeField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  const headerLine = content.headers.map(escapeField).join(',')
  const dataLines = content.rows.map((row) => row.map(escapeField).join(','))

  return [headerLine, ...dataLines].join('\n')
}

export interface FileTableNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
  /** If true, node is resizable. If false/undefined, node auto-sizes to content. */
  resizable?: boolean
}

export function FileTableNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<FileTableNodeData> & { groupColor?: string }) {
  const label = data?.label || 'Table'
  const isMaximized = data?.isMaximized || false
  const [isInteractive, setIsInteractive] = React.useState(false)

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Load/save table content from file (CSV format)
  const { content, setContent, isLoading, error } = useFileContent<TableContent>({
    filePath: data?.file,
    defaultValue: DEFAULT_TABLE_CONTENT,
    parse: parseCSV,
    serialize: serializeCSV,
  })

  const headers = content.headers
  const rows = content.rows

  // Table manipulation functions
  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = value
    setContent({ ...content, headers: newHeaders })
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
    )
    setContent({ ...content, rows: newRows })
  }

  const addRow = () => {
    const newRow = headers.map(() => '')
    setContent({ ...content, rows: [...rows, newRow] })
  }

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`]
    const newRows = rows.map((row) => [...row, ''])
    setContent({ headers: newHeaders, rows: newRows })
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load: {error}</p>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Table className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      minWidth={200}
      minHeight={120}>
      {/* Maximized header */}
      {isMaximized && (
        <MaximizedHeader
          icon={<Table className="h-4 w-4 text-muted-foreground" />}
          label={label}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
      )}

      {/* Table Content - scrollable within fixed node bounds */}
      <div
        className={cn(
          'h-full w-full overflow-auto',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        <table className={cn('w-full border-collapse', isMaximized ? 'text-sm' : 'text-xs')}>
          <thead>
            <tr className="bg-muted/50 sticky top-0 z-10">
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className={cn(
                    'border-b border-r border-border/50 p-0 font-medium text-left',
                    isMaximized ? 'min-w-[120px]' : 'min-w-[100px]',
                  )}>
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    className={cn(
                      'w-full bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary',
                      isMaximized ? 'px-3 py-2' : 'px-2 py-1.5',
                    )}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/30">
                {(Array.isArray(row) ? row : []).map((cell, colIndex) => (
                  <td key={colIndex} className="border-b border-r border-border/50 p-0">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className={cn(
                        'w-full bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary',
                        isMaximized ? 'px-3 py-2' : 'px-2 py-1.5',
                      )}
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Add row button below the table */}
        <button
          onClick={addRow}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t border-border/50',
            isMaximized ? 'py-2 text-sm' : 'py-1.5 text-xs',
          )}>
          <Plus className={isMaximized ? 'h-4 w-4' : 'h-3 w-3'} />
          Add row
        </button>
      </div>
    </CanvasNodeWrapper>
  )
}
