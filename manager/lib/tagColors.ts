/**
 * Pure types + color palette for the maintenance-tag system. Kept in
 * its OWN module (no `'use server'`) so client components can import
 * constants and type guards without dragging in the server actions.
 *
 * The server actions live in `manager/lib/tags.ts` (which is
 * `'use server'` — only async functions allowed there).
 */

export type TagColor = 'amber' | 'rose' | 'sky' | 'emerald' | 'violet' | 'slate' | 'orange' | 'gray';

export const TAG_COLORS: TagColor[] = ['amber', 'rose', 'sky', 'emerald', 'violet', 'slate', 'orange', 'gray'];

/** Tailwind class triplet per palette key. Static strings so JIT
 *  emits the corresponding utilities — DO NOT switch to `bg-${color}-100`
 *  string interpolation, the compiler can't resolve it. */
export const TAG_COLOR_CLASSES: Record<TagColor, { bg: string; fg: string; ring: string; dot: string }> = {
  amber: { bg: 'bg-amber-100', fg: 'text-amber-900', ring: 'ring-amber-300', dot: 'bg-amber-400' },
  rose: { bg: 'bg-rose-100', fg: 'text-rose-900', ring: 'ring-rose-300', dot: 'bg-rose-400' },
  sky: { bg: 'bg-sky-100', fg: 'text-sky-900', ring: 'ring-sky-300', dot: 'bg-sky-400' },
  emerald: {
    bg: 'bg-emerald-100',
    fg: 'text-emerald-900',
    ring: 'ring-emerald-300',
    dot: 'bg-emerald-400',
  },
  violet: {
    bg: 'bg-violet-100',
    fg: 'text-violet-900',
    ring: 'ring-violet-300',
    dot: 'bg-violet-400',
  },
  slate: {
    bg: 'bg-slate-100',
    fg: 'text-slate-900',
    ring: 'ring-slate-300',
    dot: 'bg-slate-400',
  },
  orange: {
    bg: 'bg-orange-100',
    fg: 'text-orange-900',
    ring: 'ring-orange-300',
    dot: 'bg-orange-400',
  },
  gray: { bg: 'bg-gray-100', fg: 'text-gray-900', ring: 'ring-gray-300', dot: 'bg-gray-400' },
};

/**
 * Raw hex values per palette key. Used by the library Tags admin
 * color picker — bypasses Tailwind JIT entirely so the swatches
 * are guaranteed to render regardless of how the bundler scans
 * classNames.
 *
 * The values are the Tailwind v3 reference shades :
 *   - `chip` = the *-100 shade (pill background in TagsField)
 *   - `text` = the *-900 shade (pill text)
 *   - `dot`  = the *-400 shade (picker swatch / chip color dot)
 *   - `ring` = the *-300 shade (selection ring on the picker)
 * Also `label` for the human-facing French name displayed next to
 * the swatch so the picker is usable even if a stylesheet fails.
 */
export const TAG_COLOR_HEX: Record<TagColor, { chip: string; text: string; dot: string; ring: string; label: string }> =
  {
    amber: { chip: '#fef3c7', text: '#78350f', dot: '#fbbf24', ring: '#fcd34d', label: 'Ambre' },
    rose: { chip: '#ffe4e6', text: '#881337', dot: '#fb7185', ring: '#fda4af', label: 'Rose' },
    sky: { chip: '#e0f2fe', text: '#0c4a6e', dot: '#38bdf8', ring: '#7dd3fc', label: 'Ciel' },
    emerald: {
      chip: '#d1fae5',
      text: '#064e3b',
      dot: '#34d399',
      ring: '#6ee7b7',
      label: 'Émeraude',
    },
    violet: {
      chip: '#ede9fe',
      text: '#4c1d95',
      dot: '#a78bfa',
      ring: '#c4b5fd',
      label: 'Violet',
    },
    slate: { chip: '#f1f5f9', text: '#0f172a', dot: '#94a3b8', ring: '#cbd5e1', label: 'Ardoise' },
    orange: {
      chip: '#ffedd5',
      text: '#7c2d12',
      dot: '#fb923c',
      ring: '#fdba74',
      label: 'Orange',
    },
    gray: { chip: '#f3f4f6', text: '#111827', dot: '#9ca3af', ring: '#d1d5db', label: 'Gris' },
  };

export function isTagColor(s: unknown): s is TagColor {
  return typeof s === 'string' && (TAG_COLORS as string[]).includes(s);
}

/** A maintenance tag, as exposed to clients. The same shape is used
 *  everywhere : autocomplete vocabulary, block-tag list, library
 *  admin. */
export interface Tag {
  id: string;
  slug: string;
  label: string;
  color: TagColor;
}
