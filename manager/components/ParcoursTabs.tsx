'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FamilyIcon, type FamilyKey } from '@/lib/familyIcons';
import { cn } from '@/lib/utils';

/**
 * Onglets de navigation parcours (Chapitres / Variables / Navbars /
 * Bibliothèque). Style « pill » Studio : conteneur `surface-2`, onglet actif
 * = pilule `surface` + ombre douce + texte violet, inactif = texte muted +
 * hover surface-3.
 *
 * Masqué sur l'écran « éditeur de chapitre » (`/parcours/<slug>/chapters/<slug>`)
 * parce que sur cette vue le rail latéral porte déjà la navigation par
 * famille (icônes parcours / chapter / variable / navbar / library) et les
 * onglets de l'en-tête deviennent redondants — le header reste sobre.
 */
export function ParcoursTabs({ slug }: { slug: string }) {
  const pathname = usePathname() ?? '';
  const base = `/parcours/${slug}`;
  // Détecte « éditeur de chapitre » = `…/chapters/<chapterSlug>` (au moins
  // un segment APRÈS `chapters`). La page liste-chapitres `…` ou `…/chapters`
  // (sans slug) garde les onglets — c'est elle qui en est le foyer.
  const isChapterEditor = /\/chapters\/[^/]+/.test(pathname);
  if (isChapterEditor) return null;

  // Réduction à 2 entrées : « Chapitres » et « Bibliothèque ». L'onglet
  // Bibliothèque accueille les 4 sous-tabs (Blocs / Top bar / Variables /
  // Tags) via `LibrarySectionTabs` au sein de chaque page de section. Le
  // détecteur « active » de Bibliothèque inclut donc /library, /navbars
  // ET /variables (qui sont désormais des sous-sections, mais conservent
  // leurs URLs historiques pour les deep-links).
  const tabs: Array<{ href: string; label: string; family: FamilyKey; active: boolean }> = [
    {
      href: base,
      label: 'Chapitres',
      family: 'chapter',
      active: pathname === base || pathname.startsWith(`${base}/chapters`),
    },
    {
      href: `${base}/library`,
      label: 'Bibliothèque',
      family: 'library',
      active:
        pathname.startsWith(`${base}/library`) ||
        pathname.startsWith(`${base}/navbars`) ||
        pathname.startsWith(`${base}/variables`),
    },
  ];
  return (
    <nav
      // `inline-flex` + container surface-2 + p-[3px] + rounded-[11px] crée
      // la « tablette » que les onglets habitent. L'espacement vertical
      // autour est géré par la bande parente dans `(app)/parcours/[slug]/
      // layout.tsx` (`py-3` centré), donc aucun `mt-*` ici.
      className="bg-surface-2 inline-flex gap-0.5 rounded-[11px] p-[3px]"
    >
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[8px] px-3 py-[7px] text-[13px] transition-colors',
            t.active
              ? 'bg-surface text-primary-on shadow-app-sm font-medium'
              : 'text-text-muted hover:text-text hover:bg-surface-3/60',
          )}
        >
          <FamilyIcon family={t.family} className="h-4 w-4" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
