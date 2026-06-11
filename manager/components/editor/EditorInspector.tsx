'use client';

import type { ContentBlock } from '@shared/content-schema';
import { Copy, MousePointer2, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { BlockThumb } from '@/components/blocks/BlockThumb';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';

/**
 * Inspecteur de bloc droite — Direction B (handoff Studio Découverte).
 *
 * Lot 3 : panel contextuel. Quand un bloc est sélectionné dans le
 * canvas, l'inspecteur affiche :
 *   - header : icône type + libellé « Bloc <Type> » + bouton fermer ✕
 *   - body : enfants (typiquement le `InlineBlockEditor` hébergé ici
 *     au lieu d'être expansé sous la row du canvas).
 *   - footer : Dupliquer / Supprimer (ghost + danger).
 *
 * Quand aucun bloc n'est sélectionné, on rend l'état vide (Lot 1).
 *
 * Largeur 360 px — un peu plus large que les 296 px de la maquette
 * pour que le PayloadEditor existant rentre confortablement (il a été
 * conçu pour vivre dans une row pleine largeur, pas dans une colonne
 * étroite). À ajuster si besoin sur retours utilisateurs.
 */
export function EditorInspector({
  selectedBlock,
  onClose,
  onDuplicate,
  onDelete,
  children,
}: {
  /** Bloc actuellement sélectionné dans le canvas. `null` → état vide. */
  selectedBlock: { id: string; type: string } | null;
  /** Désélectionne le bloc (ferme l'inspecteur sans agir dessus). */
  onClose?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Contenu du body — typiquement l'InlineBlockEditor du bloc
   *  sélectionné, monté par ChapterEditor. */
  children?: ReactNode;
}) {
  if (!selectedBlock) {
    return (
      <aside
        className="border-border bg-surface flex h-full w-[420px] shrink-0 flex-col border-l"
        aria-label="Inspecteur de bloc"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="bg-surface-2 border-border text-text-faint inline-flex h-12 w-12 items-center justify-center rounded-xl border">
            <MousePointer2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-text text-sm font-semibold">Aucun bloc sélectionné</p>
            <p className="text-text-muted mt-1 text-xs">
              Clique sur un bloc dans le canvas pour voir et éditer ses options ici.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const typeLabel = (BLOCK_TYPE_LABELS as Record<string, string>)[selectedBlock.type] ?? selectedBlock.type;

  return (
    <aside
      className="border-border bg-surface flex h-full w-[420px] shrink-0 flex-col border-l"
      aria-label="Inspecteur de bloc"
    >
      {/* Header : icône type + libellé + fermer */}
      <div className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <BlockThumb type={selectedBlock.type as ContentBlock['type']} />
        <div className="min-w-0 flex-1">
          <p className="text-text text-sm font-semibold">Bloc {typeLabel}</p>
          <p className="text-text-faint truncate font-mono text-[10px]">{selectedBlock.id}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Désélectionner (Esc)"
            aria-label="Fermer l'inspecteur"
            className="text-text-muted hover:bg-muted hover:text-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body : InlineBlockEditor (ou autre contenu contextuel) */}
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

      {/* Footer : Dupliquer / Supprimer */}
      <div className="border-border flex gap-2 border-t px-3 py-2.5">
        <button
          type="button"
          onClick={onDuplicate}
          disabled={!onDuplicate}
          className="text-text-muted hover:bg-muted hover:text-text inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" />
          Dupliquer
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!onDelete}
          className="text-text-muted inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </aside>
  );
}
