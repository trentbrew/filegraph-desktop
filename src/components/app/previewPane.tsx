import * as React from 'react';
import { FileItem } from './fileStructure';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TextViewer } from './viewers/textViewer';
import { CodeViewer } from './viewers/codeViewer';
import { TableViewer } from './viewers/tableViewer';
import { ImageViewer } from './viewers/imageViewer';
import { MediaViewer } from './viewers/mediaViewer';
import { PdfViewer } from './viewers/pdfViewer';
import { MarkdownViewer } from './viewers/markdownViewer';
import {
  X,
  ExternalLink,
  FileText,
  File,
  AlertCircle,
  FileWarning,
} from 'lucide-react';
import { useTQL } from '@/hooks/useTQL';
import { captionImageWithLlava } from '@/lib/ollama';

interface PreviewPaneProps {
  activeItem: FileItem | null;
  onClose?: () => void;
}

export function PreviewPane({ activeItem, onClose }: PreviewPaneProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset states when active item changes
  React.useEffect(() => {
    if (activeItem) {
      setIsLoading(true);
      setError(null);
      // Simulate loading for now - will implement actual preview loading next
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [activeItem]);

  // Empty state - no file selected
  if (!activeItem) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 border-l border-border/50">
        <div className="text-center text-muted-foreground p-8">
          <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Select a file to preview</p>
        </div>
      </div>
    );
  }

  // Skip folders
  if (activeItem.file_type === 'folder') {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 border-l border-border/50">
        <div className="text-center text-muted-foreground p-8">
          <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Folder preview not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-sm border border-border/50 preview-content">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-1">
              {activeItem.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="capitalize">
                {activeItem.extension || 'File'}
              </span>
              {activeItem.size && (
                <span>{formatFileSize(activeItem.size)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Open externally"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onClose}
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : (
          <PreviewContent activeItem={activeItem} />
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center text-muted-foreground max-w-sm">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <p className="text-sm font-medium mb-1">Failed to load preview</p>
        <p className="text-xs">{error}</p>
      </div>
    </div>
  );
}

function PreviewContent({ activeItem }: { activeItem: FileItem }) {
  const extension = activeItem.extension?.toLowerCase();
  const [, tql] = useTQL();
  const [meta, setMeta] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [forceLoad, setForceLoad] = React.useState(false);

  // Large file threshold: 1MB
  const LARGE_FILE_THRESHOLD = 1024 * 1024;
  const isLargeFile = activeItem.size && activeItem.size > LARGE_FILE_THRESHOLD;

  React.useEffect(() => {
    const r = tql.getRuntime?.();
    setMeta(r?.getImageMetadata(activeItem.path) ?? null);
    // Reset force load when file changes
    setForceLoad(false);
  }, [activeItem.path, tql]);

  // Check if we need to show large file warning for text-based files
  const needsWarning =
    isLargeFile &&
    !forceLoad &&
    // Code files
    ((extension &&
      [
        'js',
        'ts',
        'tsx',
        'jsx',
        'html',
        'css',
        'scss',
        'sass',
        'py',
        'java',
        'cpp',
        'c',
        'h',
        'cs',
        'go',
        'rs',
        'php',
        'rb',
        'swift',
        'json',
        'xml',
        'yml',
        'yaml',
        'toml',
        'sh',
        'bash',
        'zsh',
        'sql',
      ].includes(extension)) ||
      // Text files
      (extension &&
        [
          'txt',
          'log',
          'ini',
          'conf',
          'gitignore',
          'env',
          'dockerignore',
        ].includes(extension)) ||
      // Markdown
      extension === 'md' ||
      // CSV
      extension === 'csv' ||
      // No extension
      !extension);

  if (needsWarning) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <FileWarning className="h-16 w-16 mx-auto text-amber-500" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Large File Detected</h3>
            <p className="text-sm text-muted-foreground mb-1">
              This file is{' '}
              <span className="font-medium text-foreground">
                {formatFileSize(activeItem.size || 0)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Loading large files may cause the UI to freeze temporarily.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setForceLoad(true)}
              variant="default"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Load Preview Anyway
            </Button>
            <p className="text-xs text-muted-foreground">
              Files over 1 MB will be truncated to 4 MB for preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Image files
  if (
    extension &&
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(
      extension,
    )
  ) {
    const quickHash = `${activeItem.size ?? 0}-${activeItem.date_modified ?? ''}`;
    const handleDescribe = async () => {
      try {
        setBusy(true);
        const { description, model } = await captionImageWithLlava(
          activeItem.path,
        );
        const r = tql.getRuntime?.();
        await r?.addImageMetadata(activeItem.path, {
          description,
          model,
          fileHash: quickHash,
          generatedAt: Date.now(),
          contentType: 'image',
        });
        setMeta(
          r?.getImageMetadata(activeItem.path) ?? {
            description,
            model,
            fileHash: quickHash,
          },
        );
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <ImageViewer filePath={activeItem.path} fileName={activeItem.name} />
        </div>
        <div className="border-t border-border/50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground whitespace-pre-wrap wrap-break-word">
              {meta?.description || 'No description yet.'}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDescribe}
              disabled={busy}
            >
              {busy
                ? 'Describing…'
                : meta?.description
                  ? 'Regenerate'
                  : 'Generate'}
            </Button>
          </div>
          {meta?.model && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              {meta.model}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Video files
  if (
    extension &&
    ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension)
  ) {
    return (
      <div className="h-full">
        <MediaViewer
          filePath={activeItem.path}
          fileName={activeItem.name}
          mediaType="video"
        />
      </div>
    );
  }

  // Audio files
  if (
    extension &&
    ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)
  ) {
    return (
      <div className="h-full">
        <MediaViewer
          filePath={activeItem.path}
          fileName={activeItem.name}
          mediaType="audio"
        />
      </div>
    );
  }

  // PDF files
  if (extension === 'pdf') {
    return (
      <div className="h-full">
        <PdfViewer filePath={activeItem.path} fileName={activeItem.name} />
      </div>
    );
  }

  // Table files (CSV and Excel)
  if (extension === 'csv') {
    return (
      <div className="h-full">
        <TableViewer
          filePath={activeItem.path}
          fileType="csv"
          fileName={activeItem.name}
        />
      </div>
    );
  }

  if (extension && ['xlsx', 'xls'].includes(extension)) {
    return (
      <div className="h-full">
        <TableViewer
          filePath={activeItem.path}
          fileType="xlsx"
          fileName={activeItem.name}
        />
      </div>
    );
  }

  // Code files with syntax highlighting
  const codeExtensions = [
    'js',
    'ts',
    'tsx',
    'jsx',
    'html',
    'css',
    'scss',
    'sass',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'json',
    'xml',
    'yml',
    'yaml',
    'toml',
    'sh',
    'bash',
    'zsh',
    'sql',
  ];

  if (extension && codeExtensions.includes(extension)) {
    return (
      <div className="h-full">
        <CodeViewer filePath={activeItem.path} extension={extension} />
      </div>
    );
  }

  // Plain text files (no syntax highlighting needed)
  const textExtensions = [
    'txt',
    'log',
    'ini',
    'conf',
    'gitignore',
    'env',
    'dockerignore',
  ];

  // Markdown files - use special markdown viewer
  if (extension === 'md') {
    return (
      <div className="h-full">
        <MarkdownViewer filePath={activeItem.path} />
      </div>
    );
  }

  if (extension && textExtensions.includes(extension)) {
    return (
      <div className="h-full">
        <TextViewer filePath={activeItem.path} />
      </div>
    );
  }

  // Files without extension - try as text
  if (!extension) {
    return (
      <div className="h-full">
        <TextViewer filePath={activeItem.path} />
      </div>
    );
  }

  // Unsupported file type
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="text-center text-muted-foreground p-8">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            Preview not available for .{extension} files
          </p>
          <p className="text-xs mt-2 opacity-70">
            Open externally to view this file
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};
