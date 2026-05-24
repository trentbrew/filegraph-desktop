/**
 * NoteViewer - Notion-style rich text editor using TipTap
 * File format: .note (JSON-LD block-based structure)
 */

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MentionWithPreview } from './MentionWithPreview'
import { CodeBlockComponent } from './CodeBlockComponent'
import { Slice } from '@tiptap/pm/model'
import { common, createLowlight } from 'lowlight'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Type,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Save,
  Loader2,
  CheckCircle,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTabStore } from '@/stores/useTabStore'
import { useVault } from '@/contexts/VaultContext'
import { getEntitySourceFile } from '@/lib/links/linkResolver'
import './noteViewer.css'
import { SlashCommand } from './SlashCommand'
import { Wikilink } from './Wikilink'
import { createMentionSuggestion, type MentionItem } from './suggestion'
import { SLASH_COMMANDS } from './CommandList'
import { MermaidBlock } from './MermaidBlock'

// Initialize lowlight with common languages
const lowlight = createLowlight(common)

// ============================================================================
// Types
// ============================================================================

interface NoteDocument {
  '@context'?: Record<string, any>
  '@type': 'Note'
  '@id': string
  title: string
  author?: string // person reference
  status?: 'draft' | 'review' | 'published' | 'archived'
  created_at: string
  updated_at: string
  blocks: NoteBlock[]
}

interface TableCell {
  content: InlineContent[]
  header?: boolean
}

interface TableRow {
  cells: TableCell[]
}

interface NoteBlock {
  id: string
  type:
    | 'paragraph'
    | 'heading'
    | 'bulletList'
    | 'orderedList'
    | 'codeBlock'
    | 'blockquote'
    | 'horizontalRule'
    | 'toggle'
    | 'table'
    | 'image'
  level?: number // for headings
  language?: string // for code blocks
  content?: InlineContent[]
  children?: NoteBlock[] // for toggles/nested content
  rows?: TableRow[] // for tables
  src?: string // for images
  alt?: string // for images
  title?: string // for images (caption)
}

function normalizeNoteBlocks(note: NoteDocument): NoteDocument {
  const blocks = note.blocks || []
  const normalized: NoteBlock[] = []

  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]

    const fenceOpen =
      b.type === 'paragraph' &&
      b.content?.length === 1 &&
      b.content[0]?.type === 'text' &&
      typeof b.content[0]?.text === 'string' &&
      b.content[0].text.trim().startsWith('```')

    if (!fenceOpen) {
      normalized.push(b)
      i++
      continue
    }

    const fenceLine = (b.content?.[0]?.text || '').trim()
    const language = fenceLine.slice(3).trim() || 'plaintext'

    const codeLines: string[] = []
    i++

    while (i < blocks.length) {
      const next = blocks[i]
      const nextIsFenceClose =
        next.type === 'paragraph' &&
        next.content?.length === 1 &&
        next.content[0]?.type === 'text' &&
        typeof next.content[0]?.text === 'string' &&
        next.content[0].text.trim() === '```'

      if (nextIsFenceClose) {
        i++
        break
      }

      // Only fold simple paragraph text into the code block. Otherwise, stop and keep content as-is.
      if (next.type !== 'paragraph' || !next.content?.length || next.content.some((c) => c.type !== 'text')) {
        break
      }

      codeLines.push(next.content.map((c) => c.text || '').join(''))
      i++
    }

    normalized.push({
      id: `b-${Math.random().toString(36).slice(2, 9)}`,
      type: 'codeBlock',
      language,
      content: codeLines.length ? [{ type: 'text', text: codeLines.join('\n') }] : [],
    })
  }

  return {
    ...note,
    blocks: normalized,
  }
}

interface InlineContent {
  type: 'text' | 'mention'
  text?: string
  marks?: ('bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight' | 'link')[]
  color?: string
  highlightColor?: string
  href?: string
  entityId?: string // for mentions
}

interface NoteViewerProps {
  filePath: string
  fileName: string
}

// ============================================================================
// Serializers
// ============================================================================

function tiptapToNote(tiptapDoc: any, existingNote: NoteDocument): NoteDocument {
  const blocks: NoteBlock[] = []

  if (tiptapDoc?.content) {
    for (const node of tiptapDoc.content) {
      const block = convertTiptapNode(node)
      if (block) blocks.push(block)
    }
  }

  return {
    ...existingNote,
    updated_at: new Date().toISOString(),
    blocks,
  }
}

function convertTiptapNode(node: any): NoteBlock | null {
  const id = `b-${Math.random().toString(36).slice(2, 9)}`

  switch (node.type) {
    case 'paragraph':
      return {
        id,
        type: 'paragraph',
        content: convertTiptapContent(node.content),
      }

    case 'heading':
      return {
        id,
        type: 'heading',
        level: node.attrs?.level || 1,
        content: convertTiptapContent(node.content),
      }

    case 'bulletList':
      return {
        id,
        type: 'bulletList',
        children: node.content?.map((item: any) => convertTiptapNode(item.content?.[0])).filter(Boolean),
      }

    case 'orderedList':
      return {
        id,
        type: 'orderedList',
        children: node.content?.map((item: any) => convertTiptapNode(item.content?.[0])).filter(Boolean),
      }

    case 'codeBlock':
      return {
        id,
        type: 'codeBlock',
        language: node.attrs?.language || 'plaintext',
        content: [{ type: 'text', text: node.content?.[0]?.text || '' }],
      }

    case 'mermaidBlock':
      return {
        id,
        type: 'codeBlock',
        language: 'mermaid',
        content: [{ type: 'text', text: node.textContent || '' }],
      }

    case 'blockquote':
      return {
        id,
        type: 'blockquote',
        children: node.content?.map((child: any) => convertTiptapNode(child)).filter(Boolean),
      }

    case 'horizontalRule':
      return {
        id,
        type: 'horizontalRule',
      }

    case 'table':
      return {
        id,
        type: 'table',
        rows:
          node.content?.map((row: any) => ({
            cells:
              row.content?.map((cell: any) => ({
                content: convertTiptapContent(cell.content?.[0]?.content),
                header: cell.type === 'tableHeader',
              })) || [],
          })) || [],
      }

    case 'image':
      return {
        id,
        type: 'image',
        src: node.attrs?.src || '',
        alt: node.attrs?.alt || '',
        title: node.attrs?.title || '',
      }

    default:
      return null
  }
}

function convertTiptapContent(content: any[] | undefined): InlineContent[] {
  if (!content) return []

  return content.map((item) => {
    if (item.type === 'mention') {
      return {
        type: 'mention' as const,
        entityId: item.attrs?.id,
      }
    }

    const marks: InlineContent['marks'] = []
    let color: string | undefined
    let highlightColor: string | undefined
    let href: string | undefined

    if (item.marks) {
      for (const mark of item.marks) {
        switch (mark.type) {
          case 'bold':
            marks.push('bold')
            break
          case 'italic':
            marks.push('italic')
            break
          case 'underline':
            marks.push('underline')
            break
          case 'strike':
            marks.push('strike')
            break
          case 'code':
            marks.push('code')
            break
          case 'highlight':
            marks.push('highlight')
            highlightColor = mark.attrs?.color
            break
          case 'link':
            marks.push('link')
            href = mark.attrs?.href
            break
          case 'textStyle':
            color = mark.attrs?.color
            break
        }
      }
    }

    return {
      type: 'text' as const,
      text: item.text || '',
      marks: marks.length > 0 ? marks : undefined,
      color,
      highlightColor,
      href,
    }
  })
}

function noteToTiptap(note: NoteDocument, entityLookup?: Map<string, string>): any {
  return {
    type: 'doc',
    content: note.blocks.map((b) => convertBlockToTiptap(b, entityLookup)).filter(Boolean),
  }
}

function convertBlockToTiptap(block: NoteBlock, entityLookup?: Map<string, string>): any {
  switch (block.type) {
    case 'paragraph':
      if (
        block.content?.length === 1 &&
        block.content[0]?.type === 'text' &&
        !block.content[0]?.marks?.length &&
        (block.content[0]?.text?.trim() === '---' || block.content[0]?.text?.trim() === '***')
      ) {
        return { type: 'horizontalRule' }
      }
      return {
        type: 'paragraph',
        content: convertContentToTiptap(block.content, entityLookup),
      }

    case 'heading':
      return {
        type: 'heading',
        attrs: { level: block.level || 1 },
        content: convertContentToTiptap(block.content, entityLookup),
      }

    case 'bulletList':
      return {
        type: 'bulletList',
        content: block.children?.map((child) => ({
          type: 'listItem',
          content: [convertBlockToTiptap(child, entityLookup)],
        })),
      }

    case 'orderedList':
      return {
        type: 'orderedList',
        content: block.children?.map((child) => ({
          type: 'listItem',
          content: [convertBlockToTiptap(child, entityLookup)],
        })),
      }

    case 'codeBlock':
      if ((block.language || 'plaintext').toLowerCase() === 'mermaid') {
        const t = block.content?.[0]?.text || ''
        return {
          type: 'mermaidBlock',
          attrs: { language: 'mermaid' },
          content: t ? [{ type: 'text', text: t }] : [],
        }
      }
      const t = block.content?.[0]?.text || ''
      return {
        type: 'codeBlock',
        attrs: { language: block.language || 'plaintext' },
        content: t ? [{ type: 'text', text: t }] : [],
      }

    case 'blockquote':
      return {
        type: 'blockquote',
        content: block.children?.map((c) => convertBlockToTiptap(c, entityLookup)).filter(Boolean),
      }

    case 'horizontalRule':
      return { type: 'horizontalRule' }

    case 'table':
      return {
        type: 'table',
        content:
          block.rows?.map((row, rowIndex) => ({
            type: 'tableRow',
            content: row.cells.map((cell) => ({
              type: cell.header || rowIndex === 0 ? 'tableHeader' : 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: convertContentToTiptap(cell.content, entityLookup),
                },
              ],
            })),
          })) || [],
      }

    case 'image':
      return {
        type: 'image',
        attrs: {
          src: block.src || '',
          alt: block.alt || '',
          title: block.title || '',
        },
      }

    default:
      return null
  }
}

function convertContentToTiptap(content: InlineContent[] | undefined, entityLookup?: Map<string, string>): any[] {
  if (!content) return []

  const hasMarkdownArtifacts = (text: string) => {
    return (
      /\*\*[^*]+\*\*/.test(text) ||
      /__[^_]+__/.test(text) ||
      /~~[^~]+~~/.test(text) ||
      /==[^=]+==/.test(text) ||
      /`[^`]+`/.test(text) ||
      /\[([^\]]+)\]\(([^)]+)\)/.test(text) ||
      /\[\[([^\]]+)\]\]/.test(text) ||
      /@\[([^\]]+)\]\(([^)]+)\)/.test(text) ||
      /@[a-z]+:[a-z0-9-]+:\d{3}/i.test(text) ||
      /(?<!\*)\*(?!\*)([^*\s][^*]*[^*\s]|[^*\s])\*(?!\*)/.test(text) ||
      /(?<!_)_(?!_)([^_\s][^_]*[^_\s]|[^_\s])_(?!_)/.test(text)
    )
  }

  const result: any[] = []

  for (const item of content) {
    if (item.type === 'mention') {
      const entityId = item.entityId || ''
      const label = (entityId && entityLookup?.get(entityId)) || entityId
      result.push({
        type: 'mention',
        attrs: { id: entityId, label },
      })
      continue
    }

    const rawText = item.text || ''
    if (!rawText) continue
    const shouldParseInlineMarkdown = !item.marks?.length && rawText && hasMarkdownArtifacts(rawText)
    if (shouldParseInlineMarkdown) {
      result.push(...parseInlineMarkdown(rawText))
      continue
    }

    const marks: any[] = []

    if (item.marks) {
      for (const mark of item.marks) {
        switch (mark) {
          case 'bold':
            marks.push({ type: 'bold' })
            break
          case 'italic':
            marks.push({ type: 'italic' })
            break
          case 'underline':
            marks.push({ type: 'underline' })
            break
          case 'strike':
            marks.push({ type: 'strike' })
            break
          case 'code':
            marks.push({ type: 'code' })
            break
          case 'highlight':
            marks.push({ type: 'highlight', attrs: { color: item.highlightColor } })
            break
          case 'link':
            marks.push({ type: 'link', attrs: { href: item.href } })
            break
        }
      }
    }

    if (item.color) {
      marks.push({ type: 'textStyle', attrs: { color: item.color } })
    }

    result.push({
      type: 'text',
      text: rawText,
      marks: marks.length > 0 ? marks : undefined,
    })
  }

  return result
}

// Simple markdown to TipTap JSON parser
function parseMarkdownToTiptap(markdown: string): any {
  const lines = markdown.split('\n')
  const content: any[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'plaintext'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      const codeText = codeLines.join('\n')
      content.push({
        type: lang.toLowerCase() === 'mermaid' ? 'mermaidBlock' : 'codeBlock',
        attrs: { language: lang },
        content: codeText ? [{ type: 'text', text: codeText }] : [],
      })
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInlineMarkdown(headingMatch[2]),
      })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarkdown(line.slice(2)),
          },
        ],
      })
      i++
      continue
    }

    // Bullet list item
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (bulletMatch) {
      const items: any[] = []
      while (i < lines.length && /^(\s*)[-*+]\s+/.test(lines[i])) {
        const itemMatch = lines[i].match(/^(\s*)[-*+]\s+(.+)$/)
        if (itemMatch) {
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: parseInlineMarkdown(itemMatch[2]) }],
          })
        }
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    // Numbered list item
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (numberedMatch) {
      const items: any[] = []
      while (i < lines.length && /^(\s*)\d+\.\s+/.test(lines[i])) {
        const itemMatch = lines[i].match(/^(\s*)\d+\.\s+(.+)$/)
        if (itemMatch) {
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: parseInlineMarkdown(itemMatch[2]) }],
          })
        }
        i++
      }
      content.push({ type: 'orderedList', content: items })
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Empty line (skip)
    if (!line.trim()) {
      i++
      continue
    }

    // Paragraph
    content.push({
      type: 'paragraph',
      content: parseInlineMarkdown(line),
    })
    i++
  }

  return { type: 'doc', content }
}

/**
 * Parse inline markdown text into TipTap content nodes.
 * Handles: bold, italic, strikethrough, code, highlight, links, wikilinks, and entity mentions.
 *
 * Patterns supported:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Bold+Italic: ***text*** or ___text___
 * - Strikethrough: ~~text~~
 * - Highlight: ==text==
 * - Inline code: `text`
 * - Markdown links: [text](url)
 * - Wikilinks: [[page]] or [[page|display text]]
 * - Entity mentions: @entityId or @[display](entityId)
 */
function parseInlineMarkdown(text: string): any[] {
  const result: any[] = []
  let remaining = text

  // Define patterns in priority order (most specific first)
  const patterns: Array<{
    name: string
    regex: RegExp
    handler: (match: RegExpMatchArray) => any
  }> = [
    // Bold+Italic ***text*** (must come before bold/italic)
    {
      name: 'boldItalic',
      regex: /^\*\*\*([^*]+)\*\*\*/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'bold' }, { type: 'italic' }],
      }),
    },
    // Bold+Italic ___text___
    {
      name: 'boldItalicUnderscore',
      regex: /^___([^_]+)___/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'bold' }, { type: 'italic' }],
      }),
    },
    // Bold **text**
    {
      name: 'boldAsterisk',
      regex: /^\*\*([^*]+)\*\*/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'bold' }],
      }),
    },
    // Bold __text__
    {
      name: 'boldUnderscore',
      regex: /^__([^_]+)__/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'bold' }],
      }),
    },
    // Strikethrough ~~text~~
    {
      name: 'strike',
      regex: /^~~([^~]+)~~/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'strike' }],
      }),
    },
    // Highlight ==text==
    {
      name: 'highlight',
      regex: /^==([^=]+)==/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'highlight', attrs: { color: '#fef08a' } }],
      }),
    },
    // Inline code `text`
    {
      name: 'code',
      regex: /^`([^`]+)`/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'code' }],
      }),
    },
    // Markdown link [text](url)
    {
      name: 'link',
      regex: /^\[([^\]]+)\]\(([^)]+)\)/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'link', attrs: { href: match[2] } }],
      }),
    },
    // Wikilink with display text [[page|display]]
    {
      name: 'wikilinkDisplay',
      regex: /^\[\[([^\]|]+)\|([^\]]+)\]\]/,
      handler: (match) => ({
        type: 'wikilink',
        attrs: { id: match[1], label: match[2] },
      }),
    },
    // Wikilink basic [[page]]
    {
      name: 'wikilink',
      regex: /^\[\[([^\]]+)\]\]/,
      handler: (match) => ({
        type: 'wikilink',
        attrs: { id: match[1], label: match[1] },
      }),
    },
    // Entity mention @[display](entityId)
    {
      name: 'mentionDisplay',
      regex: /^@\[([^\]]+)\]\(([^)]+)\)/,
      handler: (match) => ({
        type: 'mention',
        attrs: { id: match[2], label: match[1] },
      }),
    },
    // Entity mention @entityId (must look like entity ID pattern)
    {
      name: 'mentionId',
      regex: /^@([a-z]+:[a-z0-9-]+:\d{3})/i,
      handler: (match) => ({
        type: 'mention',
        attrs: { id: match[1], label: match[1] },
      }),
    },
    // Italic *text* (single asterisks - must not be followed/preceded by space)
    {
      name: 'italicAsterisk',
      regex: /^\*([^*\s][^*]*[^*\s])\*(?!\*)/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'italic' }],
      }),
    },
    // Italic *x* (single char)
    {
      name: 'italicAsteriskSingle',
      regex: /^\*([^*\s])\*(?!\*)/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'italic' }],
      }),
    },
    // Italic _text_
    {
      name: 'italicUnderscore',
      regex: /^_([^_\s][^_]*[^_\s])_(?!_)/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'italic' }],
      }),
    },
    // Italic _x_ (single char)
    {
      name: 'italicUnderscoreSingle',
      regex: /^_([^_\s])_(?!_)/,
      handler: (match) => ({
        type: 'text',
        text: match[1],
        marks: [{ type: 'italic' }],
      }),
    },
  ]

  while (remaining.length > 0) {
    let matched = false

    // Try each pattern in order
    for (const { regex, handler } of patterns) {
      const match = remaining.match(regex)
      if (match) {
        result.push(handler(match))
        remaining = remaining.slice(match[0].length)
        matched = true
        break
      }
    }

    if (!matched) {
      // Collect plain text until we hit a potential special character
      const plainMatch = remaining.match(/^[^*_`\[~=@]+/)
      if (plainMatch && plainMatch[0].length > 0) {
        result.push({ type: 'text', text: plainMatch[0] })
        remaining = remaining.slice(plainMatch[0].length)
      } else {
        // Single special char (not part of a recognized pattern)
        result.push({ type: 'text', text: remaining[0] })
        remaining = remaining.slice(1)
      }
    }
  }

  // ProseMirror disallows empty text nodes; represent “no text” as empty content.
  return result
}

function isEffectivelyEmptyNote(note: NoteDocument): boolean {
  if (!note.blocks?.length) return true

  for (const block of note.blocks) {
    if (block.type === 'horizontalRule') return false

    if (block.type === 'codeBlock') {
      const t = block.content?.[0]?.text
      if (t && t.trim().length) return false
      continue
    }

    if (block.type === 'heading' || block.type === 'paragraph') {
      const hasText = (block.content || []).some(
        (c) => (c.type === 'text' && (c.text || '').trim().length) || c.type === 'mention',
      )
      if (hasText) return false
      continue
    }

    if (block.type === 'bulletList' || block.type === 'orderedList' || block.type === 'blockquote') {
      if (block.children?.length) return false
      continue
    }
  }

  return true
}

function createDefaultNote(filePath: string): NoteDocument {
  const fileName = filePath.split('/').pop()?.replace('.note', '') || 'Untitled'
  const now = new Date().toISOString()

  return {
    '@context': { schema: 'https://schema.org/' },
    '@type': 'Note',
    '@id': `note:${fileName.toLowerCase().replace(/\s+/g, '-')}`,
    title: fileName,
    status: 'draft',
    created_at: now,
    updated_at: now,
    blocks: [
      {
        id: 'b-initial',
        type: 'paragraph',
        content: [],
      },
    ],
  }
}

// ============================================================================
// Color Picker Components
// ============================================================================

const TEXT_COLORS = [
  { name: 'Default', color: null },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Lime', color: '#84cc16' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Fuchsia', color: '#d946ef' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Rose', color: '#f43f5e' },
]

const HIGHLIGHT_COLORS = [
  { name: 'None', color: null },
  { name: 'Gray', color: '#374151' },
  { name: 'Red', color: '#7f1d1d' },
  { name: 'Orange', color: '#7c2d12' },
  { name: 'Amber', color: '#78350f' },
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Lime', color: '#d9f99d' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Emerald', color: '#a7f3d0' },
  { name: 'Teal', color: '#99f6e4' },
  { name: 'Cyan', color: '#a5f3fc' },
  { name: 'Sky', color: '#bae6fd' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Indigo', color: '#c7d2fe' },
  { name: 'Violet', color: '#ddd6fe' },
  { name: 'Purple', color: '#e9d5ff' },
  { name: 'Fuchsia', color: '#f5d0fe' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Rose', color: '#fecdd3' },
]

interface ColorPickerProps {
  colors: typeof TEXT_COLORS
  activeColor: string | null
  onSelect: (color: string | null) => void
  icon: React.ReactNode
  title: string
}

function ColorPicker({ colors, activeColor, onSelect, icon, title }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(!open)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'h-7 w-7 p-0 relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
            activeColor && 'bg-muted',
          )}>
          {icon}
          {activeColor && (
            <div
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" onMouseDown={(e) => e.stopPropagation()}>
        <div className="text-xs font-medium text-muted-foreground mb-2">{title}</div>
        <div className="grid grid-cols-5 gap-1">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(c.color)
                setOpen(false)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                'w-6 h-6 rounded-md border border-border/50 transition-all hover:scale-110 hover:border-primary',
                activeColor === c.color && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                !c.color && 'bg-linear-to-br from-muted to-muted/50',
              )}
              style={c.color ? { backgroundColor: c.color } : undefined}
              title={c.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Toolbar Component (Fixed)
// ============================================================================

interface ToolbarProps {
  editor: ReturnType<typeof useEditor>
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  // Get current colors
  const currentTextColor = editor.getAttributes('textStyle').color || null
  const currentHighlight = editor.getAttributes('highlight').color || null

  return (
    <div className="flex items-center gap-1 p-1 border-b border-border/50 bg-muted/30 flex-wrap">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('underline') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('strike') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('code') && 'bg-muted')}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Text Color Picker */}
      <ColorPicker
        colors={TEXT_COLORS}
        activeColor={currentTextColor}
        onSelect={(color) => {
          if (color) {
            editor.chain().focus().setColor(color).run()
          } else {
            editor.chain().focus().unsetColor().run()
          }
        }}
        icon={<Type className="h-3.5 w-3.5" />}
        title="Text Color"
      />

      {/* Highlight Color Picker */}
      <ColorPicker
        colors={HIGHLIGHT_COLORS}
        activeColor={currentHighlight}
        onSelect={(color) => {
          if (color) {
            editor.chain().focus().toggleHighlight({ color }).run()
          } else {
            editor.chain().focus().unsetHighlight().run()
          }
        }}
        icon={<Highlighter className="h-3.5 w-3.5" />}
        title="Highlight Color"
      />

      <div className="w-px h-4 bg-border mx-0.5" />

      {/* Link */}
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('link') && 'bg-muted')}
        onClick={() => {
          const url = window.prompt('Enter URL')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}>
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ============================================================================
// Metadata Footer Component
// ============================================================================

interface MetadataFooterProps {
  note: NoteDocument
  onUpdate: (updates: Partial<NoteDocument>) => void
}

function MetadataFooter({ note, onUpdate }: MetadataFooterProps) {
  return (
    <div className="border-t border-border/50 px-4 py-2 bg-muted/20">
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">Status:</span>
          <Select
            value={note.status || 'draft'}
            onValueChange={(v) => onUpdate({ status: v as NoteDocument['status'] })}>
            <SelectTrigger className="h-5 w-20 text-xs border-none bg-muted/50 px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Author */}
        {note.author && (
          <>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 opacity-60" />
              <span className="font-mono">{note.author}</span>
            </div>
            <div className="w-px h-3 bg-border" />
          </>
        )}

        {/* Dates */}
        <div className="flex items-center gap-1 opacity-60">
          <span>Created:</span>
          <span>{new Date(note.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 opacity-60">
          <span>Updated:</span>
          <span>{new Date(note.updated_at).toLocaleDateString()}</span>
        </div>

        {/* Backlinks placeholder */}
        <div className="ml-auto flex items-center gap-1 opacity-60">
          <LinkIcon className="h-3 w-3" />
          <span>0 backlinks</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NoteViewer({ filePath, fileName }: NoteViewerProps) {
  const [note, setNote] = React.useState<NoteDocument | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [rawSource, setRawSource] = React.useState<string>('')
  const [showRawSource, setShowRawSource] = React.useState(false)
  const [entities, setEntities] = React.useState<MentionItem[]>([])

  const { vaultPath } = useVault()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)

  // Ref for entities to avoid editor recreation
  const entitiesRef = React.useRef<MentionItem[]>([])
  React.useEffect(() => {
    entitiesRef.current = entities
  }, [entities])

  // Track if suggestion popup is open to pause autosave
  const suggestionOpenRef = React.useRef(false)

  // Handle clicking on mentions/wikilinks to navigate to the referenced entity
  const handleMentionClick = React.useCallback(
    (entityId: string) => {
      if (!vaultPath) return

      const [namespace, slug] = entityId.split(':')

      // Special handling for note: namespace - these are actual .note files
      if (namespace === 'note' && slug) {
        const noteFileName = `${slug}.note`
        const absolutePath = `${vaultPath}/notes/${noteFileName}`

        openEditorPinned({
          id: noteFileName,
          name: noteFileName,
          path: absolutePath,
          file_type: 'file',
          size: null,
          date_modified: new Date().toISOString(),
          extension: 'note',
        })
        return
      }

      // Get the source file for this entity from the namespace registry
      const sourceFile = getEntitySourceFile(entityId)
      if (!sourceFile) {
        // Try to find it in loaded entities
        const entity = entitiesRef.current.find((e) => e.id === entityId)
        if (entity) {
          toast.info(`Entity "${entityId}" found but no source file mapped`)
        } else {
          toast.error(`Could not resolve entity: ${entityId}`)
        }
        return
      }

      const absolutePath = `${vaultPath}/${sourceFile}`
      const lastSlash = absolutePath.lastIndexOf('/')
      const name = absolutePath.substring(lastSlash + 1)

      openEditorPinned({
        id: name,
        name,
        path: absolutePath,
        file_type: 'file',
        size: null,
        date_modified: new Date().toISOString(),
        extension: getEffectiveExtension(name),
      })
    },
    [vaultPath, openEditorPinned],
  )

  // Handle creating new entities from the mention picker (stable ref)
  const handleCreateEntityRef = React.useRef((entityId: string, namespace: string) => {
    // For now, just insert the mention and show a toast
    // In the future, this could open a dialog to create the entity
    toast.info(`Entity "${entityId}" will be created when you save a .data file with this reference`)
  })

  // Load entities for mention autocomplete
  React.useEffect(() => {
    const loadEntities = async () => {
      try {
        // Use vaultPath from context instead of parsing from filePath
        if (!vaultPath) return

        // Load all .data files from vault and extract entity IDs
        const allEntities: MentionItem[] = []

        // Helper to extract entities from parsed JSON
        const extractEntities = (obj: any) => {
          if (obj?.['@graph']) {
            for (const node of obj['@graph']) {
              if (node['@id'] || node.id) {
                const id = node['@id'] || node.id
                const namespace = id.split(':')[0]
                allEntities.push({
                  id,
                  label: node.name || node.title || id,
                  namespace,
                })
              }
            }
          }
          // Check for named arrays (items, members, etc.)
          for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value) && !key.startsWith('@')) {
              for (const item of value) {
                if (item?.id || item?.['@id']) {
                  const id = item.id || item['@id']
                  const namespace = id.split(':')[0]
                  allEntities.push({
                    id,
                    label: item.name || item.title || id,
                    namespace,
                  })
                }
              }
            }
          }
        }

        // Recursively scan directories for .data files
        const scanDirectory = async (dirPath: string) => {
          try {
            const files = await invoke<any[]>('list_directory', { path: dirPath })
            for (const file of files) {
              if (file.file_type === 'folder') {
                // Recursively scan subdirectories
                await scanDirectory(file.path)
              } else if (file.extension === 'data') {
                try {
                  const response = await invoke<{ content: string }>('read_text_file', { filePath: file.path })
                  // Skip empty files
                  const content = response.content?.trim()
                  if (!content) continue

                  const parsed = JSON.parse(content)
                  const beforeCount = allEntities.length
                  extractEntities(parsed)
                  const afterCount = allEntities.length
                  if (afterCount > beforeCount) {
                    console.log(`[NoteViewer] Extracted ${afterCount - beforeCount} entities from ${file.path}`)
                  }
                } catch (e) {
                  console.warn(`[NoteViewer] Failed to parse ${file.path}:`, e)
                }
              }
            }
          } catch (e) {
            console.warn(`[NoteViewer] Failed to scan ${dirPath}:`, e)
          }
        }

        await scanDirectory(vaultPath)

        // Deduplicate by ID
        const uniqueEntities = Array.from(new Map(allEntities.map((e) => [e.id, e])).values())

        // Debug: log entities by namespace
        const byNamespace = uniqueEntities.reduce(
          (acc, e) => {
            acc[e.namespace || 'unknown'] = (acc[e.namespace || 'unknown'] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        console.log(`[NoteViewer] Loaded ${uniqueEntities.length} entities:`, byNamespace)

        setEntities(uniqueEntities)
      } catch (err) {
        console.error('Failed to load entities for mentions:', err)
      }
    }

    loadEntities()
  }, [vaultPath])

  // Load note from file
  React.useEffect(() => {
    const loadNote = async () => {
      setLoading(true)
      try {
        const response = await invoke<{ content: string }>('read_text_file', { filePath })
        setRawSource(response.content)
        const content = response.content.trim()

        if (!content) {
          // Empty file - create default
          const defaultNote = createDefaultNote(filePath)
          setNote(defaultNote)
          setRawSource(JSON.stringify(defaultNote, null, 2))
          return
        }

        // Check if content looks like JSON (starts with { or [)
        if (content.startsWith('{') || content.startsWith('[')) {
          try {
            const parsed = JSON.parse(content) as NoteDocument
            // Validate it has the expected structure
            if (parsed['@type'] === 'Note' && Array.isArray(parsed.blocks)) {
              const normalized = normalizeNoteBlocks(parsed)
              setNote(normalized)
              if (JSON.stringify(normalized.blocks) !== JSON.stringify(parsed.blocks)) {
                setHasChanges(true)
              }
              return
            }
          } catch (parseErr) {
            console.warn('File looks like JSON but failed to parse:', parseErr)
          }
        }

        // Content is not valid JSON-LD Note format - import markdown into blocks
        console.log('Converting non-JSON content to note format')
        const defaultNote = createDefaultNote(filePath)
        try {
          const importedTiptap = parseMarkdownToTiptap(content)
          const importedNote = tiptapToNote(importedTiptap, defaultNote)
          setNote(importedNote)
          setRawSource(JSON.stringify(importedNote, null, 2))
        } catch (e) {
          defaultNote.blocks = [
            {
              id: 'b-imported',
              type: 'paragraph',
              content: [{ type: 'text', text: content }],
            },
          ]
          setNote(defaultNote)
          setRawSource(JSON.stringify(defaultNote, null, 2))
        }

        setHasChanges(true) // Mark as needing save to convert format
      } catch (err) {
        console.error('Failed to load note:', err)
        const defaultNote = createDefaultNote(filePath)
        setNote(defaultNote)
        setRawSource(JSON.stringify(defaultNote, null, 2))
      } finally {
        setLoading(false)
      }
    }

    loadNote()
  }, [filePath])

  // TipTap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
        }),
        MermaidBlock,
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === 'heading') {
              return 'Heading'
            }
            return 'Type / for commands, @ to mention...'
          },
        }),
        Highlight.configure({
          multicolor: true,
        }),
        TextStyle,
        Color,
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline cursor-pointer',
          },
        }),
        CodeBlockLowlight.extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeBlockComponent)
          },
        }).configure({
          lowlight,
          defaultLanguage: 'plaintext',
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'note-table',
          },
        }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: 'note-image',
          },
        }),
        // @ mention with HoverCard preview
        MentionWithPreview.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          renderText({ node }) {
            // Display the label (name) instead of the id for plain text
            return `@${node.attrs.label || node.attrs.id}`
          },
          suggestion: createMentionSuggestion({
            getItems: (query) => {
              const currentEntities = entitiesRef.current
              if (!query) return currentEntities.slice(0, 20)
              const lower = query.toLowerCase()
              return currentEntities
                .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
                .slice(0, 20)
            },
            onCreate: handleCreateEntityRef.current,
            onOpen: () => {
              suggestionOpenRef.current = true
            },
            onClose: () => {
              suggestionOpenRef.current = false
            },
          }),
        }),
        // [[ wikilink
        Wikilink.configure({
          HTMLAttributes: {
            class: 'wikilink',
          },
          renderText({ node }) {
            // Display the label (name) instead of the id for plain text
            return `[[${node.attrs.label || node.attrs.id}]]`
          },
          suggestion: createMentionSuggestion({
            getItems: (query) => {
              const currentEntities = entitiesRef.current
              if (!query) return currentEntities.slice(0, 20)
              const lower = query.toLowerCase()
              return currentEntities
                .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
                .slice(0, 20)
            },
            onCreate: handleCreateEntityRef.current,
            onOpen: () => {
              suggestionOpenRef.current = true
            },
            onClose: () => {
              suggestionOpenRef.current = false
            },
          }),
        }),
        // / slash commands
        SlashCommand.configure({
          suggestion: {
            char: '/',
            items: ({ query }) => {
              if (!query) return SLASH_COMMANDS
              const lower = query.toLowerCase()
              return SLASH_COMMANDS.filter(
                (cmd) => cmd.title.toLowerCase().includes(lower) || cmd.description.toLowerCase().includes(lower),
              )
            },
            render: () => {
              let component: any = null
              let popup: any = null

              return {
                onStart: (props: any) => {
                  suggestionOpenRef.current = true
                  import('./CommandList').then(({ CommandList }) => {
                    import('@tiptap/react').then(({ ReactRenderer }) => {
                      import('tippy.js').then((tippy) => {
                        component = new ReactRenderer(CommandList, {
                          props: {
                            items: props.items,
                            command: (item: any) => {
                              item.command(props.editor)
                              props.editor.chain().focus().deleteRange(props.range).run()
                            },
                          },
                          editor: props.editor,
                        })

                        popup = tippy.default('body', {
                          getReferenceClientRect: props.clientRect,
                          appendTo: () => document.body,
                          content: component.element,
                          showOnCreate: true,
                          interactive: true,
                          trigger: 'manual',
                          placement: 'bottom-start',
                        })
                      })
                    })
                  })
                },
                onUpdate(props: any) {
                  component?.updateProps({
                    items: props.items,
                    command: (item: any) => {
                      item.command(props.editor)
                      props.editor.chain().focus().deleteRange(props.range).run()
                    },
                  })
                  popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect,
                  })
                },
                onKeyDown(props: any) {
                  if (props.event.key === 'Escape') {
                    popup?.[0]?.hide()
                    return true
                  }
                  return component?.ref?.onKeyDown(props) ?? false
                },
                onExit() {
                  popup?.[0]?.destroy()
                  component?.destroy()
                  suggestionOpenRef.current = false
                },
              }
            },
          },
        }),
      ],
      content: note ? noteToTiptap(note, new Map(entitiesRef.current.map((e) => [e.id, e.label]))) : undefined,
      onUpdate: () => {
        setHasChanges(true)
      },
      editorProps: {
        attributes: {
          class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4',
        },
        handleClick: (view, pos, event) => {
          // Check if clicked on a mention or wikilink
          const target = event.target as HTMLElement
          if (target.classList.contains('mention') || target.classList.contains('wikilink')) {
            const entityId = target.getAttribute('data-id')
            if (entityId) {
              handleMentionClick(entityId)
              return true
            }
          }
          return false
        },
        handlePaste: (view, event, slice) => {
          // Check for plain text that looks like markdown
          const text = event.clipboardData?.getData('text/plain')
          if (!text) return false

          // Markdown patterns to detect (including wikilinks and entity mentions)
          const hasMarkdown =
            /^#{1,6}\s/.test(text) || // Headings
            /^\s*[-*+]\s/.test(text) || // Bullet lists
            /^\s*\d+\.\s/.test(text) || // Numbered lists
            /\*\*[^*]+\*\*/.test(text) || // Bold (asterisks)
            /__[^_]+__/.test(text) || // Bold (underscores)
            /(?<!\*)\*(?!\*)([^*\s][^*]*[^*\s]|[^*\s])\*(?!\*)/.test(text) || // Italic (asterisks)
            /(?<!_)_(?!_)([^_\s][^_]*[^_\s]|[^_\s])_(?!_)/.test(text) || // Italic (underscores)
            /~~[^~]+~~/.test(text) || // Strikethrough
            /==[^=]+==/.test(text) || // Highlight
            /`[^`]+`/.test(text) || // Inline code
            /```[\s\S]*```/.test(text) || // Code blocks
            /^\s*>/.test(text) || // Blockquotes
            /^---+$|^\*\*\*+$/m.test(text) || // Horizontal rules
            /\[([^\]]+)\]\(([^)]+)\)/.test(text) || // Markdown links
            /\[\[([^\]]+)\]\]/.test(text) || // Wikilinks
            /@[a-z]+:[a-z0-9-]+:\d{3}/i.test(text) || // Entity mentions
            /@\[([^\]]+)\]\(([^)]+)\)/.test(text) // Entity mention with display text

          if (hasMarkdown) {
            // Parse markdown to TipTap content
            const parsed = parseMarkdownToTiptap(text)
            if (parsed && parsed.content?.length) {
              try {
                // Insert each content node
                const { tr } = view.state
                const nodes = parsed.content
                  .map((nodeJson: any) => {
                    try {
                      return view.state.schema.nodeFromJSON(nodeJson)
                    } catch (e) {
                      console.warn('[NoteViewer] Skipping invalid pasted node JSON:', nodeJson, e)
                      return null
                    }
                  })
                  .filter(Boolean)

                if (!nodes.length) return false

                const fragment = view.state.schema.nodes.doc.create(null, nodes as any).content
                const slice = new Slice(fragment, 0, 0)
                view.dispatch(tr.replaceSelection(slice))
                return true
              } catch (e) {
                console.warn('[NoteViewer] Failed to paste parsed markdown content, falling back to plain text:', e)
                return false
              }
            }
          }

          return false
        },
      },
    },
    [entities],
  )

  const sourceToDisplay = React.useMemo(() => {
    if (!showRawSource) return ''
    if (!editor || !note) return rawSource
    try {
      const updated = tiptapToNote(editor.getJSON(), note)
      return JSON.stringify(updated, null, 2)
    } catch {
      return rawSource
    }
  }, [showRawSource, editor, note, rawSource, hasChanges])

  // Update editor when note changes or entities are loaded
  React.useEffect(() => {
    if (!editor || !note || loading) return

    const entityLookup = new Map(entitiesRef.current.map((e) => [e.id, e.label]))
    const tiptapContent = noteToTiptap(note, entityLookup)

    // Avoid redundant setContent (and avoid flushSync warnings during NodeView mount)
    const nextJson = JSON.stringify(tiptapContent)
    const currentJson = JSON.stringify(editor.getJSON())
    if (nextJson === currentJson) return

    // Defer to next frame to avoid updating TipTap/React while React is still committing.
    const raf = window.requestAnimationFrame(() => {
      try {
        editor.commands.setContent(tiptapContent)
      } catch (e) {
        console.warn('[NoteViewer] Failed to set editor content:', e)
      }
    })

    return () => window.cancelAnimationFrame(raf)
  }, [note, loading, entities])

  // Save handler
  const handleSave = React.useCallback(
    async (silent = false) => {
      if (!editor || !note) return

      setSaving(true)
      try {
        const tiptapDoc = editor.getJSON()
        const updatedNote = tiptapToNote(tiptapDoc, note)

        // Data loss prevention: never overwrite a non-empty file with an effectively empty note.
        try {
          const existing = await invoke<{ content: string }>('read_text_file', { filePath })
          const existingTrimmed = (existing.content || '').trim()
          if (existingTrimmed && isEffectivelyEmptyNote(updatedNote)) {
            const e = new Error('Refusing to overwrite non-empty note with empty content')
            console.error('[NoteViewer] Safe-save guard triggered:', e)
            if (!silent) toast.error(e.message)
            return
          }
        } catch (e) {
          // If we can't read the existing file for comparison, don't block saving.
          console.warn('[NoteViewer] Safe-save guard could not read existing file; proceeding with save:', e)
        }

        await invoke('write_text_file', {
          filePath,
          content: JSON.stringify(updatedNote, null, 2),
        })

        setNote(updatedNote)
        setRawSource(JSON.stringify(updatedNote, null, 2))
        setHasChanges(false)
        if (!silent) toast.success('Note saved')
      } catch (err) {
        console.error('Failed to save note:', err)
        toast.error('Failed to save note')
      } finally {
        setSaving(false)
      }
    },
    [editor, note, filePath],
  )

  // Autosave - debounced save after changes (paused while suggestion popup is open)
  React.useEffect(() => {
    if (!hasChanges || !editor || !note) return

    const timer = setTimeout(() => {
      // Don't autosave while suggestion popup is open
      if (suggestionOpenRef.current) return
      handleSave(true) // silent save
    }, 2000) // 2 second debounce

    return () => clearTimeout(timer)
  }, [hasChanges, editor, note, handleSave])

  // Handle metadata updates
  const handleMetadataUpdate = React.useCallback((updates: Partial<NoteDocument>) => {
    setNote((prev) => (prev ? { ...prev, ...updates } : prev))
    setHasChanges(true)
  }, [])

  // Keyboard shortcut for save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!note) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Failed to load note</div>
  }

  return (
    <div className="note-editor h-full flex flex-col bg-background">
      {/* Top bar: Title + Save */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-muted/20">
        <Input
          value={note.title}
          onChange={(e) => handleMetadataUpdate({ title: e.target.value })}
          className="flex-1 text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0"
          placeholder="Untitled"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRawSource((v) => !v)}
          className={cn('text-xs', showRawSource && 'bg-muted')}>
          {showRawSource ? 'Hide Source' : 'Source'}
        </Button>
        <Button
          variant={hasChanges ? 'ghost' : 'ghost'}
          size="sm"
          onClick={() => handleSave(false)}
          disabled={saving}
          className={cn(
            'transition-colors',
            !hasChanges && 'text-green-300 border-green-300/30 hover:bg-green-500/10 text-xs',
          )}>
          {/* {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : hasChanges ? (
            <Save className="h-3.5 w-3.5 mr-1" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
          )} */}
          {saving ? 'Saving...' : hasChanges ? 'Saving...' : 'Saved'}
        </Button>
      </div>

      {showRawSource && (
        <div className="border-b border-border/50 bg-muted/10 px-4 py-3">
          <pre className="text-xs font-mono whitespace-pre overflow-auto max-h-[40vh]">{sourceToDisplay}</pre>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="note-editor h-full" />
      </div>

      {/* Metadata footer */}
      <MetadataFooter note={note} onUpdate={handleMetadataUpdate} />
    </div>
  )
}
