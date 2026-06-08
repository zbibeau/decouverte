'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted "recently opened" list for the command palette.
 *
 * Stored in `localStorage` under `mfm.palette.recents` as a JSON
 * array of `{ kind, id, ts }`. Most-recent-first, deduplicated by
 * `${kind}:${id}` (re-opening an item bumps it to the top). Capped
 * at `MAX_RECENTS` to keep the file size negligible.
 *
 * Consumers :
 *   - `CommandPalette` calls `push({ kind, id })` at every navigation
 *     / insertion exit point.
 *   - When `search` is empty, the palette renders the « Récents »
 *     group from this list resolved against the loaded `PaletteData`
 *     (rows whose id is no longer present are silently skipped — the
 *     resource was deleted).
 *
 * The hook returns the raw entries (sorted) and a `push` setter. The
 * caller does the id → row resolution because only it knows the
 * shape of `PaletteData`.
 *
 * Initial render is empty server-side (the storage isn't available
 * there) ; the effect hydrates on mount. This is fine for the
 * palette because it only renders on `open === true`.
 */

const STORAGE_KEY = 'mfm.palette.recents';
const MAX_RECENTS = 8;

export type RecentKind = 'block' | 'chapter' | 'variable' | 'parcours';

export interface RecentEntry {
  kind: RecentKind;
  id: string;
  /** Epoch millis of the last visit. */
  ts: number;
}

function readStorage(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e &&
        typeof e === 'object' &&
        typeof e.id === 'string' &&
        typeof e.ts === 'number' &&
        (e.kind === 'block' || e.kind === 'chapter' || e.kind === 'variable' || e.kind === 'parcours'),
    );
  } catch {
    return [];
  }
}

function writeStorage(entries: RecentEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / private mode — silent : recency is a nice-to-have.
  }
}

export function useRecentItems(): {
  recents: RecentEntry[];
  push: (entry: Pick<RecentEntry, 'kind' | 'id'>) => void;
  clear: () => void;
} {
  // Init empty for the SSR / first paint, hydrate on mount so the
  // displayed list is correct as soon as the palette opens.
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setRecents(readStorage());
  }, []);

  const push = useCallback((entry: Pick<RecentEntry, 'kind' | 'id'>) => {
    setRecents((prev) => {
      const ts = Date.now();
      const key = `${entry.kind}:${entry.id}`;
      const filtered = prev.filter((e) => `${e.kind}:${e.id}` !== key);
      const next = [{ kind: entry.kind, id: entry.id, ts }, ...filtered].slice(0, MAX_RECENTS);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecents([]);
    writeStorage([]);
  }, []);

  return { recents, push, clear };
}
