'use client';

import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';

interface ParcoursRow {
  id: string;
  slug: string;
  name: string;
  published_version_id: string | null;
}

/**
 * Client wrapper around the parcours list to wire keyboard navigation:
 *   ↑↓ to highlight a row, Enter to open it. The currently-selected row
 *   gets a ring highlight to make the focus visible.
 *
 * Rendered by the home page (`app/(app)/page.tsx`).
 */
export function ParcoursGrid({ parcours }: { parcours: ParcoursRow[] }) {
  const { selectedIdx, isClient } = useListKeyboardNav(
    parcours,
    (p) => `/parcours/${p.slug}`,
    null, // top-level — no parent
  );

  if (parcours.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-muted-foreground">
          Aucun parcours. Exécutez les migrations SQL de seed pour en créer un.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {parcours.map((p, idx) => (
        <Link key={p.id} href={`/parcours/${p.slug}`}>
          <Card
            className={
              'transition-colors ' +
              (isClient && idx === selectedIdx
                ? 'border-brand-primary-400 bg-brand-primary-50/40 ring-2 ring-brand-primary-300/40'
                : 'hover:border-brand-primary-200 hover:bg-brand-primary-50/30')
            }
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-primary-50 text-brand-primary-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{p.name}</CardTitle>
                    {p.published_version_id ? (
                      <Badge tone="success">publié</Badge>
                    ) : (
                      <Badge tone="warning">brouillon</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    slug : <code>{p.slug}</code>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
