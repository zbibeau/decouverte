'use client';

import { ChevronRight } from 'lucide-react';

/**
 * Slim non-interactive breadcrumb shown just below the palette's
 * input row. Tells the user WHERE the next action will land —
 * critical when a block and a chapter share a similar name and the
 * placeholder alone doesn't disambiguate which parcours / chapter
 * is the current context.
 *
 * Hidden when there's no parcours in context (the placeholder
 * already says « Cherche un parcours… » then).
 *
 * The optional `filterLabel` chip on the right surfaces the active
 * scope ("Filtre : Blocs") or tag ("Filtre : tag X") so the editor
 * sees their narrowing rule at a glance — they no longer have to
 * scroll to spot what's restricting the result set.
 */
export function PaletteContextBar({
  parcoursName,
  chapterTitle,
  filterLabel,
}: {
  parcoursName: string;
  chapterTitle?: string | null;
  filterLabel?: string | null;
}) {
  return (
    <div
      className="border-border text-text-muted bg-surface-2/40 flex items-center gap-1.5 border-b px-3 py-1.5 text-[11px]"
      aria-label="Contexte"
    >
      <span className="text-text-faint shrink-0 uppercase tracking-wider">Contexte</span>
      <ChevronRight className="text-text-faint h-3 w-3 shrink-0" />
      <span className="text-text truncate font-medium">{parcoursName}</span>
      {chapterTitle && (
        <>
          <ChevronRight className="text-text-faint h-3 w-3 shrink-0" />
          <span className="text-text-muted truncate">{chapterTitle}</span>
        </>
      )}
      {filterLabel && (
        <span className="bg-primary/10 text-primary-on ml-auto inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium">
          {filterLabel}
        </span>
      )}
    </div>
  );
}
