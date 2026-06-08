'use client';

import type { ContentBlock } from '@shared/content-schema';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { AddGallery } from '@/components/blocks/AddGallery';
import { Button } from '@/components/ui/Button';

interface Props {
  /** Called when a block type is picked. Receives the slug. */
  onInsert: (type: ContentBlock['type']) => Promise<void> | void;
  /** Optional set of types to exclude from the picker — e.g. nested
   *  contexts hide `heroTitle` and `componentRef` which only make sense at
   *  the top level of a chapter. */
  excludeTypes?: Set<ContentBlock['type']>;
  /** Visual hint forwarded to AddGallery (drives the modal's header copy). */
  insertTarget?: 'chapter' | 'children';
}

/**
 * Single "+ Ajouter un bloc" CTA that opens the `<AddGallery>` modal.
 *
 * Lot 2 of the Direction C refonte replaces the previous row of 11
 * `<AddBlockButton>` (each with its own popover + iframe preview) by
 * one button → one categorised modal. Faster to scan, lighter to
 * render, and the insertion flow is unchanged (the new block opens +
 * selects via the caller's `onInsert` callback).
 *
 * The picker copy adapts via `insertTarget` :
 *   - `'chapter'` → "Ajouter un bloc" (root)
 *   - `'children'` → "Ajouter un sous-bloc" (nested)
 */
export function BlockTypeSelector({ onInsert, excludeTypes, insertTarget = 'chapter' }: Props) {
  const [open, setOpen] = useState(false);
  const label = insertTarget === 'children' ? 'Ajouter un sous-bloc' : 'Ajouter un bloc';
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[11px] font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </Button>
      {open && (
        <AddGallery
          insertTarget={insertTarget}
          excludeTypes={excludeTypes}
          onPick={async (t) => {
            // Close BEFORE awaiting the insertion : feels snappier and
            // the parent handles the post-insert focus / scroll.
            setOpen(false);
            await onInsert(t);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
