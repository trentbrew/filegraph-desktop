import { describe, expect, it } from 'vitest'
import {
  addTableColumn,
  addTableRow,
  normalizeTableContent,
  removeTableColumn,
  removeTableRow,
  setTableCell,
  setTableHeader,
} from './tableOps'

describe('tableOps', () => {
  it('normalizes empty input', () => {
    const t = normalizeTableContent(null)
    expect(Array.isArray(t.headers)).toBe(true)
    expect(Array.isArray(t.rows)).toBe(true)
    expect(t.headers.length).toBeGreaterThan(0)
    expect(t.rows.length).toBeGreaterThan(0)
    expect(t.rows[0].length).toBe(t.headers.length)
  })

  it('setTableCell updates a single cell', () => {
    const t = normalizeTableContent({ headers: ['A', 'B'], rows: [['1', '2']] })
    const next = setTableCell(t, 0, 1, 'X')
    expect(next.rows[0][1]).toBe('X')
    expect(next.rows[0][0]).toBe('1')
  })

  it('setTableHeader renames a column header', () => {
    const t = normalizeTableContent({ headers: ['A', 'B'], rows: [['1', '2']] })
    const next = setTableHeader(t, 1, 'Bee')
    expect(next.headers[1]).toBe('Bee')
    expect(next.rows[0].length).toBe(2)
  })

  it('addTableRow appends and pads values', () => {
    const t = normalizeTableContent({ headers: ['A', 'B', 'C'], rows: [['1', '2', '3']] })
    const next = addTableRow(t, null, ['x'])
    expect(next.rows.length).toBe(2)
    expect(next.rows[1]).toEqual(['x', '', ''])
  })

  it('removeTableRow refuses to delete last row', () => {
    const t = normalizeTableContent({ headers: ['A'], rows: [['1']] })
    expect(() => removeTableRow(t, 0)).toThrow()
  })

  it('addTableColumn inserts header and values', () => {
    const t = normalizeTableContent({
      headers: ['A', 'B'],
      rows: [
        ['1', '2'],
        ['3', '4'],
      ],
    })
    const next = addTableColumn(t, 1, 'X', ['v1', 'v2'])
    expect(next.headers).toEqual(['A', 'X', 'B'])
    expect(next.rows[0]).toEqual(['1', 'v1', '2'])
    expect(next.rows[1]).toEqual(['3', 'v2', '4'])
  })

  it('removeTableColumn refuses to delete last column', () => {
    const t = normalizeTableContent({ headers: ['A'], rows: [['1'], ['2']] })
    expect(() => removeTableColumn(t, 0)).toThrow()
  })
})
