'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/**
 * Card variant with the "create" CTA inlined inside the header (right
 * of the title), and the create form expanded directly below the
 * header when the editor toggles it open.
 *
 * Replaces the previous pattern where a full-width `ExpandableCreatePanel`
 * sat ABOVE the card — that pushed the actual content (chapter list,
 * blocks…) further down the page and stacked one more CTA on every
 * tab. The compact in-header button keeps the chapter list at the
 * top of the viewport while the "add" action stays a thumb-flick away.
 *
 * Note : the create panel sits INSIDE the Card but BETWEEN
 * <CardHeader> and <CardContent>, so the dropdown appears flush to
 * the card edges rather than getting double-padded by the header.
 *
 * Slots :
 *   - `title` / `subtitle` → rendered in the CardHeader's left
 *     column. `title` typically a flex row with icon + text ;
 *     `subtitle` typically a count line.
 *   - `buttonLabel` → text inside the small purple CTA on the right.
 *   - `createForm` → element rendered inside the dropdown panel when open.
 *   - `children` → main card body (e.g. the chapter list).
 */
export function CardWithCreateAction({
  title,
  subtitle,
  buttonLabel,
  defaultOpen = false,
  headerExtra,
  createForm,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  buttonLabel: string;
  defaultOpen?: boolean;
  /**
   * Optional slot rendered between the title block and the create CTA in
   * the header. Use it for content that belongs to the SECTION but
   * navigates elsewhere — e.g. the `<LibrarySectionTabs>` for the
   * Variables / Library / Navbars cluster. Rendered with a soft margin
   * so it visually detaches from both the title and the button.
   */
  headerExtra?: ReactNode;
  createForm: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <CardTitle>{title}</CardTitle>
          {subtitle && <div className="text-muted-foreground text-xs">{subtitle}</div>}
        </div>
        {headerExtra && <div className="shrink-0">{headerExtra}</div>}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="bg-brand-primary-600 hover:bg-brand-primary-700 shadow-brand inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {buttonLabel}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </CardHeader>
      {open && <div className="border-border bg-surface-2/50 mx-5 mb-4 rounded-lg border p-5">{createForm}</div>}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
