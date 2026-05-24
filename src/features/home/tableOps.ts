import { DEFAULT_TABLE_CONTENT, type TableContent } from './types'

function toStringCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  return typeof v === 'string' ? v : String(v)
}

export function normalizeTableContent(input: unknown): TableContent {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

  const rawHeaders = Array.isArray(obj.headers) ? (obj.headers as unknown[]) : DEFAULT_TABLE_CONTENT.headers
  let headers = rawHeaders.map(toStringCell).filter((h) => typeof h === 'string')
  if (headers.length === 0) headers = ['Column 1']

  const rawRows = Array.isArray(obj.rows) ? (obj.rows as unknown[]) : DEFAULT_TABLE_CONTENT.rows
  let rows = rawRows
    .map((r) => (Array.isArray(r) ? (r as unknown[]).map(toStringCell) : headers.map(() => '')))
    .map((r) => {
      if (r.length < headers.length) return [...r, ...Array(headers.length - r.length).fill('')]
      if (r.length > headers.length) return r.slice(0, headers.length)
      return r
    })

  if (rows.length === 0) rows = [headers.map(() => '')]

  return { headers, rows }
}

export function setTableCell(table: TableContent, rowIndex: number, colIndex: number, value: string): TableContent {
  const t = normalizeTableContent(table)
  if (rowIndex < 0 || rowIndex >= t.rows.length) throw new Error(`rowIndex out of bounds: ${rowIndex}`)
  if (colIndex < 0 || colIndex >= t.headers.length) throw new Error(`colIndex out of bounds: ${colIndex}`)

  const rows = t.rows.map((row, ri) => (ri === rowIndex ? row.map((c, ci) => (ci === colIndex ? value : c)) : row))
  return { headers: t.headers, rows }
}

export function setTableHeader(table: TableContent, colIndex: number, header: string): TableContent {
  const t = normalizeTableContent(table)
  if (colIndex < 0 || colIndex >= t.headers.length) throw new Error(`colIndex out of bounds: ${colIndex}`)

  const headers = t.headers.map((h, i) => (i === colIndex ? header : h))
  return { headers, rows: t.rows }
}

export function addTableRow(table: TableContent, index: number | null, values: string[] | null): TableContent {
  const t = normalizeTableContent(table)

  const row = (values ?? []).map(toStringCell)
  const normalizedRow =
    row.length < t.headers.length
      ? [...row, ...Array(t.headers.length - row.length).fill('')]
      : row.slice(0, t.headers.length)

  const insertAt = index === null || index === undefined ? t.rows.length : index
  if (insertAt < 0 || insertAt > t.rows.length) throw new Error(`row insert index out of bounds: ${insertAt}`)

  const rows = [...t.rows.slice(0, insertAt), normalizedRow, ...t.rows.slice(insertAt)]
  return { headers: t.headers, rows }
}

export function removeTableRow(table: TableContent, index: number): TableContent {
  const t = normalizeTableContent(table)
  if (t.rows.length <= 1) throw new Error('cannot remove the last remaining row')
  if (index < 0 || index >= t.rows.length) throw new Error(`rowIndex out of bounds: ${index}`)

  const rows = t.rows.filter((_, i) => i !== index)
  return { headers: t.headers, rows }
}

export function addTableColumn(
  table: TableContent,
  index: number | null,
  header: string | null,
  values: string[] | null,
): TableContent {
  const t = normalizeTableContent(table)

  const insertAt = index === null || index === undefined ? t.headers.length : index
  if (insertAt < 0 || insertAt > t.headers.length) throw new Error(`column insert index out of bounds: ${insertAt}`)

  const nextHeader = header ?? `Column ${t.headers.length + 1}`
  const headers = [...t.headers.slice(0, insertAt), nextHeader, ...t.headers.slice(insertAt)]

  const nextValues = values ?? []
  const rows = t.rows.map((row, ri) => {
    const v = ri < nextValues.length ? toStringCell(nextValues[ri]) : ''
    return [...row.slice(0, insertAt), v, ...row.slice(insertAt)]
  })

  return { headers, rows }
}

export function removeTableColumn(table: TableContent, index: number): TableContent {
  const t = normalizeTableContent(table)
  if (t.headers.length <= 1) throw new Error('cannot remove the last remaining column')
  if (index < 0 || index >= t.headers.length) throw new Error(`colIndex out of bounds: ${index}`)

  const headers = t.headers.filter((_, i) => i !== index)
  const rows = t.rows.map((row) => row.filter((_, i) => i !== index))
  return normalizeTableContent({ headers, rows })
}
