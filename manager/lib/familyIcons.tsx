import type { LucideIcon } from 'lucide-react';
import { Book, BookMarked, Layers, Library, PanelTop, Plus, Tag, Variable } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Single source of truth for the "result family" iconography shared
 * between the ⌘K command palette and the regular manager views (tabs +
 * card headers). Centralising the family → { icon, color } mapping here
 * means the palette and the views can never drift : change an icon once
 * and it updates everywhere.
 *
 * Color classes MUST stay written as LITERAL strings here — Tailwind's
 * JIT scans `lib/**` (see `content` in `tailwind.config.ts`) for
 * class-name-shaped substrings. Building them dynamically (e.g.
 * `text-${shade}`) would silently drop `text-sky-600` / `text-slate-600`
 * / `text-rose-600` from the generated CSS (same trap that bit the tag
 * palette earlier).
 *
 * Families `chapter` / `block` / `variable` / `parcours` / `tag` / `add`
 * mirror the palette exactly. `navbar` and `library` are net-new (no
 * palette equivalent) — they exist so every tab can carry a marker.
 *
 * Pure presentational component (no hooks, no `'use client'`) so it
 * renders fine in BOTH Server Components (page card headers) and Client
 * Components (palette, tabs, sidebar).
 */
export const FAMILY_ICON = {
  add: { Icon: Plus, colorClass: 'text-emerald-600' },
  tag: { Icon: Tag, colorClass: 'text-muted-foreground' },
  chapter: { Icon: BookMarked, colorClass: 'text-primary' },
  block: { Icon: Layers, colorClass: 'text-violet-600' },
  variable: { Icon: Variable, colorClass: 'text-amber-600' },
  parcours: { Icon: Book, colorClass: 'text-rose-600' },
  navbar: { Icon: PanelTop, colorClass: 'text-sky-600' },
  library: { Icon: Library, colorClass: 'text-slate-600' },
} satisfies Record<string, { Icon: LucideIcon; colorClass: string }>;

export type FamilyKey = keyof typeof FAMILY_ICON;

/**
 * Renders a family marker icon at the default palette size (3.5) in the
 * family's brand color. Pass `className` to override size/spacing (e.g.
 * `h-4 w-4` for a card-header title).
 */
export function FamilyIcon({ family, className }: { family: FamilyKey; className?: string }) {
  const { Icon, colorClass } = FAMILY_ICON[family];
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', colorClass, className)} />;
}
