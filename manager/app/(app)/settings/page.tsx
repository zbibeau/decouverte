import { Github, Info, Monitor, Palette, User } from 'lucide-react';

import { SignOutButton } from '@/components/SignOutButton';
import { ThemeToggleRow } from '@/components/settings/ThemeToggleRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

/**
 * Page Réglages — section « Studio » de la sidebar Direction B.
 *
 * Première version simple : pas de feature lourde, juste un point
 * d'entrée pour les réglages globaux que la sidebar footer abritait
 * jusqu'ici (thème + logout). Donne aussi visibilité à des infos
 * meta du manager (version, repo).
 *
 * Sections :
 *   1. Compte — email connecté + bouton Sign out.
 *   2. Apparence — switch Clair / Sombre.
 *   3. À propos — version + lien repo.
 *
 * Au fur et à mesure que d'autres réglages globaux apparaissent
 * (profil enrichi, intégrations Hubspot, etc.) on les ajoutera ici.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? '(inconnu)';
  const initials = (email.split('@')[0]?.[0] ?? '?').toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-8">
      <header>
        <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">Studio</div>
        <h1 className="text-text text-[26px] font-bold leading-tight tracking-tight">Réglages</h1>
        <p className="text-text-muted mt-1.5 max-w-2xl text-sm">
          Préférences globales du manager : compte, apparence et infos meta.
        </p>
      </header>

      {/* --- Compte --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="text-primary-on h-4 w-4" />
            Compte
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-primary text-on-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-text truncate text-sm font-semibold">{email.split('@')[0]}</div>
            <div className="text-text-muted truncate text-xs">{email}</div>
          </div>
          <SignOutButton>
            <span className="border-border-strong bg-surface text-text hover:bg-surface-2 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors">
              Se déconnecter
            </span>
          </SignOutButton>
        </CardContent>
      </Card>

      {/* --- Apparence --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="text-primary-on h-4 w-4" />
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggleRow />
          <p className="text-text-faint mt-3 text-[11px]">
            Le rail latéral graphite reste identique dans les deux modes — c'est la signature visuelle Studio.
          </p>
        </CardContent>
      </Card>

      {/* --- À propos --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="text-primary-on h-4 w-4" />À propos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted inline-flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5" />
              Manager
            </span>
            <span className="text-text font-mono text-xs">demo-ventes-develop</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted inline-flex items-center gap-2">
              <Github className="h-3.5 w-3.5" />
              Repository
            </span>
            <a
              href="https://github.com/zbibeau/decouverte"
              target="_blank"
              rel="noreferrer"
              className="text-primary-on hover:bg-primary/10 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors"
            >
              zbibeau/decouverte
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
