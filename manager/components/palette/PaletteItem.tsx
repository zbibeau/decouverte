'use client';

import { Command } from 'cmdk';
import type { ReactNode } from 'react';

/**
 * Standardised row inside the command palette: icon · label · subtle
 * right-aligned hint. Disabled rows look greyed out and don't fire
 * `onSelect`.
 *
 * When the caller passes a `snippet` (e.g. `"…hypoxie et saturation
 * en oxygène…"`), it is rendered as a second line below the label so
 * the visitor sees *why* a result matched. `highlight` (the original
 * user query) is wrapped in `<mark>` inside the snippet so the
 * matched substring pops visually.
 *
 * Centralises the visual contract so every section (Add actions,
 * Chapters, Blocs, Variables, Parcours) renders consistently.
 */
function HighlightedSnippet({ snippet, highlight }: { snippet: string; highlight?: string }) {
  const trimmed = highlight?.trim();
  if (!trimmed) {
    return <span className="text-muted-foreground block truncate text-[11px]">{snippet}</span>;
  }
  // Case-insensitive split around the first occurrence of the query.
  // Substring positions are computed on the lowercased copy so we don't
  // mangle accented characters or break the casing of the snippet itself.
  const lower = snippet.toLowerCase();
  const q = trimmed.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    return <span className="text-muted-foreground block truncate text-[11px]">{snippet}</span>;
  }
  const before = snippet.slice(0, idx);
  const match = snippet.slice(idx, idx + q.length);
  const after = snippet.slice(idx + q.length);
  return (
    <span className="text-muted-foreground block truncate text-[11px]">
      {before}
      <mark className="text-foreground rounded-sm bg-amber-200 px-0.5">{match}</mark>
      {after}
    </span>
  );
}

export function PaletteItem({
  icon,
  label,
  hint,
  snippet,
  highlight,
  value,
  keywords,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  /** Optional context excerpt (rendered below the label) that shows
   *  WHICH part of the indexed content matched the current search. */
  snippet?: string;
  /** Current search query — used to highlight the matched substring
   *  inside `snippet`. */
  highlight?: string;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      disabled={disabled}
      onSelect={onSelect}
      className="data-[selected=true]:bg-primary/10 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm data-[disabled=true]:opacity-40"
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {snippet && <HighlightedSnippet snippet={snippet} highlight={highlight} />}
      </span>
      {hint && <span className="text-muted-foreground ml-2 shrink-0 truncate text-[10px]">{hint}</span>}
    </Command.Item>
  );
}
