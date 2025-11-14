import { Input } from '@/components/ui/input';
import { useEffect, useRef, useState } from 'react';

interface PathInputProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (path: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export function PathInput({
  value,
  onChange,
  onNavigate,
  loading = false,
  placeholder = 'Enter path...',
  className = '',
}: PathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState('200px');
  const isFullWidth = className.includes('w-full');

  useEffect(() => {
    // Skip width calculation if full width is requested
    if (isFullWidth) return;

    // Create a hidden span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = window.getComputedStyle(
      inputRef.current || document.body,
    ).font;
    span.textContent = value || placeholder;

    document.body.appendChild(span);
    const width = Math.max(200, span.getBoundingClientRect().width + 32); // Add padding
    const maxWidth = window.innerWidth * 0.7;
    setInputWidth(`${Math.min(width, maxWidth)}px`);

    document.body.removeChild(span);
  }, [value, placeholder, isFullWidth]);

  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${isFullWidth ? '' : 'w-auto min-w-[200px] max-w-full text-center'} font-mono text-sm cursor-text h-8 bg-transparent opacity-50 hover:opacity-100 active:opacity-100 focus:opacity-100 border-none focus:outline-none focus:ring-0 ${className}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onNavigate(value);
        }
      }}
      disabled={loading}
      style={isFullWidth ? undefined : { width: inputWidth }}
    />
  );
}
