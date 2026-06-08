import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { useBlockIsNew, useFieldDiff } from './DiffContext';
import { useSetHoveredField } from './FieldHoverContext';
import { useFieldSearchMatchSnippet } from './SearchMatchContext';

export function Field({
  label,
  hint,
  path,
  children,
}: {
  label: string;
  hint?: string;
  /**
   * JSON path of this field within the block payload (e.g. "main.title",
   * "fields[2].label"). When the path matches a value that differs from the
   * published version, the field is decorated with an amber/sky badge and
   * a subtle ring around its inputs.
   *
   * Also drives the preview-iframe field highlight: when the user hovers or
   * focuses the field, the matching `[data-field-path]` element in the
   * preview gets a transient amber outline.
   */
  path?: string;
  children: React.ReactNode;
}) {
  const status = useFieldDiff(path);
  const blockIsNew = useBlockIsNew();
  const setHoveredField = useSetHoveredField();
  // Brand-new blocks are entirely "new" — no per-field highlight needed,
  // the block-level banner already shouts it.
  const effectiveStatus = blockIsNew ? undefined : status;

  // Yellow highlight when the user lands from a ⌘K search and this
  // field's value contains the query. Independent of the diff status
  // — both can co-exist visually (e.g. a modified-and-matched field
  // wears both rings). The snippet powers a small "matched text"
  // preview line under the input, where the matched word is wrapped
  // in <mark> (`<input>` and `<textarea>` can't host inline HTML).
  const { isMatch: isSearchMatch, snippet, query: searchQuery } = useFieldSearchMatchSnippet(path);

  const hoverHandlers = path
    ? {
        onMouseEnter: () => setHoveredField(path),
        onMouseLeave: () => setHoveredField(null),
        onFocus: () => setHoveredField(path),
        onBlur: () => setHoveredField(null),
      }
    : {};

  // Compose the wrapper className : diff status as the base, search
  // match overlaid as an extra ring + amber tint when applicable. The
  // ring is `ring-2` rather than border so it stacks on top of the
  // diff border without offsetting the layout.
  const diffClass =
    effectiveStatus === 'modified'
      ? 'space-y-1 rounded-md border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 p-1.5'
      : effectiveStatus === 'added'
        ? 'space-y-1 rounded-md border border-sky-300 dark:border-sky-700/60 bg-sky-50/60 dark:bg-sky-950/30 p-1.5'
        : effectiveStatus === 'removed'
          ? 'space-y-1 rounded-md border border-red-300 dark:border-red-700/60 bg-red-50/60 dark:bg-red-950/30 p-1.5'
          : 'space-y-1';
  const searchClass = isSearchMatch
    ? 'rounded-md bg-amber-100/80 dark:bg-amber-900/40 ring-2 ring-amber-400 p-1.5'
    : '';

  return (
    <div
      {...hoverHandlers}
      data-search-match={isSearchMatch ? 'true' : undefined}
      className={`${diffClass}${searchClass ? ` ${searchClass}` : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-muted-foreground text-xs font-medium">{label}</label>
        {/* The "Match" chip was removed — the amber ring around the
             whole field + the snippet line under the input already
             communicate the match. Keeping the chip on top made the
             visual feel uneven against the inline <mark> highlights
             ("one bigger than the other"). */}
        {effectiveStatus === 'modified' && (
          <span className="inline-flex items-center rounded bg-amber-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-800/60 dark:text-amber-100">
            Modifié
          </span>
        )}
        {effectiveStatus === 'added' && (
          <span className="inline-flex items-center rounded bg-sky-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky-900 dark:bg-sky-800/60 dark:text-sky-200">
            Nouveau
          </span>
        )}
      </div>
      {children}
      {isSearchMatch && snippet && (
        <p className="text-[11px] italic leading-snug text-amber-900 dark:text-amber-100">
          <span className="text-amber-700 dark:text-amber-300" aria-hidden="true">
            ↪{' '}
          </span>
          <FieldMatchSnippet snippet={snippet} query={searchQuery} />
        </p>
      )}
      {hint && <p className="text-muted-foreground text-[10px]">{hint}</p>}
    </div>
  );
}

/**
 * Renders a single-line snippet with EVERY occurrence of the matched
 * substring wrapped in `<mark>`. Multi-hit highlighting keeps the
 * visual consistent for short queries that appear several times in
 * the same snippet (e.g. "pa" in "paragraphe… patient").
 *
 * Local to this file ; Palette and ChapterEditor have similar
 * helpers but unexported.
 */
function FieldMatchSnippet({ snippet, query }: { snippet: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{snippet}</>;
  const lower = snippet.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  while (cursor < snippet.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      parts.push(snippet.slice(cursor));
      break;
    }
    if (idx > cursor) parts.push(snippet.slice(cursor, idx));
    parts.push(
      <mark
        key={`m-${idx}`}
        className="rounded-sm bg-amber-300 px-0.5 font-semibold not-italic text-amber-950 dark:bg-amber-800/60 dark:text-amber-100"
      >
        {snippet.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return <>{parts}</>;
}

type AccentColor = 'slate' | 'rose' | 'green' | 'amber' | 'purple' | 'sky';

const ACCENT_CLASSES: Record<AccentColor, { border: string; title: string }> = {
  slate: { border: 'border-l-slate-300', title: 'text-muted-foreground' },
  rose: { border: 'border-l-rose-400', title: 'text-rose-700 dark:text-rose-300' },
  green: { border: 'border-l-emerald-400', title: 'text-emerald-700 dark:text-emerald-300' },
  amber: { border: 'border-l-amber-400', title: 'text-amber-800 dark:text-amber-200' },
  purple: { border: 'border-l-violet-400', title: 'text-violet-700 dark:text-violet-300' },
  sky: { border: 'border-l-sky-400', title: 'text-sky-700 dark:text-sky-300' },
};

type SectionTone = 'neutral' | 'warning';

export function Section({
  title,
  action,
  accentColor = 'slate',
  tone = 'neutral',
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  /**
   * Adds a coloured left border + matching tinted title to the section
   * header. Useful to visually pair editor groups with regions in the
   * preview (e.g. "Bloc avantages" → amber matches the rendered card).
   */
  accentColor?: AccentColor;
  /**
   * `'warning'` switches the WHOLE body to amber — used when the
   * section needs to demand attention (e.g. the maintenance tags
   * section when at least one tag slot is empty). Overrides
   * `accentColor` visually so the warning state stays unambiguous.
   */
  tone?: SectionTone;
  /**
   * When `true`, the section renders as a native `<details>` element
   * so the editor can fold / unfold its body. The title row stays
   * visible (incl. tone-driven amber styling) — only the body content
   * collapses. Used by sections whose content is secondary or only
   * occasionally edited (e.g. maintenance tags).
   */
  collapsible?: boolean;
  /**
   * Initial open state when `collapsible`. Defaults to `true` so
   * existing callers that opt in don't see their content disappear
   * unexpectedly ; callers that want a quiet default explicitly pass
   * `defaultOpen={false}`.
   */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const accent = ACCENT_CLASSES[accentColor];
  const isWarning = tone === 'warning';
  const bodyClass = isWarning
    ? 'border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30'
    : 'border-border bg-muted/20';
  const leftBorderClass = isWarning ? 'border-l-amber-500 dark:border-l-amber-600' : accent.border;
  const titleClass = isWarning ? 'text-amber-800 dark:text-amber-200' : accent.title;
  const containerClass = `space-y-2 rounded-md border border-l-4 p-3 ${bodyClass} ${leftBorderClass}`;

  if (collapsible) {
    // Native <details> for accessible toggle (keyboard, screen readers).
    // `group` + `group-open:` on the chevron lets us rotate it via CSS
    // without any extra state. The "Afficher / Masquer" hint mirrors
    // the pattern used by <TagsHelpBanner>.
    return (
      <details open={defaultOpen} className={`group ${containerClass}`}>
        <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${titleClass}`}>{title}</p>
          <div className="text-muted-foreground/70 flex items-center gap-2 text-[10px]">
            {action}
            <span className="group-open:hidden">Afficher</span>
            <span className="hidden group-open:inline">Masquer</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <div className="mt-2 space-y-2">{children}</div>
      </details>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${titleClass}`}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
