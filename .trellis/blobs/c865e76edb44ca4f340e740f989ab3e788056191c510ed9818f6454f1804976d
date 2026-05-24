/**
 * Chord indicator component
 * Shows visual feedback when waiting for the second key in a chord sequence
 */

import { useEffect, useState } from 'react';

export function ChordIndicator() {
  const [chord, setChord] = useState<string | null>(null);
  const [executed, setExecuted] = useState<{ key: string; command: string } | null>(null);

  useEffect(() => {
    const handleChordStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setChord(detail.key);
    };

    const handleChordEnd = () => {
      setChord(null);
    };

    const handleCommandExecuted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setExecuted(detail);
      // Clear after 2 seconds
      setTimeout(() => setExecuted(null), 2000);
    };

    window.addEventListener('chord-started', handleChordStart);
    window.addEventListener('chord-ended', handleChordEnd);
    window.addEventListener('command-executed', handleCommandExecuted);

    return () => {
      window.removeEventListener('chord-started', handleChordStart);
      window.removeEventListener('chord-ended', handleChordEnd);
      window.removeEventListener('command-executed', handleCommandExecuted);
    };
  }, []);

  if (!chord && !executed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {executed && (
        <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-lg px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500 font-medium">Executed:</span>
            <kbd className="px-2 py-1 bg-background/50 rounded text-xs font-mono font-medium">
              {executed.key}
            </kbd>
            <span className="text-muted-foreground text-xs">({executed.command})</span>
          </div>
        </div>
      )}
      
      {chord && (
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 text-sm">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-medium">
              {chord}
            </kbd>
            <span className="text-muted-foreground">waiting for next key...</span>
          </div>
        </div>
      )}
    </div>
  );
}
