/**
 * Best-effort parser : extract the current parcours slug + chapter slug +
 * block id from the URL. Returns nulls when not inside the matching
 * level.
 *
 * URLs handled:
 *   /parcours/<slug>
 *   /parcours/<slug>/chapters/<chapterSlug>
 *   /parcours/<slug>/chapters/<chapterSlug>/blocks/<blockId>
 *   /parcours/<slug>/chapters/<chapterSlug>/blocks/new
 *   /parcours/<slug>/variables
 *   /parcours/<slug>/library
 */
export interface PathContext {
  parcoursSlug: string | null;
  chapterSlug: string | null;
  blockId: string | null;
}

export function parsePathContext(pathname: string): PathContext {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('parcours');
  if (idx === -1 || !parts[idx + 1]) {
    return { parcoursSlug: null, chapterSlug: null, blockId: null };
  }
  const parcoursSlug = decodeURIComponent(parts[idx + 1]);
  const chapIdx = parts.indexOf('chapters', idx + 1);
  if (chapIdx === -1 || !parts[chapIdx + 1]) {
    return { parcoursSlug, chapterSlug: null, blockId: null };
  }
  const chapterSlug = decodeURIComponent(parts[chapIdx + 1]);
  const blockIdx = parts.indexOf('blocks', chapIdx + 1);
  const blockId =
    blockIdx !== -1 && parts[blockIdx + 1] && parts[blockIdx + 1] !== 'new'
      ? decodeURIComponent(parts[blockIdx + 1])
      : null;
  return { parcoursSlug, chapterSlug, blockId };
}
