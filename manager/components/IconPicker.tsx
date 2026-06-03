'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { ICON_KEYS, iconUrl } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (key: string) => void;
  /** Optional override for the Solid app URL where icons are served from. */
  clientUrl?: string;
}

export function IconPicker({ value, onChange, clientUrl = 'http://localhost:3100' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_KEYS;
    return ICON_KEYS.filter((k) => k.toLowerCase().includes(q));
  }, [query]);

  function pick(key: string) {
    onChange(key);
    setOpen(false);
    setQuery('');
  }

  function clear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'border-border bg-surface hover:bg-muted flex h-9 w-full items-center gap-2 rounded-md border px-2 text-sm transition-colors',
        )}
      >
        {value ? (
          <>
            <img
              src={iconUrl(value, clientUrl)}
              alt={value}
              className="h-5 w-5 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
              }}
            />
            <code className="flex-1 truncate text-xs">{value}</code>
            {/* Not a <button> — that would be invalid HTML (button inside a button)
                and causes React hydration errors. We use a focusable span instead. */}
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') clear(e);
              }}
              className="text-muted-foreground hover:bg-border rounded p-0.5"
              title="Retirer l'icône"
              aria-label="Retirer l'icône"
            >
              <X className="h-3 w-3" />
            </span>
          </>
        ) : (
          <span className="text-muted-foreground flex-1 text-left text-xs">— Choisir une icône —</span>
        )}
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="border-border bg-surface absolute left-0 right-0 top-full z-50 mt-1 max-h-[320px] overflow-hidden rounded-md border shadow-lg">
          <div className="border-border border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="h-8 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-xs">Aucune icône trouvée.</p>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {filtered.map((key) => {
                  const isActive = key === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pick(key)}
                      title={key}
                      className={cn(
                        'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border p-1 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-border hover:bg-muted border-transparent',
                      )}
                    >
                      <img
                        src={iconUrl(key, clientUrl)}
                        alt={key}
                        className="h-6 w-6"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-border bg-muted/30 text-muted-foreground border-t px-2 py-1 text-[10px]">
            {filtered.length} / {ICON_KEYS.length} icônes
          </div>
        </div>
      )}
    </div>
  );
}
