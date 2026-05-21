'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * In-page search input — the "loupe" filter on the block and chapter
 * editors. Lets the user keep searching after they dismissed the
 * yellow banner that came from a ⌘K landing (the banner is gone with
 * the URL `?q=`, but the editor still wants a way to highlight
 * matching fields / blocks).
 *
 * Pure presentational : the parent owns the `value` state. Typing
 * here updates the parent, which feeds it into the same
 * `SearchMatchProvider` / match-set computation that the ⌘K banner
 * uses.
 *
 * Visual layout : a flat input row with a leading loupe icon, the
 * input itself, and a trailing × clear button when there's content.
 * Compact enough to live above the editor without crowding the
 * existing affordances.
 */
export function InPageSearchInput({
  value,
  onChange,
  placeholder = 'Filtrer les champs…',
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="border-border bg-muted/20 flex items-center gap-2 rounded-md border px-2 py-1.5">
      <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground h-7 flex-1 bg-transparent text-sm outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Effacer la recherche"
          className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition"
          title="Effacer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
