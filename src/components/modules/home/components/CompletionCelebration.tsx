import { Component, createSignal, For, onMount, Show } from 'solid-js';

/**
 * Lightweight CSS-driven confetti burst. Triggered once when the visitor
 * lands on the last chapter's transition grid (= they completed the
 * parcours). 80 paper-like particles fall and rotate over ~3s. Pure CSS
 * animations — no `requestAnimationFrame` loop, no canvas, no library.
 *
 * Accessibility :
 *   - The whole component is `aria-hidden` so screen readers don't
 *     announce particle DOM nodes.
 *   - When `prefers-reduced-motion: reduce` is set, the global rule in
 *     `scss/index.scss` shortens the animations to 0.01ms — confetti
 *     effectively skips rendering. We also early-return via
 *     `matchMedia(...).matches` so the 80 nodes aren't even mounted.
 *
 * Designed to be inert (`pointer-events: none`) so it never interferes
 * with the visitor clicking on the chapter cards behind it.
 */

interface Particle {
  /** Horizontal start (%). Spread across the viewport top. */
  left: number;
  /** Animation delay in ms — stagger particles so they don't fall as a slab. */
  delay: number;
  /** Animation duration in ms. */
  duration: number;
  /** Initial rotation in degrees. */
  rotation: number;
  /** End rotation in degrees (drives the spin direction + amount). */
  endRotation: number;
  /** Square size in px. */
  size: number;
  /** Background color from the parcours-pastel palette. */
  color: string;
}

const PALETTE = [
  '#FCD34D', // amber-300
  '#F472B6', // pink-400
  '#A78BFA', // violet-400
  '#60A5FA', // blue-400
  '#34D399', // emerald-400
  '#FB923C', // orange-400
];

function makeParticles(n: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      left: Math.random() * 100,
      delay: Math.random() * 700,
      duration: 2400 + Math.random() * 1600,
      rotation: Math.random() * 360,
      endRotation: Math.random() * 720 - 360,
      size: 6 + Math.random() * 8,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    });
  }
  return out;
}

export const CompletionCelebration: Component<{
  /** When this signal flips to `true`, the burst plays once. Subsequent
   *  flips don't re-trigger (we want one celebration per session, not a
   *  loop). */
  active: boolean;
}> = (props) => {
  // Respect the OS reduced-motion preference — never even mount the
  // particles when the user has asked to minimize motion.
  const [allowMotion, setAllowMotion] = createSignal(true);
  onMount(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAllowMotion(!mq.matches);
  });

  // Latch : once it has played, don't replay if `active` flips again
  // (avoids loops on chapter re-mount due to scroll-snap glitches).
  const [played, setPlayed] = createSignal(false);
  const shouldPlay = () => props.active && allowMotion() && !played();

  // Particles allocated lazily (so they don't sit in memory before the
  // celebration is triggered) and memoised — same set for the whole
  // burst so each particle's animation params stay stable while running.
  const [particles, setParticles] = createSignal<Particle[]>([]);
  onMount(() => {
    if (props.active && allowMotion() && particles().length === 0) {
      setParticles(makeParticles(80));
      setPlayed(true);
    }
  });

  return (
    <Show when={shouldPlay() || particles().length > 0}>
      <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
        <For each={particles()}>
          {(p) => (
            <span
              class="absolute top-[-12px] block rounded-sm"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                animation: `mfm-confetti-fall ${p.duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms forwards`,
                '--mfm-rot-start': `${p.rotation}deg`,
                '--mfm-rot-end': `${p.rotation + p.endRotation}deg`,
              }}
            />
          )}
        </For>
      </div>
    </Show>
  );
};
