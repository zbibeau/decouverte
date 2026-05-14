'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

interface ChapterOption {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  chapters: ChapterOption[];
  disabled?: boolean;
  onPick: (targetChapterId: string) => void;
}

/**
 * Small dropdown shown on each library card: "Insérer dans…" then the user
 * picks the target chapter. Closes on outside click / Escape.
 */
export function LibraryInsertMenu({ chapters, disabled, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        disabled={disabled || chapters.length === 0}
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Insérer dans un chapitre
        <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
      </Button>
      {open && chapters.length > 0 && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[260px] overflow-hidden rounded-md border border-border bg-white text-sm shadow-lg">
          <div className="border-b border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Choisir un chapitre cible
          </div>
          <div className="max-h-72 overflow-y-auto">
            {chapters.map((c) => (
              <button
                key={c.id}
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted/60"
                onClick={() => {
                  setOpen(false);
                  onPick(c.id);
                }}
              >
                <span className="truncate">{c.title}</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  ({c.slug})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
