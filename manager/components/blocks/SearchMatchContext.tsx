'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Per-field search-match context. Filled by `BlockEditor` from the
 * `?q=<query>` URL param (set by the ⌘K palette) and consumed by the
 * `Field` component to highlight inputs whose value contains the
 * query. Pure presentational signal — does NOT alter the payload.
 *
 * The `paths` set holds JSON paths in the same format that
 * `<Field path="…">` already uses (e.g. `photos[1].description`).
 * `snippets` maps each match path to a short context excerpt (±N
 * chars around the match) — used by `Field` to render a small
 * "matched-text" line under the input, since `<input>` and
 * `<textarea>` can't host inline `<mark>` HTML.
 */
interface SearchMatchValue {
  query: string;
  paths: Set<string>;
  snippets: Map<string, string>;
}

const SearchMatchContext = createContext<SearchMatchValue>({
  query: '',
  paths: new Set(),
  snippets: new Map(),
});

export function SearchMatchProvider({
  query,
  paths,
  snippets,
  children,
}: {
  query: string;
  paths: Set<string>;
  snippets: Map<string, string>;
  children: ReactNode;
}) {
  // Memoise the value object so consumers don't re-render every time
  // the parent re-renders — Set / Map identity is preserved by callers.
  const value = useMemo<SearchMatchValue>(() => ({ query, paths, snippets }), [query, paths, snippets]);
  return <SearchMatchContext.Provider value={value}>{children}</SearchMatchContext.Provider>;
}

/**
 * Returns `true` when the given Field path matches the current ⌘K
 * search context. Returns `false` when no query is active or the
 * field path wasn't provided.
 */
export function useFieldSearchMatch(path?: string): boolean {
  const ctx = useContext(SearchMatchContext);
  if (!path || !ctx.query) return false;
  return ctx.paths.has(path);
}

/** Like `useFieldSearchMatch` but also returns the snippet + the
 *  raw query, so the caller can render a "matched text" preview
 *  line with `<mark>` highlighting under the input. */
export function useFieldSearchMatchSnippet(path?: string): { isMatch: boolean; snippet?: string; query: string } {
  const ctx = useContext(SearchMatchContext);
  if (!path || !ctx.query) return { isMatch: false, query: '' };
  if (!ctx.paths.has(path)) return { isMatch: false, query: ctx.query };
  return { isMatch: true, snippet: ctx.snippets.get(path), query: ctx.query };
}

/** Returns the current search query (for the highlight `<mark>` in the
 *  label/hint of a matched field) and the full match set (so a parent
 *  layer can scroll to the first match). */
export function useSearchMatchContext(): SearchMatchValue {
  return useContext(SearchMatchContext);
}
