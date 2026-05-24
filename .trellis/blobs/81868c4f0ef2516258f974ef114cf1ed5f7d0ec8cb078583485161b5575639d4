/**
 * Trellis Document Format (TDF) - Block-based response format for agent responses
 *
 * Enables rich, structured output with embedded files, diagrams, charts, links, and more.
 * Designed to treat agent responses as graphs of interconnected content blocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Block Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TextBlock {
  type: 'text'
  content: string
  style?: 'paragraph' | 'heading' | 'subheading' | 'callout' | 'quote' | 'caption'
}

export interface CodeBlock {
  type: 'code'
  code: string
  language: string
  filename?: string
  highlights?: number[] // Line numbers to highlight
}

export interface MermaidBlock {
  type: 'mermaid'
  code: string
  caption?: string
}

export interface ChartBlock {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut'
  title?: string
  data: {
    labels: string[]
    datasets: Array<{
      label?: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string
    }>
  }
}

export interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
  caption?: string
}

export interface LinkBlock {
  type: 'link'
  target: string // Entity ID (e.g., "person:sarah:001") or file path
  display?: string
  preview?: boolean // Show inline preview
}

export interface EmbedBlock {
  type: 'embed'
  path: string // Vault file path
  lines?: [number, number] // Optional line range [start, end]
  collapsed?: boolean
}

export interface ImageBlock {
  type: 'image'
  src: string // URL or data URI
  alt?: string
  caption?: string
}

export interface CalloutBlock {
  type: 'callout'
  variant: 'info' | 'success' | 'warning' | 'error' | 'tip' | 'note'
  title?: string
  content: string
}

export interface ListBlock {
  type: 'list'
  style: 'bullet' | 'numbered' | 'checklist'
  items: Array<{
    content: string
    checked?: boolean // For checklist
    children?: ListBlock['items']
  }>
}

export interface DividerBlock {
  type: 'divider'
}

export interface ColumnsBlock {
  type: 'columns'
  columns: TrellisBlock[][]
}

export interface CollapsibleBlock {
  type: 'collapsible'
  title: string
  blocks: TrellisBlock[]
  defaultOpen?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Union Type
// ─────────────────────────────────────────────────────────────────────────────

export type TrellisBlock =
  | TextBlock
  | CodeBlock
  | MermaidBlock
  | ChartBlock
  | TableBlock
  | LinkBlock
  | EmbedBlock
  | ImageBlock
  | CalloutBlock
  | ListBlock
  | DividerBlock
  | ColumnsBlock
  | CollapsibleBlock

// ─────────────────────────────────────────────────────────────────────────────
// Response Format
// ─────────────────────────────────────────────────────────────────────────────

export interface TrellisResponse {
  trellis: true // Marker to identify TDF format
  blocks: TrellisBlock[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

export function isTrellisResponse(value: unknown): value is TrellisResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'trellis' in value &&
    (value as TrellisResponse).trellis === true &&
    'blocks' in value &&
    Array.isArray((value as TrellisResponse).blocks)
  )
}

export function parseTrellisResponse(content: string): TrellisResponse | null {
  if (!content) return null

  let jsonStr = content.trim()

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // Try to find JSON object in the content (handles text before/after)
  const jsonMatch = jsonStr.match(/\{[\s\S]*"trellis"\s*:\s*true[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (isTrellisResponse(parsed)) {
      return parsed
    }
  } catch {
    // Not valid JSON, not a Trellis response
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Block Type Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = [
  'text',
  'code',
  'mermaid',
  'chart',
  'table',
  'link',
  'embed',
  'image',
  'callout',
  'list',
  'divider',
  'columns',
  'collapsible',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export const CALLOUT_VARIANTS = ['info', 'success', 'warning', 'error', 'tip', 'note'] as const
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number]

export const TEXT_STYLES = ['paragraph', 'heading', 'subheading', 'callout', 'quote', 'caption'] as const
export type TextStyle = (typeof TEXT_STYLES)[number]

export const CHART_TYPES = ['bar', 'line', 'pie', 'area', 'scatter', 'doughnut'] as const
export type ChartType = (typeof CHART_TYPES)[number]
