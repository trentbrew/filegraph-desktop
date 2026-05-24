/**
 * Table Node for Canvas
 * Inline editable table with rows and columns
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { X, Maximize, Minimize, Table, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Styled handle
function StyledHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id?: string }) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-3! h-3! bg-muted-foreground/60! border-2! border-background! hover:bg-primary! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

export interface TableNodeData {
  label?: string
  headers?: string[]
  rows?: string[][]
  isMaximized?: boolean
}

const DEFAULT_HEADERS = ['Column 1', 'Column 2', 'Column 3']
const DEFAULT_ROWS = [
  ['', '', ''],
  ['', '', ''],
]

export function TableNode({ id, data, selected }: NodeProps<TableNodeData>) {
  const [headers, setHeaders] = React.useState<string[]>(data?.headers || DEFAULT_HEADERS)
  const [rows, setRows] = React.useState<string[][]>(data?.rows || DEFAULT_ROWS)
  const [editingCell, setEditingCell] = React.useState<{ row: number; col: number } | null>(null)
  const isMaximized = data?.isMaximized || false

  // Notify parent of changes
  const notifyChange = React.useCallback(
    (newHeaders: string[], newRows: string[][]) => {
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, headers: newHeaders, rows: newRows } },
        }),
      )
    },
    [id, data],
  )

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = value
    setHeaders(newHeaders)
    notifyChange(newHeaders, rows)
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
    )
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const addRow = () => {
    const newRow = headers.map(() => '')
    const newRows = [...rows, newRow]
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`]
    const newRows = rows.map((row) => [...row, ''])
    setHeaders(newHeaders)
    setRows(newRows)
    notifyChange(newHeaders, newRows)
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const removeColumn = (index: number) => {
    if (headers.length <= 1) return
    const newHeaders = headers.filter((_, i) => i !== index)
    const newRows = rows.map((row) => row.filter((_, i) => i !== index))
    setHeaders(newHeaders)
    setRows(newRows)
    notifyChange(newHeaders, newRows)
  }

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  const handleMaximize = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
    },
    [id],
  )

  return (
    <div
      className={`
        canvas-node group relative
        bg-card border rounded-lg shadow-md overflow-hidden
        min-w-[300px] min-h-[150px] h-full w-full
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Resizer */}
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={300}
          minHeight={150}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      {/* Header */}
      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <div className="flex items-center gap-1.5">
          <Table className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground truncate">{data?.label || 'Table'}</span>
        </div>
        <div
          className={`
            flex items-center gap-0.5 transition-opacity
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
          <button
            type="button"
            onClick={addColumn}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Add column">
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? 'Exit fullscreen' : 'Maximize'}>
            {isMaximized ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          {!isMaximized && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto h-[calc(100%-36px)] nodrag nowheel">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="border-b border-r border-border/50 p-0 font-medium text-left relative group/header">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    className="w-full px-2 py-1.5 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIndex)}
                      className="absolute top-0 right-0 p-0.5 opacity-0 group-hover/header:opacity-100 hover:text-destructive transition-opacity"
                      title="Remove column">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </th>
              ))}
              <th className="w-6 border-b border-border/50" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group/row hover:bg-muted/30">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border-b border-r border-border/50 p-0">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="w-6 border-b border-border/50 text-center">
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(rowIndex)}
                      className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:text-destructive transition-opacity"
                      title="Remove row">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row button */}
        <button
          onClick={addRow}
          className="w-full py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1">
          <Plus className="h-3 w-3" />
          Add row
        </button>
      </div>

      {/* Handles */}
      {!isMaximized && (
        <>
          <StyledHandle type="target" position={Position.Top} id="top" />
          <StyledHandle type="source" position={Position.Bottom} id="bottom" />
          <StyledHandle type="target" position={Position.Left} id="left" />
          <StyledHandle type="source" position={Position.Right} id="right" />
        </>
      )}
    </div>
  )
}
