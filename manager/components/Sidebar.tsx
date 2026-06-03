'use client';

import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SignOutButton } from '@/components/SignOutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { pastelForString, safeThemeColor } from '@/lib/pastelColors';
import { cn } from '@/lib/utils';

interface ParcoursItem {
  id: string;
  slug: string;
  name: string;
  /** Pastel color tinting the parcours header. `null` for legacy rows. */
  themeColor?: string | null;
  /** True when this parcours has an active draft (= uncommitted changes
   *  vs the live version). Drives a small orange pulse next to the name
   *  so authors spot pending work without navigating in. */
  hasDraft?: boolean;
}

interface Props {
  email: string;
  parcours: ParcoursItem[];
}

const STORAGE_KEY = 'manager:sidebarCollapsed';

/**
 * Rail latéral « Studio » — graphite permanent, **identique en clair et en
 * sombre**. C'est la signature visuelle de la direction : un cadre sobre qui
 * encadre le plan de travail clair et fait ressortir les contenus colorés
 * (tags, field rails, preview).
 *
 * Replié (w-14 = 56 px) : rail d'icônes. Chaque parcours garde son dot
 * coloré + son icône, l'item actif a la même barre violet 3 px qu'en mode
 * déplié — le repère visuel reste lisible.
 */
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
        // Rail graphite — TOUJOURS sombre. Variables `--rail-*` jamais
        // overrides par .dark → cohérence visuelle en clair comme en sombre.
        'bg-rail-bg border-rail-border text-rail-text relative flex shrink-0 flex-col border-r transition-[width] duration-200',
        isCollapsed ? 'w-14' : 'w-64',
      )}
    >
      {/* Header : logo carré violet + toggle. Sépare visuellement la
          marque du contenu nav via une bordure basse. */}
      <div
        className={cn(
          'border-rail-border flex h-14 items-center border-b',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3',
        )}
      >
        {!isCollapsed && (
          <Link href="/" className="text-rail-text flex items-center gap-2 text-sm font-semibold">
            <span
              className="bg-primary text-on-primary inline-flex h-7 w-7 items-center justify-center text-[12px] font-bold"
              style={{ borderRadius: 7 }}
            >
              M
            </span>
            <span className="truncate">Manager</span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          className="text-rail-muted hover:text-rail-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          title={isCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn('flex flex-1 flex-col gap-0.5', isCollapsed ? 'px-1.5 py-2' : 'p-2')}>
        {!isCollapsed && (
          <p className="text-rail-section px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em]">
            Parcours
          </p>
        )}
        {parcours.map((p) => {
          const isActive = activeSlug === p.slug;
          const tint = safeThemeColor(p.themeColor ?? pastelForString(p.slug));
          // Initiale du parcours — premier caractère non-espace du nom,
          // capitalisé. Fallback sur le slug si le nom est vide, puis « ? »
          // pour ne jamais rendre une pastille sans glyphe.
          const initial = (p.name?.trim() || p.slug || '?').charAt(0).toUpperCase() || '?';
          return (
            <Link
              key={p.id}
              href={`/parcours/${p.slug}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={collapse}
              title={isCollapsed ? p.name : undefined}
              className={cn(
                'group relative flex items-center rounded-md text-sm transition-colors',
                isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2 py-1.5',
                isActive
                  ? 'bg-rail-active-bg text-rail-active-text'
                  : 'text-rail-text hover:text-rail-active-text hover:bg-white/[0.055]',
              )}
            >
              {/* Liseré gauche pour l'item actif — repère ultra-rapide
                  même quand l'œil scanne verticalement. */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                />
              )}
              {/* Pastille colorée du parcours — fond = `theme_color` (la
                  même teinte que l'ancien bandeau de header), initiale du
                  nom centrée en gras. Sert de mini-identité visuelle pour
                  le parcours et, en collapsed, devient le seul identifiant
                  (avec le tooltip natif sur `title=`). Texte forcé en
                  #181b22 (= `--text` clair) parce que la palette de pastels
                  est calibrée pour rester lisible avec du texte sombre,
                  peu importe le thème global. */}
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-md border border-white/10 font-semibold leading-none',
                  isCollapsed ? 'h-9 w-9 text-base' : 'h-7 w-7 text-[13px]',
                )}
                style={{ background: tint, color: '#181b22' }}
              >
                {initial}
              </span>
              {!isCollapsed && (
                <>
                  <span className="truncate">{p.name}</span>
                  {p.hasDraft && (
                    <span
                      aria-label="Brouillon non publié"
                      title="Brouillon non publié"
                      className="ml-auto inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/30"
                    />
                  )}
                </>
              )}
              {/* Pastille brouillon en collapsed : petit point amber dans le
                  coin haut-droite de la pastille colorée. `ring-rail-bg`
                  pour le découper proprement sur le fond graphite. */}
              {isCollapsed && p.hasDraft && (
                <span
                  aria-label="Brouillon non publié"
                  title="Brouillon non publié"
                  className="ring-rail-bg absolute right-1.5 top-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer : email (déplié) + theme toggle + logout. Bordure haute
          pour matérialiser la séparation avec la nav. */}
      <div
        className={cn(
          'border-rail-border border-t',
          isCollapsed ? 'flex flex-col items-center gap-1 px-1.5 py-2' : 'px-2 py-2',
        )}
      >
        {!isCollapsed ? (
          <div className="text-rail-muted flex items-center gap-1.5 px-2 py-1.5 text-xs">
            <span className="flex-1 truncate" title={email}>
              {email}
            </span>
            <ThemeToggle />
            <SignOutButton>
              <LogOut className="h-4 w-4" />
            </SignOutButton>
          </div>
        ) : (
          <>
            <ThemeToggle />
            <SignOutButton>
              <LogOut className="h-4 w-4" />
            </SignOutButton>
          </>
        )}
      </div>
    </aside>
  );
}
