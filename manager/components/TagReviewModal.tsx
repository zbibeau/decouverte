'use client';

import { AlertTriangle, Check, ChevronRight, Hash, Layers, SkipForward, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { TagsField } from '@/components/blocks/TagsField';
import { Button } from '@/components/ui/Button';
import type { BrokenVariableRef, DraftTagReviewSummary } from '@/lib/actions';
import { isTagColor, TAG_COLOR_HEX } from '@/lib/tagColors';
import { cn } from '@/lib/utils';

/**
 * Pre-publish tag review modal — Tier 3 refactor : **2-pane layout**.
 *
 * Before this refactor, the modal stacked every reviewable row
 * vertically, which became unwieldy on drafts with >20 blocks — the
 * editor lost context between the row they were currently editing
 * and the rest of the queue.
 *
 * The new layout splits the modal into :
 *   - **Left pane (~35% wide)** : compact list of every row to review
 *     (blocks + chapters interleaved, kept in their original order
 *     per group). Each item shows its state pill (pending / validated
 *     / skipped), type, short label, and a coloured dot indicating
 *     "has tags" vs "no tags yet". Scrollable.
 *   - **Right pane (~65% wide)** : full detail of the selected row :
 *     icon + type + diff badge + title + subtitle + current tag
 *     chips + a `TagsField` for inline tag management + the per-row
 *     action buttons (Validate / Skip / Reset / Open in new tab).
 *
 * Selection auto-advances : when the editor validates or skips a row,
 * we jump to the next pending row so they can blow through the queue
 * without clicking the list. The user can still click any row in the
 * list to jump to it manually — useful for revisiting.
 *
 * Validation / skip state is still ephemeral. Tags added inline via
 * `TagsField` are persisted immediately (block/chapter mode hits
 * `setBlockTags` / `setChapterTags`). Publish enables only when every
 * row has been tranched.
 */

type RowState = 'pending' | 'validated' | 'skipped';

interface Props {
  summary: DraftTagReviewSummary;
  onPublish: () => void;
  onClose: () => void;
  parcoursSlug: string;
  brokenRefs?: BrokenVariableRef[];
}

/** Internal flat-list representation used by the left pane. Mixes blocks
 *  and chapters in display order (blocks first, then chapters) so the
 *  editor sees a unified queue. */
interface RowEntry {
  key: string;
  kind: 'bloc' | 'chapitre';
  typeLabel: string;
  title: string;
  subtitle?: string;
  diff: 'new' | 'modified';
  tags: Array<{ id: string; label: string; color: string }>;
  editHref: string;
  /** TagsField target for inline tag management. */
  target: { kind: 'block'; blockId: string } | { kind: 'chapter'; chapterId: string };
  icon: React.ReactNode;
}

export function TagReviewModal({ summary, onPublish, onClose, parcoursSlug, brokenRefs = [] }: Props) {
  // Flatten blocks + chapters into a single row queue. Order : blocks
  // first (as before), chapters next. Stable identity by their join
  // key so React keys + selection survive re-renders.
  const rows = useMemo<RowEntry[]>(() => {
    const out: RowEntry[] = [];
    for (const b of summary.blocks) {
      out.push({
        key: `block:${b.id}`,
        kind: 'bloc',
        typeLabel: b.type,
        title: b.summary || `Bloc ${b.type}`,
        subtitle: `Chapitre : ${b.chapterTitle}`,
        diff: b.diff,
        tags: b.tags,
        editHref: `/parcours/${parcoursSlug}/chapters/${b.chapterSlug}/blocks/${b.id}`,
        target: { kind: 'block', blockId: b.id },
        icon: <Layers className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />,
      });
    }
    for (const c of summary.chapters) {
      out.push({
        key: `chapter:${c.id}`,
        kind: 'chapitre',
        typeLabel: 'chapter',
        title: c.title,
        subtitle: c.slug,
        diff: c.diff,
        tags: c.tags,
        editHref: `/parcours/${parcoursSlug}/chapters/${c.slug}`,
        target: { kind: 'chapter', chapterId: c.id },
        icon: <Hash className="text-primary h-3.5 w-3.5" />,
      });
    }
    return out;
  }, [summary, parcoursSlug]);

  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  // Initial selection : first pending row, else first row, else null.
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (rows.length === 0) return null;
    return rows[0].key;
  });

  function stateOf(rowKey: string): RowState {
    return rowStates[rowKey] ?? 'pending';
  }
  /** Set the state of a row and auto-advance selection to the next
   *  pending row (so the editor doesn't have to click the list). */
  function setStateAndAdvance(rowKey: string, next: RowState) {
    setRowStates((prev) => ({ ...prev, [rowKey]: next }));
    const idx = rows.findIndex((r) => r.key === rowKey);
    if (idx < 0) return;
    // Look forward first, then wrap around to the start.
    for (let i = 1; i <= rows.length; i++) {
      const candidate = rows[(idx + i) % rows.length];
      const s = (candidate.key === rowKey ? next : rowStates[candidate.key]) ?? 'pending';
      if (s === 'pending' && candidate.key !== rowKey) {
        setSelectedKey(candidate.key);
        return;
      }
    }
    // No pending left — stay on the row we just validated so the
    // editor sees the state pill update before they hit Publier.
  }
  function skipAll() {
    const next: Record<string, RowState> = {};
    for (const r of rows) next[r.key] = 'skipped';
    setRowStates(next);
  }
  function validateAllTagged() {
    setRowStates((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (r.tags.length > 0 && (next[r.key] ?? 'pending') === 'pending') {
          next[r.key] = 'validated';
        }
      }
      return next;
    });
  }

  // ESC closes the modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Footer counters.
  const counts = useMemo(() => {
    let validated = 0;
    let skipped = 0;
    let pending = 0;
    for (const r of rows) {
      const s = rowStates[r.key] ?? 'pending';
      if (s === 'validated') validated++;
      else if (s === 'skipped') skipped++;
      else pending++;
    }
    return { validated, skipped, pending, total: rows.length };
  }, [rowStates, rows]);

  const allDone = counts.pending === 0;

  // Auto-focus Publier when all rows are done — one Enter to publish.
  const publishBtnRef = useRef<HTMLButtonElement | null>(null);
  const allDoneRef = useRef(allDone);
  useEffect(() => {
    if (allDone && !allDoneRef.current) publishBtnRef.current?.focus();
    allDoneRef.current = allDone;
  }, [allDone]);

  const selectedRow = selectedKey ? (rows.find((r) => r.key === selectedKey) ?? null) : null;
  const blockCount = summary.blocks.length;

  // Portal to <body> so the overlay escapes any sticky-bar
  // backdrop-filter ancestor (which establishes a containing block
  // for `position: fixed` and would clip the modal).
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revue des tags avant publication"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-surface flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="border-border flex items-start gap-3 border-b px-5 py-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold">Revue des tags avant publication</h2>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {summary.total} {summary.total > 1 ? 'éléments' : 'élément'} new/modifié dans le brouillon. Valide /
              ignore chaque ligne avant de publier.
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

        {/* 2-pane body */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT — compact queue */}
          <div className="border-border flex w-[320px] shrink-0 flex-col border-r">
            {/* Broken refs banner (above the list — affects publish overall) */}
            {brokenRefs.length > 0 && (
              <div className="border-border border-b px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {brokenRefs.length} ref{brokenRefs.length > 1 ? 's' : ''} cassée{brokenRefs.length > 1 ? 's' : ''}
                </div>
                <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
                  Variables référencées mais non déclarées — visiteur tombe sur « undefined ».
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {brokenRefs.map((r) => (
                    <li key={r.key} className="flex items-center gap-1.5 text-[10px]">
                      <code className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                        {r.key}
                      </code>
                      <span className="text-muted-foreground">×{r.count}</span>
                      {r.sampleChapterSlug && (
                        <Link
                          href={`/parcours/${parcoursSlug}/chapters/${r.sampleChapterSlug}`}
                          target="_blank"
                          className="text-amber-800 underline underline-offset-2 dark:text-amber-200"
                        >
                          ↗
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="text-muted-foreground px-3 py-6 text-center text-xs italic">Aucun élément.</p>
              ) : (
                <ul>
                  {rows.map((r, i) => (
                    <CompactRow
                      key={r.key}
                      row={r}
                      state={stateOf(r.key)}
                      isSelected={selectedKey === r.key}
                      onSelect={() => setSelectedKey(r.key)}
                      sectionLabel={
                        // Inject sticky section dividers : Blocs (before
                        // first block) / Chapitres (before first chapter).
                        i === 0 && r.kind === 'bloc'
                          ? `Blocs (${blockCount})`
                          : i === blockCount && r.kind === 'chapitre'
                            ? `Chapitres (${summary.chapters.length})`
                            : null
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT — selected row detail */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            {selectedRow ? (
              <DetailPane
                row={selectedRow}
                state={stateOf(selectedRow.key)}
                onValidate={() => setStateAndAdvance(selectedRow.key, 'validated')}
                onSkip={() => setStateAndAdvance(selectedRow.key, 'skipped')}
                onReset={() => setStateAndAdvance(selectedRow.key, 'pending')}
              />
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs italic">
                Sélectionne une ligne à gauche pour la traiter.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/30 flex items-center gap-3 border-t px-5 py-3">
          <div className="text-muted-foreground flex-1 text-[11px]">
            {counts.validated > 0 && <span className="mr-3">✓ {counts.validated} validé(s)</span>}
            {counts.skipped > 0 && <span className="mr-3">↷ {counts.skipped} ignoré(s)</span>}
            {counts.pending > 0 && (
              <span className="font-medium text-amber-700 dark:text-amber-300">⚠ {counts.pending} à revoir</span>
            )}
          </div>
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
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Left pane — compact row                                             */
/* ------------------------------------------------------------------ */

function CompactRow({
  row,
  state,
  isSelected,
  onSelect,
  sectionLabel,
}: {
  row: RowEntry;
  state: RowState;
  isSelected: boolean;
  onSelect: () => void;
  sectionLabel: string | null;
}) {
  const hasNoTag = row.tags.length === 0;
  return (
    <>
      {sectionLabel && (
        <li className="bg-muted/40 text-text-muted sticky top-0 z-10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
          {sectionLabel}
        </li>
      )}
      <li>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
            isSelected ? 'bg-primary/10 border-primary border-l-2' : 'hover:bg-muted/40 border-l-2 border-transparent',
          )}
        >
          {/* state dot */}
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
              state === 'validated' && 'bg-emerald-500',
              state === 'skipped' && 'bg-slate-400',
              state === 'pending' && (hasNoTag ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'),
            )}
            aria-hidden="true"
          />
          {row.icon}
          <span className="min-w-0 flex-1 truncate text-xs">{row.title}</span>
          {/* state pill (compact) */}
          {state === 'validated' && <span className="text-[10px] text-emerald-700 dark:text-emerald-300">✓</span>}
          {state === 'skipped' && <span className="text-text-muted text-[10px]">↷</span>}
          {state === 'pending' && hasNoTag && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300">⚠</span>
          )}
        </button>
      </li>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Right pane — detail of the selected row                             */
/* ------------------------------------------------------------------ */

function DetailPane({
  row,
  state,
  onValidate,
  onSkip,
  onReset,
}: {
  row: RowEntry;
  state: RowState;
  onValidate: () => void;
  onSkip: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Detail header */}
      <div className="border-border space-y-2 border-b px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {row.icon}
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {row.typeLabel}
          </span>
          <DiffBadge diff={row.diff} />
          <h3 className="text-sm font-semibold">{row.title}</h3>
        </div>
        {row.subtitle && <p className="text-muted-foreground text-xs">{row.subtitle}</p>}
      </div>

      {/* Detail body — current tags + TagsField editor */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <section>
          <h4 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">Tags posés</h4>
          {row.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {row.tags.map((t) => {
                const hex = isTagColor(t.color) ? TAG_COLOR_HEX[t.color] : TAG_COLOR_HEX.amber;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: hex.chip, color: hex.text }}
                  >
                    <span aria-hidden="true">🏷</span>
                    <span>{t.label}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] italic text-amber-700 dark:text-amber-300">⚠ Aucun tag — pense à en ajouter.</p>
          )}
        </section>

        <section>
          <h4 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">Ajouter / retirer</h4>
          <div className="bg-surface rounded border border-dashed border-slate-200 p-2 dark:border-slate-700/60">
            {row.target.kind === 'block' ? (
              <TagsField target={{ kind: 'block', blockId: row.target.blockId }} />
            ) : (
              <TagsField target={{ kind: 'chapter', chapterId: row.target.chapterId }} />
            )}
          </div>
        </section>
      </div>

      {/* Detail footer — per-row actions */}
      <div className="border-border bg-muted/30 flex items-center justify-between gap-2 border-t px-5 py-3">
        <Link
          href={row.editHref}
          target="_blank"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-[11px] hover:underline"
          title="Ouvrir l'éditeur dans un nouvel onglet"
        >
          Éditer le {row.kind}
          <ChevronRight className="h-3 w-3" />
        </Link>
        <div className="flex items-center gap-2">
          {state === 'pending' ? (
            <>
              <Button size="sm" variant="ghost" onClick={onSkip} title={`Ignorer ce ${row.kind}`}>
                <SkipForward className="mr-1 h-3.5 w-3.5" />
                Ignorer
              </Button>
              <Button size="sm" onClick={onValidate}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Valider
              </Button>
            </>
          ) : (
            <>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  state === 'validated'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                }`}
              >
                {state === 'validated' ? '✓ Validé' : '↷ Ignoré'}
              </span>
              <Button size="sm" variant="outline" onClick={onReset} title="Repasser cette ligne en pending">
                Revoir
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffBadge({ diff }: { diff: 'new' | 'modified' }) {
  if (diff === 'new') {
    return (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
        Nouveau
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
      Modifié
    </span>
  );
}
