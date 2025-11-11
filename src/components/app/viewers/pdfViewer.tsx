import * as React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PdfViewerProps {
  filePath: string;
  fileName: string;
}

export function PdfViewer({ filePath, fileName }: PdfViewerProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [embedSupported, setEmbedSupported] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);

  const assetUrl = React.useMemo(() => {
    try {
      return convertFileSrc(filePath);
    } catch (err) {
      setError('Failed to load PDF');
      return '';
    }
  }, [filePath]);

  const handleOpenExternal = async () => {
    try {
      const result = await invoke<string>('open_file_with_default_app', {
        filePath,
      });
      toast.success(result);
    } catch (error) {
      toast.error(`Failed to open PDF: ${error}`);
    }
  };

  const handleEmbedError = () => {
    setEmbedSupported(false);
  };

  // Handle pinch-to-zoom
  React.useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container || !embedSupported) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if it's a pinch gesture (Ctrl key is set for trackpad pinch)
      if (e.ctrlKey) {
        e.preventDefault();
        
        const delta = -e.deltaY;
        const zoomFactor = delta > 0 ? 1.1 : 0.9;
        
        setZoomLevel((prev) => {
          const newZoom = prev * zoomFactor;
          // Clamp between 0.5x and 3x for PDFs
          return Math.max(0.5, Math.min(3, newZoom));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [embedSupported]);

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load PDF</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // Fallback if embed not supported
  if (!embedSupported) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-sm">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-2">PDF Preview Not Available</p>
          <p className="text-xs text-muted-foreground mb-4">
            PDF inline preview is not supported in your browser.
          </p>
          <Button
            onClick={handleOpenExternal}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open with Default App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>PDF Document</span>
          {zoomLevel !== 1 && (
            <span className="font-medium text-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleZoomReset}
            disabled={zoomLevel === 1}
            title="Reset zoom (100%)"
          >
            <span className="text-xs">Reset Zoom</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="text-xs">Open External</span>
          </Button>
        </div>
      </div>

      {/* PDF Embed */}
      <div 
        ref={pdfContainerRef}
        className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center"
      >
        <div
          className="transition-transform duration-100"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <embed
            src={assetUrl}
            type="application/pdf"
            className="w-full h-full"
            onError={handleEmbedError}
          />
        </div>
      </div>
    </div>
  );
}
