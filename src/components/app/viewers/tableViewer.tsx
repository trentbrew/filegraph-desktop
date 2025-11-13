import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AlertCircle, Search, Download, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface TextFileContent {
  content: string;
  truncated: boolean;
  encoding: string;
  size: number;
}

interface TableViewerProps {
  filePath: string;
  fileType: 'csv' | 'xlsx';
  fileName?: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export function TableViewer({
  filePath,
  fileType,
  fileName,
}: TableViewerProps) {
  const [data, setData] = React.useState<TableData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredData, setFilteredData] = React.useState<TableData | null>(
    null,
  );

  // Load and parse the file
  React.useEffect(() => {
    let isMounted = true;

    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Read file as binary for XLSX or text for CSV
        const response = await invoke<TextFileContent>('read_text_file', {
          filePath: filePath,
          maxBytes: 10 * 1024 * 1024, // 10MB limit
        });

        if (!isMounted) return;

        const content = response.content;

        if (fileType === 'csv') {
          // Parse CSV
          Papa.parse(content, {
            complete: (results) => {
              if (!isMounted) return;

              const headers = results.data[0] as string[];
              const rows = results.data.slice(1) as string[][];

              // Filter out empty rows
              const validRows = rows.filter((row) =>
                row.some(
                  (cell) => cell !== null && cell !== undefined && cell !== '',
                ),
              );

              setData({
                headers,
                rows: validRows,
                totalRows: validRows.length,
              });
              setLoading(false);
            },
            error: (error: Error) => {
              if (!isMounted) return;
              setError(`Failed to parse CSV: ${error.message}`);
              setLoading(false);
            },
          });
        } else if (fileType === 'xlsx') {
          try {
            // Parse XLSX
            // Note: We need to read as binary, but for now we'll work with what we have
            // In a production app, you'd want to add a separate binary read command
            const workbook = XLSX.read(content, { type: 'string' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
              header: 1,
            }) as any[][];

            if (!isMounted) return;

            const headers = jsonData[0] as string[];
            const rows = jsonData
              .slice(1)
              .map((row) => row.map((cell) => cell?.toString() || ''));

            // Filter out empty rows
            const validRows = rows.filter((row) =>
              row.some((cell) => cell !== ''),
            );

            setData({
              headers: headers.map((h) => h?.toString() || ''),
              rows: validRows,
              totalRows: validRows.length,
            });
            setLoading(false);
          } catch (err) {
            if (!isMounted) return;
            setError(`Failed to parse XLSX: ${err}`);
            setLoading(false);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setError(`Failed to load file: ${err}`);
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [filePath, fileType]);

  // Filter data based on search query
  React.useEffect(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = data.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(query)),
    );

    setFilteredData({
      headers: data.headers,
      rows: filtered,
      totalRows: filtered.length,
    });
  }, [data, searchQuery]);

  const handleExport = () => {
    if (!data) return;

    // Export as CSV
    const csv = [
      data.headers.join(','),
      ...data.rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    );
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
    );
  }

  if (!data || !filteredData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{fileType.toUpperCase()}</span>
          <span>•</span>
          <span>
            {filteredData.totalRows}{' '}
            {filteredData.totalRows === 1 ? 'row' : 'rows'}
          </span>
          <span>•</span>
          <span>
            {data.headers.length}{' '}
            {data.headers.length === 1 ? 'column' : 'columns'}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleExport}
            title="Export as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="text-xs">Export</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-secondary backdrop-blur-xl border-b  z-50">
            <tr>
              <th className="sticky left-0 px-3 py-2 font-semibold text-muted-foreground w-12 border-r border-border/30 z-40 text-center bg-muted">
                ⌗
              </th>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-left font-semibold text-foreground border-r border-border/30 sticky left-12 bg-secondary min-w-64"
                >
                  {header || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.rows.length > 0 ? (
              filteredData.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <td className="sticky left-0 px-4 py-2 text-muted-foreground font-mono text-xs border-r border-border bg-card backdrop-blur-xl z-10 text-center">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 border-r border-border/30 font-mono"
                      title={cell}
                    >
                      <div className="max-w-xs truncate">{cell}</div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={data.headers.length + 1}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {searchQuery ? 'No matching rows found' : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {searchQuery && (
        <div className="shrink-0 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          Showing {filteredData.totalRows} of {data.totalRows} rows
        </div>
      )}
    </div>
  );
}
