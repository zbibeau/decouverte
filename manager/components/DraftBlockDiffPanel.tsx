'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { diffPayload, formatDiffValue, type DiffEntry } from '@/lib/diffPayload';

interface Props {
  /** 'new' → brand-new block (no source); 'modified' → show diffs; 'pristine' → nothing. */
  status?: 'new' | 'modified' | 'pristine';
  /** Payload of the currently-edited block (draft). */
  currentPayload: Record<string, unknown>;
  /** Payload of the published source (null if block is new). */
  sourcePayload: Record<string, unknown> | null;
}

/**
 * Review panel shown at the top of the block editor, so the user can scan
 * every field that diverges from the published version before publishing.
 * - 'new' → sky badge, "bloc créé dans le brouillon".
 * - 'modified' → amber badge + collapsible list of path/before/after.
 * - 'pristine' → null (nothing to review).
 */
export function DraftBlockDiffPanel({ status, currentPayload, sourcePayload }: Props) {
  // Collapsed by default — the diff panel is a review aid, not the primary
  // surface. The user expands it explicitly when they want to inspect the
  // delta vs published.
  const [open, setOpen] = useState(false);

  if (status === 'new') {
    return (
      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
        🔵 <strong>Nouveau bloc</strong> — il n'existe pas encore dans la version publiée. Tout son
        contenu partira en prod au prochain publish.
      </div>
    );
  }

  if (status !== 'modified' || !sourcePayload) {
    return null;
  }

  const entries: DiffEntry[] = diffPayload(sourcePayload, currentPayload);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 text-xs text-amber-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-amber-100/50"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>
          🟡 <strong>{entries.length} modification{entries.length > 1 ? 's' : ''}</strong> dans ce
          bloc par rapport au publié
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-amber-200 border-t border-amber-200">
          {entries.map((e, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3 py-1.5">
              <code className="font-mono text-[11px] text-amber-950">{e.path}</code>
              <span
                className={
                  e.kind === 'added'
                    ? 'text-[10px] uppercase tracking-wide text-sky-700'
                    : e.kind === 'removed'
                    ? 'text-[10px] uppercase tracking-wide text-red-700'
                    : 'text-[10px] uppercase tracking-wide text-amber-700'
                }
              >
                {e.kind === 'added' ? 'ajouté' : e.kind === 'removed' ? 'supprimé' : 'modifié'}
              </span>
              {e.kind !== 'added' && (
                <span className="col-span-2 text-[11px] text-muted-foreground">
                  <span className="text-red-700">− </span>
                  <span className="font-mono">{formatDiffValue(e.before)}</span>
                </span>
              )}
              {e.kind !== 'removed' && (
                <span className="col-span-2 text-[11px] text-muted-foreground">
                  <span className="text-emerald-700">+ </span>
                  <span className="font-mono">{formatDiffValue(e.after)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
