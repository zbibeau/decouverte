'use client';

import { type Dispatch, type SetStateAction, useEffect } from 'react';

/**
 * Wire the global keyboard shortcuts that drive the command palette:
 *
 *   ⌘K / Ctrl+K    — toggle open/closed
 *   ⌘P / Ctrl+P    — alias (power-user habit)
 *   Escape         — close (only when currently open)
 *
 * Mounted once at the top level by `<CommandPalette>` ; listens at the
 * window so it fires regardless of where focus is — including inside the
 * cmdk input itself.
 */
export function useCommandPaletteHotkeys(setOpen: Dispatch<SetStateAction<boolean>>): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // `e.key` can be undefined for synthetic / autofill keydowns —
      // bail early so we don't crash the page.
      const k = e.key?.toLowerCase();
      if (!k) return;
      if ((k === 'k' || k === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (k === 'escape') {
        setOpen((v) => {
          if (!v) return v;
          e.preventDefault();
          return false;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
