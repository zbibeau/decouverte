'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Coordinates which field is being hovered/focused in the block editor so
 * the preview iframe can highlight the corresponding rendered element.
 *
 * The provider is mounted once at the top of `BlockEditor`; the actual
 * `hoveredField` state lives in the BlockEditor component (so it can also
 * be passed as a prop to `<PreviewPanel>`). `Field` consumes the setter
 * via `useSetHoveredField()`.
 */
interface FieldHoverContextValue {
  setHoveredField: (path: string | null) => void;
}

const FieldHoverContext = createContext<FieldHoverContextValue>({
  setHoveredField: () => {},
});

export function FieldHoverProvider({
  setHoveredField,
  children,
}: {
  setHoveredField: (path: string | null) => void;
  children: ReactNode;
}) {
  return (
    <FieldHoverContext.Provider value={{ setHoveredField }}>{children}</FieldHoverContext.Provider>
  );
}

/** Hook used by `<Field>` (and `<InlineDiffBadge>`) to notify the provider. */
export function useSetHoveredField(): (path: string | null) => void {
  return useContext(FieldHoverContext).setHoveredField;
}
