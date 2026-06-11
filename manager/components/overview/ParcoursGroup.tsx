'use client';

import { ChevronDown, ChevronRight, Clock, Layers, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FamilyIcon } from '@/lib/familyIcons';
import { cn } from '@/lib/utils';

/**
 * Vue d'ensemble — un parcours = un groupe repliable contenant ses
 * chapitres. Pattern handoff §8 « Vue chapitres » : header de groupe
 * cliquable, fond surface-2 quand ouvert, ChapterRow alignée avec n°
 * mono, titre, slug technique, badge status, count blocs, durée et
 * date d'édition.
 *
 * Client component pour gérer l'état d'ouverture localement (chaque
 * groupe est indépendant — l'éditeur déplie celui qu'il consulte sans
 * que les autres se replient). Pas de persistance — au reload tout
 * est replié sauf `defaultOpen=true`.
 */

export interface OverviewChapter {
  id: string;
  slug: string;
  title: string;
  /** Numéro composé section.chapitre (ex. 2.2). Calculé serveur. */
  positionLabel: string;
  status: ChapterStatus;
  /** Nombre de blocs top-level dans le chapitre. */
  blockCount: number;
  /** Date d'édition relative (« il y a 2 j », « hier »…). */
  editedRelative: string | null;
}

export interface OverviewParcours {
  id: string;
  slug: string;
  name: string;
  chapters: OverviewChapter[];
}

export type ChapterStatus = 'published' | 'draft' | 'review' | 'new' | 'progress' | 'update' | 'outdated';

export function ParcoursGroup({ p, defaultOpen = false }: { p: OverviewParcours; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = p.chapters.length;
  return (
    <div className={cn('transition-colors', open ? 'bg-surface-2' : '')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
          open ? 'border-border border-b' : 'hover:bg-surface-2/50',
        )}
      >
        {open ? (
          <ChevronDown className="text-text-muted h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="text-text-muted h-4 w-4 shrink-0" />
        )}
        <div className="bg-surface-3 border-border text-text-muted inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
          <FamilyIcon family="parcours" className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-text truncate text-sm font-bold tracking-tight">{p.name}</div>
        </div>
        <span className="text-text-faint shrink-0 text-xs font-medium">
          {total} chapitre{total > 1 ? 's' : ''}
        </span>
        <div className="bg-border mx-1 h-4 w-px shrink-0" aria-hidden="true" />
        <Link
          href={`/parcours/${p.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="text-primary-on hover:bg-primary/10 inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Chapitre
        </Link>
      </button>
      {open && (
        <div className="px-2 py-2">
          {p.chapters.length === 0 ? (
            <div className="text-text-faint px-3 py-4 text-center text-xs italic">Aucun chapitre dans ce parcours.</div>
          ) : (
            p.chapters.map((ch) => <ChapterRow key={ch.id} ch={ch} parcoursSlug={p.slug} />)
          )}
        </div>
      )}
    </div>
  );
}

function ChapterRow({ ch, parcoursSlug }: { ch: OverviewChapter; parcoursSlug: string }) {
  return (
    <Link
      href={`/parcours/${parcoursSlug}/chapters/${ch.slug}`}
      className="hover:bg-primary/5 group flex h-14 items-center gap-3 rounded-lg px-2 transition-colors"
    >
      <span className="text-text-muted w-9 shrink-0 text-center font-mono text-xs font-semibold">
        {ch.positionLabel}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-text truncate text-sm font-semibold">{ch.title}</div>
        <div className="text-text-faint truncate font-mono text-[11px]">
          /{parcoursSlug}/{ch.slug}
        </div>
      </div>
      <ChapterStatusTag status={ch.status} />
      <div className="text-text-faint flex w-20 shrink-0 items-center gap-1 text-xs">
        <Layers className="h-3 w-3" />
        <span>
          {ch.blockCount} bloc{ch.blockCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-text-faint w-20 shrink-0 text-right text-xs">
        {ch.editedRelative ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {ch.editedRelative}
          </span>
        ) : null}
      </div>
      <MoreHorizontal className="text-text-faint group-hover:text-text-muted h-4 w-4 shrink-0" />
    </Link>
  );
}

const STATUS_CFG: Record<ChapterStatus, { label: string; classes: string; dot: string }> = {
  published: {
    label: 'Publié',
    classes: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  draft: {
    label: 'Brouillon',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    dot: 'bg-slate-400',
  },
  review: {
    label: 'À relire',
    classes: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  new: {
    label: 'Nouveau',
    classes: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
    dot: 'bg-violet-500',
  },
  progress: {
    label: 'En cours',
    classes: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    dot: 'bg-sky-500',
  },
  update: {
    label: 'À mettre à jour',
    classes: 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
  outdated: {
    label: 'Obsolète',
    classes: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
};

function ChapterStatusTag({ status }: { status: ChapterStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        'inline-flex w-24 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        cfg.classes,
      )}
      title={cfg.label}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// Re-export Pencil for the page (avoid double import in consumer).
export { Pencil };
