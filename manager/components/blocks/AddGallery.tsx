'use client';

import type { ContentBlock } from '@shared/content-schema';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LivePreviewIframe } from '@/components/palette/LivePreviewIframe';
import {
  BLOCK_CATEGORIES,
  BLOCK_CATEGORY_ORDER,
  BLOCK_TYPE_GLYPHS,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES_ORDER,
  blankBlock,
} from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { cn } from '@/lib/utils';

interface Props {
  /**
   * Editor context : `'chapter'` = adding a root block, `'children'` =
   * adding a sub-block under a container. Only drives the header copy ;
   * the type exclusion is the caller's job via `excludeTypes`.
   */
  insertTarget?: 'chapter' | 'children';
  /** Hide types that don't make sense in this context (e.g. `heroTitle`
   *  + `componentRef` when adding under a `card`). */
  excludeTypes?: Set<ContentBlock['type']>;
  /** Called when the editor picks a type — the parent inserts and closes. */
  onPick: (type: ContentBlock['type']) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Modal gallery for picking a block type. Replaces the previous row of
 * `<AddBlockButton>` (11 buttons stacked horizontally) by a category-
 * sectioned grid of cards : glyph + label + short description per type.
 *
 * Two interactions per card :
 *   - **Click** → fires `onPick(type)` and closes the modal (insertion
 *     handled by the parent with `SAMPLE_PAYLOADS[type]`).
 *   - **Option+Click** → opens an inline LIVE PREVIEW pane on the
 *     right side of the modal, hosting an iframe of the Solid front
 *     with the curated sample payload. Lets the editor evaluate a
 *     type before committing to inserting it. Reuses the existing
 *     `LivePreviewIframe` (id `palette-live`) → no new preview-block
 *     route, no new postMessage.
 *
 * Escape closes the preview pane first if open, else the whole modal.
 */
export function AddGallery({ insertTarget = 'chapter', excludeTypes, onPick, onClose }: Props) {
  const allowedTypes = useMemo(() => BLOCK_TYPES_ORDER.filter((t) => !excludeTypes?.has(t)), [excludeTypes]);

  /** Type currently previewed in the right-hand pane. `null` = pane
   *  hidden, click anywhere triggers normal pick. */
  const [previewType, setPreviewType] = useState<ContentBlock['type'] | null>(null);

  // ESC : close preview pane first ; if no pane open, close the modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (previewType) {
        setPreviewType(null);
      } else {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, previewType]);

  function handleCardClick(e: React.MouseEvent, t: ContentBlock['type']) {
    // Option / Alt + clic → ne pas insérer, juste prévisualiser.
    if (e.altKey) {
      e.preventDefault();
      setPreviewType((prev) => (prev === t ? null : t));
      return;
    }
    void onPick(t);
  }

  const title = insertTarget === 'children' ? 'Ajouter un sous-bloc' : 'Ajouter un bloc';
  const subtitle =
    insertTarget === 'children'
      ? "Il se posera ici avec un contenu d'exemple, déplié et prêt à l'édition."
      : 'Choisis un type — il sera ajouté en fin de chapitre avec un contenu d’exemple.';

  // Block prop for the live iframe : built from SAMPLE_PAYLOADS when
  // available, falls back to a blank payload. Stable identity per
  // `previewType` so the iframe doesn't re-push on every render.
  const previewBlock = useMemo(() => {
    if (!previewType) return null;
    const sample = SAMPLE_PAYLOADS[previewType];
    const payload = sample
      ? (JSON.parse(JSON.stringify(sample.payload)) as Record<string, unknown>)
      : (blankBlock(previewType).payload as Record<string, unknown>);
    return { type: previewType, payload };
  }, [previewType]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'border-border bg-surface flex max-h-[80vh] w-full flex-col overflow-hidden rounded-xl border shadow-2xl',
          // Largeur élargie quand le panel preview est ouvert pour
          // accommoder l'iframe à droite sans compresser la grille.
          previewType ? 'max-w-5xl' : 'max-w-3xl',
        )}
      >
        {/* Header */}
        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-text text-base font-semibold leading-tight">{title}</h2>
            <p className="text-text-muted mt-0.5 text-xs">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text hover:bg-muted/50 rounded-md p-1.5"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — gallery left, preview pane right (when active) */}
        <div className="flex min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {BLOCK_CATEGORY_ORDER.map((cat) => {
              const types = allowedTypes.filter((t) => BLOCK_CATEGORIES[t] === cat);
              if (types.length === 0) return null;
              return (
                <section key={cat} className="mb-5 last:mb-0">
                  <h3 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">{cat}</h3>
                  <div
                    className={cn(
                      'grid gap-2',
                      previewType ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    )}
                  >
                    {types.map((t) => {
                      const label = (BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t;
                      const glyph = BLOCK_TYPE_GLYPHS[t];
                      const desc = SAMPLE_PAYLOADS[t]?.description ?? `Bloc « ${label} ».`;
                      const isPreviewed = previewType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={(e) => handleCardClick(e, t)}
                          className={cn(
                            'border-border bg-surface group flex min-h-[88px] flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                            'focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-2',
                            isPreviewed ? 'border-primary bg-primary/5' : 'hover:border-primary/60 hover:bg-primary/5',
                          )}
                          title={`Clic = ajouter · Option+clic = aperçu de ${label}`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                'bg-muted text-text inline-flex h-7 w-7 items-center justify-center rounded-md',
                                'group-hover:bg-primary group-hover:text-primary-on text-base font-semibold transition-colors',
                                isPreviewed && 'bg-primary text-primary-on',
                              )}
                              aria-hidden="true"
                            >
                              {glyph}
                            </span>
                            <span className="text-text text-sm font-medium">{label}</span>
                          </span>
                          <span className="text-text-muted line-clamp-2 text-[11px] leading-snug">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Preview pane — toggled by Option+Click on a card. Reuses
              the existing `LivePreviewIframe` (id `palette-live`) so
              the front Solid renderer is booted ONCE per modal session
              and just receives a new `preview:setBlockOverride` when
              the editor changes their preview target. */}
          {previewType && previewBlock && (
            <aside className="border-border bg-bg flex w-[360px] shrink-0 flex-col border-l">
              <div className="border-border text-text-muted flex items-center justify-between border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wider">
                <span>Aperçu · {(BLOCK_TYPE_LABELS as Record<string, string>)[previewType] ?? previewType}</span>
                <button
                  type="button"
                  onClick={() => setPreviewType(null)}
                  className="text-text-muted hover:text-text hover:bg-muted/50 rounded p-1"
                  aria-label="Fermer l'aperçu"
                  title="Fermer l'aperçu"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <LivePreviewIframe block={previewBlock} className="h-full w-full flex-1" />
            </aside>
          )}
        </div>

        {/* Footer keyboard hint */}
        <div className="border-border bg-muted/30 text-text-muted flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
          <span>
            <kbd className="border-border bg-surface rounded border px-1 py-0.5">⌥</kbd>+clic = aperçu
          </span>
          <span>
            <kbd className="border-border bg-surface rounded border px-1 py-0.5">esc</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
}
