import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, WrapText, Copy, Check, Edit, Save } from 'lucide-react';

interface TextFileContent {
  content: string;
  truncated: boolean;
  encoding: string;
  size: number;
}

interface TextViewerProps {
  filePath: string;
  maxBytes?: number;
}

export function TextViewer({ filePath, maxBytes = 4 * 1024 * 1024 }: TextViewerProps) {
  const [data, setData] = React.useState<TextFileContent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [wordWrap, setWordWrap] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes,
        });

        if (!cancelled) {
          setData(result);
          setEditedContent(result.content);
          setIsEditing(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [filePath, maxBytes]);

  const handleCopy = React.useCallback(() => {
    const contentToCopy = isEditing ? editedContent : data?.content;
    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Silently fail
        });
    }
  }, [data, isEditing, editedContent]);

  const handleSave = React.useCallback(async () => {
    if (!data || data.truncated) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await invoke('write_text_file', {
        filePath,
        content: editedContent,
      });
      
      setData({ ...data, content: editedContent });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [data, editedContent, filePath]);

  const hasChanges = isEditing && editedContent !== data?.content;

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load file</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{data.encoding}</span>
          <span>•</span>
          <span>{formatFileSize(data.size)}</span>
          {data.truncated && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-medium">Truncated</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!data.truncated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={() => {
                if (isEditing && hasChanges) {
                  if (confirm('You have unsaved changes. Discard them?')) {
                    setEditedContent(data.content);
                    setIsEditing(!isEditing);
                  }
                } else {
                  setIsEditing(!isEditing);
                }
              }}
              title={isEditing ? 'Cancel editing' : 'Edit file'}
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="text-xs">{isEditing ? 'Cancel' : 'Edit'}</span>
            </Button>
          )}
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              title="Save changes"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => setWordWrap(!wordWrap)}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText className="h-3.5 w-3.5" />
            <span className="text-xs">Wrap</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleCopy}
            title="Copy all"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Copy</span>
          </Button>
          {hasChanges && (
            <span className="text-xs text-amber-500 font-medium ml-2">Unsaved</span>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="flex-1 overflow-hidden">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className={`w-full h-full p-4 text-xs font-mono bg-transparent resize-none focus:outline-none ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            }`}
            spellCheck={false}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <pre
            className={`p-4 text-xs font-mono ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            }`}
          >
            {data.content}
          </pre>
        </ScrollArea>
      )}

      {/* Truncation notice */}
      {data.truncated && (
        <div className="shrink-0 border-t border-amber-500/50 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This file has been truncated to {formatFileSize(maxBytes)} for preview.
            Open externally to view the full content.
          </p>
        </div>
      )}
    </div>
  );
}

const formatFileSize = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};
