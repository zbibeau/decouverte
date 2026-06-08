'use client';

import { ExternalLink } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Layout wrapper that docks a slim block-preview iframe to the right
 * of the parcours pages where it makes sense. The aside is rendered
 * on every parcours sub-page EXCEPT the chapter editor (which keeps
 * its own rich `<PreviewPanel>` — that one already drives the iframe
 * with the full Lot-3 protocol `preview:setBlockOverride /
 * scrollToBlock / setEditedBlock`).
 *
 * Why a wrapper rather than a fixed `position: fixed` overlay :
 *   - The wrapper participates in the document flow, so the main
 *     content never sits under the preview (no overlap on narrow lg
 *     viewports).
 *   - The grid collapses cleanly on `< lg` — the preview disappears,
 *     no media query gymnastics elsewhere.
 *
 * No new `preview:*` message is invented. The aside iframe loads the
 * parcours' own front URL (`/parcours/<slug>`) — same renderer the
 * editor previews, just unscoped to a single block. When a parcours-
 * level setting changes (variables, navbars, library) the editor can
 * already see its impact by glancing right.
 */
export function DockedPreviewLayout({
  slug,
  clientUrl = 'http://localhost:3100',
  children,
}: {
  slug: string;
  clientUrl?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  // On the chapter editor we DON'T render the aside : that page owns
  // its own grid + rich PreviewPanel. Layering ours on top would
  // shrink the editor surface AND double-mount the iframe (the chapter
  // page's PreviewPanel sends `preview:setBlockOverride` with a
  // different `blockId`, so a second iframe wouldn't get them anyway —
  // it'd just sit there idle, wasting space).
  const isChapterRoute = pathname.includes(`/parcours/${slug}/chapters/`);

  if (isChapterRoute) {
    return <>{children}</>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-6">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">
        <DockedParcoursPreview slug={slug} clientUrl={clientUrl} />
      </aside>
    </div>
  );
}

/**
 * Sticky preview pane : header (label + open-in-tab) + iframe pointed
 * at the parcours' front. Sticky so the editor can scroll a long
 * variables / library page without losing sight of the live render.
 *
 * The iframe uses the existing `/parcours/<slug>` route — no new
 * route, no new postMessage. If we later need to push the currently-
 * selected variable into the preview, we can reuse
 * `preview:setBlockOverride` or extend via a parcours-scoped
 * variant — that's a separate decision out of Lot 3's scope.
 */
function DockedParcoursPreview({ slug, clientUrl }: { slug: string; clientUrl: string }) {
  const publicUrl = useMemo(() => `${clientUrl}/parcours/${slug}`, [clientUrl, slug]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // `key` bumped on chapter changes from the iframe — keeps the
  // sticky pane in sync if the visitor inside the iframe navigates
  // (e.g. front-side chapter pagination). Listens for the existing
  // `preview:chapterChanged` message ; we don't act on it beyond
  // logging — Lot 3 spec is "no new messages, no new behaviour".
  const [chapterEcho, setChapterEcho] = useState<string | null>(null);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:chapterChanged' && typeof e.data.chapterSlug === 'string') {
        setChapterEcho(e.data.chapterSlug);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="sticky top-20 flex flex-col">
      <div className="text-text-muted mb-2 flex items-center gap-2 text-[11px]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500/70" />
        <span className="flex-1 truncate">
          Aperçu live du parcours
          {chapterEcho && (
            <span className="text-text-faint">
              {' · '}
              <code className="font-mono">{chapterEcho}</code>
            </span>
          )}
        </span>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-text-muted hover:text-primary-on inline-flex items-center gap-1 transition-colors"
          title="Ouvrir le parcours public (nouvel onglet)"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="border-border bg-surface overflow-hidden rounded-lg border shadow-sm">
        <iframe
          ref={iframeRef}
          src={publicUrl}
          title="Aperçu live du parcours"
          sandbox="allow-scripts allow-same-origin"
          className="h-[70vh] w-full"
        />
      </div>
    </div>
  );
}
