import * as React from 'react';

import { useBlockIsNew, useFieldDiff } from './DiffContext';
import { useSetHoveredField } from './FieldHoverContext';

export function Field({
  label,
  hint,
  path,
  children,
}: {
  label: string;
  hint?: string;
  /**
   * JSON path of this field within the block payload (e.g. "main.title",
   * "fields[2].label"). When the path matches a value that differs from the
   * published version, the field is decorated with an amber/sky badge and
   * a subtle ring around its inputs.
   *
   * Also drives the preview-iframe field highlight: when the user hovers or
   * focuses the field, the matching `[data-field-path]` element in the
   * preview gets a transient amber outline.
   */
  path?: string;
  children: React.ReactNode;
}) {
  const status = useFieldDiff(path);
  const blockIsNew = useBlockIsNew();
  const setHoveredField = useSetHoveredField();
  // Brand-new blocks are entirely "new" — no per-field highlight needed,
  // the block-level banner already shouts it.
  const effectiveStatus = blockIsNew ? undefined : status;

  const hoverHandlers = path
    ? {
        onMouseEnter: () => setHoveredField(path),
        onMouseLeave: () => setHoveredField(null),
        onFocus: () => setHoveredField(path),
        onBlur: () => setHoveredField(null),
      }
    : {};

  return (
    <div
      {...hoverHandlers}
      className={
        effectiveStatus === 'modified'
          ? 'space-y-1 rounded-md border border-amber-300 bg-amber-50/60 p-1.5'
          : effectiveStatus === 'added'
          ? 'space-y-1 rounded-md border border-sky-300 bg-sky-50/60 p-1.5'
          : effectiveStatus === 'removed'
          ? 'space-y-1 rounded-md border border-red-300 bg-red-50/60 p-1.5'
          : 'space-y-1'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {effectiveStatus === 'modified' && (
          <span className="inline-flex items-center rounded bg-amber-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-900">
            Modifié
          </span>
        )}
        {effectiveStatus === 'added' && (
          <span className="inline-flex items-center rounded bg-sky-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky-900">
            Nouveau
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type AccentColor = 'slate' | 'rose' | 'green' | 'amber' | 'purple' | 'sky';

const ACCENT_CLASSES: Record<AccentColor, { border: string; title: string }> = {
  slate: { border: 'border-l-slate-300', title: 'text-muted-foreground' },
  rose: { border: 'border-l-rose-400', title: 'text-rose-700' },
  green: { border: 'border-l-emerald-400', title: 'text-emerald-700' },
  amber: { border: 'border-l-amber-400', title: 'text-amber-800' },
  purple: { border: 'border-l-violet-400', title: 'text-violet-700' },
  sky: { border: 'border-l-sky-400', title: 'text-sky-700' },
};

export function Section({
  title,
  action,
  accentColor = 'slate',
  children,
}: {
  title: string;
  action?: React.ReactNode;
  /**
   * Adds a coloured left border + matching tinted title to the section
   * header. Useful to visually pair editor groups with regions in the
   * preview (e.g. "Bloc avantages" → amber matches the rendered card).
   */
  accentColor?: AccentColor;
  children: React.ReactNode;
}) {
  const accent = ACCENT_CLASSES[accentColor];
  return (
    <div
      className={`space-y-2 rounded-md border border-l-4 border-border bg-muted/20 p-3 ${accent.border}`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${accent.title}`}
        >
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}
