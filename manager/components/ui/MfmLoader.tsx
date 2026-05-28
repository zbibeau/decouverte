import { MfmLogo } from '@/components/ui/MfmLogo';
import { cn } from '@/lib/utils';

/**
 * Branded loading indicator — the MadeForMed splat logo (`MfmLogo`),
 * gently rotating + breathing. Used as the visual fallback for Next.js
 * `loading.tsx` boundaries (route transitions = instant click feedback)
 * AND for in-page Suspense placeholders (DraftStatusBar, async server
 * components…).
 *
 * Variants
 * --------
 * - `size`        : `sm` (32 px) / `md` (56 px) / `lg` (96 px). The logo
 *                   and the label scale together. Default `md`.
 * - `label`       : optional text below the logo (e.g. « Chargement du
 *                   parcours… »). Stays italic-muted so the logo reads
 *                   as the primary visual.
 * - `fullscreen`  : when true, the loader is rendered centered inside a
 *                   semi-transparent backdrop covering the viewport.
 *                   Used by global navigation overlays.
 *
 * Animation lives in `tailwind.config.ts` :
 *   - `animate-mfm-spin`   : slow counter-clockwise rotation (3.6 s).
 *   - `animate-mfm-breath` : subtle scale pulse (2 s), wrapped on the
 *                            outer container so the breath ANDs with the
 *                            spin without fighting it.
 * The double `<div>` layering (breath wrapper around spin wrapper) is
 * intentional : combining two `transform`s on the same element would
 * make them battle each render frame. Splitting them up the DOM tree
 * lets each transform live on its own node and compose naturally.
 *
 * Pure Server Component (no `'use client'`, no hooks) — cheap to import
 * anywhere, including inside `loading.tsx` files which are rendered on
 * the server.
 */
type Size = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<Size, number> = { sm: 32, md: 56, lg: 96 };
const LABEL_CLASS: Record<Size, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

export function MfmLoader({
  size = 'md',
  label,
  className,
  fullscreen = false,
}: {
  size?: Size;
  label?: string;
  className?: string;
  fullscreen?: boolean;
}) {
  const px = SIZE_PX[size];
  const inner = (
    <div
      className={cn('inline-flex flex-col items-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Three layers, each owning one animation so transforms don't
          fight on the same node :
            - outer : breath (scale pulse, slow)
            - inner : spin (slow counter-clockwise rotation)
            - logo  : per-arm twinkle wave (handled inside MfmLogo
                      when `animated` is true — each line gets a
                      staggered opacity pulse)
          Together they read as one organic « breathing splat being
          painted by a moving highlight » — three time scales (2 s /
          3.6 s / 2.4 s) deliberately incommensurate so the eye never
          catches a repeating loop. */}
      <div className="animate-mfm-breath inline-flex items-center justify-center" style={{ width: px, height: px }}>
        <div className="animate-mfm-spin inline-flex h-full w-full items-center justify-center">
          <MfmLogo
            animated
            className="text-brand-primary-500 h-full w-full drop-shadow-[0_2px_8px_rgba(149,81,251,0.25)]"
          />
        </div>
      </div>
      {label ? <span className={cn('text-muted-foreground tracking-wide', LABEL_CLASS[size])}>{label}</span> : null}
      <span className="sr-only">Chargement en cours…</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="bg-background/70 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm">
        {inner}
      </div>
    );
  }
  return inner;
}

/**
 * Block-level wrapper that centers the loader in a `min-h-[300px]` card,
 * matching the visual rhythm of empty-state placeholders used elsewhere
 * in the manager (chapter list empty state, etc.). The default
 * convenience for `loading.tsx` files — most route fallbacks just need
 * "centered loader, some breathing room, a contextual label".
 */
export function MfmLoaderBlock({ label = 'Chargement…', size = 'md' }: { label?: string; size?: Size }) {
  return (
    <div className="border-border bg-muted/20 flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
      <MfmLoader size={size} label={label} />
    </div>
  );
}
