import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface HomeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function HomeButton({
  onClick,
  disabled = false,
  className = '',
}: HomeButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${className}`}
      title="Home"
    >
      <Home className="h-4 w-4" />
    </Button>
  );
}
