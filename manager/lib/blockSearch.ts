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
 * Walk a payload and return the JSON paths of every string field
 * whose value contains `query` (case-insensitive). HTML tags are
 * stripped before matching so a match found in raw HTML doesn't
 * surface the wrong field.
 *
 * Path format mirrors the convention used by `<Field path="…">`
 * across the block editors (e.g. `main.title`, `photos[1].description`,
 * `fields[2].label`). Container paths are NOT emitted — only the
 * exact leaf where the string lives — so the BlockEditor can
 * highlight ONLY the specific input the user is looking for.
 *
 * Used by the block editor to highlight every field that matched the
 * ⌘K search query carried via `?q=`.
 */
/**
 * Recursively walks a payload and collects every `tagIds: string[]`
 * array found inside it. Used to surface maintenance tags attached
 * to NESTED blocks (children of card / toolContentSection /
 * conditional / faq questions etc.) — top-level blocks store their
 * tags in the `block_tag` join table, but nested children have no
 * DB row of their own and keep their tag IDs inline in the parent's
 * payload via `payload.tagIds`.
 *
 * Returns the deduplicated set of tag IDs. The caller resolves
 * those IDs against the `tag` table to get labels + colors.
 */
export function harvestNestedTagIds(payload: unknown): Set<string> {
  const out = new Set<string>();
  walkTagIds(payload, out);
  return out;
}

function walkTagIds(value: unknown, out: Set<string>): void {
  if (value == null) return;
  if (typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) walkTagIds(item, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.tagIds)) {
    for (const id of obj.tagIds) {
      if (typeof id === 'string') out.add(id);
    }
  }
  for (const v of Object.values(obj)) walkTagIds(v, out);
}

/**
 * Returns a new payload with every occurrence of `tagId` removed
 * from any `tagIds: string[]` array found at any depth. The original
 * payload is returned unchanged (referentially) when no tagId
 * occurrence was found, so the caller can cheaply detect "did
 * anything change ?" by reference equality.
 *
 * Used by `deleteTag` to scrub dangling references when a tag is
 * removed from the library admin.
 */
export function removeTagIdFromPayload(payload: unknown, tagId: string): unknown {
  if (payload == null || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) {
    let changed = false;
    const next = payload.map((item) => {
      const nextItem = removeTagIdFromPayload(item, tagId);
      if (nextItem !== item) changed = true;
      return nextItem;
    });
    return changed ? next : payload;
  }
  const obj = payload as Record<string, unknown>;
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'tagIds' && Array.isArray(v)) {
      const filtered = v.filter((id) => id !== tagId);
      if (filtered.length !== v.length) {
        changed = true;
        next[k] = filtered;
        continue;
      }
    }
    const nextV = removeTagIdFromPayload(v, tagId);
    if (nextV !== v) changed = true;
    next[k] = nextV;
  }
  return changed ? next : payload;
}

export function findMatchingFieldPaths(payload: unknown, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: string[] = [];
  walkPaths(payload, '', q, out, null);
  return out;
}

/**
 * Like `findMatchingFieldPaths` but also harvests a context snippet
 * around each match (±`radius` chars), keyed by the same JSON path.
 * Used by the block editor to render a "matched text" preview line
 * under each highlighted input (since `<input>` and `<textarea>`
 * can't host inline `<mark>` HTML).
 */
export function findMatchingFieldSnippets(payload: unknown, query: string, radius = 32): Map<string, string> {
  const q = query.trim().toLowerCase();
  const map = new Map<string, string>();
  if (!q) return map;
  walkPaths(payload, '', q, [], { map, radius });
  return map;
}

interface SnippetCollector {
  map: Map<string, string>;
  radius: number;
}

function walkPaths(
  value: unknown,
  currentPath: string,
  q: string,
  out: string[],
  snippets: SnippetCollector | null,
): void {
  if (value == null) return;
  if (typeof value === 'string') {
    if (!currentPath) return; // root scalar shouldn't normally happen on a payload
    const cleaned = stripHtml(value);
    const lower = cleaned.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return;
    out.push(currentPath);
    if (snippets) {
      const snippet = extractSnippet(cleaned, q, snippets.radius);
      if (snippet) snippets.map.set(currentPath, snippet);
    }
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkPaths(v, `${currentPath}[${i}]`, q, out, snippets));
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = currentPath ? `${currentPath}.${k}` : k;
      walkPaths(v, next, q, out, snippets);
    }
  }
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
