'use client';

import type { BranchingCondition, ContentBlock } from '@shared/content-schema';
import { useState } from 'react';

import { ChildBlockList } from './ChildBlockList';
import { ConditionBuilder } from './ConditionBuilder';
import { ConditionSimulator } from './ConditionSimulator';
import { Field } from './Field';
import type { PayloadEditorProps } from './editor-types';

type CondPayload = {
  condition: BranchingCondition;
  then: ContentBlock[];
  else?: ContentBlock[];
};

export function ConditionalEditor({ payload, onChange, variables, depth = 0 }: PayloadEditorProps<CondPayload>) {
  /** Live evaluation result from the simulator. `null` = no variables yet. */
  const [simResult, setSimResult] = useState<boolean | null>(null);

  const thenActive = simResult === true;
  const elseActive = simResult === false;

  return (
    <div className="space-y-3">
      <Field label="Condition" path="condition">
        <ConditionBuilder
          condition={payload.condition}
          onChange={(condition) => onChange({ ...payload, condition })}
          variables={variables}
        />
      </Field>

      <ConditionSimulator
        condition={payload.condition}
        variables={variables}
        onResult={setSimResult}
      />

      <div
        className={
          'rounded-md border-l-2 p-3 transition-all ' +
          (thenActive
            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/40'
            : simResult === null
              ? 'border-primary/40 bg-primary/5'
              : 'border-muted bg-muted/10 opacity-60')
        }
      >
        <Field
          label={`✓ Alors (then)${thenActive ? ' — actif' : ''}`}
          path="then"
        >
          <ChildBlockList
            blocks={payload.then}
            onChange={(then) => onChange({ ...payload, then })}
            variables={variables}
            depth={depth + 1}
            scopeLabel="Conditionnel > Alors"
          />
        </Field>
      </div>

      <div
        className={
          'rounded-md border-l-2 p-3 transition-all ' +
          (elseActive
            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/40'
            : simResult === null
              ? 'border-muted bg-muted/20'
              : 'border-muted bg-muted/10 opacity-60')
        }
      >
        <Field
          label={`✗ Sinon (else)${elseActive ? ' — actif' : ''}`}
          path="else"
        >
          <ChildBlockList
            blocks={payload.else ?? []}
            onChange={(next) => onChange({ ...payload, else: next })}
            variables={variables}
            depth={depth + 1}
            scopeLabel="Conditionnel > Sinon"
          />
        </Field>
      </div>
    </div>
  );
}
