import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, InputProps } from '@/components/ui/Input';

/** Password field with a show/hide toggle to help users avoid typos. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          disabled={props.disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-cream-dark hover:text-ink disabled:opacity-50"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
