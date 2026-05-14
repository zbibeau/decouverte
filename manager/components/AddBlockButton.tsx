'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import type { BlockSample } from '@/lib/blockSamples';

interface Props {
  type: string;
  label: string;
  sample: BlockSample;
  clientUrl?: string;
  /** Inserts the block at the end of the current chapter, using the sample payload. */
  onInsert: (type: string) => Promise<void>;
  /**
   * Where this button is inserting. Drives the success toast wording and
   * the small "what happens on insert" hint inside the popover.
   * Default = 'chapter' (original top-level usage).
   */
  insertTarget?: 'chapter' | 'children';
}

/**
 * Compact "+ LABEL" button that, on click, opens a popover showing a live
 * preview of the block (rendered via the `/preview-block` Solid route) plus
 * its description + a single "Insérer cet exemple" action.
 *
 * The popover is closed on outside click and on Escape. Clicking again on
 * the button toggles it.
 */
export function AddBlockButton({
  type,
  label,
  sample,
  clientUrl = 'http://localhost:3100',
  onInsert,
  insertTarget = 'chapter',
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const toast = useToast();

  const previewId = `add-${type}`;
  const iframeUrl = `${clientUrl}/preview-block?preview=1&id=${previewId}&type=${type}`;

  // Push the sample payload once the Solid iframe signals it is ready.
  useEffect(() => {
    if (!open) return;
    function handler(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (
        e.data.type === 'preview:isolatedReady' &&
        String(e.data.blockId ?? '') === previewId
      ) {
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
  }, [open, type, sample.payload, clientUrl, previewId]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function handleInsert() {
    startTransition(async () => {
      try {
        await onInsert(type);
        toast.success(
          insertTarget === 'children'
            ? `Sous-bloc « ${label} » ajouté`
            : `Bloc « ${label} » ajouté au chapitre`,
        );
        setOpen(false);
      } catch (e) {
        console.error('[AddBlockButton] insert failed', e);
        toast.error(`Échec de l'insertion : ${(e as Error).message}`);
      }
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium uppercase tracking-wide"
      >
        + {label}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[420px] overflow-hidden rounded-lg border border-border bg-white shadow-xl">
          {/* Header */}
          <div className="space-y-1 border-b border-border p-3">
            <span className="inline-flex h-5 items-center rounded bg-muted px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <p className="text-sm font-medium leading-snug">{sample.description}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Quand l&apos;utiliser :</span> {sample.whenToUse}
            </p>
          </div>

          {/* Live preview */}
          <div className="border-b border-border bg-secondary-50">
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="h-[260px] w-full"
              title={`Aperçu ${label}`}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>

          {/* Insert action */}
          <div className="flex items-center justify-between gap-2 p-3">
            <p className="text-[10px] text-muted-foreground">
              {insertTarget === 'children'
                ? "Le sous-bloc sera ajouté à la fin de la liste avec ce contenu d'exemple. Tu pourras ensuite l'éditer."
                : "Le bloc sera ajouté à la fin du chapitre avec ce contenu d'exemple. Tu pourras ensuite l'éditer."}
            </p>
            <Button size="sm" disabled={isPending} onClick={handleInsert}>
              {isPending ? 'Insertion…' : 'Insérer cet exemple'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
