import { useTQL } from '@/hooks/useTQL';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';

interface IndexingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IndexingDrawer({ isOpen, onClose }: IndexingDrawerProps) {
  const [state] = useTQL();
  const { scanning, scanProgress, stats, error } = state;

  if (!isOpen) return null;

  const getPhaseIcon = (phase: string) => {
    if (scanning && scanProgress?.phase === phase) {
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    }
    return <CheckCircle2 className="h-3 w-3 text-muted-foreground" />;
  };

  const phases = [
    { id: 'scanning', label: 'Discovering files' },
    { id: 'indexing', label: 'Parsing text' },
    { id: 'complete', label: 'Building relationships' },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l border-border flex flex-col shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Indexing</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Building your graph...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Indexing failed</span>
                </>
              ) : stats ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Graph ready</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">No folder indexed</span>
                </>
              )}
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {error}
              </div>
            )}
          </div>

          <Separator />

          {/* Phases */}
          {scanning && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Progress
              </p>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <div key={phase.id} className="flex items-center gap-2">
                    {getPhaseIcon(phase.id)}
                    <span className="text-sm">{phase.label}</span>
                  </div>
                ))}
              </div>

              {scanProgress && scanProgress.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {scanProgress.processed} / {scanProgress.total} files
                    </span>
                    <span>
                      {Math.round((scanProgress.processed / scanProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(scanProgress.processed / scanProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Graph Stats
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label="Files" value={stats.uniqueEntities} />
                  <StatItem label="Facts" value={stats.totalFacts} />
                  <StatItem label="Links" value={stats.totalLinks} />
                  <StatItem
                    label="Attributes"
                    value={stats.uniqueAttributes}
                  />
                </div>
              </div>
            </>
          )}

          {/* Help Text */}
          {!scanning && !stats && (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                Indexing builds a queryable knowledge graph of your files.
              </p>
              <div className="space-y-1">
                <p className="font-medium">You can then:</p>
                <ul className="space-y-1 pl-4">
                  <li className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Query files like a database</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Discover hidden patterns</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Explore relationships</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
