'use client';

import type { BranchingCondition, ContentBlock } from '@shared/content-schema';
import { useEffect, useRef, useState } from 'react';

import { ChildBlockList } from './ChildBlockList';
import { ConditionBuilder } from './ConditionBuilder';
import { ConditionSimulator } from './ConditionSimulator';
import type { PayloadEditorProps } from './editor-types';
import { Field } from './Field';

type CondPayload = {
  condition: BranchingCondition;
  then: ContentBlock[];
  else?: ContentBlock[];
};

type Branch = 'then' | 'else';

export function ConditionalEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
  depth = 0,
}: PayloadEditorProps<CondPayload>) {
  /** Live evaluation result from the simulator. `null` = no variables yet. */
  const [simResult, setSimResult] = useState<boolean | null>(null);

  /**
   * Active branch in the tabbed view. Previously the two branches were
   * stacked vertically, which made the editor very tall and forced the
   * user to scroll between them. We now show one branch at a time via
   * tabs (Bug #1 — request: "une vue remplace une autre plutôt que l'un
   * au-dessus de l'autre"). The "live" dot on each tab signals which
   * branch the simulator says will render.
   */
  const [activeBranch, setActiveBranch] = useState<Branch>('then');

  // Auto-select the live branch ONCE, on the first non-null simulator
  // result, so the editor opens on the branch that will actually render.
  // After that the user's manual tab choice is preserved — re-evaluating
  // a variable won't yank them away from a branch they're editing.
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (simResult === null) return;
    didAutoSelectRef.current = true;
    setActiveBranch(simResult ? 'then' : 'else');
  }, [simResult]);

  const thenActive = simResult === true;
  const elseActive = simResult === false;
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

      <ConditionSimulator condition={payload.condition} variables={variables} onResult={setSimResult} />

      {/* Tabs header. Each tab shows: icon, label, child count, and a
          subtle "actif" hint when the simulator picks the branch. */}
      <div
        className="border-border flex items-center gap-1 border-b"
        role="tablist"
        aria-label="Branche conditionnelle"
      >
        <TabButton
          isActive={activeBranch === 'then'}
          isLive={thenActive}
          onClick={() => setActiveBranch('then')}
          label="Alors (then)"
          icon="✓"
          count={thenCount}
          tone="then"
        />
        <TabButton
          isActive={activeBranch === 'else'}
          isLive={elseActive}
          onClick={() => setActiveBranch('else')}
          label="Sinon (else)"
          icon="✗"
          count={elseCount}
          tone="else"
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
          className={
            'rounded-md border-l-2 p-3 transition-all ' +
            (thenActive
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/40 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-700/40'
              : simResult === null
                ? 'border-primary/40 bg-primary/5'
                : 'border-muted bg-muted/10')
          }
        >
          <Field label={`✓ Alors (then)${thenActive ? ' — actif' : ''}`} path="then">
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
          className={
            'rounded-md border-l-2 p-3 transition-all ' +
            (elseActive
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/40 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-700/40'
              : simResult === null
                ? 'border-muted bg-muted/20'
                : 'border-muted bg-muted/10')
          }
        >
          <Field label={`✗ Sinon (else)${elseActive ? ' — actif' : ''}`} path="else">
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

/**
 * Single tab button. Visually distinct when active (the user-selected
 * tab) vs. live (the branch the simulator says will render). Both states
 * can coexist — they are independent signals.
 */
function TabButton({
  isActive,
  isLive,
  onClick,
  label,
  icon,
  count,
  tone,
}: {
  isActive: boolean;
  isLive: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  count: number;
  tone: 'then' | 'else';
}) {
  const base =
    'relative -mb-px inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors';
  const activeCls = isActive
    ? tone === 'then'
      ? 'border-border bg-surface text-foreground'
      : 'border-border bg-surface text-foreground'
    : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground';
  const liveDot = isLive ? (
    <span
      className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
      title="Branche active selon le simulateur"
    />
  ) : null;
  return (
    <button type="button" role="tab" aria-selected={isActive} onClick={onClick} className={`${base} ${activeCls}`}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
      <span className="bg-muted text-muted-foreground rounded px-1 text-[10px] tabular-nums">{count}</span>
      {liveDot}
    </button>
  );
}
