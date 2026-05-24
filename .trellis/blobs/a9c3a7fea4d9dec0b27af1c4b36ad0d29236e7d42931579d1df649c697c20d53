import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowRight } from 'lucide-react';

interface ForwardButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ForwardButton({
  onClick,
  disabled = false,
  className = '',
}: ForwardButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${className}`}
      title="Forward"
    >
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
