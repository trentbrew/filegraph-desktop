import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TabProps {
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  className?: string;
}

export function Tab({
  title,
  isActive,
  onSelect,
  onClose,
  className = '',
}: TabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex items-center gap-2 px-3 h-9
        border-r border-border/50 cursor-pointer
        transition-colors select-none
        ${isActive ? 'bg-background' : 'bg-muted/30 hover:bg-muted/50'}
        ${className}
      `}
    >
      <span className="text-sm truncate max-w-[150px]">{title}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className={`
          h-5 w-5 p-0 rounded-sm
          opacity-0 group-hover:opacity-100
          hover:bg-accent/50
          transition-opacity
        `}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
