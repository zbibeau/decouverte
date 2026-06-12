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
  //
  // Note race condition : la URL contient `?step=<chapter>` qui
  // déclenche un scroll initial AU CHAPITRE quand le front charge.
  // Si on envoie scrollToBlock immédiatement après rendererReady,
  // notre scroll est exécuté puis le step= scroll arrive et écrase
  // la position. On envoie donc PLUSIEURS fois avec des delays
  // croissants — la dernière émission gagne la course. C'est laid
  // mais robuste, et le coût d'un postMessage est négligeable.
  // align: 'center' = default Solid → le bloc édité atterrit
  // pile au centre de la viewport, plus naturel que 'start'.
  useEffect(() => {
    if (!ready || !scrollToBlockId) return;
    const send = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage({ type: 'preview:scrollToBlock', blockId: scrollToBlockId, align: 'center' }, clientUrl);
    };
    // Émissions échelonnées : 100ms (immédiat post-ready), 600ms
    // (après le scroll initial step=), 1400ms (filet de sécurité).
    const t1 = setTimeout(send, 100);
    const t2 = setTimeout(send, 600);
    const t3 = setTimeout(send, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
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
