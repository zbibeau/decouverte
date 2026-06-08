/**
 * Search & Replace engine over a block payload.
 *
 * Mirrors the search side in `blockSearch.ts` (same EXCLUDED_KEYS
 * exclusion, same `stripHtml` projection for HTML fields) but
 * emits ONE record per occurrence — multiple matches inside a
 * single string each get their own row, so the palette can let
 * the editor cherry-pick which ones to replace.
 *
 * Two public functions :
 *   - `findOccurrencesInPayload(payload, query, opts)` returns the
 *     full list of matches with snippet + per-occurrence offset.
 *   - `replaceOccurrencesInPayload(payload, hits, replaceWith)`
 *     produces a new immutable payload with the targeted
 *     occurrences swapped, preserving HTML structure when present.
 *
 * Strategy for HTML fields :
 *   - At find time we parse the raw HTML via DOMParser, walk text
 *     nodes, and build a virtual projection (text content with one
 *     space inserted per element boundary). Each text node gets a
 *     `[start, end)` range in that projection. A match is
 *     `replaceable` iff its range fits inside ONE text node — a
 *     match spanning a tag boundary (e.g. searching "ab" on
 *     "a<strong>b</strong>") is surfaced but disabled in the UI.
 *   - At replace time we re-parse the same HTML, locate the text
 *     node holding each hit, splice the matched range out and the
 *     replacement in, and serialize the modified document back.
 *     Tags and attributes stay intact.
 *
 * Strategy for plain text fields :
 *   - The projection is the raw string. Splice right-to-left so
 *     prior replacements don't shift later offsets.
 */

import { EXCLUDED_KEYS, extractSnippet } from './blockSearch';

/**
 * Parent keys whose string value MAY contain HTML markup that we want
 * to preserve when replacing. Cheap heuristic — combined with a
 * "string actually contains `<letter`" check at runtime. Any false
 * positive falls back gracefully to plain-text splicing (the DOM
 * parser still parses, walks zero element boundaries, and the
 * resulting text-node range covers the whole string).
 */
const HTML_FIELD_KEYS = new Set<string>([
  'html',
  'description',
  'body',
  'content',
  'intro',
  'outro',
  'answer',
  'text',
  'message',
  'quote',
  'note',
]);

export interface Occurrence {
  /** Path inside the payload — same convention as `findMatchingFieldPaths`,
   *  e.g. `main.title`, `photos[1].description`. */
  path: string;
  /** Offset of the match inside the field's projection
   *  (raw value for plain text fields, stripped-with-element-spaces
   *  projection for HTML fields). */
  index: number;
  /** Length of the match in the projection — equal to `query.length`. */
  length: number;
  /** ±radius chars of context around the match, casing preserved. */
  snippet: string;
  /** True when the parent key suggests HTML markup AND the raw value
   *  actually contains `<letter`. Drives the replace strategy. */
  isHtml: boolean;
  /** False when the match traverses a tag boundary in an HTML field
   *  — the UI shows the row but disables its checkbox. */
  replaceable: boolean;
  /** Original-casing text of the match. Used by the UI to render the
   *  `<mark>` in the snippet without re-running the lookup. */
  matchText: string;
}

export interface FindOccurrencesOptions {
  matchCase: boolean;
  /** Chars on each side of the match included in the snippet. Default 32. */
  radius?: number;
}

function isHtmlField(parentKey: string | null, raw: string): boolean {
  if (!parentKey) return false;
  if (!HTML_FIELD_KEYS.has(parentKey)) return false;
  // A string under a "html-y" key but containing zero `<letter` markers
  // (e.g. a plain-text caption stored under `text`) is treated as plain
  // text — that's the desired fallback.
  return /<[a-z]/i.test(raw);
}

interface TextNodeRange {
  node: Text;
  /** Inclusive start offset in the field's projection. */
  start: number;
  /** Exclusive end offset in the field's projection. */
  end: number;
}

interface HtmlParse {
  /** Wrapping <div> hosting the parsed fragment. Re-used for
   *  serialization on the replace side. */
  root: HTMLElement;
  ranges: TextNodeRange[];
  projection: string;
}

/**
 * Parse `rawHtml` as an HTML fragment, walk its text nodes in document
 * order, and produce a virtual projection of the visible text. Each
 * element boundary (open + close) injects one space — matches the
 * conceptual model of `stripHtml` but works directly on parsed nodes
 * so the offsets can be mapped back to text-node-relative indices for
 * the replace pass.
 */
function parseHtmlField(rawHtml: string): HtmlParse {
  const parser = new DOMParser();
  // We wrap in a div so the fragment is parsed as body content rather
  // than as a full document — keeps things simple even when rawHtml
  // contains multiple top-level nodes.
  const doc = parser.parseFromString(`<div id="__mfm_replace_root__">${rawHtml}</div>`, 'text/html');
  const root = doc.getElementById('__mfm_replace_root__') as HTMLElement;
  const ranges: TextNodeRange[] = [];
  const parts: string[] = [];
  let offset = 0;

  function visit(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node as Text;
      const text = t.nodeValue ?? '';
      if (text.length === 0) return;
      ranges.push({ node: t, start: offset, end: offset + text.length });
      parts.push(text);
      offset += text.length;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Opening tag → one space in the projection.
      parts.push(' ');
      offset += 1;
      for (const child of Array.from(node.childNodes)) visit(child);
      // Closing tag → one space too.
      parts.push(' ');
      offset += 1;
      return;
    }
    // Comments / processing instructions are skipped — they have no
    // visible text representation.
  }

  for (const child of Array.from(root.childNodes)) visit(child);
  return { root, ranges, projection: parts.join('') };
}

function snippetAround(projection: string, idx: number, length: number, radius: number): string {
  const start = Math.max(0, idx - radius);
  const end = Math.min(projection.length, idx + length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < projection.length ? '…' : '';
  return prefix + projection.slice(start, end) + suffix;
}

function fitsInOneTextNode(ranges: TextNodeRange[], idx: number, length: number): TextNodeRange | null {
  for (const r of ranges) {
    if (r.start <= idx && idx + length <= r.end) return r;
  }
  return null;
}

function walkOccurrences(
  value: unknown,
  currentPath: string,
  parentKey: string | null,
  needleOriginal: string,
  needleLower: string,
  matchCase: boolean,
  radius: number,
  out: Occurrence[],
): void {
  if (value == null) return;
  if (typeof value === 'string') {
    if (!parentKey) return;
    if (EXCLUDED_KEYS.has(parentKey)) return;
    if (!value.trim()) return;
    const html = isHtmlField(parentKey, value);
    let projection: string;
    let ranges: TextNodeRange[] | null = null;
    if (html) {
      const parsed = parseHtmlField(value);
      projection = parsed.projection;
      ranges = parsed.ranges;
    } else {
      projection = value;
    }
    const haystack = matchCase ? projection : projection.toLowerCase();
    const search = matchCase ? needleOriginal : needleLower;
    if (!search) return;
    let from = 0;
    let idx = haystack.indexOf(search, from);
    while (idx !== -1) {
      const length = search.length;
      const matchText = projection.slice(idx, idx + length);
      const snippet = snippetAround(projection, idx, length, radius);
      const replaceable = html ? fitsInOneTextNode(ranges!, idx, length) !== null : true;
      out.push({
        path: currentPath,
        index: idx,
        length,
        snippet,
        isHtml: html,
        replaceable,
        matchText,
      });
      from = idx + length;
      idx = haystack.indexOf(search, from);
    }
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    // Arrays inherit the parent key — `tags: ['foo', 'bar']` means both
    // strings are indexed under parentKey === 'tags'. Mirrors the walker
    // in `blockSearch.ts` so EXCLUDED_KEYS exclusion stays in sync.
    value.forEach((v, i) =>
      walkOccurrences(v, `${currentPath}[${i}]`, parentKey, needleOriginal, needleLower, matchCase, radius, out),
    );
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k;
      walkOccurrences(v, nextPath, k, needleOriginal, needleLower, matchCase, radius, out);
    }
  }
}

/**
 * Walk every string in `payload` and return one entry per occurrence
 * of `query`. Respects `EXCLUDED_KEYS` (same blacklist as the search
 * index in `blockSearch.ts`) so URLs, ids, icon names, etc. are
 * skipped automatically.
 *
 * HTML-bearing fields are parsed via DOMParser so the per-occurrence
 * `index` can be mapped back to a text node at replace time without
 * surprises around tag boundaries.
 */
export function findOccurrencesInPayload(payload: unknown, query: string, opts: FindOccurrencesOptions): Occurrence[] {
  const out: Occurrence[] = [];
  if (!query) return out;
  const radius = opts.radius ?? 32;
  walkOccurrences(payload, '', null, query, query.toLowerCase(), opts.matchCase, radius, out);
  // Sanity: when query has trailing whitespace, ignore — this is a
  // search box, not a literal-paste tool.
  return out;
}

/**
 * Convenience wrapper around `extractSnippet` re-exposed here so the
 * UI can recompute a fresh snippet from a freshly typed replace value
 * without re-walking the payload.
 */
export { extractSnippet };

interface HitToApply {
  path: string;
  index: number;
  length: number;
  isHtml: boolean;
}

interface PathEdit {
  path: string;
  isHtml: boolean;
  hits: { index: number; length: number }[];
}

function groupByPath(hits: ReadonlyArray<HitToApply>): PathEdit[] {
  const byPath = new Map<string, PathEdit>();
  for (const h of hits) {
    let entry = byPath.get(h.path);
    if (!entry) {
      entry = { path: h.path, isHtml: h.isHtml, hits: [] };
      byPath.set(h.path, entry);
    }
    entry.hits.push({ index: h.index, length: h.length });
  }
  // Sort each path's hits descending so we can splice right-to-left
  // and keep earlier offsets stable across the loop.
  for (const e of byPath.values()) {
    e.hits.sort((a, b) => b.index - a.index);
  }
  return [...byPath.values()];
}

/** Parse a JSON-ish path into an ordered list of property/array
 *  accessors. Path syntax mirrors `blockSearch.ts` :
 *    `main.title` → ['main', 'title']
 *    `photos[1].description` → ['photos', 1, 'description']
 */
function parsePath(path: string): Array<string | number> {
  const out: Array<string | number> = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === '.') {
      i += 1;
      continue;
    }
    if (path[i] === '[') {
      const close = path.indexOf(']', i);
      if (close === -1) break;
      const n = Number(path.slice(i + 1, close));
      if (!Number.isFinite(n)) break;
      out.push(n);
      i = close + 1;
      continue;
    }
    let j = i;
    while (j < path.length && path[j] !== '.' && path[j] !== '[') j += 1;
    out.push(path.slice(i, j));
    i = j;
  }
  return out;
}

function getAtPath(payload: unknown, segments: Array<string | number>): unknown {
  let cur: unknown = payload;
  for (const seg of segments) {
    if (cur == null) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (typeof cur !== 'object' || Array.isArray(cur)) return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}

/** Immutable `setIn` — returns a structurally new payload with `value`
 *  written at `segments`. Untouched branches keep their reference
 *  identity, so React's diff stays cheap. */
function setAtPath(payload: unknown, segments: Array<string | number>, value: unknown): unknown {
  if (segments.length === 0) return value;
  const [head, ...rest] = segments;
  if (typeof head === 'number') {
    const arr = Array.isArray(payload) ? payload : [];
    const next = arr.slice();
    next[head] = setAtPath(arr[head], rest, value);
    return next;
  }
  const obj =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  return { ...obj, [head]: setAtPath(obj[head], rest, value) };
}

function applyHitsToPlainString(
  raw: string,
  hits: { index: number; length: number }[],
  replaceWith: string,
): {
  next: string;
  applied: number;
} {
  // hits already sorted descending — splice right-to-left.
  let out = raw;
  let applied = 0;
  for (const h of hits) {
    // Bounds guard — the payload could have been edited between find
    // and apply (rare ; UI prevents it by closing on success, but
    // belt-and-braces in case the caller mis-uses this function).
    if (h.index < 0 || h.index + h.length > out.length) continue;
    out = out.slice(0, h.index) + replaceWith + out.slice(h.index + h.length);
    applied += 1;
  }
  return { next: out, applied };
}

function applyHitsToHtmlString(
  rawHtml: string,
  hits: { index: number; length: number }[],
  replaceWith: string,
): {
  next: string;
  applied: number;
} {
  const parsed = parseHtmlField(rawHtml);
  let applied = 0;
  for (const h of hits) {
    const fit = fitsInOneTextNode(parsed.ranges, h.index, h.length);
    if (!fit) continue; // Not replaceable — silently skip.
    const offsetInNode = h.index - fit.start;
    const before = (fit.node.nodeValue ?? '').slice(0, offsetInNode);
    const after = (fit.node.nodeValue ?? '').slice(offsetInNode + h.length);
    fit.node.nodeValue = before + replaceWith + after;
    applied += 1;
  }
  return { next: parsed.root.innerHTML, applied };
}

/**
 * Apply the supplied hits to `payload`, returning a structurally new
 * payload with the matched ranges replaced by `replaceWith`. Hits are
 * grouped per path so we can splice right-to-left within a single
 * string and keep all earlier offsets stable. HTML fields are routed
 * through `applyHitsToHtmlString` so tags and attributes survive
 * intact.
 *
 * Returns `{ payload: newPayload, appliedCount }` — the count includes
 * every hit actually written (i.e. excludes hits that mapped to a
 * non-replaceable position, which can only happen for HTML fields).
 */
export function replaceOccurrencesInPayload(
  payload: unknown,
  hits: ReadonlyArray<HitToApply>,
  replaceWith: string,
): { payload: unknown; appliedCount: number } {
  if (hits.length === 0) return { payload, appliedCount: 0 };
  let next = payload;
  let appliedCount = 0;
  for (const edit of groupByPath(hits)) {
    const segments = parsePath(edit.path);
    const raw = getAtPath(next, segments);
    if (typeof raw !== 'string') continue;
    const { next: nextStr, applied } = edit.isHtml
      ? applyHitsToHtmlString(raw, edit.hits, replaceWith)
      : applyHitsToPlainString(raw, edit.hits, replaceWith);
    if (applied === 0) continue;
    next = setAtPath(next, segments, nextStr);
    appliedCount += applied;
  }
  return { payload: next, appliedCount };
}
