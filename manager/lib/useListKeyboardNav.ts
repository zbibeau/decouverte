'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keyboard navigation helper for list pages (parcours grid, chapter list,
 * block list, etc.).
 *
 *   ↑ / ↓        — move selection
 *   →            — navigate to selected item's href
 *   ←            — navigate to the parent page
 *
 * Note: Enter and Escape are intentionally NOT bound — Enter is reserved
 * for form submissions / button activations elsewhere, and Escape is
 * reserved for closing modals (palette, etc.). vim-style j/k/h/l are
 * also unbound to keep typing-anywhere predictable.
 *
 * Behaviour notes:
 *   - The hook ignores key events while an `<input>`, `<textarea>`, `<select>`
 *     or contenteditable element has focus — so typing in a search box
 *     doesn't move the row selection.
 *   - The selected index is persisted in `sessionStorage` keyed by the
 *     current pathname, so navigating into a child and pressing Esc
 *     restores the previous focus row.
 *   - The hook returns `selectedIdx` and a setter, so the caller can
 *     render the selected row with a visual ring/background.
 *
 * @param items     The rows that can be selected. Order matters.
 * @param getHref   Builds the URL for a given item — null disables navigation
 *                  for that row (e.g. disabled placeholders).
 * @param parentHref URL to go back to on Esc/←. `null` = no parent.
 */
export function useListKeyboardNav<T>(
  items: readonly T[],
  getHref: (item: T, index: number) => string | null,
  parentHref: string | null = null,
): { selectedIdx: number; setSelectedIdx: (n: number) => void; isClient: boolean } {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const storageKey = `mfm.listNav.${pathname}`;
  // Always start at 0 (matches server-side render). Rehydrate from
  // sessionStorage in a useEffect — that way the first client render
  // matches the server output and we avoid hydration mismatches.
  const [selectedIdx, setSelectedIdxState] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      const n = stored ? Number(stored) : 0;
      if (Number.isFinite(n) && n >= 0 && n < items.length) {
        setSelectedIdxState(n);
      }
    } catch {
      // sessionStorage may be blocked — non-fatal.
    }
    // Only re-read storage when the page changes (storageKey is derived
    // from pathname). Don't rerun on items.length changes — that would
    // overwrite the user's current selection on each re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist whenever the selection changes.
  const setSelectedIdx = useCallback(
    (n: number) => {
      setSelectedIdxState(n);
      try {
        window.sessionStorage.setItem(storageKey, String(n));
      } catch {
        // sessionStorage may be blocked — non-fatal.
      }
    },
    [storageKey],
  );

  // Clamp the selected index if items shrink (e.g. after a delete).
  useEffect(() => {
    if (items.length === 0) return;
    if (selectedIdx >= items.length) setSelectedIdx(items.length - 1);
  }, [items.length, selectedIdx, setSelectedIdx]);

  // Stable refs so the listener doesn't need to be reattached every render.
  const stateRef = useRef({ items, getHref, parentHref, selectedIdx, setSelectedIdx, router });
  stateRef.current = { items, getHref, parentHref, selectedIdx, setSelectedIdx, router };

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return; // leave ⌘K and friends alone
      if (isTypingTarget(e.target)) return;
      const { items, getHref, parentHref, selectedIdx, setSelectedIdx, router } = stateRef.current;
      const len = items.length;
      if (len === 0 && e.key !== 'Escape') return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx((selectedIdx + 1) % len);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx((selectedIdx - 1 + len) % len);
          break;
        case 'ArrowRight': {
          const href = getHref(items[selectedIdx], selectedIdx);
          if (!href) return;
          e.preventDefault();
          router.push(href);
          break;
        }
        case 'ArrowLeft':
          if (parentHref) {
            e.preventDefault();
            router.push(parentHref);
          }
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIdx(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIdx(len - 1);
          break;
        default:
          return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { selectedIdx, setSelectedIdx, isClient };
}

/**
 * Slim variant for pages without a list — listens to ← to go back to
 * the parent page. Escape is intentionally NOT bound (it's reserved for
 * closing modals).
 */
export function useBackArrowToParent(parentHref: string | null): void {
  const router = useRouter();
  useEffect(() => {
    if (!parentHref) return;
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowLeft' && parentHref) {
        e.preventDefault();
        router.push(parentHref);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [parentHref, router]);
}
