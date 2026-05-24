/**
 * useAttachments - Hook for managing file attachments with image optimization
 */

import * as React from 'react'

export interface Attachment {
  id: string
  file: File
  previewUrl: string | null
  base64: string
}

const MAX_DIMENSION = 1024
const PREVIEW_DIMENSION = 256
const JPEG_QUALITY = 0.85

async function optimizeImage(file: File): Promise<{ base64: string; previewUrl: string; optimizedSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const dataUrl = canvas.toDataURL(mimeType, JPEG_QUALITY)
      const base64 = dataUrl.split(',')[1]

      const previewScale = Math.min(PREVIEW_DIMENSION / img.width, PREVIEW_DIMENSION / img.height, 1)
      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = Math.round(img.width * previewScale)
      previewCanvas.height = Math.round(img.height * previewScale)
      const previewCtx = previewCanvas.getContext('2d')!
      previewCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height)
      const previewUrl = previewCanvas.toDataURL('image/jpeg', 0.7)

      const optimizedSize = Math.round((base64.length * 3) / 4)
      console.debug(
        `[Agent] Image optimized: ${file.name} ${file.size} → ${optimizedSize} bytes (${Math.round((optimizedSize / file.size) * 100)}%)`,
      )

      resolve({ base64, previewUrl, optimizedSize })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function processFile(file: File): Promise<{ base64: string; previewUrl: string | null }> {
  const isImage = file.type.startsWith('image/')

  if (isImage) {
    const { base64, previewUrl } = await optimizeImage(file)
    return { base64, previewUrl }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve({ base64, previewUrl: null })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useAttachments() {
  const [attachments, setAttachments] = React.useState<Attachment[]>([])

  const addAttachment = React.useCallback(async (file: File) => {
    try {
      const { base64, previewUrl } = await processFile(file)
      const newAttachment: Attachment = {
        id: `attach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl,
        base64,
      }
      setAttachments((prev) => [...prev, newAttachment])
    } catch (err) {
      console.error('[Agent] Failed to process file:', err)
    }
  }, [])

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAttachments = React.useCallback(() => {
    setAttachments([])
  }, [])

  const getAttachmentsData = React.useCallback(() => {
    if (attachments.length === 0) return undefined
    return attachments.map((att) => ({
      id: att.id,
      name: att.file.name,
      type: att.file.type,
      size: att.file.size,
      data: att.base64,
      previewUrl: att.previewUrl || undefined,
    }))
  }, [attachments])

  return {
    attachments,
    setAttachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    getAttachmentsData,
  }
}
