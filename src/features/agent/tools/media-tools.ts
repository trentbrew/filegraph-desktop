/**
 * Agent Tools — Media Domain
 *
 * Tools for vision analysis (images/video/PDF) and image generation.
 */

import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { getVaultPath } from './helpers'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif', 'tiff', 'ico']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']
const DOCUMENT_EXTENSIONS = ['pdf']
const ALL_ANALYZABLE_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...DOCUMENT_EXTENSIONS]

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const MEDIA_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'analyze_canvas_media',
    description: `Analyze an image, video, or PDF on the Home canvas using Gemini vision AI. Use this when the user asks you to describe, analyze, or explain visual content on their canvas.

**Examples:**
- "Describe autumn.png" → search: "autumn.png" or "autumn"
- "What's in the sunset image?" → search: "sunset"
- "Analyze the photo of the building" → search: "building"
- "Summarize the PDF document" → search for the PDF filename
- "Tell me about this video" → provide the node ID

**Supported media types:**
- Images: jpg, jpeg, png, gif, webp, bmp, svg, heic, tiff
- Videos: mp4, webm, mov, avi, mkv
- Documents: pdf

**Returns:**
- description: AI-generated analysis of the content
- nodeId: The node that was analyzed
- filePath: Path to the media file
- mediaType: 'image', 'video', or 'document'
- model: The vision model used (prefers Gemini)`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: ['string', 'null'], description: 'ID of the canvas node to analyze (from get_home_canvas)' },
        search: { type: ['string', 'null'], description: 'Search for a node by label/name (e.g., "a good day", "sunset photo")' },
        prompt: { type: ['string', 'null'], description: 'Custom prompt for analysis (default: "Describe this image in detail")' },
      },
      required: ['nodeId', 'search', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'generate_image',
    description: `Generate an image using Gemini Nano Banana (text-to-image) and save it as a local file.

Uses Gemini's image generation models (default: gemini-2.5-flash-image) and persists the returned base64 image data into the current Home canvas space folder, so it can be previewed and placed on the canvas.

**Code organization:** When generating images for a web project, always set subdirectory to "assets/images" so assets stay organized.

Returns the saved filePath and (optionally) the created canvas nodeId.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Text prompt describing the image to generate' },
        label: { type: ['string', 'null'], description: 'Optional label/filename hint for the generated image' },
        model: { type: ['string', 'null'], description: 'Gemini image model ID (default: gemini-2.5-flash-image)' },
        aspectRatio: { type: ['string', 'null'], description: 'Optional aspect ratio (e.g., "1:1", "16:9", "9:16", "4:3", "3:4")' },
        imageSize: { type: ['string', 'null'], description: 'Optional output size (primarily for gemini-3-pro-image-preview, e.g., "2K", "4K")' },
        addToCanvas: { type: ['boolean', 'null'], description: 'If true, add the generated image as a filePreview node on the Home canvas (default: true)' },
        subdirectory: { type: ['string', 'null'], description: 'Subdirectory within the space folder to save the image (e.g. "assets/images"). Defaults to "assets/images" for web projects. Use null to save to space root.' },
        position: {
          type: ['object', 'null'],
          description: 'Optional canvas position for the new node (only used when addToCanvas=true)',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
          additionalProperties: false,
        },
      },
      required: ['prompt', 'label', 'model', 'aspectRatio', 'imageSize', 'addToCanvas', 'subdirectory', 'position'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeFileStem(input: string): string {
  const s = (input || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return s || 'image'
}

function extensionFromMime(mimeType: string): string {
  const mt = (mimeType || '').toLowerCase()
  if (mt === 'image/png') return 'png'
  if (mt === 'image/jpeg' || mt === 'image/jpg') return 'jpg'
  if (mt === 'image/webp') return 'webp'
  if (mt === 'image/gif') return 'gif'
  return 'png'
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeCanvasMedia(
  nodeId?: string | null,
  search?: string | null,
  prompt?: string | null,
): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Vision analysis only works in browser context' }

    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const store = useHomeCanvasStore.getState()
    if (!store.isInitialized) await store.initialize()
    const { nodes } = useHomeCanvasStore.getState()

    if (nodes.length === 0) return { error: 'Home canvas is empty. No media to analyze.' }

    let targetNode: any = null

    if (nodeId) {
      targetNode = nodes.find((n) => n.id === nodeId)
      if (!targetNode) return { error: `Node not found: ${nodeId}` }
    } else if (search) {
      const searchLower = search.toLowerCase()
      const mediaNodes = nodes.filter((n) => {
        if (n.type === 'image') return true
        if (n.type === 'filePreview') {
          const filePath = n.data?.filePath || n.data?.file || ''
          const ext = filePath.split('/').pop()?.toLowerCase().split('.').pop() || ''
          return ALL_ANALYZABLE_EXTENSIONS.includes(ext)
        }
        return false
      })

      const scored = mediaNodes.map((n) => {
        const label = (n.data?.label || '').toLowerCase()
        const filePath = n.data?.filePath || n.data?.file || ''
        const fileName = filePath.split('/').pop()?.toLowerCase() || ''
        const fileNameNoExt = fileName.replace(/\.[^.]+$/, '')
        let score = 0
        if (label === searchLower) score = 100
        else if (fileNameNoExt === searchLower) score = 95
        else if (label.includes(searchLower)) score = 80
        else if (fileNameNoExt.includes(searchLower)) score = 70
        else if (fileName.includes(searchLower)) score = 60
        return { node: n, score }
      })
      scored.sort((a, b) => b.score - a.score)

      if (scored.length === 0 || scored[0].score === 0) {
        return {
          error: `No media found matching "${search}"`,
          hint: 'Use get_home_canvas to see available nodes and their labels/files',
          availableMedia: mediaNodes.slice(0, 5).map((n) => ({ id: n.id, type: n.type, label: n.data?.label, file: n.data?.filePath || n.data?.file })),
        }
      }
      targetNode = scored[0].node
    } else {
      return { error: 'Must provide either nodeId or search parameter', hint: 'Use get_home_canvas first to find image/video nodes' }
    }

    let filePath = ''
    let mediaType: 'image' | 'video' | 'document' = 'image'

    if (targetNode.type === 'image') {
      const src = targetNode.data?.src || targetNode.data?.url || ''
      if (src.startsWith('http://') || src.startsWith('https://')) return { error: 'Cannot analyze external URLs. Only local files are supported.' }
      filePath = src
    } else if (targetNode.type === 'filePreview') {
      filePath = targetNode.data?.filePath || targetNode.data?.file || ''
    } else {
      return { error: `Node type "${targetNode.type}" is not a media node` }
    }

    if (!filePath) return { error: 'Could not determine file path for the media node' }
    if (!filePath.startsWith('/')) {
      const vaultPath = await getVaultPath()
      filePath = await join(vaultPath, filePath)
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    if (VIDEO_EXTENSIONS.includes(ext)) mediaType = 'video'
    else if (DOCUMENT_EXTENSIONS.includes(ext)) mediaType = 'document'
    else if (!IMAGE_EXTENSIONS.includes(ext)) {
      return { error: `Unsupported file type: .${ext}`, supportedImages: IMAGE_EXTENSIONS, supportedVideos: VIDEO_EXTENSIONS, supportedDocuments: DOCUMENT_EXTENSIONS }
    }

    const fileContent = await invoke<{ data: string; truncated: boolean; size: number }>('read_file_base64', { filePath, maxBytes: 10 * 1024 * 1024 })
    if (fileContent.truncated) return { error: 'File is too large for vision analysis (>10MB)', filePath, size: fileContent.size }

    const defaultPrompt = mediaType === 'document' ? 'Analyze and summarize this document.' : mediaType === 'video' ? 'Describe this video.' : 'Describe this image in detail.'
    const analysisPrompt = prompt || defaultPrompt

    const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', heic: 'image/heic', heif: 'image/heif', tiff: 'image/tiff', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/x-m4v', pdf: 'application/pdf' }
    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    let description = ''
    let modelUsed = ''

    try {
      const { getAdapter } = await import('@/lib/providers')
      const { useAgentAppStore } = await import('@/features/agent/stores/useAgentAppStore')
      const agentState = useAgentAppStore.getState()
      const geminiApiKey = agentState.modelConfig.provider === 'gemini' ? agentState.modelConfig.apiKey : localStorage.getItem('filegraph-gemini-api-key')

      if (geminiApiKey) {
        const geminiAdapter = getAdapter('gemini')
        const geminiModel = 'gemini-2.5-flash'
        const response = await geminiAdapter.chat(
          { messages: [{ role: 'system', content: 'You are a helpful assistant that analyzes images, videos, and documents accurately and concisely.' }, { role: 'user', content: analysisPrompt, attachments: [{ type: mimeType, data: fileContent.data, name: filePath.split('/').pop() }] } as any], stream: false },
          { provider: 'gemini', model: geminiModel, apiKey: geminiApiKey },
        )
        description = response.content || 'No description generated'
        modelUsed = `gemini:${geminiModel}`
      } else {
        throw new Error('No Gemini API key configured')
      }
    } catch (geminiErr) {
      try {
        const { getAdapter, PROVIDERS } = await import('@/lib/providers')
        const { useAgentAppStore } = await import('@/features/agent/stores/useAgentAppStore')
        const { provider, model, apiKey } = useAgentAppStore.getState().modelConfig
        const providerDef = PROVIDERS[provider]
        const modelDef = providerDef?.models.find((m: any) => m.id === model)

        if (!modelDef?.supportsVision) {
          if (mediaType === 'image') {
            try {
              const captionResult = await invoke<{ description: string; model: string }>('caption_image', { filePath, host: 'http://localhost:11434', model: 'llava' })
              description = captionResult.description
              modelUsed = `ollama:${captionResult.model}`
            } catch (ollamaErr) {
              return { error: 'No vision model available', details: `Gemini error: ${geminiErr}. Ollama error: ${ollamaErr}.`, hint: 'Configure a Gemini API key in Settings, or install Ollama with llava: "ollama pull llava"' }
            }
          } else {
            return { error: 'No vision model available for this content type', details: `Gemini error: ${geminiErr}.`, hint: 'Configure a Gemini API key in Settings', mediaType }
          }
        } else {
          const adapter = getAdapter(provider)
          const response = await adapter.chat(
            { messages: [{ role: 'system', content: 'You are a helpful assistant that analyzes images, videos, and documents accurately and concisely.' }, { role: 'user', content: analysisPrompt, attachments: [{ type: mimeType, data: fileContent.data, name: filePath.split('/').pop() }] } as any], stream: false },
            { provider, model, apiKey },
          )
          description = response.content || 'No description generated'
          modelUsed = `${provider}:${model}`
        }
      } catch (providerErr) {
        return { error: 'Vision analysis failed', geminiError: String(geminiErr), providerError: String(providerErr), hint: 'Configure a Gemini API key in Settings' }
      }
    }

    return { success: true, nodeId: targetNode.id, nodeType: targetNode.type, label: targetNode.data?.label, filePath, mediaType, fileSize: fileContent.size, model: modelUsed, description }
  } catch (err) {
    return { error: `Vision analysis failed: ${err}` }
  }
}

export async function generateImage(
  prompt: string,
  label?: string | null,
  model?: string | null,
  aspectRatio?: string | null,
  imageSize?: string | null,
  addToCanvas?: boolean | null,
  subdirectory?: string | null,
  position?: { x: number; y: number } | null,
): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Image generation only works in browser context' }

    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const store = useHomeCanvasStore.getState()
    if (!store.isInitialized) await store.initialize()

    const state = useHomeCanvasStore.getState()
    const nodesDir = state.currentSpacePath
    if (!nodesDir) return { error: 'Home canvas not initialized (no nodes directory available)' }

    const { PROVIDERS } = await import('@/lib/providers')
    const { useAgentAppStore } = await import('@/features/agent/stores/useAgentAppStore')
    const agentState = useAgentAppStore.getState()
    const geminiApiKey = agentState.modelConfig.provider === 'gemini' ? agentState.modelConfig.apiKey : localStorage.getItem('filegraph-gemini-api-key')
    const apiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) return { error: 'Gemini API key not configured', hint: 'Set VITE_GEMINI_API_KEY or configure Gemini in Settings' }

    const baseUrl = PROVIDERS.gemini?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
    const chosenModel = (model || 'gemini-2.5-flash-image').trim()

    const generationConfig: Record<string, any> = { responseModalities: ['Image'] }
    if (aspectRatio || imageSize) {
      generationConfig.imageConfig = { ...(aspectRatio ? { aspectRatio } : {}), ...(imageSize ? { imageSize } : {}) }
    }

    const url = `${baseUrl}/models/${encodeURIComponent(chosenModel)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return { error: (err as any)?.error?.message || `Gemini API error: ${resp.status}`, model: chosenModel }
    }

    const data = await resp.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p?.inlineData?.data)
    if (!imagePart?.inlineData?.data) return { error: 'No image returned by model', model: chosenModel }

    const mimeType: string = imagePart.inlineData.mimeType || 'image/png'
    const imageBase64: string = imagePart.inlineData.data
    const ext = extensionFromMime(mimeType)
    const stem = sanitizeFileStem(label || prompt)
    const fileName = `${stem}-${Date.now()}.${ext}`
    const saveDir = subdirectory ? await join(nodesDir, subdirectory) : nodesDir
    const filePath = await join(saveDir, fileName)

    if (subdirectory) {
      await invoke('shell_exec', { cmd: `mkdir -p "${saveDir}"`, cwd: null, timeoutMs: 5_000, maxOutput: 1_000 })
    }

    await invoke('write_file_base64', { filePath, data: imageBase64 })

    const shouldAdd = addToCanvas !== false
    if (!shouldAdd) return { success: true, filePath, mimeType, model: chosenModel }

    let pos = position || { x: 0, y: 0 }
    if (!position) {
      const nodes = state.nodes
      if (nodes.length > 0) {
        let maxX = -Infinity, minY = Infinity
        for (const n of nodes) {
          const w = (n.style?.width as number) || 300
          maxX = Math.max(maxX, n.position.x + w)
          minY = Math.min(minY, n.position.y)
        }
        pos = { x: Math.round(maxX + 80), y: Number.isFinite(minY) ? Math.round(minY) : 0 }
      }
    }

    const nodeId = useHomeCanvasStore.getState().addFileNode(filePath, pos)
    window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: nodeId } }))
    return { success: true, filePath, mimeType, model: chosenModel, nodeId }
  } catch (err) {
    return { error: `Failed to generate image: ${err}` }
  }
}
