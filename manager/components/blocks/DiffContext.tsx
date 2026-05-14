'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { buildDiffPathSets } from '@/lib/diffPayload';

type DiffStatus = 'modified' | 'added' | 'removed' | undefined;

interface DiffContextValue {
  /** Returns the diff status for a given JSON path (e.g. "main.title", "fields[2].label"). */
  statusOf: (path: string | undefined) => DiffStatus;
  /** True when the entire block is brand new (no published source). */
  blockIsNew: boolean;
}

const DiffContext = createContext<DiffContextValue>({
  statusOf: () => undefined,
  blockIsNew: false,
});

/** Read diff state inside any editor. Components that don't pass a path get undefined. */
export function useFieldDiff(path?: string): DiffStatus {
  const { statusOf } = useContext(DiffContext);
  return statusOf(path);
}

/** True when the current block was created in the draft (no published twin). */
export function useBlockIsNew(): boolean {
  return useContext(DiffContext).blockIsNew;
}

/**
 * Provide diff data to all nested editor Fields. The provider computes the
 * sets of modified / added / removed JSON paths once per render, then
 * exposes a path lookup helper.
 */
export function DiffProvider(props: {
  current: unknown;
  source: unknown | null;
  blockIsNew: boolean;
  children: ReactNode;
}) {
  const sets = useMemo(() => {
    if (props.source == null) {
      return { modified: new Set<string>(), added: new Set<string>(), removed: new Set<string>() };
    }
    return buildDiffPathSets(props.source, props.current);
  }, [props.current, props.source]);

  const value = useMemo<DiffContextValue>(
    () => ({
      blockIsNew: props.blockIsNew,
      statusOf: (path) => {
        if (path === undefined) return undefined;
        if (sets.added.has(path)) return 'added';
        if (sets.removed.has(path)) return 'removed';
        if (sets.modified.has(path)) return 'modified';
        return undefined;
      },
    }),
    [sets, props.blockIsNew],
  );

  return <DiffContext.Provider value={value}>{props.children}</DiffContext.Provider>;
}
