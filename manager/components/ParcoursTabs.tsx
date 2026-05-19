'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function ParcoursTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/parcours/${slug}`;
  const tabs = [
    { href: base, label: 'Chapitres', active: pathname === base || pathname.startsWith(`${base}/chapters`) },
    { href: `${base}/variables`, label: 'Variables', active: pathname.startsWith(`${base}/variables`) },
    { href: `${base}/navbars`, label: 'Navbars', active: pathname.startsWith(`${base}/navbars`) },
    { href: `${base}/library`, label: 'Bibliothèque', active: pathname.startsWith(`${base}/library`) },
  ];
  return (
    <nav className="mt-4 flex gap-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'border-b-2 px-3 py-2 text-sm transition-colors',
            t.active
              ? 'border-primary font-medium text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
