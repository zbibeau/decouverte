'use client';

import type { BranchingCondition, LeafCondition } from '@shared/content-schema';
import { isAllCondition, isAnyCondition, isLeafCondition } from '@shared/content-schema';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

import { Field } from './Field';
import type { VariableMeta } from './editor-types';

interface Props {
  condition: BranchingCondition;
  onChange: (next: BranchingCondition) => void;
  variables: VariableMeta[];
}

type Mode = 'single' | 'all' | 'any';

const EMPTY_LEAF: LeafCondition = { variable: '', op: '=', value: '' };

/**
 * Decompose a stored BranchingCondition into a UI-friendly mode + flat
 * list of leaves. Returns null if the condition is too deeply nested
 * for this builder (the JSON survives but we surface a warning instead
 * of pretending we can edit it).
 */
function decompose(c: BranchingCondition): { mode: Mode; leaves: LeafCondition[] } | null {
  if (isLeafCondition(c)) return { mode: 'single', leaves: [c] };
  if (isAllCondition(c)) {
    if (c.all.every(isLeafCondition)) return { mode: 'all', leaves: c.all as LeafCondition[] };
    return null;
  }
  if (isAnyCondition(c)) {
    if (c.any.every(isLeafCondition)) return { mode: 'any', leaves: c.any as LeafCondition[] };
    return null;
  }
  return null;
}

/**
 * Recompose a UI mode + leaves into the canonical storage shape.
 * Important: we do NOT collapse a single-leaf AND/OR back to a bare leaf,
 * because that would erase the user's chosen mode and the UI would snap
 * back to "single" on the next render.
 */
function recompose(mode: Mode, leaves: LeafCondition[]): BranchingCondition {
  if (leaves.length === 0) return { ...EMPTY_LEAF };
  if (mode === 'single') return leaves[0];
  if (mode === 'all') return { all: leaves };
  return { any: leaves };
}

export function ConditionBuilder({ condition, onChange, variables }: Props) {
  const decomposed = decompose(condition);

  if (!decomposed) {
    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-800/60 dark:bg-amber-950/40">
        <p className="text-xs text-amber-900 dark:text-amber-100">
          Cette condition contient une combinaison imbriquée AND/OR que l&apos;éditeur visuel ne sait pas encore
          représenter. La donnée est conservée intacte dans la base — supprime ce bloc et reconstruis-le si tu veux
          pouvoir l&apos;éditer ici.
        </p>
        <pre className="bg-surface overflow-x-auto rounded p-2 text-[10px] text-amber-900 dark:text-amber-100">
          {JSON.stringify(condition, null, 2)}
        </pre>
      </div>
    );
  }

  const { mode, leaves } = decomposed;

  function setMode(nextMode: Mode) {
    if (nextMode === mode) return;
    if (nextMode === 'single') {
      // Keep first leaf only.
      onChange(leaves[0] ?? { ...EMPTY_LEAF });
    } else {
      // Make sure we have at least 2 leaves so the combinator is meaningful.
      const next = leaves.length >= 2 ? leaves : [...leaves, { ...EMPTY_LEAF }];
      while (next.length < 2) next.push({ ...EMPTY_LEAF });
      onChange(recompose(nextMode, next));
    }
  }

  function updateLeaf(idx: number, patch: Partial<LeafCondition>) {
    const next = leaves.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(recompose(mode, next));
  }

  function addLeaf() {
    // Button is only visible in AND/OR modes, so `mode` is never 'single' here.
    onChange(recompose(mode, [...leaves, { ...EMPTY_LEAF }]));
  }

  function removeLeaf(idx: number) {
    const next = leaves.filter((_, i) => i !== idx);
    if (next.length === 0) {
      onChange({ ...EMPTY_LEAF });
      return;
    }
    if (next.length === 1) {
      onChange(next[0]);
      return;
    }
    onChange(recompose(mode, next));
  }

  return (
    <div className="border-border bg-surface space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Condition</p>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="space-y-1.5">
        {leaves.map((leaf, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            {leaves.length > 1 && (
              <span className="bg-muted text-muted-foreground mt-1.5 w-6 shrink-0 rounded px-1 text-center text-[10px] font-medium uppercase">
                {idx === 0 ? 'si' : mode === 'all' ? 'et' : 'ou'}
              </span>
            )}
            <div className="flex-1">
              <LeafEditor leaf={leaf} onChange={(patch) => updateLeaf(idx, patch)} variables={variables} />
            </div>
            {leaves.length > 1 && (
              <Button variant="ghost" size="sm" title="Supprimer cette condition" onClick={() => removeLeaf(idx)}>
                <Trash2 className="text-destructive h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {mode !== 'single' && (
        <Button variant="outline" size="sm" onClick={addLeaf}>
          <Plus className="h-3 w-3" />
          Ajouter une condition
        </Button>
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const options: Array<{ value: Mode; label: string; title: string }> = [
    { value: 'single', label: '1 var.', title: 'Une seule variable' },
    { value: 'all', label: 'ET', title: 'Toutes les conditions doivent être vraies' },
    { value: 'any', label: 'OU', title: 'Au moins une condition doit être vraie' },
  ];
  return (
    <div className="border-border bg-muted/30 flex gap-0.5 rounded-md border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
            mode === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LeafEditor({
  leaf,
  onChange,
  variables,
}: {
  leaf: LeafCondition;
  onChange: (patch: Partial<LeafCondition>) => void;
  variables: VariableMeta[];
}) {
  const selected = variables.find((v) => v.key === leaf.variable);

  function updateVariable(key: string) {
    const v = variables.find((x) => x.key === key);
    const newValue = !v
      ? ''
      : v.type === 'boolean'
        ? false
        : v.type === 'enum'
          ? (v.options[0]?.value ?? '')
          : v.type === 'number'
            ? 0
            : '';
    onChange({ variable: key, value: newValue });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          className="border-border bg-surface h-7 rounded-md border px-2 text-xs"
          value={leaf.variable}
          onChange={(e) => updateVariable(e.target.value)}
        >
          <option value="">— variable —</option>
          {variables.map((v) => (
            <option key={v.id} value={v.key}>
              {v.key} ({v.type})
            </option>
          ))}
        </select>

        <select
          className="border-border bg-surface h-7 rounded-md border px-2 text-xs"
          value={leaf.op}
          onChange={(e) => onChange({ op: e.target.value as LeafCondition['op'] })}
        >
          <option value="=">=</option>
          <option value="!=">≠</option>
          <option value="in">dans</option>
        </select>

        <ValueInput selected={selected} op={leaf.op} value={leaf.value} onChange={(value) => onChange({ value })} />
      </div>
      {!selected && leaf.variable && (
        <p className="text-destructive text-[10px]">
          La variable <code>{leaf.variable}</code> n&apos;existe plus dans le parcours.
        </p>
      )}
    </div>
  );
}

function ValueInput({
  selected,
  op,
  value,
  onChange,
}: {
  selected: VariableMeta | undefined;
  op: LeafCondition['op'];
  value: LeafCondition['value'];
  onChange: (v: LeafCondition['value']) => void;
}) {
  if (!selected) {
    return (
      <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className="h-7 w-32 text-xs" />
    );
  }

  if (op === 'in') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <Input
        value={arr.join(',')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder="val1,val2"
        className="h-7 w-40 text-xs"
      />
    );
  }

  if (selected.type === 'boolean') {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="border-border bg-surface h-7 rounded-md border px-2 text-xs"
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (selected.type === 'enum') {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-surface h-7 rounded-md border px-2 text-xs"
      >
        {selected.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (selected.type === 'number') {
    return (
      <Input
        type="number"
        value={Number(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-24 text-xs"
      />
    );
  }

  return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className="h-7 w-32 text-xs" />;
}
