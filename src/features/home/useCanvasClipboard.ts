/**
 * Canvas Clipboard Hook
 *
 * Handles system clipboard integration for HomeCanvas.
 * Paste behavior mirrors drag & drop: URLs, images, text, file paths → nodes.
 * Copy exports selected node data to system clipboard.
 */

import * as React from 'react'
import { toast } from 'sonner'
import { invoke } from '@tauri-apps/api/core'
import type { Node, Edge } from 'reactflow'
import {
  copySelectedNodes as copyToInternal,
  pasteNodes as pasteFromInternal,
  cutSelectedNodes as cutFromInternal,
} from './canvasUtils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClipboardPasteResult {
  handled: boolean
  nodeIds?: string[]
}

export interface UseCanvasClipboardOptions {
  addNode: (type: string, position: { x: number; y: number }, label?: string, data?: any) => Promise<string>
  addFileNode: (filePath: string, position: { x: number; y: number }) => string
  addFolderNode: (folderPath: string, position: { x: number; y: number }) => string
  getViewportCenter: () => { x: number; y: number }
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  nodesRef: React.MutableRefObject<Node[]>
  edgesRef: React.MutableRefObject<Edge[]>
  pushSnapshotToHistory: (
    description: string,
    before: { nodes: Node[]; edges: Edge[] },
    after: { nodes: Node[]; edges: Edge[] },
  ) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const extractYouTubeVideoId = (url: string): string | null => {
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return watchMatch[1]

  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return shortMatch[1]

  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
  if (embedMatch) return embedMatch[1]

  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?]+)/)
  if (shortsMatch) return shortsMatch[1]

  return null
}

const extractSpotifyInfo = (url: string): { type: string; id: string } | null => {
  const trackMatch = url.match(/spotify\.com\/track\/([^?]+)/)
  if (trackMatch) return { type: 'track', id: trackMatch[1] }

  const albumMatch = url.match(/spotify\.com\/album\/([^?]+)/)
  if (albumMatch) return { type: 'album', id: albumMatch[1] }

  const playlistMatch = url.match(/spotify\.com\/playlist\/([^?]+)/)
  if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] }

  const artistMatch = url.match(/spotify\.com\/artist\/([^?]+)/)
  if (artistMatch) return { type: 'artist', id: artistMatch[1] }

  const episodeMatch = url.match(/spotify\.com\/episode\/([^?]+)/)
  if (episodeMatch) return { type: 'episode', id: episodeMatch[1] }

  const showMatch = url.match(/spotify\.com\/show\/([^?]+)/)
  if (showMatch) return { type: 'show', id: showMatch[1] }

  return null
}

const isHttpUrl = (text: string): boolean => /^https?:\/\//i.test(text)

const isFilePath = (text: string): boolean => {
  if (text.startsWith('file://')) return true
  if (text.startsWith('/')) return true
  // Windows paths
  if (/^[A-Za-z]:[/\\]/.test(text)) return true
  return false
}

const decodeFileUriToPath = (uri: string): string | null => {
  try {
    if (uri.startsWith('file://')) {
      const u = new URL(uri)
      return decodeURIComponent(u.pathname)
    }
    return uri.startsWith('/') ? uri : null
  } catch {
    return null
  }
}

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    await invoke('list_directory', { path })
    return true
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCanvasClipboard(options: UseCanvasClipboardOptions) {
  const {
    addNode,
    addFileNode,
    addFolderNode,
    getViewportCenter,
    setNodes,
    setEdges,
    nodesRef,
    edgesRef,
    pushSnapshotToHistory,
  } = options

  // Store pending paste event data
  const pendingPasteRef = React.useRef<ClipboardEvent | null>(null)

  /**
   * Handle paste event from clipboard (no permission prompt needed)
   */
  const handlePasteEvent = React.useCallback(
    async (event: ClipboardEvent): Promise<ClipboardPasteResult> => {
      const clipboardData = event.clipboardData
      if (!clipboardData) return { handled: false }

      const center = getViewportCenter()
      const nodeIds: string[] = []

      // Check for images first
      const items = Array.from(clipboardData.items)
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            const reader = new FileReader()
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })

            const nodeId = await addNode('image', center, 'Pasted Image', { src: dataUrl })
            nodeIds.push(nodeId)
          }
        }
      }

      // If we got images, we're done
      if (nodeIds.length > 0) {
        toast.success(`Pasted ${nodeIds.length} image${nodeIds.length > 1 ? 's' : ''}`)
        return { handled: true, nodeIds }
      }

      // Check for files (macOS Finder copies file paths as text/uri-list)
      const uriList = clipboardData.getData('text/uri-list')
      if (uriList) {
        const paths = uriList
          .split(/\r?\n/)
          .filter((l) => l && !l.startsWith('#'))
          .map((uri) => decodeFileUriToPath(uri))
          .filter((p): p is string => p !== null)

        if (paths.length > 0) {
          const pathInfos = await Promise.all(paths.map(async (path) => ({ path, isDir: await isDirectory(path) })))
          const spacing = 48
          const cols = Math.max(1, Math.ceil(Math.sqrt(pathInfos.length)))

          for (let i = 0; i < pathInfos.length; i++) {
            const { path, isDir } = pathInfos[i]
            const col = i % cols
            const row = Math.floor(i / cols)
            const position = {
              x: center.x + col * spacing,
              y: center.y + row * spacing,
            }

            if (isDir) {
              nodeIds.push(addFolderNode(path, position))
            } else {
              nodeIds.push(addFileNode(path, position))
            }
          }

          if (nodeIds.length > 0) {
            toast.success(`Pasted ${nodeIds.length} file${nodeIds.length > 1 ? 's' : ''}`)
            return { handled: true, nodeIds }
          }
        }
      }

      // Check for plain text (URLs, file paths, or text)
      const text = clipboardData.getData('text/plain')
      if (text) {
        const result = await handleTextPaste(text, center)
        if (result.handled) {
          return result
        }
      }

      return { handled: false }
    },
    [addNode, addFileNode, addFolderNode, getViewportCenter],
  )

  /**
   * Handle pasting text content (URLs, file paths, or plain text)
   */
  const handleTextPaste = React.useCallback(
    async (text: string, basePosition: { x: number; y: number }): Promise<ClipboardPasteResult> => {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length === 0) {
        return { handled: false }
      }

      const nodeIds: string[] = []
      const spacing = 48
      const cols = Math.max(1, Math.ceil(Math.sqrt(lines.length)))

      // Categorize lines
      const httpUrls: string[] = []
      const filePaths: string[] = []
      const plainTexts: string[] = []

      for (const line of lines) {
        if (isHttpUrl(line)) {
          httpUrls.push(line)
        } else if (isFilePath(line)) {
          const path = decodeFileUriToPath(line)
          if (path) filePaths.push(path)
        } else {
          plainTexts.push(line)
        }
      }

      // Process HTTP URLs
      for (let i = 0; i < httpUrls.length; i++) {
        const url = httpUrls[i]
        const col = i % cols
        const row = Math.floor(i / cols)
        const position = {
          x: basePosition.x + col * spacing,
          y: basePosition.y + row * spacing,
        }

        const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url)
        const videoId = isYouTube ? extractYouTubeVideoId(url) : null

        const isSpotify = /spotify\.com/i.test(url)
        const spotifyInfo = isSpotify ? extractSpotifyInfo(url) : null

        if (isYouTube && videoId) {
          const nodeId = await addNode('youtube', position, 'YouTube', {
            url,
            videoId,
            title: 'YouTube',
            provider: 'youtube',
          })
          nodeIds.push(nodeId)
        } else if (isSpotify && spotifyInfo) {
          const nodeId = await addNode('spotify', position, 'Spotify', {
            url,
            spotifyId: spotifyInfo.id,
            spotifyType: spotifyInfo.type,
            title: 'Spotify',
            provider: 'spotify',
          })
          nodeIds.push(nodeId)
        } else {
          let label = 'Web'
          try {
            label = new URL(url).hostname.replace(/^www\./, '') || 'Web'
          } catch {
            // ignore
          }
          const nodeId = await addNode('embed', position, label, { url, title: 'Web' })
          nodeIds.push(nodeId)
        }
      }

      // Process file paths
      if (filePaths.length > 0) {
        const startIdx = httpUrls.length
        const pathInfos = await Promise.all(filePaths.map(async (path) => ({ path, isDir: await isDirectory(path) })))

        for (let i = 0; i < pathInfos.length; i++) {
          const { path, isDir } = pathInfos[i]
          const idx = startIdx + i
          const col = idx % cols
          const row = Math.floor(idx / cols)
          const position = {
            x: basePosition.x + col * spacing,
            y: basePosition.y + row * spacing,
          }

          if (isDir) {
            const nodeId = addFolderNode(path, position)
            nodeIds.push(nodeId)
          } else {
            const nodeId = addFileNode(path, position)
            nodeIds.push(nodeId)
          }
        }
      }

      // Process plain text as sticky notes (if no URLs/files were found and text is substantial)
      if (nodeIds.length === 0 && plainTexts.length > 0) {
        const fullText = plainTexts.join('\n')
        // Only create a sticky note if the text is more than just whitespace
        if (fullText.trim().length > 0) {
          const nodeId = await addNode('stickyNote', basePosition, 'Note', {
            text: fullText,
            color: 'yellow',
          })
          nodeIds.push(nodeId)
        }
      }

      if (nodeIds.length > 0) {
        toast.success(`Pasted ${nodeIds.length} item${nodeIds.length > 1 ? 's' : ''}`)
        return { handled: true, nodeIds }
      }

      return { handled: false }
    },
    [addNode, addFileNode, addFolderNode],
  )

  /**
   * Copy selected nodes to system clipboard
   */
  const copyToSystemClipboard = React.useCallback(async (): Promise<number> => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected)
    if (selectedNodes.length === 0) return 0

    // Also copy to internal clipboard for internal paste
    const internalCount = copyToInternal(nodesRef.current, edgesRef.current)

    // Build clipboard text from selected nodes
    const clipboardLines: string[] = []

    for (const node of selectedNodes) {
      const data = node.data as any

      // File nodes: copy file path
      if (node.type === 'filePreview' && (data?.filePath || data?.file)) {
        clipboardLines.push(data.filePath || data.file)
        continue
      }

      // Folder nodes: copy folder path
      if (node.type === 'folder' && data?.folderPath) {
        clipboardLines.push(data.folderPath)
        continue
      }

      // Embed/YouTube nodes: copy URL
      if ((node.type === 'embed' || node.type === 'youtube' || node.type === 'spotify') && data?.url) {
        clipboardLines.push(data.url)
        continue
      }

      // Rich text/sticky notes: copy text content
      if (node.type === 'richText' || node.type === 'stickyNote') {
        if (data?.text) {
          clipboardLines.push(data.text)
        } else if (data?.content) {
          // Try to extract plain text from rich text content
          const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
          clipboardLines.push(content)
        }
        continue
      }

      // Image nodes: copy src if it's a URL (not data URL)
      if (node.type === 'image' && data?.src && !data.src.startsWith('data:')) {
        clipboardLines.push(data.src)
        continue
      }

      // Fallback: copy node label
      if (data?.label) {
        clipboardLines.push(data.label)
      }
    }

    // Write to system clipboard
    if (clipboardLines.length > 0) {
      try {
        await navigator.clipboard.writeText(clipboardLines.join('\n'))
      } catch (err) {
        console.warn('Failed to write to system clipboard:', err)
      }
    }

    return internalCount
  }, [nodesRef, edgesRef])

  /**
   * Fall back to internal clipboard paste (for node duplication)
   */
  const pasteFromInternalClipboard = React.useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const { nodes: newNodes, edges: newEdges, pastedCount } = pasteFromInternal(currentNodes, currentEdges)

    if (pastedCount > 0) {
      pushSnapshotToHistory(
        'Paste nodes',
        { nodes: currentNodes, edges: currentEdges },
        { nodes: newNodes, edges: newEdges },
      )
      setNodes(newNodes)
      setEdges(newEdges)
      toast.success(`Pasted ${pastedCount} node${pastedCount > 1 ? 's' : ''}`)
    }
  }, [nodesRef, edgesRef, setNodes, setEdges, pushSnapshotToHistory])

  /**
   * Set up paste event listener to capture clipboard data without permission prompt
   */
  React.useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
      // Only handle paste when canvas is focused (not in inputs)
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Prevent default to stop browser's default paste behavior
      event.preventDefault()

      // Process the clipboard event
      const result = await handlePasteEvent(event)

      // If system clipboard didn't have anything useful, try internal clipboard
      if (!result.handled) {
        pasteFromInternalClipboard()
      }
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [handlePasteEvent, pasteFromInternalClipboard])

  /**
   * Trigger paste via keyboard shortcut (just focus - actual paste comes from event listener)
   */
  const handlePaste = React.useCallback(() => {
    // The actual paste handling happens in the paste event listener above
    // This function exists for API compatibility but the event listener does the work
    // We can trigger a paste programmatically by using execCommand as fallback
    document.execCommand('paste')
  }, [])

  /**
   * Unified copy handler: copies to both system and internal clipboard
   */
  const handleCopy = React.useCallback(async () => {
    const count = await copyToSystemClipboard()
    if (count > 0) {
      toast.success(`Copied ${count} node${count > 1 ? 's' : ''}`)
    }
  }, [copyToSystemClipboard])

  /**
   * Cut handler: copies then removes selected nodes
   */
  const handleCut = React.useCallback(async () => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current

    // Copy first
    await copyToSystemClipboard()

    // Then cut (remove selected)
    const { nodes: newNodes, edges: newEdges, cutCount } = cutFromInternal(currentNodes, currentEdges)

    if (cutCount > 0) {
      pushSnapshotToHistory(
        'Cut nodes',
        { nodes: currentNodes, edges: currentEdges },
        { nodes: newNodes, edges: newEdges },
      )
      setNodes(newNodes)
      setEdges(newEdges)
      toast.success(`Cut ${cutCount} node${cutCount > 1 ? 's' : ''}`)
    }
  }, [copyToSystemClipboard, nodesRef, edgesRef, setNodes, setEdges, pushSnapshotToHistory])

  return {
    handleCopy,
    handlePaste,
    handleCut,
    copyToSystemClipboard,
    handlePasteEvent,
  }
}
