/**
 * Curated palette of pastel hex colors used to tint the parcours header
 * in the manager UI. Each color is :
 *  - light enough to keep dark text readable on top (target contrast > 7:1)
 *  - distinct from its neighbours at a glance
 *  - emotionally neutral (no red/orange that read as "warning")
 *
 * Used by :
 *  - `createParcours` in `lib/actions.ts` (random pick on create)
 *  - Parcours layout header (background tint)
 *  - Sidebar (small color dot next to each parcours name)
 */
export const PASTEL_PALETTE = [
  '#FCE4EC', // 0  pink
  '#F3E5F5', // 1  purple
  '#E1F5FE', // 2  light blue
  '#E0F2F1', // 3  mint
  '#F1F8E9', // 4  light green
  '#FFF9C4', // 5  light yellow
  '#FFE0B2', // 6  peach
  '#FFCCBC', // 7  salmon
  '#D7CCC8', // 8  warm beige
  '#CFD8DC', // 9  blue-grey
] as const;

/** Fallback used when a parcours row has no `theme_color` (legacy rows). */
export const FALLBACK_THEME_COLOR = '#F1F5F9'; // slate-100 — neutral, calm

/** Pick a random pastel from the palette. Used when creating a new parcours. */
export function randomPastel(): string {
  const idx = Math.floor(Math.random() * PASTEL_PALETTE.length);
  return PASTEL_PALETTE[idx];
}

/** Deterministic pastel based on a string (e.g. parcours slug). Useful for
 *  backfilling or for the sidebar's color dot when no theme_color is set. */
export function pastelForString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  const idx = Math.abs(hash) % PASTEL_PALETTE.length;
  return PASTEL_PALETTE[idx];
}

/** Returns the given color if valid hex, else the fallback. Safe to feed
 *  directly into `style={{ background: ... }}` or `bg-[var(...)]`. */
export function safeThemeColor(input: string | null | undefined): string {
  if (!input) return FALLBACK_THEME_COLOR;
  return /^#[0-9a-fA-F]{6}$/.test(input) ? input : FALLBACK_THEME_COLOR;
}
