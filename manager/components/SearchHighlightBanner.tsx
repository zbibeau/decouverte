'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Yellow banner that appears at the top of the chapter / block editor
 * when the user landed on the page from a ⌘K search (the palette
 * appends `?q=<query>` to the navigation URL). Shows the original
 * query + a match count + a clear button.
 *
 * Clearing strips the `q` param from the URL via `router.replace`
 * (no page reload), so the dependent block-row highlights vanish
 * along with the banner.
 *
 * Pure presentational component : the parent decides the match count
 * by passing it in. Renders nothing when no query is present.
 */
export function SearchHighlightBanner({ matchCount }: { matchCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim();

  if (!q) return null;

  function handleClear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <div className="flex min-w-0 items-center gap-2">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Recherche : <strong>« {q} »</strong>
          {typeof matchCount === 'number' && (
            <span className="ml-2 text-amber-800/80">
              ·{' '}
              {matchCount === 0
                ? 'aucun bloc correspondant ici'
                : `${matchCount} bloc${matchCount > 1 ? 's' : ''} correspondant${matchCount > 1 ? 's' : ''}`}
            </span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
        title="Effacer la recherche"
      >
        <X className="h-3 w-3" />
        Effacer
      </button>
    </div>
  );
}
