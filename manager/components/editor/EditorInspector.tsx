'use client';

import { MousePointer2 } from 'lucide-react';

/**
 * Inspecteur de bloc droite — Direction B (handoff Studio Découverte).
 *
 * Lot 1 : panel placeholder. Aucun bloc sélectionné encore (la
 * sélection arrive en Lot 3) → on affiche l'état vide pour valider
 * l'enveloppe visuelle de la grille 3-col (Sidebar | Canvas papier |
 * Inspector 296).
 *
 * Lots suivants (Lot 3) : ce panel devient contextuel — il hébergera
 * le `PayloadEditor` du bloc actuellement sélectionné (le composant
 * déjà existant — juste re-localisé à droite au lieu d'inline sous
 * la row). Header avec icône + type + sous-titre, body avec les
 * champs, footer avec Dupliquer / Supprimer.
 */
export function EditorInspector() {
  return (
    <aside
      className="border-border bg-surface flex h-full w-[296px] shrink-0 flex-col border-l"
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
