'use client';

import {
  createContext,
  type ElementType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

/**
 * Context used by **any** nested editor to publish "Add X" actions that
 * make sense at its level of the editing tree, and consumed by the global
 * ⌘K palette (and potentially other surfaces) to surface those actions
 * from the deepest scope to the shallowest.
 *
 * Why two contexts?
 *   - Editors must NOT re-render when other editors register/deregister
 *     (otherwise their inline `onChange` props get fresh identities, the
 *     useEffect deps change, register fires again → infinite loop).
 *   - So editors only consume `RegisterContext`, which exposes a stable
 *     `register` function. The palette consumes `ScopesContext`, which
 *     changes whenever the scope set mutates.
 */

export interface AddAction {
  id: string;
  label: string;
  description?: string;
  run: () => void | Promise<void>;
}

export interface AddScope {
  id: string;
  label: string;
  depth: number;
  actions: AddAction[];
}

type RegisterFn = (scope: AddScope) => () => void;

const RegisterContext = createContext<RegisterFn | null>(null);
const ScopesContext = createContext<AddScope[]>([]);

/**
 * Selection state — which scope the user is "in" right now, set by
 * clicking inside a `<ScopeRoot>`. Drives the visual selection ring and
 * the palette's "selected first" ordering.
 */
interface SelectionValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}
const SelectionContext = createContext<SelectionValue | null>(null);

export function AddActionsProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<Map<string, AddScope>>(new Map());
  const listenersRef = useRef<Set<() => void>>(new Set());
  // Cached scopes array; rebuilt only when the map mutates. Stable
  // identity between updates is what lets the palette React-batch.
  const scopesRef = useRef<AddScope[]>([]);
  function rebuildScopes() {
    scopesRef.current = Array.from(mapRef.current.values()).sort(
      (a, b) => b.depth - a.depth,
    );
  }
  // Force-update only for components that depend on the scopes (the palette).
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const register = useCallback<RegisterFn>((scope) => {
    mapRef.current.set(scope.id, scope);
    rebuildScopes();
    bump();
    return () => {
      mapRef.current.delete(scope.id);
      rebuildScopes();
      bump();
    };
  }, []);

  // ---- Scope selection (set by ScopeRoot onMouseDown) ----
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
  }, []);
  const selectionValue = useMemo<SelectionValue>(
    () => ({ selectedId, setSelectedId }),
    [selectedId, setSelectedId],
  );

  // Editors only see `register`, which is referentially stable — they
  // never re-render due to scopes mutations. SelectionContext changes
  // when the user clicks a scope, which re-renders ScopeRoot wrappers
  // (cheap) and the palette.
  return (
    <RegisterContext.Provider value={register}>
      <ScopesContext.Provider value={scopesRef.current}>
        <SelectionContext.Provider value={selectionValue}>{children}</SelectionContext.Provider>
      </ScopesContext.Provider>
    </RegisterContext.Provider>
  );
}

/**
 * Consumed by the palette / any surface that wants to display the
 * current list of registered scopes. Re-renders the caller when scopes
 * mutate.
 */
export function useAddActionScopes(): AddScope[] {
  return useContext(ScopesContext);
}

/**
 * Read-only access to the currently selected scope id. The palette
 * uses this to promote the matching scope to the top of its list.
 */
export function useSelectedScopeId(): string | null {
  return useContext(SelectionContext)?.selectedId ?? null;
}

/**
 * `<ScopeRoot scopeId="...">` — wrap an editor region with this to make
 * a mouse-click inside it set the scope as "selected". The wrapper also
 * applies a visible ring when its scope is the current selection.
 *
 * Multiple nested ScopeRoots are fine: the innermost one wins (it fires
 * first on bubble, then stops propagation so outer wrappers don't
 * overwrite the selection).
 */
export function ScopeRoot({
  scopeId,
  className,
  children,
  as: As = 'div',
  ringClass = 'ring-2 ring-brand-primary-400 ring-offset-1',
}: {
  scopeId: string;
  className?: string;
  children: ReactNode;
  /** Override the wrapper tag (defaults to <div>). */
  as?: ElementType;
  /** Custom ring/highlight class — applied when the scope is selected. */
  ringClass?: string;
}) {
  const sel = useContext(SelectionContext);
  const isSelected = sel?.selectedId === scopeId;
  return (
    <As
      data-scope-id={scopeId}
      onMouseDown={(e: ReactMouseEvent) => {
        sel?.setSelectedId(scopeId);
        e.stopPropagation();
      }}
      className={(className ?? '') + (isSelected ? ' ' + ringClass : '')}
    >
      {children}
    </As>
  );
}

/**
 * Editor-side hook. Re-registers the scope whenever any value in `deps`
 * changes. NOTE: relies on the stable `RegisterContext` so the editor
 * doesn't re-render on unrelated scope updates.
 */
export function useRegisterAddScope(
  scope: AddScope | null,
  deps: ReadonlyArray<unknown>,
): void {
  const register = useContext(RegisterContext);
  useEffect(() => {
    if (!register || !scope) return;
    return register(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, scope?.id, scope?.label, scope?.depth, ...deps]);
}
