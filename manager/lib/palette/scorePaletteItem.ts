/**
 * Weighted text-matching score for palette items.
 *
 * cmdk's `filter` prop accepts a number — higher is better. The
 * default `matchesQuery` used by `CommandPalette` returned 0/1
 * (boolean substring), which gave every match the same score and
 * forced the ordering back to natural DOM order. An exact title
 * match could then sink below a body-text match in another section.
 *
 * `scoreMatch` ranks every candidate field of an item against the
 * normalized query and returns the highest band that hit :
 *
 *   100  exact equality on the label
 *    60  label starts with the query
 *    40  label contains the query
 *    22  sub/hint contains the query
 *    12  keywords contain the query
 *     0  no match → cmdk hides the row
 *
 * Empty query returns `1` so cmdk keeps the natural ordering and
 * shows every row when the input is blank. Caller-supplied strings
 * are lowercased and trimmed internally so consumers don't have to.
 *
 * Composite `>` queries (hierarchical tags) fall back to the legacy
 * sub-string strategy : the score is the best of any segment that
 * matched any field. Lets queries like "réglages > acte" still
 * surface rows tagged "réglages > patient".
 */

function norm(s: string | undefined | null): string {
  return (s ?? '').toLowerCase().trim();
}

export interface ScoreInputs {
  /** Primary identifier — the row's display label. */
  label: string;
  /** Secondary text shown in the hint slot. Optional. */
  sub?: string;
  /** Auxiliary search terms (synonyms, type, parent title…). */
  keywords?: readonly string[];
}

/**
 * Returns the score for `query` against the candidate fields of an
 * item. `0` means "no match" → cmdk drops the row. `1` for an empty
 * query so the natural order is preserved (we don't want a blank
 * query to filter anything out).
 */
export function scoreMatch(inputs: ScoreInputs, query: string): number {
  const q = norm(query);
  if (!q) return 1;

  const segments = q.includes('>')
    ? q
        .split('>')
        .map((s) => s.trim())
        .filter((s) => s.length >= 2)
    : [q];
  if (segments.length === 0) return 0;

  let best = 0;
  for (const seg of segments) {
    const lab = norm(inputs.label);
    const sub = norm(inputs.sub);
    const kw = norm((inputs.keywords ?? []).join(' '));
    let s = 0;
    if (lab === seg) s = 100;
    else if (lab.startsWith(seg)) s = 60;
    else if (lab.includes(seg)) s = 40;
    else if (sub.includes(seg)) s = 22;
    else if (kw.includes(seg)) s = 12;
    if (s > best) best = s;
  }
  return best;
}
