'use client';

import {
  ChevronsUpDown,
  History,
  ImageIcon,
  LayoutList,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Stethoscope,
} from 'lucide-react';
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
 * Refonte Direction B (handoff §4) :
 *   - En-tête : pastille logo 30×30 en gradient violet + Stethoscope blanc
 *     + libellés « MadeForMed » / « Studio · Découverte ».
 *   - Déclencheur ⌘K factice : champ de recherche cliquable qui ouvre la
 *     palette via dispatch event clavier (le `useCommandPaletteHotkeys`
 *     écoute déjà window keydown).
 *   - Deux sections de nav : « Parcours de découverte » (liste live) et
 *     « Studio » (Vue d'ensemble).
 *   - Pied : avatar avec initiales du user + email + chevronsUpDown.
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
  /** Active state for the Studio section links. */
  const onOverview = pathname === '/overview' || pathname.startsWith('/overview/');
  const onMedia = pathname === '/media' || pathname.startsWith('/media/');
  const onHistory = pathname === '/history' || pathname.startsWith('/history/');
  const onSettings = pathname === '/settings' || pathname.startsWith('/settings/');

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

  /** Direction B — Déclencheur ⌘K. Click sur le champ « Rechercher… »
   *  dispatch un événement clavier ⌘K que `useCommandPaletteHotkeys`
   *  écoute déjà → ouverture sans nouveau contexte React.  */
  function openCommandPalette() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
  }

  // Initiale email pour l'avatar utilisateur (premier char du local-part).
  const userInitials = (email?.split('@')[0]?.[0] ?? '?').toUpperCase();

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
      {/* En-tête Direction B : pastille violet-gradient + Stethoscope +
          libellés « MadeForMed » / « Studio · Découverte ». Toggle à
          droite (replier/déplier la sidebar). */}
      <div
        className={cn(
          'border-rail-border flex h-[60px] items-center border-b',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3',
        )}
      >
        {!isCollapsed ? (
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(150deg, #9951fb, #6e1ed2)' }}
            >
              <Stethoscope className="h-[15px] w-[15px] text-white" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[14px] font-bold text-white">MadeForMed</span>
              <span className="text-rail-muted truncate text-[11px] font-semibold">Studio · Découverte</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            aria-label="Accueil"
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(150deg, #9951fb, #6e1ed2)' }}
          >
            <Stethoscope className="h-[15px] w-[15px] text-white" />
          </Link>
        )}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggle}
            className="text-rail-muted hover:text-rail-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
            title="Masquer la sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Toggle en mode collapsed — sous le logo. Le placer dans le header
          collapsed encombrerait, le mettre ici garde le logo seul. */}
      {isCollapsed && (
        <div className="border-rail-border/40 flex justify-center border-b px-2 py-1.5">
          <button
            type="button"
            onClick={toggle}
            className="text-rail-muted hover:text-rail-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
            title="Afficher la sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Déclencheur ⌘K Direction B — champ de recherche factice qui
          ouvre la palette. Visible uniquement en mode déplié (en mode
          collapsed le user peut presser ⌘K direct au clavier). */}
      {!isCollapsed && (
        <div className="px-2 pt-2.5">
          <button
            type="button"
            onClick={openCommandPalette}
            className="border-rail-border text-rail-muted hover:text-rail-text flex h-9 w-full items-center gap-2 rounded-md border bg-white/[0.04] px-2.5 text-xs transition-colors hover:bg-white/[0.07]"
            title="Ouvrir la palette de commandes (⌘K)"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="border-rail-border inline-flex h-5 min-w-5 items-center justify-center rounded border bg-white/[0.04] px-1 font-mono text-[10px]">
              ⌘
            </kbd>
            <kbd className="border-rail-border inline-flex h-5 min-w-5 items-center justify-center rounded border bg-white/[0.04] px-1 font-mono text-[10px]">
              K
            </kbd>
          </button>
        </div>
      )}

      <nav className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto', isCollapsed ? 'px-1.5 py-2' : 'p-2')}>
        {!isCollapsed && (
          <p className="text-rail-section px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.07em]">
            Parcours de découverte
          </p>
        )}
        {parcours.map((p) => {
          const isActive = activeSlug === p.slug;
          const tint = safeThemeColor(p.themeColor ?? pastelForString(p.slug));
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
              {isActive && (
                <span
                  aria-hidden="true"
                  className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                />
              )}
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

        {/* Section « Studio » Direction B — entrées globales (cross-parcours).
            Pour le moment : Vue d'ensemble. Bibliothèque média / Historique /
            Réglages sont mentionnés dans le handoff mais n'ont pas de routes
            dédiées dans le manager actuel — on les ajoutera quand ces écrans
            existeront. */}
        {!isCollapsed && (
          <p className="text-rail-section mt-4 px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.07em]">
            Studio
          </p>
        )}
        <Link
          href="/overview"
          aria-current={onOverview ? 'page' : undefined}
          title={isCollapsed ? "Vue d'ensemble" : undefined}
          className={cn(
            'group relative flex items-center rounded-md text-sm transition-colors',
            isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2 py-1.5',
            onOverview
              ? 'bg-rail-active-bg text-rail-active-text'
              : 'text-rail-text hover:text-rail-active-text hover:bg-white/[0.055]',
          )}
        >
          {onOverview && (
            <span
              aria-hidden="true"
              className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            />
          )}
          <LayoutList className={cn('shrink-0', isCollapsed ? 'h-5 w-5' : 'h-4 w-4')} />
          {!isCollapsed && <span className="truncate">Vue d'ensemble</span>}
        </Link>
        <Link
          href="/media"
          aria-current={onMedia ? 'page' : undefined}
          title={isCollapsed ? 'Bibliothèque média' : undefined}
          className={cn(
            'group relative flex items-center rounded-md text-sm transition-colors',
            isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2 py-1.5',
            onMedia
              ? 'bg-rail-active-bg text-rail-active-text'
              : 'text-rail-text hover:text-rail-active-text hover:bg-white/[0.055]',
          )}
        >
          {onMedia && (
            <span
              aria-hidden="true"
              className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            />
          )}
          <ImageIcon className={cn('shrink-0', isCollapsed ? 'h-5 w-5' : 'h-4 w-4')} />
          {!isCollapsed && <span className="truncate">Bibliothèque média</span>}
        </Link>
        <Link
          href="/history"
          aria-current={onHistory ? 'page' : undefined}
          title={isCollapsed ? 'Historique' : undefined}
          className={cn(
            'group relative flex items-center rounded-md text-sm transition-colors',
            isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2 py-1.5',
            onHistory
              ? 'bg-rail-active-bg text-rail-active-text'
              : 'text-rail-text hover:text-rail-active-text hover:bg-white/[0.055]',
          )}
        >
          {onHistory && (
            <span
              aria-hidden="true"
              className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            />
          )}
          <History className={cn('shrink-0', isCollapsed ? 'h-5 w-5' : 'h-4 w-4')} />
          {!isCollapsed && <span className="truncate">Historique</span>}
        </Link>
        <Link
          href="/settings"
          aria-current={onSettings ? 'page' : undefined}
          title={isCollapsed ? 'Réglages' : undefined}
          className={cn(
            'group relative flex items-center rounded-md text-sm transition-colors',
            isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2 py-1.5',
            onSettings
              ? 'bg-rail-active-bg text-rail-active-text'
              : 'text-rail-text hover:text-rail-active-text hover:bg-white/[0.055]',
          )}
        >
          {onSettings && (
            <span
              aria-hidden="true"
              className="bg-rail-active-bar absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            />
          )}
          <Settings className={cn('shrink-0', isCollapsed ? 'h-5 w-5' : 'h-4 w-4')} />
          {!isCollapsed && <span className="truncate">Réglages</span>}
        </Link>
      </nav>

      {/* Footer Direction B : avatar avec initiales + email + theme + logout. */}
      <div
        className={cn(
          'border-rail-border border-t',
          isCollapsed ? 'flex flex-col items-center gap-1 px-1.5 py-2' : 'px-2 py-2',
        )}
      >
        {!isCollapsed ? (
          <div className="text-rail-muted flex items-center gap-2 px-1 py-1">
            <span
              aria-hidden="true"
              className="bg-primary text-on-primary inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold"
              title={email}
            >
              {userInitials}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-rail-text truncate text-[13px] font-semibold">{email.split('@')[0]}</div>
              <div className="text-rail-muted truncate text-[11px]">{email}</div>
            </div>
            <ChevronsUpDown className="text-rail-muted h-3.5 w-3.5 shrink-0" />
            <ThemeToggle />
            <SignOutButton>
              <LogOut className="h-4 w-4" />
            </SignOutButton>
          </div>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="bg-primary text-on-primary inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-bold"
              title={email}
            >
              {userInitials}
            </span>
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
