'use client';

import { ChevronDown, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
 */
export function DuplicateBlockMenu({
  chapters,
  currentChapterSlug,
  disabled,
  onDuplicateHere,
  onCopyTo,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        title="Dupliquer"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Copy className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[220px] overflow-hidden rounded-md border border-border bg-white text-sm shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-muted/60"
            onClick={() => {
              setOpen(false);
              onDuplicateHere();
            }}
          >
            Dupliquer ici
            <span className="ml-2 text-[10px] text-muted-foreground">(juste après)</span>
          </button>
          {otherChapters.length > 0 && (
            <>
              <div className="border-t border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Copier vers…
              </div>
              <div className="max-h-60 overflow-y-auto">
                {otherChapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted/60"
                    onClick={() => {
                      setOpen(false);
                      onCopyTo(c.id);
                    }}
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      ({c.slug})
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
