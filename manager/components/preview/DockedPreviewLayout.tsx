'use client';

import { ExternalLink, Monitor, Smartphone } from 'lucide-react';
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
 *
 * Mobile / Desktop toggle : state lifted here so the grid column
 * width can react to the user's choice. 420 px en mobile, 720 px en
 * desktop — le front Solid voit alors un iframe plus large et bascule
 * sur sa version responsive desktop sans hack CSS scale.
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

  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');

  if (isChapterRoute) {
    return <>{children}</>;
  }

  const gridClass =
    deviceMode === 'desktop'
      ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,720px)] lg:gap-6'
      : 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-6';

  return (
    <div className={gridClass}>
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">
        <DockedParcoursPreview
          slug={slug}
          clientUrl={clientUrl}
          deviceMode={deviceMode}
          onDeviceModeChange={setDeviceMode}
        />
      </aside>
    </div>
  );
}

/**
 * Sticky preview pane : header (label + device toggle + open-in-tab)
 * + iframe pointed at the parcours' front. Sticky so the editor can
 * scroll a long variables / library page without losing sight of the
 * live render.
 *
 * The iframe uses the existing `/parcours/<slug>` route — no new
 * route, no new postMessage. If we later need to push the currently-
 * selected variable into the preview, we can reuse
 * `preview:setBlockOverride` or extend via a parcours-scoped
 * variant — that's a separate decision out of Lot 3's scope.
 */
/**
 * Viewport simulé en mode desktop. Doit dépasser `MAX_MOBILE_WIDTH`
 * (=1200) défini dans `src/components/layout/StepperLayout.tsx` côté
 * front Solid, sinon ce dernier reste en rendu mobile/tablet (pas de
 * sidebar gauche, layout collapsé). 1280 px laisse une marge
 * confortable au-dessus de la frontière.
 */
const DESKTOP_VIEWPORT_PX = 1280;

function DockedParcoursPreview({
  slug,
  clientUrl,
  deviceMode,
  onDeviceModeChange,
}: {
  slug: string;
  clientUrl: string;
  deviceMode: 'mobile' | 'desktop';
  onDeviceModeChange: (next: 'mobile' | 'desktop') => void;
}) {
  const publicUrl = useMemo(() => `${clientUrl}/parcours/${slug}`, [clientUrl, slug]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Container qui clip l'iframe scalée. Sa largeur réelle (dépend
  // du viewport via le grid minmax) sert à calculer le scale du
  // mode desktop : `scale = containerW / DESKTOP_VIEWPORT_PX`.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  // Observe le container ; chaque resize recalcule le scale pour
  // rester ajusté quand le user redimensionne la fenêtre. En mode
  // mobile, scale reste à 1 (l'iframe occupe 100% du container).
  useEffect(() => {
    if (deviceMode !== 'desktop') {
      setScale(1);
      return;
    }
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? DESKTOP_VIEWPORT_PX;
      setScale(Math.min(1, w / DESKTOP_VIEWPORT_PX));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [deviceMode]);
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
        {/* Toggle Mobile / Desktop — segmented control miniature
            (cohérent avec le PreviewPanel des pages chapitre). Modifie
            la largeur de la colonne grid au niveau du parent → le
            front Solid voit un viewport plus large et rend sa version
            desktop responsive. */}
        <div className="bg-surface-2 inline-flex shrink-0 gap-0.5 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onDeviceModeChange('mobile')}
            className={
              deviceMode === 'mobile'
                ? 'bg-primary/15 text-primary-on shadow-app-sm inline-flex h-5 w-5 items-center justify-center rounded-[4px]'
                : 'text-text-muted hover:text-text inline-flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors'
            }
            title="Aperçu mobile (420 px)"
            aria-label="Aperçu mobile"
            aria-pressed={deviceMode === 'mobile'}
          >
            <Smartphone className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDeviceModeChange('desktop')}
            className={
              deviceMode === 'desktop'
                ? 'bg-primary/15 text-primary-on shadow-app-sm inline-flex h-5 w-5 items-center justify-center rounded-[4px]'
                : 'text-text-muted hover:text-text inline-flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors'
            }
            title="Aperçu desktop (720 px) — le front rend sa version large"
            aria-label="Aperçu desktop"
            aria-pressed={deviceMode === 'desktop'}
          >
            <Monitor className="h-3 w-3" />
          </button>
        </div>
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
      <div
        ref={frameRef}
        className="border-border bg-surface relative h-[70vh] w-full overflow-hidden rounded-lg border shadow-sm"
      >
        <iframe
          ref={iframeRef}
          src={publicUrl}
          title="Aperçu live du parcours"
          sandbox="allow-scripts allow-same-origin"
          // En mode mobile : l'iframe occupe 100% du container (le
          // front Solid voit la largeur réelle ≈420 px → rendu mobile
          // natif). En mode desktop : largeur physique fixée à
          // 1280 px (> MAX_MOBILE_WIDTH=1200 côté front, qui bascule
          // ainsi sur sa version desktop), puis CSS transform-scale
          // pour rentrer dans le container. La hauteur est gonflée
          // proportionnellement pour que le scaled-down remplisse
          // toujours 100% du wrapper.
          style={
            deviceMode === 'desktop'
              ? {
                  width: `${DESKTOP_VIEWPORT_PX}px`,
                  height: `${100 / (scale || 1)}%`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  border: 0,
                }
              : { height: '100%', width: '100%', border: 0 }
          }
        />
      </div>
    </div>
  );
}
