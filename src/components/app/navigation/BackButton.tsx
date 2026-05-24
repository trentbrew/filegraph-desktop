import { Button } from '@/components/ui/button';
import { ChevronLeft, ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function BackButton({
  onClick,
  disabled = false,
  className = '',
}: BackButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${className}`}
      title="Back"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
