import * as React from 'react';

import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'border-border bg-surface text-text flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
        'placeholder:text-text-faint focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-1',
        'font-mono',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
