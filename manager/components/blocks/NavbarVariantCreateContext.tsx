'use client';

import { createContext, useContext } from 'react';

import type { NavbarVariantMeta } from './editor-types';

/**
 * Optional create-callback for the inline « + Nouvelle navbar… » action in
 * {@link NavbarVariantSelect}. Provided once per editor host
 * (`InlineBlockEditor`), so the leaf picker — and any nested sub-block picker
 * (via `ChildBlockList`) — can create a parcours navbar variant without
 * threading a callback through every per-type editor. `null` (the default)
 * hides the create option, e.g. in isolated / library previews that have no
 * parcours-scoped create action.
 */
export type CreateNavbarVariantFn = (title: string) => Promise<NavbarVariantMeta>;

const NavbarVariantCreateContext = createContext<CreateNavbarVariantFn | null>(null);

export function NavbarVariantCreateProvider({
  onCreate,
  children,
}: {
  onCreate: CreateNavbarVariantFn | null | undefined;
  children: React.ReactNode;
}) {
  return <NavbarVariantCreateContext.Provider value={onCreate ?? null}>{children}</NavbarVariantCreateContext.Provider>;
}

/** Returns the create callback, or `null` when no host provided one. */
export function useNavbarVariantCreate(): CreateNavbarVariantFn | null {
  return useContext(NavbarVariantCreateContext);
}
