import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import { convertToHtml } from 'mammoth/mammoth.browser';
import type { MammothMessage } from 'mammoth/mammoth.browser';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface BinaryFileContent {
  data: string;
  truncated: boolean;
  size: number;
}

interface DocxViewerProps {
  filePath: string;
  fileName?: string;
}

const DOCX_MAX_BYTES = 12 * 1024 * 1024; // 12MB hard cap
const DOCX_WARNING_THRESHOLD = 3 * 1024 * 1024; // Warn above 3MB

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
};

export function DocxViewer({ filePath, fileName }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [docMeta, setDocMeta] = React.useState<BinaryFileContent | null>(null);
  const [forceLoad, setForceLoad] = React.useState(false);
  const [warningSize, setWarningSize] = React.useState<number | null>(null);
  const [conversionWarnings, setConversionWarnings] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    setForceLoad(false);
    setHtmlContent('');
    setDocMeta(null);
    setWarningSize(null);
    setConversionWarnings([]);
  }, [filePath]);

  React.useEffect(() => {
    let isMounted = true;

    const loadDoc = async () => {
      setLoading(true);
      setError(null);
      setWarningSize(null);
      setHtmlContent('');
      setConversionWarnings([]);

      try {
        const response = await invoke<BinaryFileContent>('read_file_base64', {
          filePath,
          maxBytes: DOCX_MAX_BYTES,
        });

        if (!isMounted) return;

        setDocMeta(response);

        if (response.size > DOCX_WARNING_THRESHOLD && !forceLoad) {
          setWarningSize(response.size);
          return;
        }

        const arrayBuffer = base64ToArrayBuffer(response.data);
        const result = await convertToHtml({ arrayBuffer });
        if (!isMounted) return;

        const sanitized = DOMPurify.sanitize(result.value, {
          USE_PROFILES: { html: true },
        });

        setHtmlContent(sanitized);
        const messages = (result.messages ?? []) as MammothMessage[];
        setConversionWarnings(
          messages
            .filter((msg) => msg.type === 'warning' && Boolean(msg.message))
            .map((msg) => msg.message as string),
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [filePath, forceLoad]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load document</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (warningSize && !forceLoad) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full p-6 space-y-4">
        <FileText className="h-12 w-12 text-amber-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Large Word document detected</p>
          <p className="text-xs text-muted-foreground">
            This file is {formatFileSize(warningSize)}. Loading the entire
            document may impact performance.
          </p>
        </div>
        <Button onClick={() => setForceLoad(true)} className="gap-2">
          Load Preview
        </Button>
      </div>
    );
  }

  if (!htmlContent) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>DOCX</span>
          {docMeta?.size !== undefined && (
            <>
              <span>•</span>
              <span>{formatFileSize(docMeta.size)}</span>
            </>
          )}
          {docMeta?.truncated && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-medium">Truncated</span>
            </>
          )}
        </div>
        {fileName && (
          <span className="text-muted-foreground/80 truncate">{fileName}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-muted/20">
        <div
          className="prose prose-invert max-w-none p-6 text-sm leading-6"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {(docMeta?.truncated || conversionWarnings.length > 0) && (
        <div className="shrink-0 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
          {docMeta?.truncated && (
            <p>
              Preview truncated to first {formatFileSize(DOCX_MAX_BYTES)} of{' '}
              {formatFileSize(docMeta.size)}.
            </p>
          )}
          {conversionWarnings.map((warning, index) => (
            <p key={warning ?? index} className="text-amber-500">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};
