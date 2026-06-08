/**
 * Centralised declaration of which `ContentBlock` types host child
 * lists, and under which payload field(s). Mirrors the prototype's
 * `childContainers(b)` helper (cf. design/refonte-manager-C/source/
 * prototype/editor.jsx) — keeping it in one place means adding a new
 * container type later is a single-line change here, picked up by
 * every consumer (drag-and-drop, ⌘K walker, scope registration…).
 *
 * The schema is the source of truth (`shared/content-schema.ts`) ;
 * this module only maps types to UI-facing field metadata.
 */

import type { ContentBlock } from '@shared/content-schema';

export interface ChildContainer {
  /** Key inside `block.payload` that holds the child array. */
  field: string;
  /** Human-facing label for the sub-zone header (e.g. "Sous-blocs",
   *  "Alors", "Sinon"). */
  label: string;
}

/**
 * Returns the list of child containers a block exposes. Empty array
 * for leaf types (text, video, hero, form…).
 *
 *   - `card` → `[{ field: 'children', label: 'Sous-blocs' }]`
 *   - `toolContentSection` → `[{ field: 'children', label: 'Sous-blocs' }]`
 *   - `conditional` → `[{ field: 'then', label: 'Alors' }, { field: 'else', label: 'Sinon' }]`
 *
 * Note : `conditional.else` is optional in the schema. The walker
 * downstream MUST treat an undefined value as an empty list — see
 * `getChildList` below.
 */
export function childContainers(block: ContentBlock): ChildContainer[] {
  switch (block.type) {
    case 'card':
      return [{ field: 'children', label: 'Sous-blocs' }];
    case 'toolContentSection':
      return [{ field: 'children', label: 'Sous-blocs' }];
    case 'conditional':
      return [
        { field: 'then', label: 'Alors' },
        { field: 'else', label: 'Sinon' },
      ];
    default:
      return [];
  }
}

/**
 * Read a child list from `block.payload[field]`. Returns `[]` when the
 * field is undefined (e.g. `conditional.else` not set yet) or holds a
 * non-array value (defensive — the schema enforces arrays, but we
 * survive a stale payload without throwing).
 */
export function getChildList(block: ContentBlock, field: string): ContentBlock[] {
  const payload = block.payload as Record<string, unknown> | null | undefined;
  if (!payload) return [];
  const list = payload[field];
  return Array.isArray(list) ? (list as ContentBlock[]) : [];
}
