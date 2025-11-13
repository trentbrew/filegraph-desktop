import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTQL } from '@/hooks/useTQL';
import { useVault } from '@/contexts/VaultContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Folder, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VaultSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onVaultSelected?: (path: string) => void;
}

export function VaultSelector({ isOpen, onClose, onVaultSelected }: VaultSelectorProps) {
  const [state, actions] = useTQL();
  const { scanning: isScanning } = state;
  const { setVaultPath } = useVault();
  const [inputPath, setInputPath] = React.useState('');
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [scanComplete, setScanComplete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debug: Log when isOpen changes
  React.useEffect(() => {
    console.log('[VaultSelector] isOpen changed to:', isOpen);
  }, [isOpen]);

  // Set default vault path on mount
  React.useEffect(() => {
    const setDefaultPath = async () => {
      try {
        const homeDir = await invoke<string>('get_home_directory');
        const defaultVault = `${homeDir}/.filegraph`;
        setInputPath(defaultVault);
      } catch (err) {
        console.error('[VaultSelector] Failed to get home directory:', err);
        // Fallback to a generic path
        setInputPath('~/.filegraph');
      }
    };
    setDefaultPath();
  }, []);

  const handleScanDirectory = async () => {
    if (!inputPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    try {
      setSelectedPath(inputPath);
      setError(null);
      setScanComplete(false);

      toast.info('Building your graph...', {
        description: inputPath,
      });

      // Start TQL scan
      await actions.scanDirectory(inputPath);

      setScanComplete(true);
      const stats = actions.getRuntime()?.getStats();
      
      // Debug: Log stats to investigate zero metrics issue
      console.log('[VaultSelector] Indexing complete. Stats:', stats);
      
      toast.success('Graph ready', {
        description: stats
          ? `Indexed ${stats.uniqueEntities} files with ${stats.totalFacts} facts`
          : 'You can now ask structured questions about your files',
      });

      // Set vault path in context for vault-scoped navigation
      setVaultPath(inputPath);
      console.log('[VaultSelector] Vault path set to:', inputPath);

      onVaultSelected?.(inputPath);
      // Close modal on success
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to index folder';
      setError(message);
      toast.error('Indexing failed', {
        description: message,
      });
      console.error('[VaultSelector] Error:', err);
    }
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (scanComplete)
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (isScanning)
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    return <Folder className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (error) return 'Indexing failed';
    if (scanComplete) return 'Graph ready';
    if (isScanning) return 'Building your graph...';
    return 'No folder indexed';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Index a Folder</DialogTitle>
          <DialogDescription>
            Build a queryable graph of your files. Indexing stays local—you control which folders.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
        <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="directory-path">Folder Path</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setInputPath('/Users/trentbrew/filegraph-test-vault')
            }
            disabled={isScanning}
            className="h-auto py-1 px-2 text-xs"
          >
            Use test vault
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            id="directory-path"
            type="text"
            placeholder="/Users/username/Documents"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            disabled={isScanning}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleScanDirectory();
              }
            }}
            className="flex-1 font-mono text-sm"
          />
          <Button
            onClick={handleScanDirectory}
            disabled={isScanning || !inputPath.trim()}
            size="default"
            className="gap-2 min-w-[100px]"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <Folder className="h-4 w-4" />
                Index
              </>
            )}
          </Button>
        </div>
      </div>

      {selectedPath && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{getStatusText()}</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {selectedPath}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      </div>
      </DialogContent>
    </Dialog>
  );
}
