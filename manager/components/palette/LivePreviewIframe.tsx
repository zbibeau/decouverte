'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Live block preview embedded in the ⌘K palette. Hosts a single
 * persistent iframe pointing at the Solid `/preview-block` route and
 * postMessages new block payloads as the user highlights different
 * palette rows. Reuses the same isolation contract already used by
 * `LibraryBlockCard` (the iframe sends `preview:isolatedReady`, we
 * reply with `preview:setBlockOverride`).
 *
 * Design choices :
 *   - Persistent iframe : reused across highlight changes via
 *     postMessage, so we boot Solid ONCE per palette session rather
 *     than per row. Subsequent updates are < 50ms.
 *   - Debounced posting (250 ms) : avoids re-rendering the block
 *     mid-arrow-key-scroll. Only posts when the user "stops" on a row.
 *   - Stable preview id `palette-live` : the IsolatedBlockPreview
 *     filters incoming messages by this id, so it has to match.
 *   - Gracefully no-op when `block` is null (palette is on a row that
 *     isn't a block / add-block — we just hide the iframe).
 */

const DEFAULT_PREVIEW_ID = 'palette-live';

interface LivePreviewIframeProps {
  /** Block to render. null/undefined → iframe stays mounted but
   *  invisible (parent decides via `hidden`). */
  block: { type: string; payload: Record<string, unknown> } | null;
  /** Solid client URL (defaults to localhost:3100 — matches the
   *  preview-block iframes used elsewhere in the manager). */
  clientUrl?: string;
  /** Class forwarded to the iframe (height etc.). */
  className?: string;
  /** Identifier used in the preview URL `?id=<previewId>` and in
   *  the `preview:setBlockOverride` blockId — DOIT correspondre
   *  côté Solid (IsolatedBlockPreview filtre par cette valeur).
   *  Permet de distinguer plusieurs iframes simultanées (e.g.
   *  palette ⌘K = `palette-live`, canvas chapter editor =
   *  `canvas-live`). */
  previewId?: string;
}

export function LivePreviewIframe({
  block,
  clientUrl = 'http://localhost:3100',
  className,
  previewId = DEFAULT_PREVIEW_ID,
}: LivePreviewIframeProps) {
  const PREVIEW_ID = previewId;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  /** Last block we successfully sent, so we don't re-post identical
   *  payloads when other unrelated state changes. */
  const lastSentRef = useRef<string | null>(null);

  // Listen for the iframe's "ready" handshake.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:isolatedReady' && String(e.data.blockId ?? '') === PREVIEW_ID) {
        setReady(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Debounced post on block changes. The timeout means a fast arrow
  // scroll doesn't trigger a re-render on every transient row ; only
  // the row the user lingers on for > 250 ms gets pushed.
  useEffect(() => {
    if (!ready || !block) return;
    // Skip identical payloads to avoid noisy re-renders (e.g. when
    // the parent re-creates the object every render with same content).
    const fingerprint = JSON.stringify({ t: block.type, p: block.payload });
    if (lastSentRef.current === fingerprint) return;
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'preview:setBlockOverride',
          blockId: PREVIEW_ID,
          block: { type: block.type, payload: block.payload },
        },
        clientUrl,
      );
      lastSentRef.current = fingerprint;
    }, 250);
    return () => clearTimeout(t);
  }, [ready, block, clientUrl]);

  // Iframe URL is computed ONCE and never updates — if it changed,
  // React would re-set `src` on the iframe, triggering a full reload
  // (re-boot of Solid). We always start with `type=text` ; the actual
  // block type is sent via the postMessage right after boot. The
  // `preview=1` flag suppresses the auto-scroll-past-panorama, and
  // `id=palette-live` keys the postMessage routing on the Solid side.
  const [iframeUrl] = useState(() => `${clientUrl}/preview-block?preview=1&id=${PREVIEW_ID}&type=text`);

  return (
    <iframe
      ref={iframeRef}
      src={iframeUrl}
      title="Aperçu live du bloc"
      sandbox="allow-scripts allow-same-origin"
      className={className}
    />
  );
}
