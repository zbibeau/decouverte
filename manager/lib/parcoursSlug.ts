/**
 * Slugify any input string into a URL/DB-safe parcours slug. Shared
 * between the server action (used at creation time to validate /
 * normalise) and the client wizard (used live as the user types the
 * name to suggest a slug).
 *
 * Pure function — no React, no Supabase, safe to import on either side.
 */
export function slugifyForParcours(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks (range U+0300..U+036F)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
