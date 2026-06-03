import * as React from 'react';

import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-brand-primary-600 text-white shadow-brand hover:bg-brand-primary-700 active:bg-brand-primary-800',
  outline: 'border border-primary-weak-border bg-surface text-primary-on hover:bg-primary/10',
  ghost: 'text-foreground hover:bg-primary/10 hover:text-primary-on',
  destructive: 'bg-brand-danger-600 text-white shadow-sm hover:bg-brand-danger-700',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'focus-visible:ring-brand-primary-300 inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
