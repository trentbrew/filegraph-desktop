import * as React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AlertCircle } from 'lucide-react';

interface MediaViewerProps {
  filePath: string;
  fileName: string;
  mediaType: 'video' | 'audio';
}

export function MediaViewer({ filePath, fileName, mediaType }: MediaViewerProps) {
  const [error, setError] = React.useState<string | null>(null);

  const assetUrl = React.useMemo(() => {
    try {
      return convertFileSrc(filePath);
    } catch (err) {
      setError('Failed to load media file');
      return '';
    }
  }, [filePath]);

  const handleError = () => {
    setError(`Failed to load ${mediaType} file`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load {mediaType}</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-black/5">
        <video
          src={assetUrl}
          controls
          onError={handleError}
          className="max-w-full max-h-full rounded"
          preload="metadata"
        >
          <track kind="captions" />
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  // Audio
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-full max-w-md">
        <audio
          src={assetUrl}
          controls
          onError={handleError}
          className="w-full"
          preload="metadata"
        >
          Your browser does not support the audio element.
        </audio>
        <p className="text-xs text-muted-foreground text-center mt-4">
          {fileName}
        </p>
      </div>
    </div>
  );
}
