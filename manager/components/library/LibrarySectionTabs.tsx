'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FamilyIcon, type FamilyKey } from '@/lib/familyIcons';
import { cn } from '@/lib/utils';

/**
 * Sous-onglets de la section « Bibliothèque » : Blocs · Top bar · Variables ·
 * Tags. Chacun navigue vers une URL dédiée (= les 4 pages cohabitent au même
 * niveau hiérarchique, partagent ce composant qu'elles montent en tête),
 * plutôt qu'un toggle d'état local — comme ça les deep-links marchent, le
 * back/forward du navigateur aussi, et le `loading.tsx` de Next se déclenche
 * proprement à chaque switch.
 *
 * « Top bar » est l'étiquette user-facing de ce qu'on nomme « navbar » dans
 * le schéma (URL `/navbars`, types `NavbarVariant…`). On garde la
 * terminologie technique côté code et on renomme seulement à l'affichage.
 */
export function LibrarySectionTabs({ slug }: { slug: string }) {
  const pathname = usePathname() ?? '';
  const base = `/parcours/${slug}`;

  const tabs: Array<{ href: string; label: string; family: FamilyKey; active: boolean }> = [
    {
      href: `${base}/library`,
      label: 'Blocs',
      family: 'block',
      // /library = Blocs, /library/tags = Tags → match exact pour ne pas
      // que /library/tags active aussi le Blocs.
      active: pathname === `${base}/library`,
    },
    {
      href: `${base}/navbars`,
      label: 'Top bar',
      family: 'navbar',
      active: pathname.startsWith(`${base}/navbars`),
    },
    {
      href: `${base}/variables`,
      label: 'Variables',
      family: 'variable',
      active: pathname.startsWith(`${base}/variables`),
    },
    {
      href: `${base}/library/tags`,
      label: 'Tags',
      family: 'tag',
      active: pathname.startsWith(`${base}/library/tags`),
    },
  ];

  return (
    <nav
      // Pilule Studio identique aux onglets top-level (cohérence visuelle) :
      // `surface-2` + `p-[3px]` + `rounded-[11px]`, onglet actif sur surface
      // blanche + shadow douce + violet.
      className="bg-surface-2 inline-flex gap-0.5 rounded-[11px] p-[3px]"
      role="tablist"
      aria-label="Sections de la bibliothèque"
    >
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={t.active}
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
