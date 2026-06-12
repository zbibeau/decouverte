'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Iframe Solid pleine surface pour le mode « Aperçu » de la topbar
 * Direction B v9. Auto-scroll au bloc actuellement sélectionné dans
 * l'Inspector via `preview:scrollToBlock` — l'éditeur bascule en
 * aperçu et atterrit DIRECTEMENT sur la partie qu'il était en train
 * d'éditer, sans avoir à scroller manuellement.
 *
 * Protocole :
 *   1. Iframe charge → Solid émet `preview:rendererReady` sur la
 *      window parent (mécanisme existant, utilisé aussi par la
 *      docked preview avant Lot 1).
 *   2. À réception du ready, si `scrollToBlockId` est défini, on
 *      envoie `preview:scrollToBlock` avec l'id + `align: 'start'`
 *      pour scroller en haut de la viewport.
 *   3. Si `scrollToBlockId` change après le boot (l'éditeur change
 *      de sélection sans quitter le mode preview), on re-envoie le
 *      scrollToBlock.
 *
 * Le reloadKey du parent (bumpé sur insert ou autre refresh)
 * remount l'iframe via `key` → on ré-attend le ready handshake et
 * re-déclenche le scroll.
 */
export function PreviewIframeWithScroll({
  previewUrl,
  chapterSlug,
  chapterTitle,
  reloadKey,
  scrollToBlockId,
  clientUrl = 'http://localhost:3100',
}: {
  previewUrl: string;
  chapterSlug: string;
  chapterTitle: string;
  reloadKey: number;
  scrollToBlockId: string | null;
  clientUrl?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  // Reset ready à chaque remount (key bumpé).
  useEffect(() => {
    setReady(false);
  }, [chapterSlug, reloadKey]);

  // Écoute le handshake du renderer Solid.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:rendererReady') {
        setReady(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Auto-scroll au bloc sélectionné dès que ready ET id présent.
  // Re-déclenche aussi quand `scrollToBlockId` change.
  useEffect(() => {
    if (!ready || !scrollToBlockId) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'preview:scrollToBlock', blockId: scrollToBlockId, align: 'start' }, clientUrl);
  }, [ready, scrollToBlockId, clientUrl]);

  return (
    <iframe
      ref={iframeRef}
      key={`preview-${chapterSlug}-${reloadKey}`}
      src={previewUrl}
      title={`Aperçu front du chapitre ${chapterTitle}`}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="h-full w-full border-0 bg-white"
    />
  );
}
