/**
 * Error Panel Component
 * 
 * Displays indexing errors with retry/ignore actions
 * Clears error badge when opened
 */

import { useState } from 'react';
import { type ErrorDetail } from '@/lib/tql/status-types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorPanelProps {
  rows: ErrorDetail[];
  isOpen: boolean;
  onClose: () => void;
  onRetry: (ids: string[]) => void;
  onIgnore: (ids: string[]) => void;
  onMarkReviewed: () => void;
}

export function ErrorPanel({
  rows,
  isOpen,
  onClose,
  onRetry,
  onIgnore,
  onMarkReviewed,
}: ErrorPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mark all errors as reviewed when panel opens
  useState(() => {
    if (isOpen && rows.length > 0) {
      onMarkReviewed();
    }
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleRetrySelected = () => {
    onRetry([...selected]);
    clearSelection();
    toast.success(`Retrying ${selected.size} ${selected.size === 1 ? 'file' : 'files'}`);
  };

  const handleIgnoreSelected = () => {
    onIgnore([...selected]);
    clearSelection();
    toast.info(`Ignored ${selected.size} ${selected.size === 1 ? 'error' : 'errors'}`);
  };

  const handleRetryOne = (id: string) => {
    onRetry([id]);
    toast.success('Retrying file');
  };

  const handleIgnoreOne = (id: string) => {
    onIgnore([id]);
    toast.info('Error ignored');
  };

  const copyErrorDetails = (error: ErrorDetail) => {
    const details = JSON.stringify(error, null, 2);
    navigator.clipboard.writeText(details);
    toast.success('Error details copied to clipboard');
  };

  // Group errors by code for better UX
  const groupedErrors = rows.reduce((acc, error) => {
    if (!acc[error.code]) {
      acc[error.code] = [];
    }
    acc[error.code].push(error);
    return acc;
  }, {} as Record<string, ErrorDetail[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Indexing Errors ({rows.length})</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={rows.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selected.size === 0}
              >
                Clear
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {Object.entries(groupedErrors).map(([code, errors]) => (
              <div key={code} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="uppercase">{code}</span>
                  <span className="text-xs">({errors.length})</span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm" aria-label="Indexing errors">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="w-8 p-2"></th>
                        <th className="text-left p-2 font-medium">Time</th>
                        <th className="text-left p-2 font-medium">File</th>
                        <th className="text-left p-2 font-medium">Source</th>
                        <th className="text-left p-2 font-medium">Message</th>
                        <th className="text-left p-2 font-medium">Provenance</th>
                        <th className="text-right p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((error) => (
                        <tr
                          key={error.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-2">
                            <Checkbox
                              checked={selected.has(error.id)}
                              onCheckedChange={() => toggleSelection(error.id)}
                              aria-label={`Select error ${error.id}`}
                            />
                          </td>
                          <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(error.ts * 1000).toLocaleTimeString()}
                          </td>
                          <td className="p-2 max-w-[200px]">
                            <div
                              className="truncate font-mono text-xs"
                              title={error.file || '—'}
                            >
                              {error.file || '—'}
                            </div>
                          </td>
                          <td className="p-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                              {error.source}
                            </span>
                          </td>
                          <td className="p-2 max-w-[300px]">
                            <div className="truncate text-xs" title={error.message}>
                              {error.message}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {error.provenance?.method && (
                              <div className="truncate">
                                {error.provenance.method}
                                {error.provenance.version && (
                                  <span className="ml-1">v{error.provenance.version}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleRetryOne(error.id)}
                                title="Retry this file"
                              >
                                <RotateCw className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleIgnoreOne(error.id)}
                                title="Ignore this error"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => copyErrorDetails(error)}
                                title="Copy error details as JSON"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No errors to display</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selected.size > 0 && `${selected.size} selected`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleIgnoreSelected}
                disabled={selected.size === 0}
              >
                Ignore Selected
              </Button>
              <Button
                onClick={handleRetrySelected}
                disabled={selected.size === 0}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Retry Selected
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
