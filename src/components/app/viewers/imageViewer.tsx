import * as React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ZoomOut, Maximize2, AlertCircle } from 'lucide-react';

interface ImageViewerProps {
  filePath: string;
  fileName: string;
}

export function ImageViewer({ filePath, fileName }: ImageViewerProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<'contain' | 'actual'>('contain');
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [imageDimensions, setImageDimensions] = React.useState<{width: number; height: number} | null>(null);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);

  const assetUrl = React.useMemo(() => {
    try {
      return convertFileSrc(filePath);
    } catch (err) {
      setError('Failed to load image');
      return '';
    }
  }, [filePath]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoading(false);
    setImageDimensions({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    });
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load image');
  };

  // Handle pinch-to-zoom
  React.useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if it's a pinch gesture (Ctrl key is set for trackpad pinch)
      if (e.ctrlKey) {
        e.preventDefault();
        
        const delta = -e.deltaY;
        const zoomFactor = delta > 0 ? 1.1 : 0.9;
        
        setZoomLevel((prev) => {
          const newZoom = prev * zoomFactor;
          // Clamp between 0.5x and 5x
          return Math.max(0.5, Math.min(5, newZoom));
        });
        
        // Switch to actual size mode when zooming
        if (zoom === 'contain') {
          setZoom('actual');
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom]);

  const handleZoomReset = () => {
    setZoomLevel(1);
    setZoom('contain');
  };

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load image</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {imageDimensions && (
            <span>{imageDimensions.width} × {imageDimensions.height}px</span>
          )}
          {zoom === 'actual' && zoomLevel !== 1 && (
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
            disabled={zoom === 'contain' && zoomLevel === 1}
            title="Reset zoom"
          >
            <ZoomOut className="h-3.5 w-3.5" />
            <span className="text-xs">Reset</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => {
              setZoom('actual');
              setZoomLevel(1);
            }}
            disabled={zoom === 'actual' && zoomLevel === 1}
            title="Actual size (100%)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="text-xs">100%</span>
          </Button>
        </div>
      </div>

      {/* Image Content */}
      <ScrollArea className="flex-1">
        <div 
          ref={imageContainerRef}
          className={`p-4 flex items-center justify-center ${zoom === 'contain' ? 'min-h-full' : ''}`}
        >
          {loading && (
            <div className="w-full max-w-2xl">
              <Skeleton className="w-full aspect-video" />
            </div>
          )}
          <img
            src={assetUrl}
            alt={fileName}
            onLoad={handleLoad}
            onError={handleError}
            className={`${
              zoom === 'contain'
                ? 'max-w-full max-h-full object-contain'
                : 'object-none'
            } ${loading ? 'hidden' : ''} transition-transform duration-100`}
            style={
              zoom === 'actual' 
                ? { 
                    imageRendering: 'crisp-edges',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center',
                  } 
                : {}
            }
          />
        </div>
      </ScrollArea>
    </div>
  );
}
