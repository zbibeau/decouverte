'use client';

import { Check, ChevronRight, Hash, Layers, SkipForward, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TagsField } from '@/components/blocks/TagsField';
import { Button } from '@/components/ui/Button';
import { TAG_COLOR_HEX, isTagColor } from '@/lib/tagColors';
import type { DraftTagReviewSummary } from '@/lib/actions';

/**
 * Pre-publish tag review modal.
 *
 * Mounted by `PublishDraftButton` when the editor clicks Publier on a
 * non-empty draft. Walks every new / modified block + chapter in the
 * draft, lets the editor either :
 *   - **Confirm** the existing tags (one click for already-tagged rows)
 *   - **Add a tag** inline when the row has none — the input is a
 *     full `TagsField` so the rest of the tag vocabulary is reachable
 *     via autocomplete, with immediate DB persistence (same flow as
 *     the regular block editor)
 *   - **Skip** the row — the editor explicitly opts out for this round
 *   - **Skip everything** in one click via a footer button — useful
 *     for emergency hotfixes when tagging coverage isn't the priority
 *
 * Validation / skip state is ephemeral (held in the modal's local
 * state). Closing the modal (X / Esc / clicking the backdrop) drops
 * that state — but tags the editor added inline are already persisted
 * because TagsField in `block` / `chapter` mode hits `setBlockTags` /
 * `setChapterTags` on every change. The modal just shepherds the
 * decision, it doesn't gate the persistence.
 *
 * Publish is only enabled once every row is non-pending (validated or
 * skipped).
 */

type RowState = 'pending' | 'validated' | 'skipped';

interface Props {
  summary: DraftTagReviewSummary;
  /** Called when the editor presses the final "Publier" button. The
   *  parent runs the actual publish action — the modal just decides
   *  *when* to fire it. */
  onPublish: () => void;
  /** Called when the editor closes the modal without publishing
   *  (X / Esc / backdrop click / explicit cancel). The parent
   *  re-enables the Publier trigger so a fresh click reopens the
   *  modal with up-to-date counts. */
  onClose: () => void;
  /** Used to build chapter / block URLs in the row actions so the
   *  editor can pop the editor open in a new tab without losing the
   *  modal state. */
  parcoursSlug: string;
}

export function TagReviewModal({ summary, onPublish, onClose, parcoursSlug }: Props) {
  // Per-row state — keyed by a synthetic id so we don't collide
  // between block ids and chapter ids (both are UUIDs but
  // theoretically could clash if a future feature reuses ids).
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // ESC closes the modal. Native <dialog> would handle this for free
  // but we're on a custom overlay so we wire it up manually.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function stateOf(rowKey: string): RowState {
    return rowStates[rowKey] ?? 'pending';
  }
  function setState(rowKey: string, next: RowState) {
    setRowStates((prev) => ({ ...prev, [rowKey]: next }));
  }
  function skipAll() {
    const next: Record<string, RowState> = {};
    for (const b of summary.blocks) next[`block:${b.id}`] = 'skipped';
    for (const c of summary.chapters) next[`chapter:${c.id}`] = 'skipped';
    setRowStates(next);
  }
  function validateAllTagged() {
    setRowStates((prev) => {
      const next = { ...prev };
      for (const b of summary.blocks) {
        if (b.tags.length > 0 && (next[`block:${b.id}`] ?? 'pending') === 'pending') {
          next[`block:${b.id}`] = 'validated';
        }
      }
      for (const c of summary.chapters) {
        if (c.tags.length > 0 && (next[`chapter:${c.id}`] ?? 'pending') === 'pending') {
          next[`chapter:${c.id}`] = 'validated';
        }
      }
      return next;
    });
  }

  // Footer counters — derived once per render from `rowStates`.
  const counts = useMemo(() => {
    let validated = 0;
    let skipped = 0;
    let pending = 0;
    const rows: { key: string }[] = [
      ...summary.blocks.map((b) => ({ key: `block:${b.id}` })),
      ...summary.chapters.map((c) => ({ key: `chapter:${c.id}` })),
    ];
    for (const r of rows) {
      const s = rowStates[r.key] ?? 'pending';
      if (s === 'validated') validated++;
      else if (s === 'skipped') skipped++;
      else pending++;
    }
    return { validated, skipped, pending, total: rows.length };
  }, [rowStates, summary]);

  const allDone = counts.pending === 0;

  // Auto-focus the Publier button as soon as every row is settled,
  // so a single Enter / Space confirms publication. Triggered on the
  // `allDone` transition, NOT every render — otherwise the button
  // would re-steal focus while the editor is tab-ing through.
  const publishBtnRef = useRef<HTMLButtonElement | null>(null);
  const allDoneRef = useRef(allDone);
  useEffect(() => {
    if (allDone && !allDoneRef.current) publishBtnRef.current?.focus();
    allDoneRef.current = allDone;
  }, [allDone]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revue des tags avant publication"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="border-border flex items-start gap-3 border-b px-5 py-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold">Revue des tags avant publication</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {summary.total} {summary.total > 1 ? 'éléments' : 'élément'} new/modifié dans le brouillon. Valide les
              tags existants, ajoute-en si besoin, ou ignore. La publication n&apos;est débloquée que lorsque chaque
              ligne a été tranchée.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted-foreground hover:bg-muted -mr-1 -mt-1 rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {summary.blocks.length === 0 && summary.chapters.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm italic">Aucun élément à revoir.</p>
          )}

          {summary.blocks.length > 0 && (
            <section className="mb-4">
              <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
                Blocs ({summary.blocks.length})
              </h3>
              <div className="space-y-2">
                {summary.blocks.map((b) => (
                  <BlockReviewRow
                    key={b.id}
                    block={b}
                    state={stateOf(`block:${b.id}`)}
                    onValidate={() => setState(`block:${b.id}`, 'validated')}
                    onSkip={() => setState(`block:${b.id}`, 'skipped')}
                    onReset={() => setState(`block:${b.id}`, 'pending')}
                    parcoursSlug={parcoursSlug}
                  />
                ))}
              </div>
            </section>
          )}

          {summary.chapters.length > 0 && (
            <section>
              <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
                Chapitres ({summary.chapters.length})
              </h3>
              <div className="space-y-2">
                {summary.chapters.map((c) => (
                  <ChapterReviewRow
                    key={c.id}
                    chapter={c}
                    state={stateOf(`chapter:${c.id}`)}
                    onValidate={() => setState(`chapter:${c.id}`, 'validated')}
                    onSkip={() => setState(`chapter:${c.id}`, 'skipped')}
                    onReset={() => setState(`chapter:${c.id}`, 'pending')}
                    parcoursSlug={parcoursSlug}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/30 flex items-center gap-3 border-t px-5 py-3">
          <div className="text-muted-foreground flex-1 text-[11px]">
            {counts.validated > 0 && <span className="mr-3">✓ {counts.validated} validé(s)</span>}
            {counts.skipped > 0 && <span className="mr-3">↷ {counts.skipped} ignoré(s)</span>}
            {counts.pending > 0 && <span className="font-medium text-amber-700">⚠ {counts.pending} à revoir</span>}
          </div>
          {/* Bulk actions hidden once there's nothing left to action.
              Keeping them would offer no behaviour change (Publier is
              already enabled) and visually crowd the footer next to
              the now-primary "Publier" button. */}
          {!allDone && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={validateAllTagged}
                title="Valider en bloc les lignes déjà taggées"
              >
                Tout valider (taggés)
              </Button>
              <Button variant="outline" size="sm" onClick={skipAll} title="Ignorer toutes les lignes restantes">
                <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                Tout ignorer
              </Button>
            </>
          )}
          <Button ref={publishBtnRef} onClick={onPublish} disabled={!allDone} size="sm">
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row components                                                      */
/* ------------------------------------------------------------------ */

interface RowProps<T> {
  state: RowState;
  onValidate: () => void;
  onSkip: () => void;
  onReset: () => void;
  parcoursSlug: string;
}

function BlockReviewRow({
  block,
  ...props
}: RowProps<DraftTagReviewSummary['blocks'][number]> & {
  block: DraftTagReviewSummary['blocks'][number];
}) {
  const editHref = `/parcours/${props.parcoursSlug}/chapters/${block.chapterSlug}/blocks/${block.id}`;
  return (
    <RowShell
      icon={<Layers className="h-3.5 w-3.5 text-violet-600" />}
      kind="bloc"
      typeLabel={block.type}
      title={block.summary || `Bloc ${block.type}`}
      subtitle={`Chapitre : ${block.chapterTitle}`}
      diff={block.diff}
      tags={block.tags}
      editHref={editHref}
      {...props}
    >
      <TagsField target={{ kind: 'block', blockId: block.id }} />
    </RowShell>
  );
}

function ChapterReviewRow({
  chapter,
  ...props
}: RowProps<DraftTagReviewSummary['chapters'][number]> & {
  chapter: DraftTagReviewSummary['chapters'][number];
}) {
  const editHref = `/parcours/${props.parcoursSlug}/chapters/${chapter.slug}`;
  return (
    <RowShell
      icon={<Hash className="text-primary h-3.5 w-3.5" />}
      kind="chapitre"
      typeLabel="chapter"
      title={chapter.title}
      subtitle={chapter.slug}
      diff={chapter.diff}
      tags={chapter.tags}
      editHref={editHref}
      {...props}
    >
      <TagsField target={{ kind: 'chapter', chapterId: chapter.id }} />
    </RowShell>
  );
}

/* ------------------------------------------------------------------ */
/* Shared row shell                                                    */
/* ------------------------------------------------------------------ */

interface RowShellProps {
  icon: React.ReactNode;
  kind: 'bloc' | 'chapitre';
  typeLabel: string;
  title: string;
  subtitle?: string;
  diff: 'new' | 'modified';
  tags: Array<{ id: string; label: string; color: string }>;
  editHref: string;
  state: RowState;
  onValidate: () => void;
  onSkip: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

function RowShell(props: RowShellProps) {
  const { state, tags, diff } = props;
  const isCollapsed = state !== 'pending';
  const hasNoTag = tags.length === 0;

  // Border accent : amber when there's nothing to do, gray when
  // settled, green when validated, slate when skipped.
  const border =
    state === 'validated'
      ? 'border-emerald-200 bg-emerald-50/40'
      : state === 'skipped'
        ? 'border-border bg-muted/30'
        : hasNoTag
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-border bg-white';

  return (
    <div className={`rounded-md border ${border} px-3 py-2 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{props.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {props.typeLabel}
            </span>
            <DiffBadge diff={diff} />
            <span className="truncate text-sm font-medium">{props.title}</span>
          </div>
          {props.subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{props.subtitle}</p>}

          {/* Tag chips (always visible — they're the whole point) */}
          {tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {tags.map((t) => {
                const hex = isTagColor(t.color) ? TAG_COLOR_HEX[t.color] : TAG_COLOR_HEX.amber;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: hex.chip, color: hex.text }}
                  >
                    <span aria-hidden="true">🏷</span>
                    <span>{t.label}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-[11px] italic text-amber-700">⚠ Aucun tag</p>
          )}

          {/* Inline editor : only revealed when the row is still
              pending. Once validated or skipped the editor is hidden
              to declutter the modal — clicking "Revoir" reopens it. */}
          {!isCollapsed && (
            <div className="mt-2 rounded border border-dashed border-slate-200 bg-white p-2">{props.children}</div>
          )}
        </div>

        {/* Per-row action column */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {state === 'pending' ? (
            <>
              <Button size="sm" variant="outline" onClick={props.onValidate}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Valider
              </Button>
              <Button size="sm" variant="ghost" onClick={props.onSkip} title={`Ignorer ce ${props.kind}`}>
                <SkipForward className="mr-1 h-3.5 w-3.5" />
                Ignorer
              </Button>
            </>
          ) : (
            <>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  state === 'validated' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {state === 'validated' ? '✓ Validé' : '↷ Ignoré'}
              </span>
              <Button size="sm" variant="ghost" onClick={props.onReset} title="Revoir cette ligne">
                Revoir
              </Button>
            </>
          )}
          <Link
            href={props.editHref}
            target="_blank"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-[10px] hover:underline"
            title="Ouvrir l'éditeur dans un nouvel onglet"
          >
            Éditer
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DiffBadge({ diff }: { diff: 'new' | 'modified' }) {
  if (diff === 'new') {
    return (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
        Nouveau
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
      Modifié
    </span>
  );
}
