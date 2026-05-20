/**
 * Extract searchable text from an arbitrary block payload.
 *
 * Two flavours :
 *   - `extractBlockSearchText(payload)` returns a single flat string
 *     (kept for backwards-compat — still used by code that wants one
 *     blob without weighting).
 *   - `extractBlockSearchTextWeighted(payload)` returns `{ primary,
 *     secondary }`. Primary holds the high-signal labels (titles,
 *     subtitles, labels…) ; secondary holds the body content (html,
 *     long text, descriptions, captions, …). The palette duplicates
 *     primary in its keywords array so cmdk's fuzzy matcher ranks a
 *     "saturation" match on a block title higher than the same word
 *     buried in the 12th line of HTML body.
 *
 * The walker only collects values stored under a known set of
 * text-bearing keys — payloads contain plenty of technical strings
 * (`vimeoSrc`, `icon`, condition operators…) that would pollute the
 * index. Hardcoding the meaningful keys keeps the index tight and
 * avoids false positives.
 *
 * HTML tags are stripped so that `<strong>foo</strong>` becomes `foo`.
 */
const PRIMARY_KEYS = new Set<string>([
  'title',
  'subtitle',
  'label',
  'advantageTitle',
  'caption',
  'nextButtonText',
  'name',
  // Maintenance tags attached to media blocks (video / heroTitle /
  // photoCarousel). Editor-curated keywords ⇒ treated as primary so a
  // match on a tag outweighs a match buried in the body. The walker
  // already iterates arrays of strings under their parentKey, so
  // adding 'tags' to the set is enough — no other change needed.
  'tags',
]);

const SECONDARY_KEYS = new Set<string>([
  'html',
  'text',
  'description',
  'advantageText',
  'advantagePoints',
  'alt',
  'placeholder',
  'helpText',
  'hint',
  'message',
]);

/**
 * Strip HTML tags and decode common entities from a string. Used both
 * by the search-text walker and the palette's PreviewPane to render
 * a clean text excerpt of an HTML payload.
 */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');
}

interface Buckets {
  primary: string[];
  secondary: string[];
}

function walk(value: unknown, parentKey: string | null, buckets: Buckets): void {
  if (value == null) return;
  if (typeof value === 'string') {
    if (!parentKey) return;
    const cleaned = stripHtml(value).trim();
    if (!cleaned) return;
    if (PRIMARY_KEYS.has(parentKey)) buckets.primary.push(cleaned);
    else if (SECONDARY_KEYS.has(parentKey)) buckets.secondary.push(cleaned);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, parentKey, buckets);
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, k, buckets);
    }
  }
}

function collapse(parts: string[]): string {
  return parts.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface WeightedBlockSearchText {
  /** High-signal labels — titles, subtitles, button labels. Duplicated in keywords to boost ranking. */
  primary: string;
  /** Body content — html, descriptions, alt text. Lower weight in the search. */
  secondary: string;
  /** Concatenation of `primary` + `secondary`. Used for snippet extraction. */
  full: string;
}

export function extractBlockSearchTextWeighted(payload: unknown): WeightedBlockSearchText {
  const buckets: Buckets = { primary: [], secondary: [] };
  walk(payload, null, buckets);
  const primary = collapse(buckets.primary);
  const secondary = collapse(buckets.secondary);
  return {
    primary,
    secondary,
    full: collapse([primary, secondary]),
  };
}

/**
 * @deprecated Prefer `extractBlockSearchTextWeighted` so the caller can
 * use the primary text to boost ranking. Kept for compatibility with
 * any code still relying on the single-string shape.
 */
export function extractBlockSearchText(payload: unknown): string {
  return extractBlockSearchTextWeighted(payload).full;
}

/**
 * Extract a short context snippet around the first occurrence of `query`
 * inside `haystack`. Returns `null` if no match.
 *
 *   extractSnippet('hypoxie et saturation en oxygene <90', 'saturation', 20)
 *   → '…hypoxie et saturation en oxygene <90'
 *
 * The match is case-insensitive. The returned snippet preserves the
 * casing of `haystack` (so the caller can highlight by matching the
 * lowercased query against the lowercased snippet).
 *
 * `radius` = number of chars to include on each side of the match. The
 * total snippet length is at most `radius * 2 + query.length`. Ellipses
 * (`…`) are prepended/appended when content is truncated on that side.
 */
export function extractSnippet(haystack: string, query: string, radius = 40): string | null {
  if (!haystack || !query) return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const hayLower = haystack.toLowerCase();
  const idx = hayLower.indexOf(q);
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(haystack.length, idx + q.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < haystack.length ? '…' : '';
  return prefix + haystack.slice(start, end) + suffix;
}
