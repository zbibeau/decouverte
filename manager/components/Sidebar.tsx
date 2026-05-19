'use client';

import { BookOpen, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SignOutButton } from '@/components/SignOutButton';
import { pastelForString, safeThemeColor } from '@/lib/pastelColors';
import { cn } from '@/lib/utils';

interface ParcoursItem {
  id: string;
  slug: string;
  name: string;
  /** Pastel color tinting the parcours header. `null` for legacy rows. */
  themeColor?: string | null;
}

interface Props {
  email: string;
  parcours: ParcoursItem[];
}

const STORAGE_KEY = 'manager:sidebarCollapsed';

export function Sidebar({ email, parcours }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname() ?? '';
  /** Extract the active parcours slug from the URL (e.g. `/parcours/test-new/chapters/...` → `test-new`). */
  const activeSlug = (() => {
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] === 'parcours' && parts[1] ? decodeURIComponent(parts[1]) : null;
  })();

  // Read persisted state on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  /** Force-collapse the sidebar (no toggle). Called when the user picks a
   *  parcours so the parcours detail gets the full viewport width — most
   *  users navigate to a single parcours and stay there. They can re-expand
   *  via the chevron in the top-left when they need to switch. */
  function collapse() {
    setCollapsed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  // Avoid a hydration flash: render the expanded width on the server, then
  // swap to the persisted state once hydrated.
  const isCollapsed = hydrated && collapsed;

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-r border-border bg-white transition-[width] duration-200',
        isCollapsed ? 'w-12' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {!isCollapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary-600 text-[11px] font-bold text-white shadow-brand">
              M
            </span>
            <span>Découverte — Manager</span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          title={isCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <nav className="flex flex-col gap-0.5 p-2">
          <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Parcours
          </p>
          {parcours.map((p) => {
            const isActive = activeSlug === p.slug;
            return (
              <Link
                key={p.id}
                href={`/parcours/${p.slug}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={collapse}
                className={cn(
                  'group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-brand-primary-100 font-semibold text-brand-primary-700 ring-1 ring-brand-primary-300/60'
                    : 'text-foreground hover:bg-brand-primary-50 hover:text-brand-primary-700',
                )}
              >
                {/* Left accent bar for the active item — extra visibility */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-primary-600"
                  />
                )}
                {/* Small color dot matching the parcours' theme color —
                     visual cue so the author quickly tells projects apart
                     in the list. Falls back to a deterministic pastel
                     derived from the slug for legacy rows without a
                     stored theme_color. */}
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border/60"
                  style={{
                    background: safeThemeColor(
                      p.themeColor ?? pastelForString(p.slug),
                    ),
                  }}
                />
                <BookOpen
                  className={cn(
                    'h-4 w-4',
                    isActive
                      ? 'text-brand-primary-700'
                      : 'text-muted-foreground group-hover:text-brand-primary-600',
                  )}
                />
                <span className="truncate">{p.name}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-2">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="truncate">{email}</span>
            <SignOutButton>
              <LogOut className="h-4 w-4" />
            </SignOutButton>
          </div>
        </div>
      )}
    </aside>
  );
}
