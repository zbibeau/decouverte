import {
  type BranchingCondition,
  isAllCondition,
  isAnyCondition,
  isLeafCondition,
} from '@shared/content-schema';

import type { VariableMeta } from '@/components/blocks/editor-types';

/**
 * Walk a (potentially nested) branching condition and collect every
 * variable key it references. Order = depth-first traversal so callers
 * can list variables in roughly the order they appear in the condition.
 *
 * Pure function — no React, no DOM. Safe to call from a memo / effect.
 */
export function collectVariableKeys(
  cond: BranchingCondition,
  acc: string[] = [],
): string[] {
  if (isLeafCondition(cond)) {
    if (cond.variable && !acc.includes(cond.variable)) acc.push(cond.variable);
    return acc;
  }
  if (isAllCondition(cond)) {
    cond.all.forEach((c) => collectVariableKeys(c, acc));
    return acc;
  }
  if (isAnyCondition(cond)) {
    cond.any.forEach((c) => collectVariableKeys(c, acc));
    return acc;
  }
  return acc;
}

/**
 * Sensible initial value for each variable type — used by simulators
 * when they encounter a variable they haven't seen yet.
 */
export function defaultValueForVariable(meta: VariableMeta | undefined): unknown {
  if (!meta) return '';
  switch (meta.type) {
    case 'boolean':
      return false;
    case 'enum':
      return meta.options[0]?.value ?? '';
    case 'number':
      return 0;
    default:
      return '';
  }
}
