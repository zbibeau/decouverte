'use client';

import { useEffect } from 'react';

/**
 * Adds a native `beforeunload` prompt while `when` is true, so closing or
 * reloading the tab (or following an external link) with unsaved edits
 * asks the author to confirm first.
 *
 * Next.js App Router intercepts IN-APP navigation but NOT browser-level
 * unloads (tab close, refresh, address-bar navigation) — this hook covers
 * exactly that gap. Modern browsers show their own generic prompt and
 * ignore custom text; assigning `returnValue` is what triggers it.
 *
 * Pass a precise dirty flag (true only when there are genuinely unsaved
 * changes) so the author isn't warned after merely opening an editor.
 */
export function useUnsavedChangesWarning(when: boolean) {
  useEffect(() => {
    if (!when) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);
}
