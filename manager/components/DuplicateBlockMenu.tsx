'use client';

import { ChevronDown, Copy } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';

interface ChapterOption {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  /** All chapters in the current parcours, including the current one. */
  chapters: ChapterOption[];
  /** Slug of the chapter being viewed (excluded from "vers …" list). */
  currentChapterSlug: string;
  disabled?: boolean;
  /** Duplicate inside the current chapter, right after the source. */
  onDuplicateHere: () => void;
  /** Copy into another chapter (appended at the end). */
  onCopyTo: (targetChapterId: string) => void;
}

/**
 * Dropdown shown next to the trash icon in the block list. First option
 * duplicates inside the current chapter (most common case); the rest sends
 * a copy to another chapter of the parcours.
 *
 * Rendered via a `createPortal` into `document.body` so the menu escapes
 * the parent's `overflow-y-auto` clipping (the block list lives inside
 * a scrollable Card — without the portal, the dropdown would be cut off
 * at the bottom of the list). Position is computed from the trigger's
 * bounding rect each time the menu opens; we re-compute on scroll /
 * resize while it's open so the menu stays anchored.
 */
export function DuplicateBlockMenu({ chapters, currentChapterSlug, disabled, onDuplicateHere, onCopyTo }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Position the menu under the trigger, right-aligned. Re-computed on
  // open + whenever the page scrolls or resizes while it's visible —
  // matters when the user scrolls the chapter list while the menu is
  // already showing.
  useLayoutEffect(() => {
    if (!open) return;
    function updateCoords() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open]);

  // Close on outside click / Escape. The outside detector accounts for
  // BOTH the trigger and the portaled menu — otherwise clicking inside
  // the menu would count as "outside" because it's no longer a child of
  // the trigger in the DOM tree.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const otherChapters = chapters.filter((c) => c.slug !== currentChapterSlug);

  return (
    <div ref={triggerRef} className="relative">
      <Button variant="ghost" size="sm" title="Dupliquer" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <Copy className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, right: coords.right }}
            className="border-border z-50 min-w-[220px] overflow-hidden rounded-md border bg-white text-sm shadow-lg"
          >
            <button
              type="button"
              className="hover:bg-muted/60 block w-full px-3 py-2 text-left"
              onClick={() => {
                setOpen(false);
                onDuplicateHere();
              }}
            >
              Dupliquer ici
              <span className="text-muted-foreground ml-2 text-[10px]">(juste après)</span>
            </button>
            {otherChapters.length > 0 && (
              <>
                <div className="border-border text-muted-foreground border-t px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  Copier vers…
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {otherChapters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="hover:bg-muted/60 block w-full px-3 py-2 text-left"
                      onClick={() => {
                        setOpen(false);
                        onCopyTo(c.id);
                      }}
                    >
                      <span className="truncate">{c.title}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-[10px]">({c.slug})</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
