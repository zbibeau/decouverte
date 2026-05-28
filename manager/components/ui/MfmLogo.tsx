/**
 * MadeForMed brand mark — the asymmetric 7-arm brush-stroke « splat ».
 *
 * Implemented as an inline React SVG (rather than an `<img>` referencing
 * `public/logo-madeformed.svg`) for two reasons :
 *   1. `currentColor` lets the parent component theme the logo via plain
 *      `text-*` Tailwind utilities (brand purple by default, but the
 *      loader could tint it amber for a warning state, etc.).
 *   2. The SVG inherits transforms / animations applied to its container
 *      seamlessly — no `<img>`-level rotation quirks. We also need to
 *      reach each arm individually for the per-stroke twinkle effect ;
 *      that's only possible with inline SVG.
 *
 * The 7-line approximation below is INTENTIONALLY rough — it captures
 * the asymmetric splat silhouette but doesn't try to mimic the brush
 * texture of the official PNG (uniform stroke-width + rounded caps =
 * « geometric splat », not « hand-drawn »). If you want pixel-perfect
 * fidelity, drop the official file at `public/logo-madeformed.svg` and
 * swap this component to render `<img src="/logo-madeformed.svg" />`
 * (you'll lose the per-arm twinkle though — that's the trade-off).
 *
 * Center of the splat is at SVG (0, 0) — viewBox is shifted by half its
 * size so the logo rotates around its visual center without any
 * `transform-origin` gymnastics.
 *
 * Animation
 * ---------
 * `animated` prop = true wires each arm to `animate-mfm-twinkle` with a
 * staggered `animationDelay` so a wave of light walks around the splat
 * counter-clockwise. Order of `ARMS` defines the wave direction ;
 * I matched it to the visual « next clockwise » traversal so the wave
 * reads naturally even when the outer `MfmLoader` spins the SVG.
 *
 * NOTE for code-formatter passes : the `style={{ animationDelay }}`
 * camelCase below is React DOM (NOT Solid kebab-case). Do not let
 * eslint's `solid/style-prop` autofix touch it — this is a React file.
 */

// Arm geometry — extracted to a constant so the per-arm twinkle map
// can index by `i` for its `animationDelay`. Stroke widths intentionally
// alternate (22 / 24) so neighbouring arms have a subtle thickness
// contrast — feels less mechanical than a constant width.
const ARMS: Array<{ x2: number; y2: number; width: number }> = [
  { x2: -8, y2: -82, width: 22 }, // top (slightly left)
  { x2: 60, y2: -58, width: 24 }, // upper-right
  { x2: 82, y2: -12, width: 22 }, // right
  { x2: 65, y2: 58, width: 24 }, // lower-right
  { x2: 2, y2: 88, width: 22 }, // bottom
  { x2: -60, y2: 48, width: 24 }, // lower-left
  { x2: -86, y2: -22, width: 22 }, // left
];

// 2.4 s twinkle cycle / 7 arms ≈ 343 ms — a phase shift just under a
// third of a second per arm. Slow enough that each arm's pulse is
// readable, fast enough that the wave feels continuous.
const TWINKLE_STAGGER_S = 0.34;

export function MfmLogo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg
      viewBox="-100 -100 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="MadeForMed"
    >
      <title>MadeForMed</title>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {ARMS.map((arm, i) => (
          <line
            key={i}
            x1={-3}
            y1={-5}
            x2={arm.x2}
            y2={arm.y2}
            strokeWidth={arm.width}
            className={animated ? 'animate-mfm-twinkle' : undefined}
            style={animated ? { animationDelay: `${(i * TWINKLE_STAGGER_S).toFixed(2)}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
