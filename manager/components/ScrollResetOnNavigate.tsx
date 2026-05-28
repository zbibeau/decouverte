'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Resets the app-shell scroll position to the top on every route change.
 *
 * Next.js App Router restores / resets scroll on the window &
 * `document.documentElement` only. But this shell scrolls inside
 * `<main className="… overflow-y-auto">` (see `app/(app)/layout.tsx`) —
 * a custom scroll container Next doesn't touch. Without this, navigating
 * from a scrolled-down chapter list into a chapter / block view kept the
 * previous `scrollTop`, so the new view appeared mid-page instead of at
 * the top.
 *
 * Runs on initial mount + on every pathname change. Pure side-effect
 * component (renders null). The `instant` scroll is deliberate — a
 * smooth animation on every navigation would feel sluggish.
 *
 * Note on ⌘K deep-links : the chapter editor scrolls to the first
 * matching block via `requestAnimationFrame` (see ChapterEditor's
 * `searchQuery` effect). That rAF runs AFTER this synchronous reset, so
 * the match-scroll still wins — landing-at-top only applies to plain
 * navigations.
 */
export function ScrollResetOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, left: 0 });
    // Defensive fallback for any layout variant where the document
    // itself is the scroller rather than <main>.
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}
