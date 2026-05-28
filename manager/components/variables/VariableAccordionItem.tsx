'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { FamilyIcon } from '@/lib/familyIcons';
import { cn } from '@/lib/utils';

/**
 * One collapsible row in the Variables list. Collapsed by default it
 * shows only the variable's name (+ type + usage badge + delete) so the
 * author can scan the whole vocabulary at a glance; expanding reveals the
 * full detail (rename, enum options, Hubspot mapping) passed as children.
 *
 * Slot pattern : the usage badge and the delete control are server-
 * rendered nodes (the delete carries a bound server action) passed in via
 * `usageSlot` / `deleteSlot`, and the editable detail forms come in as
 * `children`. They live OUTSIDE the toggle <button> — the usage badge is
 * an <a> and the delete is a <form>, neither of which may be nested in a
 * <button>, and clicking them shouldn't toggle the row anyway.
 */
export function VariableAccordionItem({
  name,
  type,
  usageSlot,
  deleteSlot,
  children,
}: {
  name: string;
  type: string;
  usageSlot?: React.ReactNode;
  deleteSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="hover:bg-brand-primary-50/40 -mx-2 flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
          title={open ? 'Replier le détail' : 'Déplier le détail (renommer, options, Hubspot…)'}
        >
          <ChevronRight
            className={cn('text-muted-foreground h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
          />
          <FamilyIcon family="variable" />
          <code className="text-sm font-medium">{name}</code>
          <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
            {type}
          </span>
        </button>
        {usageSlot}
        {deleteSlot}
      </div>
      {open && <div className="space-y-3 py-3 pl-7">{children}</div>}
    </div>
  );
}
