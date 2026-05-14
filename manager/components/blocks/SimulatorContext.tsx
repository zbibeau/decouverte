'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { VariableMeta } from './editor-types';

/**
 * Shared state between the **global** variable simulator (top of
 * `PreviewPanel`) and any **inline** simulator (e.g. `ConditionSimulator`
 * inside `ConditionalEditor`).
 *
 * Values are stored as strings to mirror the format used by the preview
 * postMessage protocol (booleans = `'true'` / `'false'`, enums = option
 * value, numbers = stringified). Consumers convert to the typed shape
 * via the variable's `meta.type` when needed.
 */
export interface SimulatorContextValue {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  variables: VariableMeta[];
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({
  value,
  children,
}: {
  value: SimulatorContextValue;
  children: ReactNode;
}) {
  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

/**
 * Returns the simulator context if a `SimulatorProvider` wraps the
 * component, or `null` otherwise. Consumers should gracefully fall back
 * to local state when the context is absent (e.g. rendered outside the
 * `BlockEditor` chrome, in standalone previews).
 */
export function useSimulator(): SimulatorContextValue | null {
  return useContext(SimulatorContext);
}
