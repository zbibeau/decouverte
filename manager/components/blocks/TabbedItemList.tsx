'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Rendu d'une liste d'items SIMILAIRES (questions d'un form, photos d'un
 * carousel, items d'une keyPointsCard…) sous forme d'onglets : un seul item
 * affiché à la fois, le reste accessible via un tab strip horizontal.
 *
 * Inspiration : `ConditionalEditor` (onglets Alors/Sinon). Même logique mais
 * généralisée à un nombre dynamique d'items.
 *
 * Comportement :
 *   - Si `items.length <= 1` : pas de tab strip, render direct (un seul item
 *     n'a aucun besoin d'onglet, ce serait juste du bruit visuel).
 *   - Plusieurs items : tab strip horizontale scrollable (overflow-x), un
 *     onglet par item (label = `getLabel(item, idx)`). Onglet actif = surface
 *     + ombre + texte violet (cohérent avec ParcoursTabs + LibrarySectionTabs).
 *   - Auto-clamp de l'index actif quand `items` rétrécit (delete) ou quand
 *     l'utilisateur ajoute → focus sur le nouveau dernier item.
 *   - Actions move up/down/delete + bouton "+ Ajouter" centralisées dans le
 *     header de la liste (le bouton "+ Ajouter" reste visible quand un onglet
 *     est ouvert, c'est le call-to-action de la liste, pas de l'item actif).
 *
 * Type générique `T` parce que chaque caller injecte sa propre shape d'item
 * (FormField, CarouselPhoto, KeyPointItem…). Le composant n'en lit rien — il
 * délègue tout au renderItem + getLabel.
 */
export interface TabbedItemListProps<T> {
  /** Liste d'items à rendre. */
  items: T[];
  /** Libellé court affiché sur l'onglet (typiquement "Question #1", "Photo #1"). */
  getLabel: (item: T, idx: number) => string;
  /** Rendu du panel actif. Reçoit l'item + son index. */
  renderItem: (item: T, idx: number) => React.ReactNode;
  /** Ajout d'un item — push à la fin + focus auto sur le nouveau dernier onglet. */
  onAdd?: () => void;
  /** Suppression d'un item à `idx`. Le composant clamp activeIdx tout seul. */
  onRemove: (idx: number) => void;
  /** Move up (-1) / down (+1) à `idx`. */
  onMove: (idx: number, dir: -1 | 1) => void;
  /** Texte du bouton "+ Ajouter" (par défaut "Ajouter"). */
  addLabel?: string;
  /** Titre du bloc liste (ex. "Questions (4)"). */
  title?: string;
  /** Texte affiché quand `items` est vide. */
  emptyText?: string;
}

export function TabbedItemList<T>(props: TabbedItemListProps<T>) {
  const { items, getLabel, renderItem, onAdd, onRemove, onMove, addLabel = 'Ajouter', title, emptyText } = props;
  const [activeIdx, setActiveIdx] = useState(0);

  // Clamp / refocus : quand la liste rétrécit (delete) on borne activeIdx ;
  // quand elle grandit on focus le nouveau dernier item (UX "j'ai cliqué
  // Ajouter, je veux éditer ce que je viens d'ajouter").
  const lastLengthRef = useStableRef(items.length);
  useEffect(() => {
    const prev = lastLengthRef.prev;
    const curr = items.length;
    if (curr === 0) {
      setActiveIdx(0);
    } else if (curr > prev) {
      // Item ajouté → focus dessus.
      setActiveIdx(curr - 1);
    } else if (activeIdx >= curr) {
      // Item supprimé sous notre index → clamp au dernier.
      setActiveIdx(curr - 1);
    }
    lastLengthRef.prev = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const safeActive = Math.max(0, Math.min(activeIdx, items.length - 1));
  const active = items[safeActive];

  return (
    <div className="space-y-3">
      {/* Header : titre + bouton "+ Ajouter" pleine largeur du bloc. */}
      {(title || onAdd) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{title}</span>
          )}
          {onAdd && (
            <Button size="sm" variant="outline" onClick={onAdd} className="ml-auto">
              <Plus className="mr-1 h-3.5 w-3.5" /> {addLabel}
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && emptyText && <p className="text-muted-foreground text-xs">{emptyText}</p>}

      {/* Tab strip — affiché uniquement quand il y a au moins 2 items
          (cas où un onglet a un intérêt). Scroll horizontal si débordement. */}
      {items.length >= 2 && (
        <div
          role="tablist"
          aria-label={title ?? 'Liste'}
          className="border-border flex flex-nowrap items-center gap-1 overflow-x-auto border-b pb-px"
        >
          {items.map((item, idx) => {
            const isActive = idx === safeActive;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  '-mb-px inline-flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-border bg-surface text-primary-on'
                    : 'bg-surface-2/40 text-text-muted hover:bg-surface-3/60 hover:text-text border-transparent',
                )}
              >
                {getLabel(item, idx)}
              </button>
            );
          })}
        </div>
      )}

      {/* Active item panel + actions move/delete. */}
      {items.length > 0 && active !== undefined && (
        <div className="border-border bg-surface space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              {getLabel(active, safeActive)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove(safeActive, -1)}
                disabled={safeActive === 0}
                title="Déplacer vers le haut"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove(safeActive, 1)}
                disabled={safeActive === items.length - 1}
                title="Déplacer vers le bas"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRemove(safeActive)} title="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {renderItem(active, safeActive)}
        </div>
      )}
    </div>
  );
}

/**
 * Petit utilitaire : un ref qui mémorise la valeur du render précédent.
 * Utilisé pour détecter les transitions `prev → curr` (ajout vs suppression).
 * On n'utilise pas `useRef` directement pour avoir un wrap propre et lint-safe.
 */
function useStableRef<T>(initial: T): { prev: T } {
  // Inline import would force a hooks/react import alongside; on garde
  // `useState` qu'on a déjà dans le scope du composant via React.
  const [ref] = useState(() => ({ prev: initial }));
  return ref;
}
