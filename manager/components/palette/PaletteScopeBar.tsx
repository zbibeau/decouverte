'use client';

export type PaletteScope = 'all' | 'blocks' | 'chapters' | 'variables' | 'parcours' | 'actions';

export const PALETTE_SCOPES: { id: PaletteScope; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'blocks', label: 'Blocs' },
  { id: 'chapters', label: 'Chapitres' },
  { id: 'variables', label: 'Variables' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'actions', label: 'Actions' },
];

/**
 * Row of scope chips that restrict the palette to a single type of
 * result (blocs / chapitres / variables / parcours / actions, or
 * « tout »). Sits just under the context breadcrumb.
 *
 * Cyclable via `Tab` / `Shift+Tab` — the cycling logic lives in
 * `CommandPalette` (it owns the key handler and the focus on the
 * input). This component is purely presentational.
 *
 * Coexists with the existing tag filter chip : scope restricts by
 * TYPE, tag restricts by LABEL ; both can be active.
 */
export function PaletteScopeBar({ scope, onScope }: { scope: PaletteScope; onScope: (next: PaletteScope) => void }) {
  return (
    <div
      className="border-border bg-surface flex items-center gap-1 border-b px-3 py-1.5"
      role="tablist"
      aria-label="Portée de recherche"
    >
      {PALETTE_SCOPES.map((s) => {
        const active = scope === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            onClick={() => onScope(s.id)}
            className={
              active
                ? 'bg-primary/15 text-primary-on shadow-app-sm inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium'
                : 'text-text-muted hover:bg-muted hover:text-text inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] transition-colors'
            }
          >
            {s.label}
          </button>
        );
      })}
      <span className="text-text-faint ml-auto hidden text-[10px] sm:inline">
        <kbd className="border-border bg-surface-2 rounded border px-1 py-0.5">⇥</kbd> cycler
      </span>
    </div>
  );
}
