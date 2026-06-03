'use client';

import { type BranchingCondition, evaluateCondition } from '@shared/content-schema';
import { Beaker, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { collectVariableKeys, defaultValueForVariable } from '@/lib/conditionVarHelpers';

import type { VariableMeta } from './editor-types';
import { useSimulator } from './SimulatorContext';

interface Props {
  condition: BranchingCondition;
  variables: VariableMeta[];
  /** Called whenever the simulated result changes. `null` = nothing to evaluate. */
  onResult?: (result: boolean | null) => void;
}

/**
 * Inline "what does this condition look like right now?" widget.
 *
 * Lists every variable referenced by `condition` with a type-aware input
 * (boolean toggle / enum select / text / number), and evaluates the
 * condition live using `evaluateCondition` from the shared schema —
 * the SAME function used at render time on the client.
 *
 * Saves the author a round-trip through the iframe preview when tuning
 * branching logic.
 */
export function ConditionSimulator({ condition, variables, onResult }: Props) {
  const keys = useMemo(() => collectVariableKeys(condition), [condition]);
  const sim = useSimulator();

  // Local fallback state when no SimulatorContext is provided (component
  // rendered outside the BlockEditor chrome, in tests or stand-alone).
  const [localValues, setLocalValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(keys.map((k) => [k, defaultValueForVariable(variables.find((v) => v.key === k))])),
  );

  useEffect(() => {
    if (sim) return; // shared state is sync'd by BlockEditor
    setLocalValues((prev) => {
      const next: Record<string, unknown> = {};
      for (const k of keys) {
        next[k] = k in prev ? prev[k] : defaultValueForVariable(variables.find((v) => v.key === k));
      }
      return next;
    });
  }, [keys, variables, sim]);

  /**
   * Typed snapshot of the values for the keys referenced by the condition.
   * Sourced from the shared SimulatorContext when available, falling back
   * to local state otherwise. The shared context stores everything as
   * strings (mirror of the preview postMessage protocol) so we convert
   * back to the typed form here using each variable's `type`.
   */
  const typedValues = useMemo<Record<string, unknown>>(() => {
    if (!sim) return localValues;
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const meta = variables.find((v) => v.key === k);
      const raw = sim.values[k] ?? '';
      if (!meta) {
        out[k] = raw;
      } else if (meta.type === 'boolean') {
        out[k] = raw === 'true';
      } else if (meta.type === 'number') {
        const n = Number(raw);
        out[k] = Number.isFinite(n) ? n : 0;
      } else {
        out[k] = raw;
      }
    }
    return out;
  }, [sim, localValues, keys, variables]);

  /** Single setter that targets either the shared context or the local fallback. */
  function writeValue(key: string, next: unknown) {
    if (sim) {
      const stringForm = typeof next === 'boolean' ? (next ? 'true' : 'false') : next == null ? '' : String(next);
      sim.setValue(key, stringForm);
    } else {
      setLocalValues((prev) => ({ ...prev, [key]: next }));
    }
  }

  const result = keys.length === 0 ? null : evaluateCondition(condition, typedValues);

  // Notify parent so it can highlight the active branch.
  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  if (keys.length === 0) {
    return (
      <div className="border-border bg-muted/20 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
        <Beaker className="mr-1 inline-block h-3.5 w-3.5" />
        Configure une variable dans la condition pour activer le simulateur.
      </div>
    );
  }

  return (
    <div className="border-border space-y-2 rounded-md border bg-amber-50/40 p-3 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
          <Beaker className="h-3.5 w-3.5" />
          Simulateur
        </span>
        <ResultBadge result={result} />
      </div>

      <p className="text-muted-foreground text-[10px]">
        {sim
          ? 'Synchronisé avec le simulateur de la preview — un toggle ici met aussi à jour l’iframe.'
          : 'Ajuste les valeurs ci-dessous pour voir, en direct, quelle branche est rendue.'}
      </p>

      <div className="space-y-1.5">
        {keys.map((key) => {
          const meta = variables.find((v) => v.key === key);
          const value = typedValues[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <code
                className="text-foreground min-w-[90px] truncate text-[11px] font-medium"
                title={meta?.label ?? key}
              >
                {key}
              </code>
              <ValueInput meta={meta} value={value} onChange={(v) => writeValue(key, v)} />
              {!meta && (
                <span className="text-destructive text-[10px]" title="Variable absente du parcours">
                  ⚠ inconnue
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: boolean | null }) {
  if (result === null) {
    return <span className="text-muted-foreground text-[10px] uppercase tracking-wide">en attente</span>;
  }
  if (result) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        rendu : Alors
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
      <XCircle className="h-3 w-3" />
      rendu : Sinon
    </span>
  );
}

function ValueInput({
  meta,
  value,
  onChange,
}: {
  meta: VariableMeta | undefined;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (!meta) {
    return (
      <Input
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs"
        placeholder="(variable inconnue)"
      />
    );
  }

  if (meta.type === 'boolean') {
    return (
      <div className="flex gap-1">
        {[
          { label: 'true', val: true },
          { label: 'false', val: false },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.val)}
            className={
              'rounded-md border px-2 py-0.5 text-[11px] transition ' +
              (value === opt.val
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-border bg-surface text-foreground hover:border-amber-400')
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (meta.type === 'enum') {
    return (
      <select
        className="border-border bg-surface h-7 rounded-md border px-2 text-xs"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {meta.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (meta.type === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? value : Number(value) || 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="h-7 w-24 text-xs"
      />
    );
  }

  return (
    <Input
      value={typeof value === 'string' ? value : String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-xs"
    />
  );
}
