import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVault } from '@/contexts/VaultContext'
import { useLinkIndex } from '@/hooks/useLinkIndex'
import { useTabStore } from '@/stores/useTabStore'
import { useHighlightStore } from '@/stores/useHighlightStore'
import { NAMESPACE_FILES, NAMESPACE_LABELS as IMPORTED_NAMESPACE_LABELS } from '@/lib/namespaces'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { format, parseISO, isValid } from 'date-fns'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Braces,
  Calendar,
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  DollarSign,
  Download,
  ExternalLink,
  GripHorizontal,
  Hash,
  Link2,
  List,
  Loader2,
  Mail,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  ToggleLeft,
  Trash2,
  TrendingUp,
  Type,
  Undo2,
  Redo2,
  Users,
  X,
  Pencil,
  CheckCircle,
  Palette,
  Paintbrush,
  TypeIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeViewer } from './codeViewer'
import { BacklinksBadge } from '../components/BacklinksPanel'
import { EntityLink } from '@/components/links'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

// Extract namespace from ID (e.g., "acc:checking:001" -> "acc")
function extractNamespace(id: string): string {
  if (!id) return 'other'
  const match = id.match(/^([a-z]+):/)
  return match ? match[1] : 'other'
}

// Human-readable names for namespaces (extends centralized config with local extras)
const NAMESPACE_LABELS: Record<string, string> = {
  ...IMPORTED_NAMESPACE_LABELS,
  // Local extras not in global namespace config
  file: 'Files',
  brand: 'Brand',
  other: 'Other',
}

type JsonLdNode = Record<string, any> & {
  '@id'?: string
  '@type'?: string | string[]
}

type DataDoc = {
  '@context'?: Record<string, any>
  '@graph'?: JsonLdNode[]
  '@schema'?: Record<string, ColumnSchema> // Column type metadata
  [key: string]: any // Support LDC-style named arrays like 'members', 'items', 'deals'
}

// Schema for column type metadata (persisted in @schema)
type ColumnSchema = {
  type: CellType
  refType?: string // For reference columns: which entity namespace (e.g., 'person', 'project')
  description?: string
  // For select/multiselect/status types
  options?: Array<{
    value: string
    label: string
    color?: string // For status: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  }>
  // For formula type
  expression?: string
}

// Common LDC array property names to check
const LDC_ARRAY_NAMES = [
  'members',
  'items',
  'deals',
  'entries',
  'records',
  'rows',
  'data',
  'nodes',
  'people',
  'tasks',
  'projects',
  'accounts',
  'categories',
]

// Find the primary data array in a document (supports both @graph and LDC-style)
function findDataArray(doc: DataDoc): { key: string; array: JsonLdNode[] } {
  // First check for @graph (standard JSON-LD)
  if (Array.isArray(doc['@graph']) && doc['@graph'].length > 0) {
    return { key: '@graph', array: doc['@graph'] }
  }

  // Check common LDC array names
  for (const name of LDC_ARRAY_NAMES) {
    if (Array.isArray(doc[name]) && doc[name].length > 0) {
      return { key: name, array: doc[name] }
    }
  }

  // Fallback: find any array property that looks like data
  for (const [key, value] of Object.entries(doc)) {
    if (
      key.startsWith('@') || // Skip JSON-LD keywords
      key.endsWith('Formatted') || // Skip computed formatted fields
      typeof value !== 'object' ||
      !Array.isArray(value) ||
      value.length === 0
    )
      continue

    // Check if array items look like data objects (have id or multiple properties)
    const first = value[0]
    if (typeof first === 'object' && first !== null) {
      const hasId = 'id' in first || '@id' in first
      const hasManyProps = Object.keys(first).length >= 2
      if (hasId || hasManyProps) {
        return { key, array: value }
      }
    }
  }

  return { key: '@graph', array: [] }
}

function isJsonLdNode(doc: DataDoc): doc is JsonLdNode {
  const anyDoc = doc as any
  const hasId = typeof anyDoc?.['@id'] === 'string' || typeof anyDoc?.id === 'string'
  const hasType =
    typeof anyDoc?.['@type'] === 'string' ||
    (Array.isArray(anyDoc?.['@type']) && anyDoc['@type'].some((t: any) => typeof t === 'string'))
  return hasId || hasType
}

// Helper functions for @expr evaluation
const exprHelpers = {
  $currency: (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  },
  $percent: (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '0%'
    // Handle both 0-1 decimals and 0-100 values
    const normalized = value <= 1 && value >= -1 ? value : value / 100
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(normalized)
  },
  $abs: (value: number): number => Math.abs(value),
  $round: (value: number, decimals = 0): number => {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
  },
  $sum: (arr: number[]): number => arr.reduce((a, b) => a + b, 0),
  $avg: (arr: number[]): number => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
  $min: (arr: number[]): number => Math.min(...arr),
  $max: (arr: number[]): number => Math.max(...arr),
  $count: (arr: any[]): number => arr.length,
}

// Computed field result
interface ComputedField {
  key: string
  expr: string
  value: any
  error?: string
}

// Visualization types for computed fields
type VizType = 'progress' | 'currency' | 'count' | 'percentage' | 'number' | 'text'

// Detect what visualization to use for a computed field
function detectVizType(key: string, value: any): VizType {
  const keyLower = key.toLowerCase()

  // Check if it's a formatted value (string result from $currency, $percent, etc.)
  if (typeof value === 'string') {
    if (value.startsWith('$')) return 'currency'
    if (value.endsWith('%')) return 'percentage'
    return 'text'
  }

  // Check for percentage/progress patterns (0-1 range or key hints)
  if (typeof value === 'number') {
    if (
      keyLower.includes('progress') ||
      keyLower.includes('utilization') ||
      keyLower.includes('rate') ||
      keyLower.includes('ratio') ||
      keyLower.includes('percent')
    ) {
      return 'progress'
    }

    // Currency patterns
    if (
      keyLower.includes('revenue') ||
      keyLower.includes('budget') ||
      keyLower.includes('cost') ||
      keyLower.includes('price') ||
      keyLower.includes('amount') ||
      keyLower.includes('salary') ||
      (keyLower.includes('total') && (keyLower.includes('pipeline') || keyLower.includes('value')))
    ) {
      return 'currency'
    }

    // Count patterns
    if (
      keyLower.includes('count') ||
      keyLower.includes('size') ||
      (keyLower.includes('total') && !keyLower.includes('revenue'))
    ) {
      return 'count'
    }

    return 'number'
  }

  return 'text'
}

// Get icon for computed field based on key
function getComputedFieldIcon(key: string): React.ComponentType<{ className?: string }> {
  const keyLower = key.toLowerCase()

  if (
    keyLower.includes('team') ||
    keyLower.includes('member') ||
    keyLower.includes('count') ||
    keyLower.includes('size')
  ) {
    return Users
  }
  if (
    keyLower.includes('revenue') ||
    keyLower.includes('budget') ||
    keyLower.includes('cost') ||
    keyLower.includes('price')
  ) {
    return DollarSign
  }
  if (keyLower.includes('progress') || keyLower.includes('sprint')) {
    return TrendingUp
  }
  if (keyLower.includes('rate') || keyLower.includes('percent') || keyLower.includes('utilization')) {
    return Percent
  }
  if (keyLower.includes('capacity') || keyLower.includes('hours')) {
    return BarChart3
  }

  return Hash
}

// Safely evaluate an @expr expression
function evaluateExpr(expr: string, context: Record<string, any>): { value: any; error?: string } {
  try {
    // Create a sandboxed function with context variables
    const contextKeys = Object.keys(context)
    const contextValues = Object.values(context)

    // Add helper functions to context
    const helperKeys = Object.keys(exprHelpers)
    const helperValues = Object.values(exprHelpers)

    // Create the function with all context and helpers available
    const fn = new Function(...contextKeys, ...helperKeys, `"use strict"; return (${expr});`)

    const result = fn(...contextValues, ...helperValues)
    return { value: result }
  } catch (err) {
    return { value: undefined, error: err instanceof Error ? err.message : String(err) }
  }
}

// Extract and evaluate all computed fields from document
function extractComputedFields(doc: DataDoc): ComputedField[] {
  const fields: ComputedField[] = []
  const { key: arrayKey, array } = findDataArray(doc)

  // Build evaluation context with document data
  const context: Record<string, any> = {}

  // Add the main data array
  context[arrayKey] = array

  // Add any nested objects (like 'sprint' in team-metrics)
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('@')) continue // Skip JSON-LD keywords
    if (Array.isArray(value)) continue // Skip arrays (already handled)
    if (typeof value === 'object' && value !== null && !('@expr' in value)) {
      // It's a plain object (like sprint: { ... })
      context[key] = value
    }
  }

  // Find all @expr fields and evaluate them in order
  // (later fields can reference earlier computed values)
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('@')) continue
    if (typeof value === 'object' && value !== null && '@expr' in value) {
      const expr = value['@expr'] as string
      const { value: computed, error } = evaluateExpr(expr, context)

      fields.push({
        key,
        expr,
        value: computed,
        error,
      })

      // Add computed value to context for subsequent expressions
      context[key] = computed
    }
  }

  return fields
}

type TableRow = Record<string, any>

interface DataViewerProps {
  filePath: string
  fileName?: string
  typeHint?: string
}

const STARTER_DOC: DataDoc = {
  '@context': {
    name: 'http://schema.org/name',
    email: 'http://schema.org/email',
    phone: 'http://schema.org/telephone',
    company: 'http://schema.org/worksFor',
    note: 'http://schema.org/description',
  },
  '@graph': [
    {
      '@id': 'person:1',
      '@type': 'Person',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+1 (555) 010-1010',
      company: 'org:1',
      note: 'Example record with a relation to an organization.',
    },
    {
      '@id': 'person:2',
      '@type': 'Person',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      phone: '+1 (555) 010-2020',
      company: 'org:1',
      note: 'Another linked record.',
    },
    {
      '@id': 'org:1',
      '@type': 'Organization',
      name: 'Analytical Engine Society',
      note: 'Referenced by people via "company".',
    },
  ],
}

function extractTypes(nodes: JsonLdNode[]): string[] {
  const set = new Set<string>()
  nodes.forEach((n) => {
    const t = n['@type']
    if (Array.isArray(t)) t.forEach((tt) => set.add(String(tt)))
    else if (typeof t === 'string') set.add(t)
  })
  return Array.from(set)
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    if (typeof value['@id'] === 'string') return value['@id']
    // Format nested objects nicely instead of raw JSON
    return formatNestedObject(value)
  }
  return String(value)
}

// Format nested objects for display (e.g., address, contact)
function formatNestedObject(obj: Record<string, any>): string {
  if (!obj || typeof obj !== 'object') return ''
  const parts: string[] = []
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('@')) continue // Skip JSON-LD keywords
    if (val === null || val === undefined || val === '') continue

    if (typeof val === 'object' && !Array.isArray(val)) {
      // Recursively format nested objects
      parts.push(formatNestedObject(val))
    } else if (Array.isArray(val)) {
      parts.push(val.filter(Boolean).join(', '))
    } else {
      parts.push(String(val))
    }
  }
  return parts.filter(Boolean).join(' · ')
}

// Check if value is a nested object (for special rendering)
function isNestedObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !('@id' in value) &&
    Object.keys(value).length > 0
  )
}

// Generate a namespace-based ID with zero-padded index
function generateId(type: string, existingItems: any[]): string {
  const namespace = getNamespacePrefix(type)
  const existingIds = existingItems
    .map((item) => item['@id'] || item['id'] || '')
    .filter((id) => id.startsWith(namespace))

  // Find the highest index
  let maxIndex = 0
  existingIds.forEach((id) => {
    const match = id.match(new RegExp(`^${namespace}(\\d+)$`))
    if (match) {
      maxIndex = Math.max(maxIndex, parseInt(match[1], 10))
    }
  })

  // Generate new ID with zero-padded index (001, 002, etc.)
  const newIndex = String(maxIndex + 1).padStart(3, '0')
  return `${namespace}${newIndex}`
}

// Get namespace prefix from type name
function getNamespacePrefix(type: string): string {
  const prefixMap: Record<string, string> = {
    Milestone: 'ms-',
    MilestoneCollection: 'ms-',
    Task: 'task-',
    TaskCollection: 'task-',
    Project: 'proj-',
    ProjectCollection: 'proj-',
    Person: 'person-',
    PeopleCollection: 'person-',
    Organization: 'org-',
    OrganizationCollection: 'org-',
  }
  return prefixMap[type] || `${type.toLowerCase().slice(0, 4)}-`
}

// Get display name for a reference ID by looking up in data
function getReferenceName(refId: string, allData: JsonLdNode[]): string {
  const item = allData.find((node) => (node['@id'] || node['id']) === refId)
  if (item) {
    // Return name, title, or label - whatever exists
    return item.name || item.title || item.label || refId
  }
  return refId
}

// Detect the type of a value for appropriate input rendering
type CellType =
  | 'text'
  | 'number'
  | 'boolean' // Checkbox
  | 'date'
  | 'email'
  | 'phone'
  | 'url'
  | 'reference' // Single entity reference (Relation)
  | 'person' // Reference constrained to people
  | 'array' // Tags / multi-value
  | 'select' // Single choice from options
  | 'multiselect' // Multiple choices from options
  | 'status' // Special select with colored states
  | 'formula' // Computed expression
  | 'files' // File attachments
  | 'created_time' // Auto-populated timestamp
  | 'last_edited_time' // Auto-populated timestamp
  // Design types
  | 'color' // Hex color with color picker
  | 'palette' // Reference to palette entity
  | 'font' // Reference to font entity

// Human-readable labels for cell types
const CELL_TYPE_LABELS: Record<CellType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Checkbox',
  date: 'Date',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  reference: 'Relation',
  person: 'Person',
  array: 'Tags',
  select: 'Select',
  multiselect: 'Multi-select',
  status: 'Status',
  formula: 'Formula',
  files: 'Files & Media',
  created_time: 'Created Time',
  last_edited_time: 'Last Edited Time',
  color: 'Color',
  palette: 'Palette',
  font: 'Font',
}

// Number format types for display
type NumberFormat = 'plain' | 'currency' | 'percent' | 'decimal'

// Detect number format based on column name
function detectNumberFormat(columnName: string): NumberFormat {
  const colLower = columnName.toLowerCase()

  // Currency patterns
  if (
    colLower.includes('price') ||
    colLower.includes('cost') ||
    colLower.includes('amount') ||
    colLower.includes('budget') ||
    colLower.includes('salary') ||
    colLower.includes('fee') ||
    colLower.includes('rate') ||
    colLower.includes('balance') ||
    colLower.includes('spent') ||
    colLower.includes('income') ||
    colLower.includes('revenue') ||
    colLower.includes('expense')
  ) {
    return 'currency'
  }

  // Percent patterns
  if (
    colLower.includes('percent') ||
    colLower.includes('rate') ||
    colLower.includes('ratio') ||
    colLower.includes('apy') ||
    colLower.includes('apr') ||
    colLower.includes('utilization') ||
    colLower.includes('progress')
  ) {
    // If also matches currency patterns, prefer currency (e.g., "rate" as hourly rate)
    if (colLower.includes('rate') && !colLower.includes('percent')) {
      return 'currency'
    }
    return 'percent'
  }

  // Decimal patterns (for things like ratings, scores)
  if (colLower.includes('rating') || colLower.includes('score')) {
    return 'decimal'
  }

  return 'plain'
}

// Format a number for display
function formatNumber(value: number, formatType: NumberFormat): string {
  if (value === null || value === undefined || isNaN(value)) return ''

  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value)
    case 'percent':
      // If value is already in decimal form (0-1), multiply by 100
      const percentValue = value <= 1 && value >= -1 ? value * 100 : value
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value <= 1 && value >= -1 ? value : value / 100)
    case 'decimal':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(value)
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}

// Format a date for display
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return dateStr
    return format(date, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

// Property names that suggest a reference type
const REFERENCE_PROPERTY_HINTS = [
  'account',
  'accounts',
  'client',
  'clients',
  'lead',
  'leads',
  'person',
  'persons',
  'people',
  'assignee',
  'assignees',
  'owner',
  'owners',
  'member',
  'members',
  'contact',
  'contacts',
  'organization',
  'organizations',
  'org',
  'orgs',
  'project',
  'projects',
  'task',
  'tasks',
  'goal',
  'goals',
  'milestone',
  'milestones',
  'bill',
  'bills',
  'subscription',
  'subscriptions',
  'manager',
  'managers',
  'parent',
  'child',
  'children',
  'related',
]

// ID pattern: type:slug:index (e.g., acc:checking:001, person:sarah:001)
const ID_PATTERN = /^[a-z]+:[a-z0-9-]+:\d{3}$/i
// Legacy ID pattern: type-001 (e.g., acc-001, person-001)
const LEGACY_ID_PATTERN = /^[a-z]+[-_][a-z0-9-]+$/i

// Columns that should never be treated as references (even if value matches ID pattern)
const NON_REFERENCE_COLUMNS = ['id', '@id', 'slug', 'name', 'title', 'label', 'description']

function detectCellType(value: any, columnName: string, knownIds?: Set<string>): CellType {
  const colLower = columnName.toLowerCase()

  // 0. Early exit for columns that should never be references
  if (NON_REFERENCE_COLUMNS.includes(colLower)) {
    // These columns contain identifiers/text, not references to other entities
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value ?? ''))) return 'date'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'text'
  }

  // 1. Check known IDs (most authoritative for values)
  if (typeof value === 'string' && knownIds?.has(value)) {
    return 'reference'
  }

  // 2. Check column name hints (strong signal for intention)
  // Date columns
  if (
    colLower.includes('date') ||
    colLower.includes('created') ||
    colLower.includes('updated') ||
    colLower.endsWith('_at') ||
    colLower.endsWith('At')
  ) {
    return 'date'
  }

  // Progress/percent columns
  if (
    colLower.includes('progress') ||
    colLower.includes('percent') ||
    colLower.includes('completion') ||
    colLower.includes('ratio')
  ) {
    return 'number'
  }

  // Reference columns hints
  if (REFERENCE_PROPERTY_HINTS.some((hint) => colLower === hint || colLower.endsWith(`_${hint}`))) {
    return 'reference'
  }

  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'array'

  // 3. Check value patterns (fallback if column name didn't match)
  if (typeof value === 'string') {
    // New pattern: acc:checking:001
    if (ID_PATTERN.test(value)) return 'reference'
    // Legacy pattern: acc-001 (only if it looks like an ID, avoid simple words)
    if (LEGACY_ID_PATTERN.test(value) && /\d/.test(value)) return 'reference'
  }

  if (typeof value === 'object' && value !== null && '@id' in value) return 'reference'

  // Infer from value patterns
  const strValue = String(value ?? '')

  if (colLower.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) return 'email'
  if (
    colLower.includes('phone') ||
    colLower.includes('tel') ||
    (/^\+?[\d\s\-().]+$/.test(strValue) && strValue.length >= 7)
  )
    return 'phone'
  if (
    colLower.includes('url') ||
    colLower.includes('website') ||
    colLower.includes('link') ||
    /^https?:\/\//.test(strValue)
  )
    return 'url'

  // Check if value looks like a date
  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) return 'date'

  // Check if string looks like a number
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return 'number'

  return 'text'
}

// Get unique values for a column (for reference dropdowns)
function getColumnUniqueValues(rows: TableRow[], column: string): string[] {
  const values = new Set<string>()
  rows.forEach((row) => {
    const val = row[column]
    if (val !== null && val !== undefined && val !== '') {
      if (Array.isArray(val)) {
        val.forEach((v) => values.add(normalizeValue(v)))
      } else {
        values.add(normalizeValue(val))
      }
    }
  })
  return Array.from(values).sort()
}

// Get all reference IDs from the graph (for reference dropdowns)
function getAllReferenceIds(doc: DataDoc | null): string[] {
  if (!doc || !Array.isArray(doc['@graph'])) return []
  return doc['@graph']
    .map((node) => node['@id'])
    .filter((id): id is string => typeof id === 'string')
    .sort()
}

// Infer the dominant type for a column based on all values
function inferColumnType(rows: TableRow[], column: string, knownIds?: Set<string>): CellType {
  const typeCounts: Record<CellType, number> = {
    text: 0,
    number: 0,
    boolean: 0,
    date: 0,
    email: 0,
    phone: 0,
    url: 0,
    reference: 0,
    person: 0,
    array: 0,
    select: 0,
    multiselect: 0,
    status: 0,
    formula: 0,
    files: 0,
    created_time: 0,
    last_edited_time: 0,
    color: 0,
    palette: 0,
    font: 0,
  }

  rows.forEach((row) => {
    const cellType = detectCellType(row[column], column, knownIds)
    typeCounts[cellType]++
  })

  // Return the most common non-text type, or text if no clear winner
  let maxType: CellType = 'text'
  let maxCount = 0
  for (const [type, count] of Object.entries(typeCounts)) {
    if (type !== 'text' && count > maxCount) {
      maxType = type as CellType
      maxCount = count
    }
  }

  // Only return non-text if at least 50% of non-empty values match
  const nonEmptyCount = rows.filter((r) => r[column] !== null && r[column] !== undefined && r[column] !== '').length
  if (maxCount >= nonEmptyCount * 0.5 && maxCount > 0) {
    return maxType
  }

  return 'text'
}

// Reference option with source info
interface ReferenceOption {
  id: string
  label: string
  source: 'current' | 'vault' | 'file'
  sourceFile?: string
  type?: string
  namespace?: string // Extracted from ID for grouping (e.g., "acc", "person")
}

type CachedReferenceOptions = {
  vaultPath: string
  options: ReferenceOption[]
}

let cachedReferenceOptions: CachedReferenceOptions | null = null
let cachedReferenceOptionsPromise: Promise<ReferenceOption[]> | null = null

async function loadReferenceOptionsForVault(vaultPath: string): Promise<ReferenceOption[]> {
  const relDataFiles = Object.values(NAMESPACE_FILES).filter((p) => typeof p === 'string' && p.endsWith('.data'))
  const uniqueRelFiles = Array.from(new Set(relDataFiles))
  const options: ReferenceOption[] = []

  for (const relPath of uniqueRelFiles) {
    const dataFilePath = `${vaultPath}/${relPath}`
    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath: dataFilePath })
      const content = response.content
      const parsed = JSON.parse(content)
      const { array: parsedArray } = findDataArray(parsed)

      parsedArray.forEach((node: JsonLdNode) => {
        const nodeId = node['@id'] || node['id']
        if (!nodeId) return
        const displayName = node.name || node.title || node.label || node.description || nodeId
        const namespace = extractNamespace(nodeId)
        options.push({
          id: nodeId,
          label: displayName,
          source: 'vault',
          sourceFile: relPath,
          type: Array.isArray(node['@type']) ? node['@type'][0] : node['@type'],
          namespace,
        })
      })
    } catch {
      continue
    }
  }

  const uniqueOptions = Array.from(
    options
      .reduce((map, opt) => {
        const existing = map.get(opt.id)
        if (!existing || (existing.sourceFile?.includes('_graph_') && !opt.sourceFile?.includes('_graph_'))) {
          map.set(opt.id, opt)
        }
        return map
      }, new Map<string, ReferenceOption>())
      .values(),
  )

  uniqueOptions.sort((a, b) => {
    const nsCompare = (a.namespace || 'other').localeCompare(b.namespace || 'other')
    if (nsCompare !== 0) return nsCompare
    return a.label.localeCompare(b.label)
  })

  return uniqueOptions
}

async function getCachedReferenceOptions(vaultPath: string): Promise<ReferenceOption[]> {
  if (cachedReferenceOptions && cachedReferenceOptions.vaultPath === vaultPath) {
    return cachedReferenceOptions.options
  }

  if (cachedReferenceOptionsPromise) {
    return cachedReferenceOptionsPromise
  }

  cachedReferenceOptionsPromise = loadReferenceOptionsForVault(vaultPath)
    .then((options) => {
      cachedReferenceOptions = { vaultPath, options }
      return options
    })
    .finally(() => {
      cachedReferenceOptionsPromise = null
    })

  return cachedReferenceOptionsPromise
}

function toCsv(headers: string[], rows: TableRow[]): string {
  const escape = (val: string) => {
    if (val.includes('"') || val.includes(',') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const lines = [headers.map(escape).join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(normalizeValue(row[h] ?? ''))).join(','))
  })
  return lines.join('\n')
}

// History state for undo/redo
interface HistoryState {
  doc: DataDoc
}
const MAX_HISTORY_LENGTH = 50

export function DataViewer({ filePath, fileName, typeHint }: DataViewerProps) {
  const { vaultPath } = useVault()
  const { activeTabId, navigateInTab } = useTabStore()
  const { highlightedEntityId, clearHighlight } = useHighlightStore()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [doc, setDoc] = React.useState<DataDoc | null>(null)
  const [types, setTypes] = React.useState<string[]>([])
  const [selectedType, setSelectedType] = React.useState<string | undefined>(undefined)
  const [columns, setColumns] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<TableRow[]>([])
  const [dataArrayKey, setDataArrayKey] = React.useState<string>('@graph')
  const [search, setSearch] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  // View mode: data (table), insights (computed fields), source (JSON editor)
  type ViewMode = 'data' | 'entity' | 'insights' | 'source'
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const stored = localStorage.getItem('dataViewer.viewMode')
    return (stored as ViewMode) || 'data'
  })

  const effectiveExtension = React.useMemo(() => {
    return fileName ? getEffectiveExtension(fileName) : null
  }, [fileName])

  const showEntityTab = Boolean(typeHint) && dataArrayKey === '@single'
  const entityTabLabel = React.useMemo(() => {
    if (typeHint) return typeHint
    if (effectiveExtension && IMPORTED_NAMESPACE_LABELS[effectiveExtension])
      return IMPORTED_NAMESPACE_LABELS[effectiveExtension]
    return 'Entity'
  }, [effectiveExtension, typeHint])

  const didAutoSelectEntityViewRef = React.useRef(false)

  React.useEffect(() => {
    didAutoSelectEntityViewRef.current = false
  }, [filePath])

  React.useEffect(() => {
    if (!showEntityTab && viewMode === 'entity') {
      setViewMode('data')
      return
    }

    if (showEntityTab && !didAutoSelectEntityViewRef.current) {
      didAutoSelectEntityViewRef.current = true
      setViewMode('entity')
    }
  }, [showEntityTab, viewMode])

  // Persist view mode to localStorage
  React.useEffect(() => {
    localStorage.setItem('dataViewer.viewMode', viewMode)
  }, [viewMode])

  // Source editor state
  const [sourceValue, setSourceValue] = React.useState('')
  const [sourceError, setSourceError] = React.useState<string | null>(null)

  // Save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Undo/redo history
  const [past, setPast] = React.useState<HistoryState[]>([])
  const [future, setFuture] = React.useState<HistoryState[]>([])
  const skipHistoryRef = React.useRef(false)
  const docRef = React.useRef<DataDoc | null>(null)

  // Reference options from sibling files
  const [referenceOptions, setReferenceOptions] = React.useState<ReferenceOption[]>([])

  // Memoize known IDs for detection
  const knownIds = React.useMemo(() => new Set(referenceOptions.map((o) => o.id)), [referenceOptions])

  // Ref for scrolling to highlighted row
  const highlightedRowRef = React.useRef<HTMLTableRowElement>(null)

  // Scroll to highlighted row when it changes
  React.useEffect(() => {
    if (highlightedEntityId && highlightedRowRef.current) {
      // Small delay to ensure the row is rendered
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)
    }
  }, [highlightedEntityId, rows])

  // Column widths for resizing
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null)
  const resizeStartX = React.useRef(0)
  const resizeStartWidth = React.useRef(0)

  // Calculate auto-fit width for a column based on content
  const calculateAutoWidth = React.useCallback(
    (col: string): number => {
      const colLower = col.toLowerCase()
      const headerWidth = col.length * 9 + 50 // Approximate header width with icon

      // Set reasonable defaults based on column type
      if (colLower.includes('id') || colLower === 'id') return 120
      if (colLower.includes('date')) return 140
      if (colLower.includes('status')) return 100
      if (colLower.includes('progress') || colLower.includes('percent')) return 90
      if (colLower.includes('description')) return 280
      if (colLower.includes('name') || colLower.includes('title')) return 180
      if (colLower.includes('project')) return 160

      // For other columns, sample content
      let maxContentWidth = headerWidth
      for (const row of rows.slice(0, 20)) {
        // Sample first 20 rows
        const value = row[col]
        if (Array.isArray(value)) {
          // Arrays (tags) need more space
          maxContentWidth = Math.max(maxContentWidth, 200)
        } else if (typeof value === 'object' && value !== null) {
          // Nested objects need more space
          maxContentWidth = Math.max(maxContentWidth, 220)
        } else {
          const displayValue = normalizeValue(value)
          // Use 7px per character as rough estimate
          const contentWidth = Math.min(displayValue.length * 7.5, 300)
          maxContentWidth = Math.max(maxContentWidth, contentWidth + 24)
        }
      }

      return Math.max(100, Math.min(maxContentWidth, 320)) // Min 100px, max 320px
    },
    [rows],
  )

  // Auto-fit all columns on initial load or when columns change
  React.useEffect(() => {
    if (columns.length > 0) {
      // Check if we need to recalculate (new columns or no widths yet)
      const hasNewColumns = columns.some((col) => !(col in columnWidths))
      if (hasNewColumns || Object.keys(columnWidths).length === 0) {
        const widths: Record<string, number> = {}
        columns.forEach((col) => {
          widths[col] = columnWidths[col] || calculateAutoWidth(col)
        })
        setColumnWidths(widths)
      }
    }
  }, [columns, calculateAutoWidth])

  // Handle column resize
  const handleResizeStart = React.useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault()
      setResizingColumn(col)
      resizeStartX.current = e.clientX
      resizeStartWidth.current = columnWidths[col] || calculateAutoWidth(col)
    },
    [columnWidths, calculateAutoWidth],
  )

  React.useEffect(() => {
    if (!resizingColumn) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current
      const newWidth = Math.max(60, resizeStartWidth.current + delta)
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingColumn])

  // Computed fields from @expr expressions
  const [computedFields, setComputedFields] = React.useState<ComputedField[]>([])

  // Formula editing state
  const [editingFormulaKey, setEditingFormulaKey] = React.useState<string | null>(null)
  const [formulaEditValue, setFormulaEditValue] = React.useState('')
  const [formulaValidation, setFormulaValidation] = React.useState<{
    valid: boolean
    error?: string
    value?: any
  }>({ valid: true })

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  React.useEffect(() => {
    docRef.current = doc
  }, [doc])

  // Load ALL entities from the vault for reference options (vault-wide entity picker)
  React.useEffect(() => {
    if (!vaultPath) return
    let cancelled = false

    const loadReferenceOptions = async () => {
      try {
        const baseOptions = await getCachedReferenceOptions(vaultPath)
        if (cancelled) return

        const currentRelPath = filePath.startsWith(`${vaultPath}/`) ? filePath.replace(`${vaultPath}/`, '') : ''
        const next = baseOptions.map((opt) =>
          opt.sourceFile === currentRelPath ? { ...opt, source: 'current' as const } : opt,
        )
        setReferenceOptions(next)
      } catch (err) {
        console.error('[DataViewer] Failed to load reference options:', err)
      }
    }

    void loadReferenceOptions()

    return () => {
      cancelled = true
    }
  }, [vaultPath, filePath])

  // Serialize doc to JSON string
  const serializeDoc = React.useCallback((d: DataDoc) => JSON.stringify(d, null, 2), [])

  // Track which array key we're using (for mutations)
  const projectDoc = React.useCallback(
    (nextDoc: DataDoc, typeHint?: string) => {
      const primary = findDataArray(nextDoc)

      // Support single-entity docs (no @graph / no LDC array)
      const key = primary.array.length === 0 && isJsonLdNode(nextDoc) ? '@single' : primary.key
      const graph = primary.array.length === 0 && isJsonLdNode(nextDoc) ? [nextDoc] : primary.array

      setDataArrayKey(key)

      const allTypes = extractTypes(graph)
      const nextType = typeHint && allTypes.includes(typeHint) ? typeHint : allTypes[0]
      const filtered = nextType
        ? graph.filter((n) => (Array.isArray(n['@type']) ? n['@type'].includes(nextType) : n['@type'] === nextType))
        : graph

      // For LDC-style docs, also exclude 'id' from columns (it's like @id)
      const excludeKeys = ['@id', '@type', 'id']
      const cols = Array.from(
        filtered.reduce((set, node) => {
          Object.keys(node || {}).forEach((k) => {
            if (!excludeKeys.includes(k)) set.add(k)
          })
          return set
        }, new Set<string>()),
      )
      setDoc(nextDoc)
      setTypes(allTypes)
      setSelectedType(nextType)
      setColumns(cols)
      setRows(filtered)
      setSourceError(null)

      // Evaluate computed fields
      const computed = extractComputedFields(nextDoc)
      setComputedFields(computed)
    },
    [serializeDoc],
  )

  React.useEffect(() => {
    if (viewMode !== 'source') return
    if (!doc) return
    setSourceValue(serializeDoc(doc))
    setSourceError(null)
  }, [doc, serializeDoc, viewMode])

  const seedTemplate = React.useCallback(async () => {
    setBusy(true)
    try {
      await invoke('write_text_file', {
        filePath,
        content: JSON.stringify(STARTER_DOC, null, 2),
      })
      projectDoc(STARTER_DOC)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      setLoading(false)
    }
  }, [projectDoc, filePath])

  const loadDoc = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (options?.silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await invoke<{ content: string }>('read_text_file', {
          filePath,
          maxBytes: 5 * 1024 * 1024,
        })

        const content = res.content ?? ''
        if (!content.trim()) {
          await seedTemplate()
          return
        }

        let parsed: any
        try {
          parsed = JSON.parse(content)
        } catch (parseErr) {
          setError('Invalid JSON in data file')
          return
        }

        const nextDoc: DataDoc = parsed && typeof parsed === 'object' ? parsed : {}
        projectDoc(nextDoc, typeHint)
        setLastUpdated(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (options?.silent) setRefreshing(false)
        else setLoading(false)
      }
    },
    [filePath, projectDoc, seedTemplate, typeHint],
  )

  React.useEffect(() => {
    void loadDoc()
  }, [loadDoc])

  React.useEffect(() => {
    if (doc) {
      projectDoc(doc, typeHint ?? selectedType)
    }
  }, [doc, projectDoc, selectedType, typeHint])

  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) => columns.some((c) => normalizeValue(row[c]).toLowerCase().includes(q)))
  }, [columns, rows, search])

  const handleRefresh = () => loadDoc({ silent: true })

  // Push current state to history (for undo/redo)
  const pushToHistory = React.useCallback(() => {
    if (skipHistoryRef.current || !docRef.current) {
      skipHistoryRef.current = false
      return
    }
    setPast((prev) => {
      const newState: HistoryState = { doc: docRef.current! }
      const newPast = [...prev, newState]
      if (newPast.length > MAX_HISTORY_LENGTH) {
        return newPast.slice(-MAX_HISTORY_LENGTH)
      }
      return newPast
    })
    setFuture([])
    setHasUnsavedChanges(true)
  }, [])

  // Undo action
  const handleUndo = React.useCallback(() => {
    if (past.length === 0 || !docRef.current) return

    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)

    setFuture((prev) => [...prev, { doc: docRef.current! }])
    skipHistoryRef.current = true
    projectDoc(previous.doc, selectedType)
    setPast(newPast)
    setHasUnsavedChanges(true)
  }, [past, projectDoc, selectedType])

  // Redo action
  const handleRedo = React.useCallback(() => {
    if (future.length === 0 || !docRef.current) return

    const next = future[future.length - 1]
    const newFuture = future.slice(0, -1)

    setPast((prev) => [...prev, { doc: docRef.current! }])
    skipHistoryRef.current = true
    projectDoc(next.doc, selectedType)
    setFuture(newFuture)
    setHasUnsavedChanges(true)
  }, [future, projectDoc, selectedType])

  // Save to file
  const handleSave = React.useCallback(async () => {
    if (isSaving || !doc) return

    setIsSaving(true)
    try {
      const content = serializeDoc(doc)
      await invoke('write_text_file', { filePath, content })
      setHasUnsavedChanges(false)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[DataViewer] Failed to save:', err)
      setSourceError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [filePath, doc, serializeDoc, isSaving])

  // Auto-save: debounced save when changes occur
  const autoSaveTimeoutRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      if (!docRef.current) return
      try {
        const content = serializeDoc(docRef.current)
        await invoke('write_text_file', { filePath, content })
        setHasUnsavedChanges(false)
        setLastUpdated(new Date())
      } catch (err) {
        console.error('[DataViewer] Auto-save failed:', err)
      }
    }, 1000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, isSaving, filePath, serializeDoc])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault()
        handleRedo()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleUndo, handleRedo])

  // Update doc from source editor
  const handleSourceChange = React.useCallback(
    (newContent: string) => {
      setSourceValue(newContent)
      try {
        const parsed = JSON.parse(newContent)
        const nextDoc: DataDoc = parsed && typeof parsed === 'object' ? parsed : {}
        pushToHistory()
        projectDoc(nextDoc, selectedType)
        setSourceError(null)
      } catch (err) {
        setSourceError(err instanceof Error ? err.message : 'Invalid JSON')
      }
    },
    [projectDoc, selectedType, pushToHistory],
  )

  const columnUniqueValues = React.useMemo(() => {
    const values: Record<string, string[]> = {}
    columns.forEach((col) => {
      values[col] = getColumnUniqueValues(rows, col)
    })
    return values
  }, [columns, rows])

  // Add a new row to the current type
  const handleAddRow = React.useCallback(() => {
    if (!doc || !selectedType) return

    if (dataArrayKey === '@single') return

    pushToHistory()
    const currentArray = Array.isArray(doc[dataArrayKey]) ? [...doc[dataArrayKey]] : []
    const isLdcStyle = dataArrayKey !== '@graph'

    // Generate proper namespace-based ID
    const newId = generateId(selectedType, currentArray)

    const newNode: JsonLdNode = isLdcStyle ? { id: newId } : { '@id': newId, '@type': selectedType }

    // Add empty values for existing columns
    columns.forEach((col) => {
      newNode[col] = ''
    })
    currentArray.push(newNode)
    const nextDoc: DataDoc = { ...doc, [dataArrayKey]: currentArray }
    projectDoc(nextDoc, selectedType)
    setHasUnsavedChanges(true)
  }, [doc, selectedType, columns, dataArrayKey, projectDoc, pushToHistory])

  // Delete a row by @id or id
  const handleDeleteRow = React.useCallback(
    (rowId: string) => {
      if (!doc) return

      if (dataArrayKey === '@single') return

      pushToHistory()
      const currentArray = Array.isArray(doc[dataArrayKey])
        ? doc[dataArrayKey].filter((n) => (n['@id'] || n['id']) !== rowId)
        : []
      const nextDoc: DataDoc = { ...doc, [dataArrayKey]: currentArray }
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)
    },
    [doc, selectedType, dataArrayKey, projectDoc, pushToHistory],
  )

  // Edit a cell value (accepts any type: string, number, boolean, array)
  const handleCellEdit = React.useCallback(
    (rowId: string, column: string, value: any) => {
      if (!doc) return

      pushToHistory()

      // Single-entity mode: update root object directly
      if (dataArrayKey === '@single') {
        const nextDoc: DataDoc = { ...doc, [column]: value }
        projectDoc(nextDoc, selectedType)
        setHasUnsavedChanges(true)
        return
      }

      const currentArray = Array.isArray(doc[dataArrayKey])
        ? doc[dataArrayKey].map((n) => ((n['@id'] || n['id']) === rowId ? { ...n, [column]: value } : n))
        : []
      const nextDoc: DataDoc = { ...doc, [dataArrayKey]: currentArray }
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)
    },
    [doc, selectedType, dataArrayKey, projectDoc, pushToHistory],
  )

  // Create a new entity from an unresolved reference
  const handleCreateEntity = React.useCallback(
    (id: string, type: string) => {
      if (!doc) return

      pushToHistory()
      const currentArray = Array.isArray(doc[dataArrayKey]) ? [...doc[dataArrayKey]] : []
      const isLdcStyle = dataArrayKey !== '@graph'

      // Check if entity already exists
      if (currentArray.some((n) => (n['@id'] || n['id']) === id)) {
        console.log('[DataViewer] Entity already exists:', id)
        return
      }

      // Create new node with inferred type and empty columns for that type
      const newNode: JsonLdNode = isLdcStyle ? { id } : { '@id': id, '@type': type }

      // Find existing nodes of the same type to infer columns
      const sameTypeNodes = currentArray.filter((n) =>
        Array.isArray(n['@type']) ? n['@type'].includes(type) : n['@type'] === type,
      )
      if (sameTypeNodes.length > 0) {
        // Add empty values for columns that exist in same-type nodes
        const existingColumns = new Set<string>()
        sameTypeNodes.forEach((node) => {
          Object.keys(node).forEach((k) => {
            if (k !== '@id' && k !== '@type' && k !== 'id') existingColumns.add(k)
          })
        })
        existingColumns.forEach((col) => {
          newNode[col] = ''
        })
      } else {
        // No existing nodes of this type, add a name column by default
        newNode.name = ''
      }

      currentArray.push(newNode)
      const nextDoc: DataDoc = { ...doc, [dataArrayKey]: currentArray }

      // Switch to the new type if different from current
      const newType = type !== selectedType ? type : selectedType
      projectDoc(nextDoc, newType)
      setHasUnsavedChanges(true)
    },
    [doc, selectedType, dataArrayKey, projectDoc, pushToHistory],
  )

  // Navigate to a reference's source file - opens in a new editor tab
  const handleNavigateToReference = React.useCallback(
    (sourceFile: string) => {
      if (!vaultPath) return

      // Convert relative path (e.g., "@finance/accounts.data") to absolute path
      const absolutePath = `${vaultPath}/${sourceFile}`

      // Extract filename for FileItem
      const lastSlash = absolutePath.lastIndexOf('/')
      const fileName = absolutePath.substring(lastSlash + 1)

      // Open in a new pinned editor tab instead of navigating away
      const { openEditorPinned } = useTabStore.getState()
      openEditorPinned({
        id: fileName,
        name: fileName,
        path: absolutePath,
        file_type: 'file',
        size: null,
        date_modified: new Date().toISOString(),
        extension: getEffectiveExtension(fileName),
      })
    },
    [vaultPath],
  )

  // --- Validation & Bulk Creation ---

  const [showValidateDialog, setShowValidateDialog] = React.useState(false)
  const [missingRefs, setMissingRefs] = React.useState<
    Array<{ id: string; namespace: string; suggestedFile: string; name: string; selected: boolean }>
  >([])

  // Detect missing references in the current document
  const handleValidate = React.useCallback(() => {
    if (!doc) return

    const foundIds = new Set<string>()
    // Recursive traversal to find all ID-like strings
    const traverse = (obj: any) => {
      if (typeof obj === 'string') {
        // Match type:slug:index pattern (e.g., acc:checking:001)
        if (/^[a-z]+:[a-z0-9-]+:\d{3}$/i.test(obj)) {
          foundIds.add(obj)
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse)
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(traverse)
      }
    }

    traverse(doc)

    // Filter out IDs that exist in the vault (referenceOptions) or in current document
    const existingIds = new Set(referenceOptions.map((o) => o.id))
    // Also add IDs defined in the current document itself
    const { array: currentArray } = findDataArray(doc)
    currentArray.forEach((n) => {
      if (n['@id']) existingIds.add(n['@id'])
      if (n.id) existingIds.add(n.id)
    })

    const missing = Array.from(foundIds).filter((id) => !existingIds.has(id))

    if (missing.length === 0) {
      // Use a simple alert for now, or a toast if available
      // For this demo, we'll just log it or show a "No issues" state if we had a UI for it
      // But since this is triggered by a button, let's use the dialog to say "All good"
      setMissingRefs([])
      setShowValidateDialog(true)
      return
    }

    // Map missing IDs to potential files based on namespace
    const namespaceFiles: Record<string, Record<string, number>> = {}
    referenceOptions.forEach((opt) => {
      if (opt.namespace && opt.sourceFile && opt.sourceFile !== 'current') {
        if (!namespaceFiles[opt.namespace]) namespaceFiles[opt.namespace] = {}
        namespaceFiles[opt.namespace][opt.sourceFile] = (namespaceFiles[opt.namespace][opt.sourceFile] || 0) + 1
      }
    })

    const candidates = missing.map((id) => {
      const namespace = extractNamespace(id)
      // Pick the most frequent file for this namespace
      let suggestedFile = ''
      if (namespaceFiles[namespace]) {
        suggestedFile = Object.entries(namespaceFiles[namespace]).sort((a, b) => b[1] - a[1])[0][0]
      }

      // Fallback mapping if no examples found
      if (!suggestedFile) {
        const fallbackMap: Record<string, string> = {
          acc: '@finance/accounts.data',
          person: '@company/team-members.data',
          org: '@company/organizations.data',
          proj: '@projects/active.data',
          task: '@tasks/backlog.data',
          goal: '@finance/goals.data',
          tx: '@finance/transactions.data',
          bill: '@finance/bills.data',
          sub: '@finance/bills.data',
          annual: '@finance/bills.data',
          ins: '@finance/insurance.data',
          inc: '@finance/income.data',
          cat: '@finance/categories.data',
        }
        suggestedFile = fallbackMap[namespace] || 'new-entities.data'
      }

      // Guess a name from the slug
      const match = id.match(/^[a-z]+:([a-z0-9-]+):\d{3}$/i)
      const slug = match ? match[1] : ''
      const name = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

      return {
        id,
        namespace,
        suggestedFile,
        name,
        selected: true,
      }
    })

    setMissingRefs(candidates)
    setShowValidateDialog(true)
  }, [doc, referenceOptions])

  // Create selected missing entities
  const handleCreateMissing = React.useCallback(async () => {
    if (!vaultPath) return

    const toCreate = missingRefs.filter((r) => r.selected)
    if (toCreate.length === 0) {
      setShowValidateDialog(false)
      return
    }

    // Group by file to minimize writes
    const byFile: Record<string, typeof toCreate> = {}
    toCreate.forEach((item) => {
      if (!byFile[item.suggestedFile]) byFile[item.suggestedFile] = []
      byFile[item.suggestedFile].push(item)
    })

    // Process each file
    for (const [relPath, items] of Object.entries(byFile)) {
      try {
        const filePath = `${vaultPath}/${relPath}`
        let content = ''
        let doc: any = {}

        // Try to read existing file
        try {
          const response = await invoke<{ content: string }>('read_text_file', { filePath })
          content = response.content
          doc = JSON.parse(content)
        } catch {
          // File doesn't exist or is empty, create new scaffold
          doc = {
            '@context': { [items[0].namespace]: 'https://schema.local/' },
            '@id': `local:${items[0].namespace}s`,
            '@type': 'Collection',
            items: [],
          }
        }

        // Find the array to add to
        const { key, array } = findDataArray(doc)
        let targetArray = array
        let targetKey = key

        // Special case for bills.data which has multiple arrays (recurring, subscriptions, annualPayments)
        if (relPath.includes('bills.data')) {
          // Route based on namespace
          const ns = items[0].namespace
          if (ns === 'sub' && Array.isArray(doc['subscriptions'])) {
            targetArray = doc['subscriptions']
          } else if (ns === 'annual' && Array.isArray(doc['annualPayments'])) {
            targetArray = doc['annualPayments']
          } else if (ns === 'bill' && Array.isArray(doc['recurring'])) {
            targetArray = doc['recurring']
          }
        }

        // If no array found (empty object), default to 'items'
        if (!targetArray) {
          targetKey = 'items'
          if (!doc[targetKey]) doc[targetKey] = []
          targetArray = doc[targetKey]
        }

        // Add items
        items.forEach((item) => {
          // Don't add duplicate if it somehow exists
          if (targetArray.some((n: any) => (n['@id'] || n.id) === item.id)) return

          // Create simple node
          const node: any = {
            id: item.id,
            slug: item.id.split(':')[1],
            name: item.name,
            type: item.namespace, // simple type inference
          }
          targetArray.push(node)
        })

        // Write back
        await invoke('write_text_file', {
          filePath: filePath,
          content: JSON.stringify(doc, null, 2),
        })
      } catch (err) {
        console.error(`Failed to update ${relPath}:`, err)
      }
    }

    setShowValidateDialog(false)
    // Reload options is handled by the file watcher/useEffect in DataViewer
  }, [missingRefs, vaultPath])

  // Update an @expr formula in the document
  const handleFormulaEdit = React.useCallback(
    (key: string, newExpr: string) => {
      if (!doc) return

      pushToHistory()
      const nextDoc: DataDoc = {
        ...doc,
        [key]: { '@expr': newExpr },
      }
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)
      setEditingFormulaKey(null)
      setFormulaEditValue('')
    },
    [doc, selectedType, projectDoc, pushToHistory],
  )

  // Add a new @expr formula to the document
  const handleAddFormula = React.useCallback(
    (key: string, expr: string) => {
      if (!doc || !key.trim()) return

      pushToHistory()
      const nextDoc: DataDoc = {
        ...doc,
        [key.trim()]: { '@expr': expr },
      }
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)
    },
    [doc, selectedType, projectDoc, pushToHistory],
  )

  // Delete an @expr formula from the document
  const handleDeleteFormula = React.useCallback(
    (key: string) => {
      if (!doc) return

      pushToHistory()
      const nextDoc: DataDoc = { ...doc }
      delete nextDoc[key]
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)
    },
    [doc, selectedType, projectDoc, pushToHistory],
  )

  // --- Custom Column Management ---
  const [showAddColumnDialog, setShowAddColumnDialog] = React.useState(false)
  const [newColumnName, setNewColumnName] = React.useState('')
  const [newColumnType, setNewColumnType] = React.useState<CellType>('text')
  const [newColumnDefault, setNewColumnDefault] = React.useState('')
  const [newColumnRefType, setNewColumnRefType] = React.useState<string>('') // For reference columns: which entity type

  // Rename column state
  const [showRenameDialog, setShowRenameDialog] = React.useState(false)
  const [renameColumnFrom, setRenameColumnFrom] = React.useState('')
  const [renameColumnTo, setRenameColumnTo] = React.useState('')

  // Get unique entity types from reference options for the type constraint dropdown
  const availableEntityTypes = React.useMemo(() => {
    const types = new Set<string>()
    referenceOptions.forEach((opt) => {
      if (opt.namespace) types.add(opt.namespace)
    })
    return Array.from(types).sort()
  }, [referenceOptions])

  // Add a new column to all rows
  const handleAddColumn = React.useCallback(() => {
    if (!doc || !newColumnName.trim() || !dataArrayKey) return

    const columnName = newColumnName.trim().toLowerCase().replace(/\s+/g, '_')

    // Check if column already exists
    if (columns.includes(columnName)) {
      toast.error(`Column "${columnName}" already exists`)
      return
    }

    pushToHistory()

    // Determine default value based on type
    let defaultValue: any = newColumnDefault || null
    if (newColumnType === 'number') {
      defaultValue = newColumnDefault ? parseFloat(newColumnDefault) : 0
    } else if (newColumnType === 'boolean') {
      defaultValue = newColumnDefault === 'true'
    } else if (newColumnType === 'array') {
      defaultValue = []
    } else if (newColumnType === 'date') {
      defaultValue = newColumnDefault || null
    }

    // Get the current data array and add the new column to each item
    const currentArray = Array.isArray(doc[dataArrayKey]) ? [...doc[dataArrayKey]] : []
    const updatedArray = currentArray.map((item: any) => ({
      ...item,
      [columnName]: defaultValue,
    }))

    // Build schema entry for this column
    const schemaEntry: ColumnSchema = { type: newColumnType }
    // Set refType for reference types
    if (newColumnType === 'person') {
      // Person type auto-sets refType to 'person'
      schemaEntry.refType = newColumnRefType || 'person'
    } else if (newColumnType === 'palette' || newColumnType === 'font') {
      // Brand assets live in @brand namespace
      schemaEntry.refType = 'brand'
    } else if (newColumnType === 'reference' && newColumnRefType) {
      schemaEntry.refType = newColumnRefType
    }

    // Update @schema with new column metadata
    const existingSchema = doc['@schema'] || {}
    const updatedSchema = { ...existingSchema, [columnName]: schemaEntry }

    const nextDoc: DataDoc = { ...doc, [dataArrayKey]: updatedArray, '@schema': updatedSchema }
    projectDoc(nextDoc, selectedType)
    setHasUnsavedChanges(true)

    // Reset dialog state
    setShowAddColumnDialog(false)
    setNewColumnName('')
    setNewColumnType('text')
    setNewColumnDefault('')
    setNewColumnRefType('')

    toast.success(
      `Added column "${columnName}"${newColumnRefType ? ` (${NAMESPACE_LABELS[newColumnRefType] || newColumnRefType} references)` : ''}`,
    )
  }, [
    doc,
    dataArrayKey,
    newColumnName,
    newColumnType,
    newColumnDefault,
    newColumnRefType,
    columns,
    selectedType,
    projectDoc,
    pushToHistory,
  ])

  // Delete a column from all rows
  const handleDeleteColumn = React.useCallback(
    (columnName: string) => {
      if (!doc || !dataArrayKey) return

      // Don't allow deleting essential columns
      const protectedColumns = ['id', '@id', 'name', 'title', 'slug']
      if (protectedColumns.includes(columnName.toLowerCase())) {
        toast.error(`Cannot delete essential column "${columnName}"`)
        return
      }

      pushToHistory()

      const currentArray = Array.isArray(doc[dataArrayKey]) ? [...doc[dataArrayKey]] : []
      const updatedArray = currentArray.map((item: any) => {
        const newItem = { ...item }
        delete newItem[columnName]
        return newItem
      })

      // Also remove from @schema if present
      const existingSchema = doc['@schema'] || {}
      const updatedSchema = { ...existingSchema }
      delete updatedSchema[columnName]

      const nextDoc: DataDoc = { ...doc, [dataArrayKey]: updatedArray, '@schema': updatedSchema }
      projectDoc(nextDoc, selectedType)
      setHasUnsavedChanges(true)

      toast.success(`Deleted column "${columnName}"`)
    },
    [doc, dataArrayKey, selectedType, projectDoc, pushToHistory],
  )

  // Rename a column in all rows
  const handleRenameColumn = React.useCallback(() => {
    if (!doc || !dataArrayKey || !renameColumnFrom || !renameColumnTo.trim()) return

    const newName = renameColumnTo.trim().toLowerCase().replace(/\s+/g, '_')

    // Check if new name already exists
    if (columns.includes(newName) && newName !== renameColumnFrom) {
      toast.error(`Column "${newName}" already exists`)
      return
    }

    // Don't allow renaming essential columns
    const protectedColumns = ['id', '@id']
    if (protectedColumns.includes(renameColumnFrom.toLowerCase())) {
      toast.error(`Cannot rename essential column "${renameColumnFrom}"`)
      return
    }

    pushToHistory()

    const currentArray = Array.isArray(doc[dataArrayKey]) ? [...doc[dataArrayKey]] : []
    const updatedArray = currentArray.map((item: any) => {
      const newItem = { ...item }
      if (renameColumnFrom in newItem) {
        newItem[newName] = newItem[renameColumnFrom]
        delete newItem[renameColumnFrom]
      }
      return newItem
    })

    // Also rename in @schema if present
    const existingSchema = doc['@schema'] || {}
    const updatedSchema = { ...existingSchema }
    if (renameColumnFrom in updatedSchema) {
      updatedSchema[newName] = updatedSchema[renameColumnFrom]
      delete updatedSchema[renameColumnFrom]
    }

    const nextDoc: DataDoc = { ...doc, [dataArrayKey]: updatedArray, '@schema': updatedSchema }
    projectDoc(nextDoc, selectedType)
    setHasUnsavedChanges(true)

    // Reset dialog state
    setShowRenameDialog(false)
    setRenameColumnFrom('')
    setRenameColumnTo('')

    toast.success(`Renamed column "${renameColumnFrom}" to "${newName}"`)
  }, [doc, dataArrayKey, renameColumnFrom, renameColumnTo, columns, selectedType, projectDoc, pushToHistory])

  // Real-time formula validation
  React.useEffect(() => {
    if (!editingFormulaKey || !doc) {
      setFormulaValidation({ valid: true })
      return
    }

    const { key: arrayKey, array } = findDataArray(doc)
    const context: Record<string, any> = { [arrayKey]: array }

    // Build context with other doc properties (plain objects)
    for (const [k, v] of Object.entries(doc)) {
      if (k.startsWith('@') || Array.isArray(v)) continue
      if (typeof v === 'object' && v !== null && !('@expr' in v)) {
        context[k] = v
      }
    }

    // Add previously computed values to context (formulas before the one being edited)
    for (const [k, v] of Object.entries(doc)) {
      if (k === editingFormulaKey) break // Stop before the current formula
      if (typeof v === 'object' && v !== null && '@expr' in v) {
        const { value } = evaluateExpr(v['@expr'], context)
        context[k] = value
      }
    }

    if (!formulaEditValue.trim()) {
      setFormulaValidation({ valid: false, error: 'Formula cannot be empty' })
      return
    }

    const { value, error } = evaluateExpr(formulaEditValue, context)
    setFormulaValidation({ valid: !error, error, value })
  }, [formulaEditValue, editingFormulaKey, doc])

  // Start editing a formula
  const startEditingFormula = React.useCallback((key: string, currentExpr: string) => {
    setEditingFormulaKey(key)
    setFormulaEditValue(currentExpr)
    setFormulaValidation({ valid: true })
  }, [])

  // Cancel editing
  const cancelEditingFormula = React.useCallback(() => {
    setEditingFormulaKey(null)
    setFormulaEditValue('')
    setFormulaValidation({ valid: true })
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium">Failed to load data file</p>
        <p className="text-xs opacity-80">{error}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button size="sm" onClick={seedTemplate} disabled={busy}>
            Seed with starter
          </Button>
        </div>
      </div>
    )
  }

  const handleExportCsv = () => {
    if (!columns.length) return
    const csv = toCsv(columns, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const summaryDetail = search.trim() ? `${filteredRows.length} of ${rows.length}` : `${rows.length}`

  const StatChip = ({ label, value }: { label: string; value: string }) => (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <span className="text-xs text-foreground">{value}</span>
      {label}
    </span>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{fileName ?? 'Data file'}</span>
          {selectedType && (
            <>
              <span>•</span>
              <span>{selectedType}</span>
            </>
          )}
          <span>•</span>
          <span>{rows.length} rows</span>
          <span>•</span>
          <span>{columns.length} columns</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo/Redo buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border/50 mx-1" />

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Unsaved</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Saved</span>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-border/50 mx-1" />

          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reload
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-1.5 bg-muted/20">
        <button
          type="button"
          onClick={() => setViewMode('data')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'data'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}>
          <List className="h-3.5 w-3.5" />
          Data
        </button>

        {showEntityTab && (
          <button
            type="button"
            onClick={() => setViewMode('entity')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'entity'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}>
            <Users className="h-3.5 w-3.5" />
            {entityTabLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => setViewMode('insights')}
          disabled={computedFields.length === 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'insights'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            computedFields.length === 0 && 'opacity-50 cursor-not-allowed',
          )}>
          <Sparkles className="h-3.5 w-3.5" />
          Insights
          {computedFields.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {computedFields.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('source')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'source'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}>
          <Braces className="h-3.5 w-3.5" />
          Source
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DATA VIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'data' && (
        <>
          {/* Secondary toolbar with filters and actions */}
          <div className="border-b border-border/60 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatChip label="rows" value={summaryDetail} />
                <StatChip label="columns" value={`${columns.length}`} />
                {types.length > 1 && <StatChip label="types" value={`${types.length}`} />}
                {lastUpdated && (
                  <span className="text-[11px] text-muted-foreground">
                    Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {types.length > 1 && (
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rows..."
                    className="h-8 w-44 rounded-md bg-muted/40 pl-8 text-xs"
                    aria-label="Search rows"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSearch('')}>
                      ✕
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleAddRow}
                  disabled={!selectedType || dataArrayKey === '@single'}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
                {/* <Button variant="outline" size="sm" className="h-7 px-2 gap-1.5" onClick={handleValidate}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Validate References
                </Button> */}
                {/* <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleExportCsv}
                  disabled={!rows.length}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button> */}
              </div>
            </div>
          </div>

          {/* Table view */}
          <div className="flex-1 overflow-auto px-0">
            <Table className="text-xs font-mono table-fixed w-full">
              <TableHeader className="sticky top-0 z-10 bg-card supports-backdrop-filter:bg-background/70">
                <TableRow>
                  <TableHead className="w-10 text-[10px] text-muted-foreground">#</TableHead>
                  {columns.map((col) => {
                    const colType = inferColumnType(rows, col, knownIds)
                    const numberFormat = colType === 'number' ? detectNumberFormat(col) : null

                    // Get icon based on type and number format
                    let TypeIcon
                    if (colType === 'number') {
                      TypeIcon = numberFormat === 'currency' ? DollarSign : numberFormat === 'percent' ? Percent : Hash
                    } else {
                      TypeIcon = {
                        text: Type,
                        email: Mail,
                        phone: Phone,
                        url: Link2,
                        date: Calendar,
                        boolean: CheckCircle,
                        array: List,
                        reference: Link2,
                        person: Users,
                        select: ChevronDown,
                        multiselect: List,
                        status: Sparkles,
                        formula: Hash,
                        files: ExternalLink,
                        created_time: Calendar,
                        last_edited_time: Calendar,
                        color: Paintbrush,
                        palette: Palette,
                        font: Type,
                      }[colType]
                    }
                    const isProtected = ['id', '@id', 'slug'].includes(col.toLowerCase())
                    return (
                      <TableHead
                        key={col}
                        className="text-xs tracking-wide text-muted-foreground relative group/header sticky top-0 z-10"
                        style={{ width: columnWidths[col] || 'auto', minWidth: 60 }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 pr-2 hover:text-foreground transition-colors w-full text-left">
                              {TypeIcon && <TypeIcon className="h-3 w-3 opacity-60" />}
                              {col}
                              <ChevronDown className="h-2.5 w-2.5 opacity-0 group-hover/header:opacity-60 transition-opacity ml-auto" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameColumnFrom(col)
                                setRenameColumnTo(col)
                                setShowRenameDialog(true)
                              }}
                              disabled={isProtected}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteColumn(col)}
                              disabled={isProtected}
                              className="text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Resize handle */}
                        <div
                          className={cn(
                            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
                            resizingColumn === col && 'bg-primary',
                          )}
                          onMouseDown={(e) => handleResizeStart(col, e)}
                        />
                      </TableHead>
                    )
                  })}
                  {/* Add Column button */}
                  <TableHead className="w-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowAddColumnDialog(true)}
                      title="Add column">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 2}
                      className="py-10 text-center text-muted-foreground font-sans text-xs">
                      No rows found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredRows.map((row, idx) => {
                  const rowId = row['@id'] || row['id'] || ''
                  const isHighlighted = highlightedEntityId === rowId
                  return (
                    <TableRow
                      key={rowId || idx}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      className={cn(
                        'group border-border/60 transition-colors duration-300',
                        isHighlighted && 'animate-highlight-pulse bg-primary/20',
                      )}>
                      <TableCell className="w-10 text-[10px] text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                      {columns.map((col) => (
                        <TableCell
                          key={col}
                          className="align-top text-foreground p-2"
                          style={{
                            width: columnWidths[col] || 'auto',
                            minWidth: columnWidths[col] || 100,
                            maxWidth: columnWidths[col] || 320,
                          }}>
                          <div className="overflow-hidden">
                            <EditableCell
                              rawValue={row[col]}
                              columnName={col}
                              referenceOptions={referenceOptions}
                              arrayOptions={columnUniqueValues[col] || []}
                              columnSchema={doc?.['@schema']?.[col]}
                              onSave={(newValue) => handleCellEdit(rowId, col, newValue)}
                              onCreateEntity={handleCreateEntity}
                              onNavigate={handleNavigateToReference}
                            />
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="w-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRow(rowId)}
                          title="Delete row">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          INSIGHTS VIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'insights' && (
        <div className="flex-1 overflow-auto p-4">
          {computedFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No computed fields in this document</p>
              <p className="text-xs mt-1 mb-4">Add @expr fields to see insights</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newKey = prompt('Enter formula name (e.g., total, average):')
                  if (newKey) {
                    handleAddFormula(newKey, '$count([])')
                    startEditingFormula(newKey, '$count([])')
                  }
                }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Formula
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Insights
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {computedFields.length} computed field{computedFields.length !== 1 ? 's' : ''} from @expr
                    expressions
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newKey = prompt('Enter formula name (e.g., total, average):')
                    if (newKey) {
                      handleAddFormula(newKey, '$count([])')
                      startEditingFormula(newKey, '$count([])')
                    }
                  }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Formula
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {computedFields
                  .map((field) => {
                    const vizType = detectVizType(field.key, field.value)
                    const Icon = getComputedFieldIcon(field.key)
                    const isProgress = vizType === 'progress'
                    const progressValue =
                      isProgress && typeof field.value === 'number'
                        ? field.value <= 1
                          ? field.value * 100
                          : field.value
                        : 0
                    const isEditing = editingFormulaKey === field.key

                    // Skip "Formatted" fields if we have the raw value
                    if (field.key.endsWith('Formatted')) {
                      const rawKey = field.key.replace('Formatted', '')
                      if (computedFields.some((f) => f.key === rawKey)) {
                        return null
                      }
                    }

                    return (
                      <div
                        key={field.key}
                        className={cn(
                          'group relative p-4 rounded-xl border transition-all duration-200',
                          isEditing
                            ? 'border-primary shadow-lg ring-2 ring-primary/20'
                            : 'hover:shadow-md hover:border-border',
                          field.error && !isEditing
                            ? 'border-destructive/50 bg-destructive/5'
                            : !isEditing && 'border-border/40 bg-card hover:bg-card/80',
                        )}>
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteFormula(field.key)}
                          title="Delete formula">
                          <Trash2 className="h-3 w-3" />
                        </Button>

                        {/* Header with icon and label */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn('p-2 rounded-lg', field.error ? 'bg-destructive/10' : 'bg-primary/10')}>
                            <Icon className={cn('h-4 w-4', field.error ? 'text-destructive' : 'text-primary')} />
                          </div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {field.key
                              .replace(/Formatted$/, '')
                              .replace(/([A-Z])/g, ' $1')
                              .trim()}
                          </span>
                        </div>

                        {/* Value display */}
                        {field.error && !isEditing ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Evaluation error</span>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-2xl leading-tight mb-2">
                              {isEditing && formulaValidation.valid && formulaValidation.value !== undefined
                                ? typeof formulaValidation.value === 'string'
                                  ? formulaValidation.value
                                  : typeof formulaValidation.value === 'number'
                                    ? vizType === 'currency'
                                      ? exprHelpers.$currency(formulaValidation.value)
                                      : vizType === 'progress' || vizType === 'percentage'
                                        ? exprHelpers.$percent(
                                            formulaValidation.value <= 1
                                              ? formulaValidation.value
                                              : formulaValidation.value / 100,
                                          )
                                        : formulaValidation.value.toLocaleString()
                                    : String(formulaValidation.value)
                                : typeof field.value === 'string'
                                  ? field.value
                                  : typeof field.value === 'number'
                                    ? vizType === 'currency'
                                      ? exprHelpers.$currency(field.value)
                                      : vizType === 'progress' || vizType === 'percentage'
                                        ? exprHelpers.$percent(field.value <= 1 ? field.value : field.value / 100)
                                        : field.value.toLocaleString()
                                    : String(field.value)}
                            </div>

                            {/* Progress bar for percentage values */}
                            {isProgress && typeof field.value === 'number' && (
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    progressValue >= 80
                                      ? 'bg-green-500'
                                      : progressValue >= 50
                                        ? 'bg-primary'
                                        : progressValue >= 25
                                          ? 'bg-amber-500'
                                          : 'bg-red-500',
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {/* Editable expression area */}
                        <div className="mt-3 pt-3 border-t border-border/30">
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                autoFocus
                                value={formulaEditValue}
                                onChange={(e) => setFormulaEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    if (formulaValidation.valid) {
                                      handleFormulaEdit(field.key, formulaEditValue)
                                    }
                                  } else if (e.key === 'Escape') {
                                    cancelEditingFormula()
                                  }
                                }}
                                className={cn(
                                  'w-full px-2 py-1.5 text-xs font-mono rounded-md border resize-none',
                                  'bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
                                  formulaValidation.valid
                                    ? 'border-green-500/50 focus:border-green-500'
                                    : 'border-destructive/50 focus:border-destructive',
                                )}
                                rows={2}
                                placeholder="Enter formula..."
                              />
                              {/* Validation status */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  {formulaValidation.valid ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                      <span className="text-green-600">Valid</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-3 w-3 text-destructive" />
                                      <span
                                        className="text-destructive truncate max-w-[150px]"
                                        title={formulaValidation.error}>
                                        {formulaValidation.error}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={cancelEditingFormula}>
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    disabled={!formulaValidation.valid}
                                    onClick={() => handleFormulaEdit(field.key, formulaEditValue)}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="group/expr flex items-center gap-2 cursor-pointer hover:bg-muted/50 -mx-2 -mb-2 p-2 rounded-b-lg transition-colors"
                              onClick={() => startEditingFormula(field.key, field.expr)}
                              title="Click to edit formula">
                              <code className="text-[10px] text-muted-foreground/70 font-mono truncate flex-1">
                                {field.expr}
                              </code>
                              <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover/expr:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SOURCE VIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'source' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Source error banner */}
          {sourceError && (
            <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2 border-b border-destructive/20">
              <AlertCircle className="h-3.5 w-3.5" />
              {sourceError}
            </div>
          )}

          {/* Full-height code viewer */}
          <div className="flex-1 overflow-hidden">
            <CodeViewer
              filePath={filePath}
              extension="json"
              maxBytes={5 * 1024 * 1024}
              content={sourceValue || undefined}
              onContentChange={handleSourceChange}
            />
          </div>
        </div>
      )}

      {viewMode === 'entity' && showEntityTab && doc && (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {(doc as any).name ||
                    (doc as any).title ||
                    (doc as any).label ||
                    (doc as any)['@id'] ||
                    (doc as any).id ||
                    'Untitled'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {Array.isArray((doc as any)['@type']) ? (doc as any)['@type'].join(', ') : (doc as any)['@type']}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">{(doc as any)['@id'] || (doc as any).id}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {columns.map((key) => {
                const rawValue = (doc as any)[key]
                const isArray = Array.isArray(rawValue)
                const isObject = typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)

                const renderString = (value: string) => {
                  const looksLikeLink =
                    value.startsWith('http://') ||
                    value.startsWith('https://') ||
                    value.includes(':') ||
                    value.includes('/') ||
                    value.endsWith('.note')
                  if (!looksLikeLink) return <span className="text-sm">{value}</span>
                  return <EntityLink target={value} />
                }

                const renderValue = () => {
                  if (rawValue == null || rawValue === '') return <span className="text-muted-foreground">—</span>
                  if (isArray) {
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {rawValue.map((v: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border/60">
                            {typeof v === 'string' ? renderString(v) : normalizeValue(v)}
                          </span>
                        ))}
                      </div>
                    )
                  }
                  if (isObject) {
                    return (
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
                        {JSON.stringify(rawValue, null, 2)}
                      </pre>
                    )
                  }
                  if (typeof rawValue === 'string') return renderString(rawValue)
                  return <span className="text-sm">{normalizeValue(rawValue)}</span>
                }

                return (
                  <div key={key} className="rounded-md border border-border/60 bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{key}</div>
                    <div className="text-sm">{renderValue()}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reference Validation</DialogTitle>
            <DialogDescription>
              {missingRefs.length > 0
                ? 'The following references do not exist in the vault. Select items to automatically create them.'
                : 'All references in this document are valid and resolve to existing entities.'}
            </DialogDescription>
          </DialogHeader>

          {missingRefs.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-md mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox
                        checked={missingRefs.every((r) => r.selected)}
                        onCheckedChange={(checked) =>
                          setMissingRefs((prev) => prev.map((r) => ({ ...r, selected: !!checked })))
                        }
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Target File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingRefs.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell>
                        <Checkbox
                          checked={ref.selected}
                          onCheckedChange={(checked) =>
                            setMissingRefs((prev) =>
                              prev.map((r) => (r.id === ref.id ? { ...r, selected: !!checked } : r)),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ref.id}</TableCell>
                      <TableCell>
                        <Input
                          value={ref.name}
                          onChange={(e) =>
                            setMissingRefs((prev) =>
                              prev.map((r) => (r.id === ref.id ? { ...r, name: e.target.value } : r)),
                            )
                          }
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground p-0">
                        <Select
                          value={ref.suggestedFile}
                          onValueChange={(value) =>
                            setMissingRefs((prev) =>
                              prev.map((r) => (r.id === ref.id ? { ...r, suggestedFile: value } : r)),
                            )
                          }>
                          <SelectTrigger className="h-7 text-xs border-0 shadow-none hover:bg-muted/50 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Set([
                                ...referenceOptions
                                  .map((o) => o.sourceFile)
                                  .filter((f): f is string => !!f && f !== 'current'),
                                'new-entities.data',
                                '@finance/accounts.data',
                                '@finance/bills.data',
                                '@finance/goals.data',
                                '@finance/transactions.data',
                                '@finance/income.data',
                                '@finance/insurance.data',
                                '@company/team-members.data',
                                '@company/organizations.data',
                                '@projects/active.data',
                                '@tasks/backlog.data',
                              ]),
                            )
                              .sort()
                              .map((file) => (
                                <SelectItem key={file} value={file} className="text-xs">
                                  {file}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowValidateDialog(false)}>
              {missingRefs.length > 0 ? 'Cancel' : 'Close'}
            </Button>
            {missingRefs.length > 0 && (
              <Button onClick={handleCreateMissing} disabled={!missingRefs.some((r) => r.selected)}>
                Create {missingRefs.filter((r) => r.selected).length} Entities
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>Define a new property for all items in this collection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input
                placeholder="e.g., priority, due_date, status"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newColumnName.trim()) {
                    handleAddColumn()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Will be converted to lowercase with underscores (e.g., "Due Date" → "due_date")
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={newColumnType} onValueChange={(v) => setNewColumnType(v as CellType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* Basic Types */}
                  <SelectItem value="text">
                    <span className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5" /> Text
                    </span>
                  </SelectItem>
                  <SelectItem value="number">
                    <span className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5" /> Number
                    </span>
                  </SelectItem>
                  <SelectItem value="boolean">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5" /> Checkbox
                    </span>
                  </SelectItem>
                  <SelectItem value="date">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> Date
                    </span>
                  </SelectItem>
                  {/* Choice Types */}
                  <SelectItem value="select">
                    <span className="flex items-center gap-2">
                      <ChevronDown className="h-3.5 w-3.5" /> Select
                    </span>
                  </SelectItem>
                  <SelectItem value="multiselect">
                    <span className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5" /> Multi-select
                    </span>
                  </SelectItem>
                  <SelectItem value="status">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" /> Status
                    </span>
                  </SelectItem>
                  {/* Reference Types */}
                  <SelectItem value="reference">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5" /> Relation
                    </span>
                  </SelectItem>
                  <SelectItem value="person">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Person
                    </span>
                  </SelectItem>
                  {/* Contact Types */}
                  <SelectItem value="email">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                  </SelectItem>
                  <SelectItem value="phone">
                    <span className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </span>
                  </SelectItem>
                  <SelectItem value="url">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5" /> URL
                    </span>
                  </SelectItem>
                  {/* Design Types */}
                  <SelectItem value="color">
                    <span className="flex items-center gap-2">
                      <Paintbrush className="h-3.5 w-3.5" /> Color
                    </span>
                  </SelectItem>
                  <SelectItem value="palette">
                    <span className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5" /> Palette
                    </span>
                  </SelectItem>
                  <SelectItem value="font">
                    <span className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5" /> Font
                    </span>
                  </SelectItem>
                  {/* Advanced Types */}
                  <SelectItem value="formula">
                    <span className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5" /> Formula
                    </span>
                  </SelectItem>
                  <SelectItem value="files">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" /> Files & Media
                    </span>
                  </SelectItem>
                  {/* Auto Types */}
                  <SelectItem value="created_time">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> Created Time
                    </span>
                  </SelectItem>
                  <SelectItem value="last_edited_time">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> Last Edited
                    </span>
                  </SelectItem>
                  {/* Legacy */}
                  <SelectItem value="array">
                    <span className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5" /> Tags (Array)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Reference type constraint */}
            {(newColumnType === 'reference' || newColumnType === 'person') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Type (optional)</label>
                <Select value={newColumnRefType} onValueChange={setNewColumnRefType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any entity type</SelectItem>
                    {availableEntityTypes.map((ns) => (
                      <SelectItem key={ns} value={ns}>
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 opacity-60" />
                          {NAMESPACE_LABELS[ns] || ns}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Limit this reference to a specific entity type (e.g., only People)
                </p>
              </div>
            )}
            {!['array', 'reference', 'person', 'palette', 'font'].includes(newColumnType) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Value (optional)</label>
                {newColumnType === 'boolean' ? (
                  <Select value={newColumnDefault} onValueChange={setNewColumnDefault}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select default..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No default</SelectItem>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : newColumnType === 'date' ? (
                  <Input type="date" value={newColumnDefault} onChange={(e) => setNewColumnDefault(e.target.value)} />
                ) : (
                  <Input
                    placeholder={newColumnType === 'number' ? '0' : 'Leave empty for null'}
                    value={newColumnDefault}
                    onChange={(e) => setNewColumnDefault(e.target.value)}
                    type={newColumnType === 'number' ? 'number' : 'text'}
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Column Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
            <DialogDescription>Rename "{renameColumnFrom}" to a new name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="New column name"
              value={renameColumnTo}
              onChange={(e) => setRenameColumnTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameColumnTo.trim()) {
                  handleRenameColumn()
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">Will be converted to lowercase with underscores</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameColumn} disabled={!renameColumnTo.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Check if a reference ID is resolved (exists in the available options)
function isReferenceResolved(refId: string, options: ReferenceOption[]): boolean {
  if (!refId || refId.trim() === '') return true // Empty is not "unresolved"
  return options.some((opt) => opt.id === refId)
}

// Infer type from reference ID prefix (e.g., "person:1" -> "Person")
function inferTypeFromId(refId: string): string {
  const match = refId.match(/^([a-z]+):/i)
  if (match) {
    // Capitalize first letter
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
  }
  return 'Item'
}

// Editable cell component with type-specific inputs
interface EditableCellProps {
  rawValue: any
  columnName: string
  referenceOptions: ReferenceOption[]
  arrayOptions: string[]
  columnSchema?: ColumnSchema // Schema metadata for this column
  onSave: (newValue: any) => void
  onCreateEntity?: (id: string, type: string) => void
  onNavigate?: (filePath: string) => void
}

function EditableCell({
  rawValue,
  columnName,
  referenceOptions,
  arrayOptions,
  columnSchema,
  onSave,
  onCreateEntity,
  onNavigate,
}: EditableCellProps) {
  // Use schema type if available, otherwise detect
  const cellType = columnSchema?.type || detectCellType(rawValue, columnName)

  // Filter reference options by refType if schema specifies one
  const filteredReferenceOptions = React.useMemo(() => {
    if (!columnSchema?.refType) return referenceOptions
    return referenceOptions.filter((opt) => opt.namespace === columnSchema.refType)
  }, [referenceOptions, columnSchema?.refType])
  const displayValue = normalizeValue(rawValue)

  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(displayValue)
  const [arrayValue, setArrayValue] = React.useState<string[]>(
    Array.isArray(rawValue) ? rawValue.map(normalizeValue) : [],
  )
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [refSearchQuery, setRefSearchQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const refInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  React.useEffect(() => {
    if (popoverOpen && refInputRef.current) {
      refInputRef.current.focus()
    }
  }, [popoverOpen])

  React.useEffect(() => {
    setEditValue(displayValue)
    setArrayValue(Array.isArray(rawValue) ? rawValue.map(normalizeValue) : [])
  }, [rawValue, displayValue])

  const handleSave = () => {
    if (editValue !== displayValue) {
      // Convert back to appropriate type
      if (cellType === 'number') {
        onSave(Number(editValue))
      } else if (cellType === 'boolean') {
        onSave(editValue === 'true')
      } else {
        onSave(editValue)
      }
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(displayValue)
      setIsEditing(false)
    }
  }

  // Boolean: render as switch
  if (cellType === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={rawValue === true} onCheckedChange={(checked) => onSave(checked)} className="scale-90" />
        <span className="text-xs text-muted-foreground">{rawValue ? 'Yes' : 'No'}</span>
      </div>
    )
  }

  // Array: render as multi-select popover
  if (cellType === 'array') {
    const toggleArrayItem = (item: string) => {
      const newArray = arrayValue.includes(item) ? arrayValue.filter((v) => v !== item) : [...arrayValue, item]
      setArrayValue(newArray)
      onSave(newArray)
    }

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded hover:bg-muted/50 text-left min-w-[80px]"
            aria-label="Edit array values">
            <div className="flex-1 flex flex-wrap gap-1">
              {arrayValue.length > 0 ? (
                arrayValue.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium">
                    {v}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground/50 italic text-xs">empty</span>
              )}
            </div>
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Select values</p>
            {arrayOptions.length > 0 ? (
              arrayOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={arrayValue.includes(option)} onCheckedChange={() => toggleArrayItem(option)} />
                  <span className="text-xs">{option}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-muted-foreground px-2">No options available</p>
            )}
            <div className="border-t border-border/50 pt-2 mt-2">
              <Input
                placeholder="Add new value..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget
                    const newVal = input.value.trim()
                    if (newVal && !arrayValue.includes(newVal)) {
                      const newArray = [...arrayValue, newVal]
                      setArrayValue(newArray)
                      onSave(newArray)
                      input.value = ''
                    }
                  }
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Reference types: render as autocomplete with search
  // Includes: reference, person, palette, font
  if (['reference', 'person', 'palette', 'font'].includes(cellType)) {
    // Check if current reference is resolved (check full list, not filtered)
    const isResolved = isReferenceResolved(displayValue, referenceOptions)
    const inferredType = !isResolved && displayValue ? inferTypeFromId(displayValue) : null

    // Get the display name for the reference (name/title instead of ID)
    const matchingOption = referenceOptions.find((opt) => opt.id === displayValue)
    // Only use label if it's different from the ID (meaning we found a real name)
    const refDisplayName =
      matchingOption?.label && matchingOption.label !== matchingOption.id ? matchingOption.label : displayValue

    // Filter options based on search query (use filtered options if refType constraint)
    const filteredOptions = refSearchQuery.trim()
      ? filteredReferenceOptions.filter(
          (opt) =>
            opt.id.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
            opt.label.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
            opt.type?.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
            opt.sourceFile?.toLowerCase().includes(refSearchQuery.toLowerCase()),
        )
      : filteredReferenceOptions

    // Group options by namespace for accordion display
    const groupedByNamespace = filteredOptions.reduce(
      (acc, opt) => {
        const ns = opt.namespace || 'other'
        if (!acc[ns]) acc[ns] = []
        acc[ns].push(opt)
        return acc
      },
      {} as Record<string, ReferenceOption[]>,
    )

    // Sort namespaces with common ones first
    const namespaceOrder = [
      'person',
      'org',
      'proj',
      'task',
      'acc',
      'goal',
      'ms',
      'tx',
      'bill',
      'sub',
      'annual',
      'cat',
      'inc',
      'ins',
      'note',
      'file',
      'other',
    ]
    const sortedNamespaces = Object.keys(groupedByNamespace).sort((a, b) => {
      const aIdx = namespaceOrder.indexOf(a)
      const bIdx = namespaceOrder.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    return (
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          setPopoverOpen(open)
          if (!open) setRefSearchQuery('')
        }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded hover:bg-muted/50 text-left min-w-[80px] group/ref',
              !isResolved && displayValue && 'bg-amber-500/10 hover:bg-amber-500/20',
              isResolved && displayValue && 'bg-primary/5 hover:bg-primary/10',
            )}
            aria-label="Select reference">
            {!isResolved && displayValue && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
            {isResolved && displayValue && <Link2 className="h-3 w-3 text-primary/60 shrink-0" />}
            <span
              className={cn(
                'flex-1 truncate',
                !isResolved && displayValue && 'text-amber-600 dark:text-amber-400',
                isResolved && displayValue && 'text-primary/80 dark:text-primary/70',
              )}>
              {refDisplayName || <span className="text-muted-foreground/50 italic">none</span>}
            </span>
            {/* Navigate icon for resolved references (using span to avoid nested button) */}
            {isResolved && matchingOption?.sourceFile && onNavigate && (
              <span
                role="button"
                tabIndex={0}
                className="h-4 w-4 p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary opacity-0 group-hover/ref:opacity-100 transition-opacity cursor-pointer inline-flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onNavigate(matchingOption.sourceFile!)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    e.preventDefault()
                    onNavigate(matchingOption.sourceFile!)
                  }
                }}
                title={`Go to ${matchingOption.sourceFile}`}>
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
            {/* Backlinks badge - shows how many files reference this entity */}
            {isResolved && displayValue && (
              <div
                className="opacity-0 group-hover/ref:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}>
                <BacklinksBadge targetId={displayValue} onNavigate={onNavigate} />
              </div>
            )}
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {/* Search input */}
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={refInputRef}
                value={refSearchQuery}
                onChange={(e) => setRefSearchQuery(e.target.value)}
                placeholder="Search references..."
                className="h-8 pl-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    onSave(filteredOptions[0].id)
                    setPopoverOpen(false)
                    setRefSearchQuery('')
                  } else if (e.key === 'Escape') {
                    setPopoverOpen(false)
                    setRefSearchQuery('')
                  }
                }}
              />
            </div>
          </div>

          {/* Options list grouped by namespace */}
          <div className="max-h-80 overflow-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                {refSearchQuery ? 'No matches found' : 'No references available'}
              </p>
            ) : (
              <Accordion type="multiple" className="w-full" defaultValue={sortedNamespaces.slice(0, 3)}>
                {sortedNamespaces.map((ns) => {
                  const options = groupedByNamespace[ns]
                  const nsLabel = NAMESPACE_LABELS[ns] || ns.charAt(0).toUpperCase() + ns.slice(1)
                  return (
                    <AccordionItem key={ns} value={ns} className="border-b-0">
                      <AccordionTrigger className="px-2 py-1.5 hover:no-underline hover:bg-muted/50 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{nsLabel}</span>
                          <span className="text-muted-foreground text-[10px]">({options.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="pl-2">
                          {options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={cn(
                                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-muted/50',
                                displayValue === option.id && 'bg-primary/10',
                              )}
                              onClick={() => {
                                onSave(option.id)
                                setPopoverOpen(false)
                                setRefSearchQuery('')
                              }}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {displayValue === option.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                                  <span className="truncate font-medium">{option.label}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate font-mono opacity-60">
                                  {option.id}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>

          {/* Unresolved reference: Create entity option */}
          {!isResolved && displayValue && onCreateEntity && (
            <div className="border-t border-amber-500/30 bg-amber-500/5 p-1">
              <div className="px-2 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Unresolved Reference
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                onClick={() => {
                  onCreateEntity(displayValue, inferredType || 'Item')
                  setPopoverOpen(false)
                  setRefSearchQuery('')
                }}>
                <Plus className="h-3.5 w-3.5" />
                Create "{displayValue}" as {inferredType || 'Item'}
              </button>
            </div>
          )}

          {/* Clear button */}
          {displayValue && (
            <div className="border-t border-border/50 p-1">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted/50 text-muted-foreground"
                onClick={() => {
                  onSave('')
                  setPopoverOpen(false)
                  setRefSearchQuery('')
                }}>
                <X className="h-3.5 w-3.5" />
                Clear reference
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Date: render as calendar popover
  if (cellType === 'date') {
    const dateValue = displayValue
      ? (() => {
          try {
            const d = parseISO(displayValue)
            return isValid(d) ? d : undefined
          } catch {
            return undefined
          }
        })()
      : undefined

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded hover:bg-muted/50 text-left min-w-[100px]"
            aria-label="Select date">
            <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">
              {dateValue ? (
                format(dateValue, 'MMM d, yyyy')
              ) : (
                <span className="text-muted-foreground/50 italic">Pick date</span>
              )}
            </span>
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              if (date) {
                const isoDate = format(date, 'yyyy-MM-dd')
                onSave(isoDate)
              }
              setPopoverOpen(false)
            }}
            initialFocus
          />
          {displayValue && (
            <div className="border-t border-border/50 p-2">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-muted/50 text-muted-foreground"
                onClick={() => {
                  onSave('')
                  setPopoverOpen(false)
                }}>
                <X className="h-3.5 w-3.5" />
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Nested object: render with expandable popover
  if (isNestedObject(rawValue)) {
    const objectEntries = Object.entries(rawValue as Record<string, any>).filter(([key]) => !key.startsWith('@'))

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded hover:bg-muted/50 text-left w-full group"
            aria-label="View nested object">
            <Braces className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate text-xs">{displayValue}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="px-3 py-2 border-b border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Braces className="h-3 w-3" />
              {columnName}
            </div>
          </div>
          <div className="p-2 space-y-1.5 max-h-64 overflow-auto">
            {objectEntries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0 min-w-[80px] text-xs font-medium">{key}:</span>
                <span className="text-foreground break-words">
                  {typeof val === 'object' && val !== null ? formatNestedObject(val) : String(val ?? '')}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Number: detect format and render with formatting
  const numberFormat = cellType === 'number' ? detectNumberFormat(columnName) : null

  // Editing mode for text-based types
  if (isEditing) {
    // Number input
    if (cellType === 'number') {
      return (
        <div className="flex items-center gap-1">
          {numberFormat === 'currency' && <span className="text-muted-foreground text-xs">$</span>}
          <Input
            ref={inputRef}
            type="number"
            step="any"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs px-1.5 w-28"
          />
          {numberFormat === 'percent' && <span className="text-muted-foreground text-xs">%</span>}
        </div>
      )
    }

    // Email input
    if (cellType === 'email') {
      return (
        <Input
          ref={inputRef}
          type="email"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1.5"
          placeholder="email@example.com"
        />
      )
    }

    // Phone input
    if (cellType === 'phone') {
      return (
        <Input
          ref={inputRef}
          type="tel"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1.5"
          placeholder="+1 (555) 000-0000"
        />
      )
    }

    // URL input
    if (cellType === 'url') {
      return (
        <Input
          ref={inputRef}
          type="url"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1.5"
          placeholder="https://"
        />
      )
    }

    // Color picker input
    if (cellType === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={editValue || '#000000'}
            onChange={(e) => {
              setEditValue(e.target.value)
            }}
            onBlur={() => handleSave()}
            className="h-6 w-6 p-0 border border-border rounded cursor-pointer bg-transparent"
          />
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs px-1.5 font-mono w-24"
            placeholder="#000000"
          />
        </div>
      )
    }

    // Default text input
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs px-1.5"
      />
    )
  }

  // Display mode with formatting
  let formattedDisplayValue: React.ReactNode = displayValue

  // Format numbers - handle empty/null values for percent columns
  if (cellType === 'number') {
    if (typeof rawValue === 'number') {
      formattedDisplayValue = formatNumber(rawValue, numberFormat || 'plain')
    } else if (numberFormat === 'percent' && (rawValue === null || rawValue === undefined || rawValue === '')) {
      // Empty percent columns default to 0%
      formattedDisplayValue = '0%'
    }
  }

  // Detect and render hex colors with a swatch (explicit color type OR auto-detected hex)
  const isHexColor = typeof displayValue === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(displayValue)
  if (cellType === 'color' || isHexColor) {
    const colorValue = isHexColor ? displayValue : '#808080' // Default gray for invalid
    formattedDisplayValue = (
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-4 h-4 rounded border border-border/50 shrink-0"
          style={{ backgroundColor: colorValue }}
          title={displayValue}
        />
        <span className="font-mono text-[10px] uppercase">{displayValue || 'none'}</span>
      </span>
    )
  }

  return (
    <span
      className="cursor-text hover:bg-muted/50 px-1 py-0.5 rounded -mx-1 block min-h-[1.5em] truncate"
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
      tabIndex={0}
      role="button"
      title={typeof formattedDisplayValue === 'string' ? formattedDisplayValue : displayValue}
      aria-label="Click to edit">
      {formattedDisplayValue || <span className="text-muted-foreground/50 italic">empty</span>}
    </span>
  )
}
