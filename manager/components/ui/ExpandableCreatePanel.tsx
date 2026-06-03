'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Full-width "create" call-to-action that reveals its creation form on
 * click. Used at the top of the Variables tab and for "Ajouter un
 * chapitre" / "Ajouter un bloc" — a single collapsed entry point instead
 * of an always-visible form, so the list stays the focus until the author
 * explicitly wants to add something.
 *
 * Thin client-side toggle : the actual form (with its bound server action)
 * is rendered by the caller and slotted in as `children`.
 */
export function ExpandableCreatePanel({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="bg-brand-primary-600 hover:bg-brand-primary-700 shadow-brand flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        <Plus className="h-4 w-4" />
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-border bg-surface mt-3 rounded-lg border p-5 shadow-sm">{children}</div>}
    </div>
  );
}
