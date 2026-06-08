'use client';

import type { BranchingCondition, ContentBlock } from '@shared/content-schema';
import { useEffect, useState } from 'react';

import { ChildBlockList } from './ChildBlockList';
import { ConditionBuilder } from './ConditionBuilder';
import type { VariableMeta } from './editor-types';
import type { PayloadEditorProps } from './editor-types';
import { Field } from './Field';
import { useSimulator } from './SimulatorContext';

type CondPayload = {
  condition: BranchingCondition;
  then: ContentBlock[];
  else?: ContentBlock[];
};

type Branch = 'then' | 'else';

/**
 * Conditional block editor — Direction C cleanup.
 *
 * Before : the editor hosted a dedicated `<ConditionSimulator>` widget
 * with type-aware inputs for every referenced variable, plus an auto-
 * select effect that snapped the active tab to the branch the simulator
 * said would render. Two surfaces (simulator + tabs) competed for
 * mental space, and the simulator was an additional render cost on a
 * brand-new conditional.
 *
 * After : the simulator widget is gone. The active branch is picked
 * SOLELY by the editor via the tabs ; clicking a tab writes a matching
 * value to the shared `SimulatorContext`, so the preview iframe
 * automatically renders the chosen branch. One mental model — "click
 * Alors / Sinon to see this branch in the preview". Default tab on
 * creation = `then` (no auto-select on mount).
 *
 * Limitations of the auto-sync :
 *   - Only LEAF conditions (`variable / op / value`) are pushed to the
 *     simulator. Composite `all` / `any` conditions are too ambiguous
 *     to map automatically (which sub-condition do we satisfy ?). The
 *     parcours-level simulator in the PreviewPanel still works for
 *     those cases.
 *   - Supports operators `=` / `!=` / `in`. Unknown operators are
 *     ignored (no sim write, preview unchanged).
 */
export function ConditionalEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
  depth = 0,
}: PayloadEditorProps<CondPayload>) {
  const sim = useSimulator();
  const [activeBranch, setActiveBranch] = useState<Branch>('then');

  // On tab change : push a simulator value that forces the preview
  // iframe to render the chosen branch. No-op when the condition is a
  // composite (`all` / `any`) or uses an unsupported operator.
  function selectBranch(branch: Branch) {
    setActiveBranch(branch);
    if (!sim) return;
    applyBranchToSimulator(payload.condition, branch, sim, variables);
  }

  // Apply the initial branch to the simulator on mount + whenever the
  // condition definition changes (e.g. user picks a different variable).
  useEffect(() => {
    if (!sim) return;
    applyBranchToSimulator(payload.condition, activeBranch, sim, variables);
    // We intentionally don't depend on `activeBranch` here — it's
    // already pushed via `selectBranch`. This effect only handles
    // mount + condition-shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.condition, variables, sim]);

  const thenCount = payload.then.length;
  const elseCount = payload.else?.length ?? 0;

  return (
    <div className="space-y-3">
      <Field label="Condition" path="condition">
        <ConditionBuilder
          condition={payload.condition}
          onChange={(condition) => onChange({ ...payload, condition })}
          variables={variables}
        />
      </Field>

      {/* Tabs header. Cliquer un onglet pousse une valeur de
          simulateur correspondante via `applyBranchToSimulator`, donc
          la preview iframe bascule sur la bonne branche. */}
      <div
        className="border-border flex items-center gap-1 border-b"
        role="tablist"
        aria-label="Branche conditionnelle"
      >
        <TabButton
          isActive={activeBranch === 'then'}
          onClick={() => selectBranch('then')}
          label="Alors (then)"
          icon="✓"
          count={thenCount}
        />
        <TabButton
          isActive={activeBranch === 'else'}
          onClick={() => selectBranch('else')}
          label="Sinon (else)"
          icon="✗"
          count={elseCount}
        />
      </div>

      {/* Tab panel — only the active branch is rendered, so the other
          branch's editors are unmounted (cheaper, simpler UI). State of
          the inactive branch lives in `payload.then` / `payload.else`,
          which are part of the persisted form payload — no data loss. */}
      {activeBranch === 'then' ? (
        <div
          role="tabpanel"
          aria-label="Branche Alors"
          className="border-primary/40 bg-primary/5 rounded-md border-l-2 p-3 transition-all"
        >
          <Field label="✓ Alors (then)" path="then">
            <ChildBlockList
              blocks={payload.then}
              onChange={(then) => onChange({ ...payload, then })}
              variables={variables}
              navbarVariants={navbarVariants}
              depth={depth + 1}
              scopeLabel="Conditionnel > Alors"
            />
          </Field>
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label="Branche Sinon"
          className="border-muted bg-muted/10 rounded-md border-l-2 p-3 transition-all"
        >
          <Field label="✗ Sinon (else)" path="else">
            <ChildBlockList
              blocks={payload.else ?? []}
              onChange={(next) => onChange({ ...payload, else: next })}
              variables={variables}
              navbarVariants={navbarVariants}
              depth={depth + 1}
              scopeLabel="Conditionnel > Sinon"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab button                                                          */
/* ------------------------------------------------------------------ */

function TabButton({
  isActive,
  onClick,
  label,
  icon,
  count,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  count: number;
}) {
  const base =
    'relative -mb-px inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors';
  const activeCls = isActive
    ? 'border-border bg-surface text-foreground'
    : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground';
  return (
    <button type="button" role="tab" aria-selected={isActive} onClick={onClick} className={`${base} ${activeCls}`}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
      <span className="bg-muted text-muted-foreground rounded px-1 text-[10px] tabular-nums">{count}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Branch → simulator value resolver                                   */
/* ------------------------------------------------------------------ */

/**
 * Push a simulator value that makes `condition` evaluate to the
 * requested branch. Only handles LEAF conditions ; composite ones
 * (`all` / `any`) are skipped silently (the parcours-level simulator
 * inside the PreviewPanel still works for those).
 */
function applyBranchToSimulator(
  condition: BranchingCondition,
  branch: Branch,
  sim: { setValue: (key: string, value: string) => void; values: Record<string, string> },
  variables: VariableMeta[],
): void {
  // Composite conditions are out of scope for the auto-sync.
  if (!('variable' in condition) || !condition.variable) return;
  const leaf = condition as { variable: string; op: '=' | '!=' | 'in'; value: unknown };
  const variable = variables.find((v) => v.key === leaf.variable);
  const wantsTrue = branch === 'then';

  let targetValue: string | null = null;
  switch (leaf.op) {
    case '=':
      targetValue = wantsTrue ? String(leaf.value) : pickAlternativeValue(variable, leaf.value);
      break;
    case '!=':
      targetValue = wantsTrue ? pickAlternativeValue(variable, leaf.value) : String(leaf.value);
      break;
    case 'in': {
      const arr = Array.isArray(leaf.value) ? (leaf.value as Array<unknown>) : [];
      if (wantsTrue) {
        targetValue = arr.length > 0 ? String(arr[0]) : null;
      } else {
        // For boolean variables this is trivially the opposite ; for
        // enum we pick the first option NOT in the array ; otherwise
        // empty string.
        targetValue = pickValueOutsideArray(variable, arr);
      }
      break;
    }
    default:
      return;
  }
  if (targetValue === null) return;
  // Only write if the current value differs — avoids triggering
  // re-renders on every tab interaction when the simulator already
  // matches.
  if (sim.values[leaf.variable] === targetValue) return;
  sim.setValue(leaf.variable, targetValue);
}

/**
 * Pick a value DIFFERENT from `currentValue` for the given variable.
 * Boolean → the opposite. Enum → the first option whose value is not
 * `currentValue`. Other types → empty string (often interpreted as
 * "unset" by the front, which differs from any literal value).
 */
function pickAlternativeValue(variable: VariableMeta | undefined, currentValue: unknown): string {
  const curStr = String(currentValue);
  if (variable?.type === 'boolean') {
    return curStr === 'true' ? 'false' : 'true';
  }
  if (variable?.type === 'enum') {
    const opts = (variable as { options?: Array<{ value: string; label: string }> }).options ?? [];
    const other = opts.find((o) => o.value !== curStr);
    return other?.value ?? '';
  }
  return '';
}

/**
 * Pick a value NOT in `array`. Boolean → the opposite of the only one
 * present (boolean has 2 values total). Enum → the first option whose
 * value is not in the array. Other types → empty string.
 */
function pickValueOutsideArray(variable: VariableMeta | undefined, array: Array<unknown>): string {
  const asStrings = array.map((v) => String(v));
  if (variable?.type === 'boolean') {
    return asStrings.includes('true') ? 'false' : 'true';
  }
  if (variable?.type === 'enum') {
    const opts = (variable as { options?: Array<{ value: string; label: string }> }).options ?? [];
    const other = opts.find((o) => !asStrings.includes(o.value));
    return other?.value ?? '';
  }
  return '';
}
