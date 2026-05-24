import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { AlertCircle, Search, Download, X } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { DataSheetGrid, textColumn, keyColumn, Column } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import './datasheet-theme.css'

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

interface BinaryFileContent {
  data: string
  truncated: boolean
  size: number
}

interface TableViewerProps {
  filePath: string
  fileType: 'csv' | 'xlsx'
  fileName?: string
}

interface TableData {
  headers: string[]
  rows: any[] // Changed to any[] for DataSheetGrid compatibility
  totalRows: number
  size?: number
}

export function TableViewer({ filePath, fileType, fileName }: TableViewerProps) {
  const [data, setData] = React.useState<TableData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filteredData, setFilteredData] = React.useState<TableData | null>(null)
  const [forceLoad, setForceLoad] = React.useState(false)
  const [columns, setColumns] = React.useState<Column[]>([])

  // Performance thresholds
  const ROW_LIMIT = 1000 // Reduced from 10000 for better initial performance
  const COL_LIMIT = 50 // Reduced from 100
  const SIZE_WARNING_THRESHOLD = 2 * 1024 * 1024 // 2MB

  // Load and parse the file
  React.useEffect(() => {
    let isMounted = true

    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)

        if (fileType === 'csv') {
          const response = await invoke<TextFileContent>('read_text_file', {
            filePath: filePath,
            maxBytes: 10 * 1024 * 1024, // 10MB limit
          })

          if (!isMounted) return

          const content = response.content

          // Parse CSV
          Papa.parse(content, {
            complete: (results) => {
              if (!isMounted) return

              // Handle empty files
              const dataRows = results.data as string[][]
              if (!dataRows || dataRows.length === 0 || (dataRows.length === 1 && dataRows[0].length === 0)) {
                setData({ headers: [], rows: [], totalRows: 0 })
                setColumns([])
                setLoading(false)
                return
              }

              const headers = results.data[0] as string[]
              const rows = results.data.slice(1) as string[][]

              // Filter out empty rows
              const validRows = rows.filter((row) =>
                row.some((cell) => cell !== null && cell !== undefined && cell !== ''),
              )

              // Transform to objects for DataSheetGrid
              const gridRows = validRows.map((row) => {
                const obj: any = {}
                row.forEach((cell, index) => {
                  obj[`col${index}`] = cell
                })
                return obj
              })

              // Create columns
              const gridCols = headers.map((header, index) => ({
                ...keyColumn(`col${index}`, textColumn),
                title: header || `Column ${index + 1}`,
                minWidth: 150,
                resizable: true,
              }))

              setColumns(gridCols)
              setData({
                headers,
                rows: gridRows,
                totalRows: validRows.length,
              })
              setLoading(false)
            },
            error: (error: Error) => {
              if (!isMounted) return
              setError(`Failed to parse CSV: ${error.message}`)
              setLoading(false)
            },
          })
        } else if (fileType === 'xlsx') {
          const response = await invoke<BinaryFileContent>('read_file_base64', {
            filePath: filePath,
            maxBytes: 8 * 1024 * 1024, // 8MB limit
          })

          if (!isMounted) return

          // Decode base64 to binary
          const binaryString = atob(response.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          const workbook = XLSX.read(bytes, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
          }) as any[][]

          if (!isMounted) return

          // Handle empty files
          if (!jsonData || jsonData.length === 0) {
            setData({ headers: [], rows: [], totalRows: 0 })
            setColumns([])
            setLoading(false)
            return
          }

          const headers = jsonData[0] as string[]
          const rawRows = jsonData.slice(1).map((row) => row.map((cell) => cell?.toString() || ''))

          // Filter out empty rows
          const validRows = rawRows.filter((row) => row.some((cell) => cell !== ''))

          // Apply limits
          const effectiveRowLimit = forceLoad ? 10000 : ROW_LIMIT
          const effectiveColLimit = forceLoad ? 200 : COL_LIMIT

          const limitedRows = validRows.slice(0, effectiveRowLimit)
          const limitedHeaders = headers.slice(0, effectiveColLimit)

          // Transform to objects for DataSheetGrid
          const gridRows = limitedRows.map((row) => {
            const obj: any = {}
            row.slice(0, effectiveColLimit).forEach((cell, index) => {
              obj[`col${index}`] = cell
            })
            return obj
          })

          // Create columns
          const gridCols = limitedHeaders.map((header, index) => ({
            ...keyColumn(`col${index}`, textColumn),
            title: header || `Column ${index + 1}`,
            minWidth: 150,
            resizable: true,
          }))

          setColumns(gridCols)
          setData({
            headers: limitedHeaders.map((h) => h?.toString() || ''),
            rows: gridRows,
            totalRows: validRows.length,
          })
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        setError(`Failed to load file: ${err}`)
        setLoading(false)
      }
    }

    loadFile()

    return () => {
      isMounted = false
    }
  }, [filePath, fileType, forceLoad])

  // Filter data based on search query
  React.useEffect(() => {
    if (!data) {
      setFilteredData(null)
      return
    }

    if (!searchQuery.trim()) {
      setFilteredData(data)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = data.rows.filter((row) =>
      Object.values(row).some((cell) => String(cell).toLowerCase().includes(query)),
    )

    setFilteredData({
      headers: data.headers,
      rows: filtered,
      totalRows: filtered.length,
    })
  }, [data, searchQuery])

  const handleExport = () => {
    if (!data) return

    // Export as CSV
    // Convert back from objects to array of arrays
    const rows = data.rows.map((row) => data.headers.map((_, index) => row[`col${index}`] || ''))

    const csv = [data.headers.join(','), ...rows.map((row) => row.map((cell: string) => `"${cell}"`).join(','))].join(
      '\n',
    )

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 border-b border-border/50 px-3 py-2">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load table</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !filteredData) {
    return null
  }

  // Empty state - file has no data
  if (data.totalRows === 0 && data.headers.length === 0) {
    const templates = [
      { name: 'Contacts', headers: ['Name', 'Email', 'Phone', 'Company', 'Notes'] },
      { name: 'Tasks', headers: ['Task', 'Status', 'Priority', 'Due Date', 'Assigned To'] },
      { name: 'Inventory', headers: ['Item', 'SKU', 'Quantity', 'Price', 'Category'] },
      { name: 'Expenses', headers: ['Date', 'Description', 'Amount', 'Category', 'Payment Method'] },
    ]

    const handlePopulateTemplate = async (headers: string[]) => {
      try {
        // Create CSV content with headers
        const csv = headers.join(',') + '\n'

        // Write to file
        await invoke('write_text_file', {
          filePath: filePath,
          content: csv,
        })

        // Reload the file
        setLoading(true)
        window.location.reload() // Simple reload to refresh the view
      } catch (error) {
        console.error('Failed to populate template:', error)
      }
    }

    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-sm font-medium mb-2">Empty Spreadsheet</h3>
          <p className="text-xs text-muted-foreground mb-6">Get started by choosing a template or creating your own</p>

          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Quick Start Templates</div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => handlePopulateTemplate(template.headers)}>
                  <span className="font-medium text-xs">{template.name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {template.headers.slice(0, 3).join(' • ')}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isRowTruncated = data.totalRows > (forceLoad ? 10000 : ROW_LIMIT)
  const isColTruncated = data.headers.length > (forceLoad ? 200 : COL_LIMIT)
  const shouldShowWarning = (isRowTruncated || isColTruncated) && !forceLoad

  const handleLoadAnyway = () => {
    setForceLoad(true)
  }

  return (
    <div className="flex flex-col h-full rounded-xl">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{fileType.toUpperCase()}</span>
          <span>•</span>
          <span>
            {filteredData.totalRows} {filteredData.totalRows === 1 ? 'row' : 'rows'}
            {isRowTruncated && ` (showing first ${forceLoad ? 10000 : ROW_LIMIT})`}
          </span>
          <span>•</span>
          <span>
            {data.headers.length} {data.headers.length === 1 ? 'column' : 'columns'}
            {isColTruncated && ` (showing first ${forceLoad ? 200 : COL_LIMIT})`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-7 pl-7 pr-7 text-xs w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleExport} title="Export as CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="text-xs">Export</span>
          </Button>
        </div>
      </div>

      {shouldShowWarning && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-400">
          <p className="flex-1">
            Large spreadsheet detected. Showing first {ROW_LIMIT} rows and {COL_LIMIT} columns to keep the UI
            responsive.
          </p>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleLoadAnyway}>
            Load more
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden bg-card">
        <DataSheetGrid
          value={filteredData.rows}
          onChange={(newValue) => {
            // Update filtered data
            setFilteredData({
              ...filteredData,
              rows: newValue,
            })
            // Also update main data to reflect changes (if we weren't filtering)
            // Note: This simple update only works correctly if not filtering.
            // If filtering, we'd need to map changes back to original data, which is complex.
            // For now, we'll just update filtered view for editing.
            if (!searchQuery) {
              setData({
                ...data,
                rows: newValue,
              })
            }
          }}
          columns={columns}
          rowHeight={32}
          headerRowHeight={32}
          className="h-full"
          autoAddRow
          lockRows={false}
        />
      </div>

      {/* Footer */}
      {searchQuery && (
        <div className="shrink-0 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          Showing {filteredData.totalRows} of {data.totalRows} rows
        </div>
      )}

      {(isRowTruncated || isColTruncated) && (
        <div className="shrink-0 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          {isRowTruncated && `Showing first ${forceLoad ? 10000 : ROW_LIMIT} rows of ${data.totalRows}.`}
          {isRowTruncated && isColTruncated && ' '}
          {isColTruncated && `Showing first ${forceLoad ? 200 : COL_LIMIT} columns of ${data.headers.length}.`}
        </div>
      )}
    </div>
  )
}

const formatFileSize = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
