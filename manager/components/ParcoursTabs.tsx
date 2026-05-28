'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FamilyIcon, type FamilyKey } from '@/lib/familyIcons';
import { cn } from '@/lib/utils';

export function ParcoursTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/parcours/${slug}`;
  const tabs: Array<{ href: string; label: string; family: FamilyKey; active: boolean }> = [
    {
      href: base,
      label: 'Chapitres',
      family: 'chapter',
      active: pathname === base || pathname.startsWith(`${base}/chapters`),
    },
    {
      href: `${base}/variables`,
      label: 'Variables',
      family: 'variable',
      active: pathname.startsWith(`${base}/variables`),
    },
    {
      href: `${base}/navbars`,
      label: 'Navbars',
      family: 'navbar',
      active: pathname.startsWith(`${base}/navbars`),
    },
    {
      href: `${base}/library`,
      label: 'Bibliothèque',
      family: 'library',
      active: pathname.startsWith(`${base}/library`),
    },
  ];
  return (
    <nav className="mt-4 flex gap-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
            t.active
              ? 'border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground border-transparent',
          )}
        >
          <FamilyIcon family={t.family} className="h-4 w-4" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
