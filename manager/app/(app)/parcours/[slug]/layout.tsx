import { ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DraftStatusBar } from '@/components/DraftStatusBar';
import { ParcoursTabs } from '@/components/ParcoursTabs';
import { Badge } from '@/components/ui/Badge';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { getDraftStatus, listVersions, restoreVersionAsDraft } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

/**
 * History button + its data, isolated as an async child so the version list
 * (`listVersions`) + draft status DON'T block the layout shell. The layout
 * thus renders after a single fast `parcours` SELECT → the `loading.tsx`
 * boundary mounts immediately on navigation (the loader shows the instant the
 * user clicks a parcours, instead of waiting for these queries). The button
 * streams in a beat later (top-right, no layout shift). The dialog refetches
 * versions on open anyway, so this initial snapshot being slightly deferred is
 * invisible in practice.
 */
async function HistoryButton({
  slug,
  loadVersions,
  restoreAction,
}: {
  slug: string;
  loadVersions: () => Promise<Awaited<ReturnType<typeof listVersions>>>;
  restoreAction: (versionId: string) => Promise<void>;
}) {
  const [versions, draftStatus] = await Promise.all([listVersions(slug), getDraftStatus(slug)]);
  return (
    <VersionHistoryDialog
      parcoursSlug={slug}
      versions={versions}
      hasDraft={draftStatus.hasDraft}
      loadVersions={loadVersions}
      restoreAction={restoreAction}
    />
  );
}

export default async function ParcoursLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Public front URL for this parcours — varies with the slug. Base comes
  // from NEXT_PUBLIC_CLIENT_URL (the SolidJS front), defaulting to the
  // local dev server. The front resolves any parcours by its slug at
  // /parcours/<slug>.
  const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3100';
  const publicUrl = `${clientUrl}/parcours/${slug}`;

  // Try selecting with `theme_color` ; fall back to the legacy 4-column
  // select if the column doesn't exist yet on this DB (migration 0035 not
  // applied). Same defensive pattern as `(app)/layout.tsx` so a fresh
  // deploy doesn't 404 every parcours page until someone runs the SQL.
  // NOTE direction Studio : on continue de lire `theme_color` pour ne pas
  // briser le contrat DB, mais le header ne le matérialise plus en bandeau
  // teinté — la couleur survit côté Sidebar (dot du parcours) et grille
  // chapitres. Le header est sobre, surface blanche, hairline en bas.
  let parcours: {
    id: string;
    slug: string;
    name: string;
    published_version_id: string | null;
    theme_color?: string | null;
  } | null = null;
  {
    const { data, error } = await supabase
      .from('parcours')
      .select('id, slug, name, published_version_id, theme_color')
      .eq('slug', slug)
      .maybeSingle();
    if (error && /column .*theme_color.* does not exist/i.test(error.message)) {
      const fallback = await supabase
        .from('parcours')
        .select('id, slug, name, published_version_id')
        .eq('slug', slug)
        .maybeSingle();
      parcours = fallback.data ? { ...fallback.data, theme_color: null } : null;
    } else {
      parcours = data as typeof parcours;
    }
  }

  if (!parcours) notFound();

  // Bound server action callbacks passed as props to the client dialog.
  async function loadVersionsAction() {
    'use server';
    return await listVersions(slug);
  }
  async function restoreAction(versionId: string) {
    'use server';
    await restoreVersionAsDraft(slug, versionId);
  }

  return (
    <div>
      {/* Header Studio : surface blanche, plus de bandeau teinté, hairline
          en bas. Padding sobre `pt-[18px] pb-4 px-[30px]`. Les onglets ne
          sont PLUS à l'intérieur — ils vivent juste sous le header, dans
          une bande dédiée centrée (voir bloc <nav /> ci-dessous). */}
      <div className="bg-surface border-border border-b">
        <div className="mx-auto max-w-[1400px] px-[30px] pb-4 pt-[18px]">
          <div className="flex items-center gap-2">
            <h1 className="text-text text-[21px] font-semibold leading-tight">{parcours.name}</h1>
            {parcours.published_version_id ? (
              <Badge tone="success">publié</Badge>
            ) : (
              <Badge tone="warning">brouillon</Badge>
            )}
            <div className="ml-auto">
              {/* Streamed so the version/draft queries don't delay the shell
                  (and thus the loading.tsx) on navigation. */}
              <Suspense fallback={null}>
                <HistoryButton slug={slug} loadVersions={loadVersionsAction} restoreAction={restoreAction} />
              </Suspense>
            </div>
          </div>
          <p className="text-text-muted mt-1 font-mono text-xs">
            slug : <code className="font-mono">{parcours.slug}</code>
          </p>
          {/* URL publique de ce parcours sur le front (varie selon le slug
              + NEXT_PUBLIC_CLIENT_URL). Clic = ouvre dans un nouvel onglet. */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-text-faint hover:text-primary-on mt-0.5 inline-flex items-center gap-1 font-mono text-xs transition-colors"
            title="Ouvrir ce parcours sur le front public (nouvel onglet)"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <code className="font-mono">{publicUrl}</code>
          </a>
        </div>
      </div>
      {/* Onglets sortis de la barre du haut, centrés en bande indépendante
          sous le header. Sélecteur positif `has-[nav]:block` : la bande
          n'est rendue QUE quand `ParcoursTabs` émet réellement un `<nav>`.
          Sur l'écran éditeur de chapitre, le composant renvoie `null` →
          aucun `<nav>` descendant → la bande reste `hidden` (par défaut).
          Le `:has(:empty)` qu'on avait avant matchait aussi les `<path>`
          internes des SVG lucide-react (qui sont sans enfants), du coup
          la bande était masquée même avec les tabs présents. */}
      <div className="bg-surface border-border hidden border-b has-[nav]:block">
        <div className="mx-auto flex max-w-[1400px] justify-center px-[30px] py-3">
          <ParcoursTabs slug={slug} />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] space-y-4 px-[30px] py-6">
        {/* DraftStatusBar pinned to the top of the viewport while the
            visitor scrolls long chapter / block lists. Without sticky,
            the author lost sight of whether the current edits land in
            the draft or the published version once the page got tall —
            led to surprise "Publier" clicks. z-30 keeps it above
            chapter cards (z-10) and below the global CommandPalette
            (z-50). */}
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 -mx-4 px-4 py-2 backdrop-blur">
          {/* DraftStatusBar is an async Server Component that hits multiple
              Supabase queries (draft diffs, deleted count, tag review summary).
              Wrapping it in Suspense lets the REST of the page stream
              independently. No fallback on purpose: the standalone "Chargement
              du statut" loader was redundant with the parcours loader below, so
              the bar simply appears once its queries resolve. */}
          <Suspense fallback={null}>
            <DraftStatusBar parcoursSlug={slug} />
          </Suspense>
        </div>
        {children}
      </div>
    </div>
  );
}
