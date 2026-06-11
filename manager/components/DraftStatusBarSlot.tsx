'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Wrapper client autour de la DraftStatusBar (qui reste un Server
 * Component async). Cache la barre quand on est dans l'éditeur de
 * chapitre — la EditorTopbar Direction B prend le relais avec son
 * status pill + bouton Publier (alias scroll-to vers la status bar
 * existante quand on est sur une autre page parcours).
 *
 * Pourquoi un client component juste pour ça : le layout est
 * server-side et n'a pas d'accès au pathname sans passer par des
 * gymnastiques d'API headers/segments. usePathname est la solution
 * réactive standard côté client. La barre elle-même reste
 * server-rendered — on ne hide que son wrapper visuel.
 */
export function DraftStatusBarSlot({ parcoursSlug, children }: { parcoursSlug: string; children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const inChapterEditor = pathname.includes(`/parcours/${parcoursSlug}/chapters/`);
  if (inChapterEditor) return null;
  return (
    <div
      data-draft-status-bar
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 -mx-4 px-4 py-2 backdrop-blur"
    >
      {children}
    </div>
  );
}
