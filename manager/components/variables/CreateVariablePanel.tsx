'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Full-width "Créer une variable" call-to-action that sits at the TOP of
 * the Variables tab. Creating a variable is the primary action on this
 * page, so it gets a prominent banner-style button spanning the whole
 * width instead of a form buried at the bottom. Clicking it reveals the
 * (otherwise hidden) creation form passed as `children`.
 *
 * Pure presentational toggle — the actual form (`AddVariableForm`, with
 * its bound server action) is rendered by the server page and slotted in
 * here as children, so this component stays a thin client-side wrapper.
 */
export function CreateVariablePanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="bg-brand-primary-600 hover:bg-brand-primary-700 shadow-brand flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        <Plus className="h-4 w-4" />
        Créer une variable
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-border mt-3 rounded-lg border bg-white p-5 shadow-sm">{children}</div>}
    </div>
  );
}
