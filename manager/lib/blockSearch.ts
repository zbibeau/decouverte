/**
 * Extract a flat searchable string from an arbitrary block payload.
 *
 * Walks the payload recursively, collecting every value found in known
 * text-bearing keys (`html`, `title`, `subtitle`, `text`, `label`,
 * `description`, `caption`, `advantageTitle`, `advantageText`,
 * `advantagePoints`, `nextButtonText`, `name`, `alt`, `placeholder`).
 *
 * HTML tags are stripped so that `<strong>foo</strong>` becomes `foo`. The
 * resulting string is lowercased and trimmed once, ready to be used by a
 * substring-match search (palette V1 keeps the matching simple — cmdk's
 * fuzzy score runs against this single field).
 *
 * Why a list of keys (and not "every string value") ?
 *   - Block payloads contain technical strings (`vimeoSrc`, `icon`,
 *     `variant`, condition operators, …) that would pollute the search.
 *   - Hardcoding the meaningful keys keeps the index tight and avoids
 *     false positives.
 */
const TEXT_KEYS = new Set<string>([
  'html',
  'title',
  'subtitle',
  'text',
  'label',
  'description',
  'caption',
  'advantageTitle',
  'advantageText',
  'advantagePoints',
  'nextButtonText',
  'name',
  'alt',
  'placeholder',
  'helpText',
  'hint',
  'message',
]);

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');
}

/** Recursively walk a value and push every relevant text fragment to `out`. */
function walk(value: unknown, parentKey: string | null, out: string[]): void {
  if (value == null) return;
  if (typeof value === 'string') {
    if (parentKey && TEXT_KEYS.has(parentKey)) {
      const cleaned = stripHtml(value).trim();
      if (cleaned) out.push(cleaned);
    }
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return; // numbers / booleans are never useful for content search
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      // Arrays inherit their parent key context (so `advantagePoints: [...]`
      // collects every string of the array under the same TEXT_KEY check).
      walk(item, parentKey, out);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, k, out);
    }
  }
}

/**
 * Build the searchable text for a single block. Returns a single
 * lowercased string — collapsed whitespace, ready for cmdk's matcher.
 */
export function extractBlockSearchText(payload: unknown): string {
  const out: string[] = [];
  walk(payload, null, out);
  return out.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
