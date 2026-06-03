'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { LibraryInsertMenu } from '@/components/library/LibraryInsertMenu';
import { useToast } from '@/components/Toaster';
import type { BlockSample } from '@/lib/blockSamples';

interface ChapterOption {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  type: string;
  label: string;
  sample: BlockSample;
  chapters: ChapterOption[];
  clientUrl?: string;
  insertAction: (
    type: string,
    payload: Record<string, unknown>,
    targetChapterId: string,
  ) => Promise<{ blockId: string; chapterSlug: string }>;
}

/**
 * Single card on the visual library page. Renders an isolated live preview
 * of the block (via the `/preview-block` Solid route) and lets the user
 * insert the curated sample payload into any chapter of the parcours.
 */
export function LibraryBlockCard({
  type,
  label,
  sample,
  chapters,
  clientUrl = 'http://localhost:3100',
  insertAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Synthetic id only used to identify this card's iframe locally.
  const previewId = `library-${type}`;
  const iframeUrl = `${clientUrl}/preview-block?preview=1&id=${previewId}&type=${type}`;

  // The Solid `IsolatedBlockPreview` posts `preview:isolatedReady` to its
  // parent (us) as soon as it has installed its `message` listener. Only
  // then is it safe to push the sample payload, otherwise the first message
  // is lost in a race with Solid's mount cycle.
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:isolatedReady' && String(e.data.blockId ?? '') === previewId) {
        e.source?.postMessage(
          {
            type: 'preview:setBlockOverride',
            blockId: previewId,
            block: { type, payload: sample.payload },
          },
          { targetOrigin: clientUrl },
        );
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [type, sample.payload, clientUrl, previewId]);

  function handleInsert(targetChapterId: string) {
    startTransition(async () => {
      try {
        const result = await insertAction(type, sample.payload, targetChapterId);
        const targetTitle = chapters.find((c) => c.id === targetChapterId)?.title ?? result.chapterSlug;
        toast.success(`Bloc inséré dans « ${targetTitle} »`);
        router.refresh();
      } catch (e) {
        console.error('[LibraryBlockCard] insert failed', e);
        toast.error(`Échec de l'insertion : ${(e as Error).message}`);
      }
    });
  }

  const sampleKeys = Object.keys(sample.payload);

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
      {/* Header: type badge + label + description */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
            {label}
          </span>
          <p className="text-sm font-medium leading-snug">{sample.description}</p>
          <p className="text-muted-foreground text-xs">
            <span className="font-medium">Quand l'utiliser :</span> {sample.whenToUse}
          </p>
        </div>
      </div>

      {/* Live preview iframe */}
      <div className="border-border overflow-hidden rounded-md border bg-secondary-50">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          className="h-[300px] w-full"
          title={`Aperçu ${label}`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Available fields */}
      <details className="border-border bg-muted/30 rounded-md border p-2 text-xs">
        <summary className="text-muted-foreground cursor-pointer font-medium">
          Champs disponibles ({sampleKeys.length})
        </summary>
        <ul className="text-muted-foreground mt-2 space-y-0.5 pl-3 font-mono text-[11px]">
          {sampleKeys.map((k) => (
            <li key={k}>• {k}</li>
          ))}
        </ul>
      </details>

      {/* Insert action */}
      <div className="mt-auto flex items-center justify-end">
        <LibraryInsertMenu chapters={chapters} disabled={isPending} onPick={handleInsert} />
      </div>
    </div>
  );
}
