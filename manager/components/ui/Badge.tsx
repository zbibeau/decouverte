import * as React from 'react';

import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'info' | 'neutral' | 'primary' | 'danger';

// Tones — chacune utilise le token `tone-*` (vars CSS qui switchent en
// dark, cf. globals.css). bg = 10% du ton (fond léger lisible sur clair
// ET sombre), text = ton plein (pour clair) / ton plus pâle automatique
// en dark via le mapping `tone-*` qui change de teinte. ring = 30%.
const toneClasses: Record<Tone, string> = {
  success: 'bg-tone-emerald/15 text-tone-emerald ring-tone-emerald/30',
  warning: 'bg-tone-amber/15 text-tone-amber ring-tone-amber/30',
  info: 'bg-tone-sky/15 text-tone-sky ring-tone-sky/30',
  neutral: 'bg-surface-3 text-text-muted ring-border-strong/60',
  primary: 'bg-primary/15 text-primary-on ring-primary/30',
  danger: 'bg-tone-rose/15 text-tone-rose ring-tone-rose/30',
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
