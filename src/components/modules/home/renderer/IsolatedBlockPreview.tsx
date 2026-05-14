import type { Chapter, ContentBlock } from '@shared/content-schema';
import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';

import { HOME_SECTION_PROPS } from '../utils/HomeUtils';
import { ChapterRenderer } from './ChapterRenderer';

/**
 * Standalone "single block" preview used by the manager when CREATING a new
 * block. The chapter is synthetic — it carries one placeholder block whose
 * id matches the block being edited; the manager then pushes the actual
 * payload via `preview:setBlockOverride` postMessage and the renderer
 * remounts the placeholder with the live override.
 *
 * Until the first override message arrives (or while the payload is still
 * empty), we show a friendly waiting state instead of trying to render an
 * empty block — most block renderers crash on missing required fields
 * (e.g. heroTitle.title), which would otherwise surface as a Next.js
 * error overlay in the manager iframe.
 */
export const IsolatedBlockPreview: Component<
  HOME_SECTION_PROPS & { blockId: string; blockType: string }
> = (props) => {
  // We capture the full block (type + payload) from the parent's postMessage
  // and use it DIRECTLY in the synthesized chapter — instead of relying on
  // `ChapterRenderer`'s own `setBlockOverride` listener. That listener would
  // miss the first message because ChapterRenderer is only mounted once
  // `hasContent` flips to true, which happens AFTER the message has been
  // dispatched. Storing the block locally avoids that race.
  const [liveBlock, setLiveBlock] = createSignal<
    (ContentBlock & { id: string }) | null
  >(null);

  onMount(() => {
    if (typeof window === 'undefined') return;
    function handler(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return;
      if (
        e.data.type === 'preview:setBlockOverride' &&
        String(e.data.blockId ?? '') === props.blockId &&
        e.data.block &&
        typeof e.data.block === 'object'
      ) {
        const incoming = e.data.block as { type?: string; payload?: unknown };
        const payload = incoming.payload;
        const hasKeys =
          payload && typeof payload === 'object' && Object.keys(payload as object).length > 0;
        if (!hasKeys) return;
        setLiveBlock({
          id: props.blockId,
          type: (incoming.type ?? props.blockType) as ContentBlock['type'],
          payload: payload as Record<string, unknown>,
        } as ContentBlock & { id: string });
      }
    }
    window.addEventListener('message', handler);

    // Tell the parent (manager iframe host) that we're ready to receive
    // `preview:setBlockOverride`. The parent posts the payload immediately
    // on iframe load, but Solid's onMount runs slightly later — so without
    // this handshake the first push can be missed.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'preview:isolatedReady', blockId: props.blockId },
        '*',
      );
    }

    onCleanup(() => window.removeEventListener('message', handler));
  });

  const chapter = (): Chapter => ({
    id: 'isolated',
    versionId: 'isolated',
    slug: 'isolated',
    title: 'Preview isolée',
    order: 0,
    blocks: [liveBlock()!],
  });

  const hasContent = () => liveBlock() !== null;

  return (
    <div class="min-h-dvh bg-white">
      <Show
        when={hasContent()}
        fallback={
          <div class="flex min-h-dvh items-center justify-center p-8">
            <div class="max-w-md space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div class="text-4xl">✏️</div>
              <h2 class="text-lg font-semibold text-slate-700">
                En attente de votre contenu
              </h2>
              <p class="text-sm text-slate-500">
                Commencez à remplir les champs du bloc <code class="rounded bg-white px-1 py-0.5 text-xs">{props.blockType}</code>{' '}
                à gauche — la prévisualisation s&apos;affichera ici en direct.
              </p>
            </div>
          </div>
        }
      >
        <ChapterRenderer chapter={chapter()} sectionProps={props} />
      </Show>
    </div>
  );
};
