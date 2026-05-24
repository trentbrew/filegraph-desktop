import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, FileText, Image, Clock, HardDrive, Folder } from 'lucide-react';
import { useTQL } from '@/hooks/useTQL';

interface PresetQuery {
  id: string;
  title: string;
  description: string;
  tql: string;
  icon: React.ReactNode;
}

const PRESET_QUERIES: PresetQuery[] = [
  {
    id: 'recent-modified',
    title: 'Recently modified files',
    description: 'Files changed in the last 7 days',
    tql: 'file.modified > now() - 7d',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: 'large-files',
    title: 'Large files',
    description: 'Files larger than 10MB',
    tql: 'file.size > 10MB',
    icon: <HardDrive className="h-4 w-4" />,
  },
  {
    id: 'images',
    title: 'All images',
    description: 'Find image files (jpg, png, gif, etc.)',
    tql: 'file.extension in ["jpg", "jpeg", "png", "gif", "webp"]',
    icon: <Image className="h-4 w-4" />,
  },
  {
    id: 'markdown',
    title: 'Markdown documents',
    description: 'All .md files in your vault',
    tql: 'file.extension = "md"',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'code-files',
    title: 'Source code',
    description: 'TypeScript, JavaScript, Python, etc.',
    tql: 'file.extension in ["ts", "tsx", "js", "jsx", "py", "rs", "go"]',
    icon: <Code2 className="h-4 w-4" />,
  },
  {
    id: 'deep-nested',
    title: 'Deeply nested folders',
    description: 'Folders more than 3 levels deep',
    tql: 'folder.depth > 3',
    icon: <Folder className="h-4 w-4" />,
  },
];

interface PresetQueriesProps {
  onQuerySelect?: (tql: string) => void;
}

export function PresetQueries({ onQuerySelect }: PresetQueriesProps) {
  const [state] = useTQL();
  const { stats } = state;

  if (!stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Quick Queries</h2>
          <p className="text-sm text-muted-foreground">
            Index a folder to start querying your files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Quick Queries</h2>
        <p className="text-sm text-muted-foreground">
          Try these preset queries or write your own
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid gap-3">
          {PRESET_QUERIES.map((query) => (
            <button
              key={query.id}
              onClick={() => onQuerySelect?.(query.tql)}
              className="group relative rounded-lg border border-border bg-card p-4 text-left transition-all hover:bg-accent hover:border-accent-foreground/20"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-muted-foreground group-hover:text-accent-foreground">
                  {query.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-sm group-hover:text-accent-foreground">
                    {query.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {query.description}
                  </p>
                  <code className="block text-xs font-mono text-muted-foreground/80 bg-muted px-2 py-1 rounded mt-2">
                    {query.tql}
                  </code>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
