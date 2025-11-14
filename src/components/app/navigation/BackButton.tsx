import { Button } from '@/components/ui/button';

interface BackButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function BackButton({ onClick, disabled = false, className = '' }: BackButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${className}`}
      title="Back"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Button>
  );
}
