import * as React from 'react';

import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'border-border bg-surface text-text flex h-9 w-full rounded-lg border px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-text-faint focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
