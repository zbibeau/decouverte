/**
 * Deep-diff two JSON-safe payloads and return a flat list of differences
 * with their dot/bracket paths. Used by the block editor's "Modifications
 * du brouillon" panel to let the user review every field that diverges
 * from the published version before hitting Publish.
 */
export type DiffEntry = {
  path: string; // e.g. "main.title", "fields[2].label"
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function formatPath(segments: (string | number)[]): string {
  let out = '';
  for (const s of segments) {
    if (typeof s === 'number') out += `[${s}]`;
    else out += out.length === 0 ? s : `.${s}`;
  }
  return out;
}

export function diffPayload(
  before: unknown,
  after: unknown,
  path: (string | number)[] = [],
  out: DiffEntry[] = [],
): DiffEntry[] {
  // Strict equality (primitives, same references) → no diff.
  if (before === after) return out;

  // Objects
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      const bv = before[k];
      const av = after[k];
      if (!(k in after)) {
        out.push({ path: formatPath([...path, k]), kind: 'removed', before: bv });
      } else if (!(k in before)) {
        out.push({ path: formatPath([...path, k]), kind: 'added', after: av });
      } else {
        diffPayload(bv, av, [...path, k], out);
      }
    }
    return out;
  }

  // Arrays — compare index-by-index, extra/missing entries counted.
  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      if (i >= after.length) {
        out.push({ path: formatPath([...path, i]), kind: 'removed', before: before[i] });
      } else if (i >= before.length) {
        out.push({ path: formatPath([...path, i]), kind: 'added', after: after[i] });
      } else {
        diffPayload(before[i], after[i], [...path, i], out);
      }
    }
    return out;
  }

  // Scalars (or mixed types) that differ.
  out.push({ path: formatPath(path) || '(racine)', kind: 'changed', before, after });
  return out;
}

/**
 * Build sets of modified / added paths for the per-field highlight feature.
 * Each set contains both the leaf path and ALL its parent prefixes, so
 * editors that bind to a parent key (e.g. `main`) light up when any nested
 * field changes.
 */
export function buildDiffPathSets(
  before: unknown,
  after: unknown,
): { modified: Set<string>; added: Set<string>; removed: Set<string> } {
  const entries = diffPayload(before, after);
  const modified = new Set<string>();
  const added = new Set<string>();
  const removed = new Set<string>();

  function fillPrefixes(path: string, target: Set<string>) {
    if (!path || path === '(racine)') {
      target.add('');
      return;
    }
    target.add(path);
    // Add every parent prefix (e.g. "main.title" → "main", "main.title").
    let acc = '';
    const segments = path.match(/[^.[\]]+|\[\d+\]/g) ?? [];
    for (const s of segments) {
      acc = acc.length === 0 ? s : s.startsWith('[') ? `${acc}${s}` : `${acc}.${s}`;
      target.add(acc);
    }
  }

  for (const e of entries) {
    if (e.kind === 'added') fillPrefixes(e.path, added);
    else if (e.kind === 'removed') fillPrefixes(e.path, removed);
    else fillPrefixes(e.path, modified);
  }
  return { modified, added, removed };
}

/** Render a value for display (trim long strings, show booleans/nulls nicely). */
export function formatDiffValue(v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.length === 0) return '""';
    if (trimmed.length > 80) return `"${trimmed.slice(0, 80)}…"`;
    return `"${trimmed}"`;
  }
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return String(v);
  }
}
