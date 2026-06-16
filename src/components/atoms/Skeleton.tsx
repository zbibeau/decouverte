import cx from 'classix';
import { Component, JSX } from 'solid-js';

/**
 * Generic skeleton placeholder used while async content (image, video,
 * remote-loaded section) hydrates. Renders a soft gradient block that
 * shimmers from left to right via a CSS `background-position` animation.
 *
 * The shimmer keyframes are defined inline in the className via Tailwind's
 * `animate-[shimmer_1.6s_linear_infinite]` arbitrary value — `tailwind.config`
 * already exposes `bg-gradient-*` and Tailwind 3.x supports CSS variables
 * in classes for the keyframe.
 *
 * Honors `prefers-reduced-motion` automatically through the global CSS
 * rule in `scss/index.scss` (animations are reduced to 0.01ms).
 *
 * Usage :
 *   <Skeleton class="aspect-video w-full rounded-3xl" />
 *   <Skeleton class="h-4 w-32" />
 */
export const Skeleton: Component<{
  /** Tailwind classes for sizing / rounding. Default empty (caller-driven). */
  class?: string;
  /** Optional inline style for unusual cases (aspect ratio in JS, etc.). */
  style?: JSX.CSSProperties | string;
  /** When false, render a static (non-shimmering) placeholder. Useful in
   *  high-density contexts where the shimmer would be visually noisy. */
  animate?: boolean;
}> = (props) => {
  const animate = () => props.animate !== false;
  return (
    // Refonte UI Kit Lot 8 — palette skeleton passe de secondary-100
    // (ocre pâle) à un dégradé violet pâle #EFE7F8 → #E2D6F2 → #EFE7F8.
    // Match l'ADN violet de la peau et reste discret sur fond clair.
    <div
      aria-hidden="true"
      class={cx('overflow-hidden rounded-[7px]', animate() && 'relative', props.class)}
      style={{
        background: 'linear-gradient(90deg, #EFE7F8 0%, #E2D6F2 50%, #EFE7F8 100%)',
        'background-size': '200% 100%',
        ...(typeof props.style === 'object' ? props.style : {}),
      }}
    >
      {/* Shimmer overlay : a translucent white band slides across the
          placeholder every 1.6s. Pure CSS, no JS, no per-frame work.
          Keyframe `mfm-skeleton-shimmer` lives in `scss/index.scss`. */}
      {animate() && (
        <div
          class="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          style={{
            animation: 'mfm-skeleton-shimmer 1.6s linear infinite',
            'will-change': 'transform',
          }}
        />
      )}
    </div>
  );
};
