import { Search } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <InputGroup className="flex-1">
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Search..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  );
}
