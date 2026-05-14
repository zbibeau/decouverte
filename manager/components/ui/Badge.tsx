import * as React from 'react';

import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'info' | 'neutral' | 'primary' | 'danger';

const toneClasses: Record<Tone, string> = {
  success: 'bg-brand-success-50 text-brand-success-700 ring-brand-success-500/20',
  warning: 'bg-brand-warning-50 text-brand-warning-700 ring-brand-warning-500/30',
  info: 'bg-brand-info-50 text-brand-info-700 ring-brand-info-500/20',
  neutral: 'bg-brand-dark-50 text-brand-dark-700 ring-brand-dark-300/40',
  primary: 'bg-brand-primary-50 text-brand-primary-700 ring-brand-primary-500/20',
  danger: 'bg-brand-danger-50 text-brand-danger-700 ring-brand-danger-500/20',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
