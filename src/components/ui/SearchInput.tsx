import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
}

/** Search field with a consistent icon and a one-tap clear button. */
export function SearchInput({ value, onValueChange, wrapperClassName, className, placeholder, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onValueChange('');
          }
        }}
        placeholder={placeholder}
        aria-label={props['aria-label'] || placeholder}
        className={cn('pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden', className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-cream-dark hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
