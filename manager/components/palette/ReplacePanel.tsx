'use client';

import { Check, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import type { Occurrence } from '@/lib/blockReplace';
import { FamilyIcon } from '@/lib/familyIcons';

/**
 * One row in the replace list — corresponds to ONE occurrence of the
 * search query inside ONE field of ONE block. The unique key is the
 * `blockId|path|index` triplet (paths inside arrays use bracket
 * notation so the triplet is globally unique within a parcours).
 */
export interface ReplaceRow extends Occurrence {
  /** Unique key — `${blockId}|${path}|${index}`. */
  key: string;
  blockId: string;
  blockSummary: string;
  chapterTitle: string;
  chapterSlug: string;
  blockType: string;
}

/**
 * Inline highlight component : wraps the matched substring inside the
 * snippet with a `<mark>` and a `<span>` of the replacement.
 *
 * Visual contract :
 *   - `checked` row → MATCH is rose + strikethrough, REPLACEMENT is
 *     emerald next to it. Tells the editor "this will be removed,
 *     this will be inserted".
 *   - `unchecked` row → MATCH is in a neutral amber (no strikethrough),
 *     NO replacement preview. Tells the editor "this match exists but
 *     will NOT be touched". Showing the green pill on a row the editor
 *     just unchecked is misleading — they actively decided to skip it.
 */
function SnippetDiff({
  snippet,
  matchText,
  replaceWith,
  checked,
}: {
  snippet: string;
  matchText: string;
  replaceWith: string;
  checked: boolean;
}) {
  if (!matchText) {
    return <span className="text-text-muted block truncate text-[11px]">{snippet}</span>;
  }
  const lower = snippet.toLowerCase();
  const needle = matchText.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) {
    return <span className="text-text-muted block truncate text-[11px]">{snippet}</span>;
  }
  const before = snippet.slice(0, idx);
  const after = snippet.slice(idx + matchText.length);
  const markClass = checked
    ? 'text-foreground rounded-sm bg-rose-200 px-0.5 line-through decoration-rose-500/60 dark:bg-rose-900/40'
    : 'text-foreground rounded-sm bg-amber-200 px-0.5 dark:bg-amber-800/60';
  return (
    <span className="text-text-muted block truncate text-[11px]">
      {before}
      <mark className={markClass}>{matchText}</mark>
      {checked && replaceWith && (
        <>
          {' '}
          <span className="rounded-sm bg-emerald-200 px-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            {replaceWith}
          </span>
        </>
      )}
      {after}
    </span>
  );
}

interface Props {
  rows: ReplaceRow[];
  searchQuery: string;
  replaceQuery: string;
  /** Set of `${blockId}|${path}|${index}` keys explicitly EXCLUDED by
   *  the user. Default is all-checked, so the set is empty until the
   *  user unchecks something. Non-`replaceable` rows are always
   *  excluded regardless of this set. */
  excludedKeys: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  onApply: () => void;
  isApplying: boolean;
  /** Mirrors the palette's loading state — drives the "Chargement…" placeholder. */
  loading: boolean;
}

export function ReplacePanel({
  rows,
  searchQuery,
  replaceQuery,
  excludedKeys,
  onToggle,
  onToggleAll,
  onApply,
  isApplying,
  loading,
}: Props) {
  const replaceable = useMemo(() => rows.filter((r) => r.replaceable), [rows]);
  const checkedCount = useMemo(
    () => replaceable.filter((r) => !excludedKeys.has(r.key)).length,
    [replaceable, excludedKeys],
  );
  const allChecked = checkedCount === replaceable.length && replaceable.length > 0;

  if (loading) {
    return <div className="text-text-muted px-3 py-6 text-center text-sm">Chargement…</div>;
  }
  if (!searchQuery.trim()) {
    return (
      <div className="text-text-muted px-3 py-6 text-center text-sm">
        Tape une recherche dans le champ du haut, puis ce que tu veux mettre à la place.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-text-muted px-3 py-6 text-center text-sm">
        Aucune occurrence pour <span className="text-text font-medium">« {searchQuery} »</span>.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — count + tout cocher/décocher */}
      <div className="border-border bg-surface-2 text-text-muted flex items-center justify-between border-b px-3 py-2 text-[11px]">
        <span>
          <span className="text-text font-medium">{rows.length}</span> occurrence{rows.length > 1 ? 's' : ''}
          {replaceable.length !== rows.length && (
            <>
              {' '}
              ·{' '}
              <span className="text-text-muted">
                {rows.length - replaceable.length} non remplaçable{rows.length - replaceable.length > 1 ? 's' : ''}
              </span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-text-muted hover:text-text rounded px-1.5 py-0.5 underline-offset-2 hover:underline"
        >
          {allChecked ? 'Tout décocher' : 'Tout cocher'}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {rows.map((r) => {
          const checked = r.replaceable && !excludedKeys.has(r.key);
          return (
            <label
              key={r.key}
              className={`hover:bg-surface-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                r.replaceable ? '' : 'opacity-50'
              }`}
              title={r.replaceable ? undefined : 'Le match traverse une balise HTML — non remplaçable automatiquement.'}
            >
              <input
                type="checkbox"
                className="mt-1 h-3.5 w-3.5 shrink-0"
                checked={checked}
                disabled={!r.replaceable || isApplying}
                onChange={() => onToggle(r.key)}
              />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <FamilyIcon family="block" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{r.blockSummary || `Bloc ${r.blockType}`}</span>
                  <span className="text-text-faint shrink-0 text-[10px]">{r.chapterTitle}</span>
                </span>
                <SnippetDiff snippet={r.snippet} matchText={r.matchText} replaceWith={replaceQuery} checked={checked} />
                <span className="text-text-faint mt-0.5 truncate font-mono text-[10px]">{r.path}</span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer — sticky apply button */}
      <div className="border-border bg-surface-2 sticky bottom-0 flex items-center justify-between border-t px-3 py-2">
        <span className="text-text-muted text-[11px]">
          {checkedCount > 0 ? (
            <>
              <span className="text-text font-medium">{checkedCount}</span> / {replaceable.length} sélectionnée
              {checkedCount > 1 ? 's' : ''}
            </>
          ) : (
            <>Aucune sélection</>
          )}
        </span>
        <button
          type="button"
          disabled={checkedCount === 0 || replaceQuery === '' || isApplying}
          onClick={onApply}
          className="bg-brand-primary-600 hover:bg-brand-primary-700 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Remplacement…
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Remplacer {checkedCount > 0 ? `${checkedCount} occurrence${checkedCount > 1 ? 's' : ''}` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
