'use client';

import { Check, ChevronRight, ExternalLink, Eye, Undo } from 'lucide-react';
import Link from 'next/link';

/**
 * Topbar de l'éditeur de chapitre — Direction B (handoff Studio Découverte).
 *
 * Layout :
 *   - Hauteur 60 px, fond `--surface`, bord bas `--border`, padding
 *     horizontal 24 px.
 *   - À gauche : fil d'Ariane « Découverte › <Parcours> › Chapitre N »
 *     avec chevrons fins en `--text-faint`. Le dernier crumb est le
 *     plus visible (15 px / 700) ; les intermédiaires sont en
 *     `--text-muted` (14 px / 500) et cliquables (chacun renvoie sur
 *     son écran parent).
 *   - À droite : badge de statut → séparateur vertical → indicateur
 *     « Enregistré » → undo → aperçu médecin → bouton « Aperçu »
 *     (default) → bouton « Publier » (primary).
 *
 * Remplace l'ancien header `Retour aux chapitres / titre / slug` qui
 * vivait au-dessus de la Card Blocs. Pour Lot 1, on garde une stub
 * pour la plupart des actions — le câblage réel (undo /
 * aperçu médecin / Publier) viendra dans les lots suivants. Le bouton
 * « Aperçu » (externalLink) ouvre l'iframe front dans un nouvel
 * onglet — il remplace l'ancienne docked PreviewPanel.
 */
export function EditorTopbar({
  parcoursSlug,
  parcoursName,
  chapterNumber,
  chapterTitle,
  status,
  previewUrl,
  onUndo,
  onPreviewMedecin,
  onPublish,
  saved = true,
}: {
  parcoursSlug: string;
  parcoursName: string;
  /** « 1.1 », « 2.2 », etc. Calculé depuis l'ordre du chapitre dans la
   *  hiérarchie du parcours (section.order, chapter.order). */
  chapterNumber?: string;
  chapterTitle: string;
  /** Statut affiché en pill (StatusTag). Pour Lot 1 on accepte
   *  'review' (à relire) par défaut — le câblage sur le vrai
   *  status de brouillon viendra plus tard. */
  status?: 'published' | 'draft' | 'review' | 'new' | 'progress' | 'update' | 'outdated';
  /** URL publique du chapitre côté front Solid (ouverte dans un
   *  nouvel onglet par le bouton « Aperçu »). */
  previewUrl: string;
  /** Indicateur « Enregistré » à côté du statut. Pour Lot 1 toujours
   *  vrai (l'auto-save est déjà en place dans InlineBlockEditor). */
  saved?: boolean;
  onUndo?: () => void;
  onPreviewMedecin?: () => void;
  onPublish?: () => void;
}) {
  return (
    <div className="border-border bg-surface flex h-[60px] shrink-0 items-center gap-3 border-b px-6">
      {/* Fil d'Ariane gauche */}
      <nav aria-label="Fil d'Ariane" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <Link href="/" className="text-text-muted hover:text-text font-medium transition-colors">
          Découverte
        </Link>
        <ChevronRight className="text-text-faint h-3.5 w-3.5 shrink-0" />
        <Link
          href={`/parcours/${parcoursSlug}`}
          className="text-text-muted hover:text-text truncate font-medium transition-colors"
        >
          {parcoursName}
        </Link>
        <ChevronRight className="text-text-faint h-3.5 w-3.5 shrink-0" />
        <span className="text-text truncate text-[15px] font-bold" title={chapterTitle}>
          {chapterNumber ? `Chapitre ${chapterNumber}` : chapterTitle}
        </span>
      </nav>

      {/* Actions droites */}
      <div className="flex shrink-0 items-center gap-2">
        {status && <TopbarStatusTag status={status} />}
        <div className="bg-border h-5 w-px" aria-hidden="true" />
        <span className="text-text-faint inline-flex items-center gap-1.5 text-[12.5px]">
          {saved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Enregistré
            </>
          ) : (
            <span className="text-amber-500">Modifications non sauvegardées</span>
          )}
        </span>
        <button
          type="button"
          onClick={onUndo}
          disabled={!onUndo}
          title="Annuler"
          aria-label="Annuler"
          className="text-text-muted hover:bg-muted hover:text-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onPreviewMedecin}
          disabled={!onPreviewMedecin}
          title="Aperçu médecin"
          aria-label="Aperçu médecin"
          className="text-text-muted hover:bg-muted hover:text-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eye className="h-4 w-4" />
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          title="Ouvrir le chapitre dans un nouvel onglet"
          className="border-border-strong bg-surface text-text hover:bg-surface-2 shadow-app-sm inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-semibold transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Aperçu
        </a>
        <button
          type="button"
          onClick={onPublish}
          disabled={!onPublish}
          title="Publier le chapitre"
          className="bg-brand-primary-600 hover:bg-brand-primary-700 shadow-brand inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Publier
        </button>
      </div>
    </div>
  );
}

/**
 * Status pill inline pour la topbar. Mappe les 7 statuts du design
 * (published / draft / review / new / progress / update / outdated)
 * vers un ton et un label. Forme pilule compacte (h-5 / text-[11px]).
 *
 * Note : le composant `Badge` du repo a une API tone restreinte
 * (success/warning/destructive/info). Ici on a besoin de 7 tons
 * distincts → composant local dédié.
 */
function TopbarStatusTag({
  status,
}: {
  status: 'published' | 'draft' | 'review' | 'new' | 'progress' | 'update' | 'outdated';
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.classes}`}
      title={cfg.label}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

const STATUS_CONFIG: Record<
  'published' | 'draft' | 'review' | 'new' | 'progress' | 'update' | 'outdated',
  { label: string; classes: string; dot: string }
> = {
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
