import { ChevronDown, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DraftStatusBar } from '@/components/DraftStatusBar';
import { DockedPreviewLayout } from '@/components/preview/DockedPreviewLayout';
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
        <div className="mx-auto max-w-[1400px] px-[30px] pb-3 pt-[18px]">
          <div className="flex items-center gap-2">
            <h1 className="text-text text-[21px] font-semibold leading-tight">{parcours.name}</h1>
            {parcours.published_version_id ? (
              <Badge tone="success">publié</Badge>
            ) : (
              <Badge tone="warning">brouillon</Badge>
            )}
            {/* Détails techniques (slug + URL publique) — derrière un
                <details> natif rendu comme un dropdown overlay. Plié
                par défaut pour rendre le header plus léger : la barre
                de titre garde uniquement nom + badge + historique
                visibles ; le slug + URL se déplient en popover quand
                l'éditeur en a besoin. Pas d'état React = Server
                Component, zéro deps. */}
            <details className="group relative ml-auto">
              <summary
                className="text-text-muted hover:text-text border-border hover:bg-muted/50 inline-flex h-7 cursor-pointer select-none list-none items-center gap-1 rounded-md border px-2 text-[11px] font-medium"
                title="Slug + URL publique"
              >
                Détails
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className="bg-surface border-border absolute right-0 top-full z-40 mt-1 flex w-max max-w-[600px] flex-col gap-2 rounded-md border p-3 text-xs shadow-md">
                <div className="flex items-baseline gap-2">
                  <span className="text-text-faint text-[10px] font-semibold uppercase tracking-wider">slug</span>
                  <code className="text-text font-mono text-xs">{parcours.slug}</code>
                </div>
                <div className="border-border border-t pt-2">
                  <p className="text-text-faint mb-1 text-[10px] font-semibold uppercase tracking-wider">
                    URL publique
                  </p>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-on hover:bg-primary/10 group inline-flex items-center gap-1.5 rounded px-1.5 py-1 font-mono text-xs transition-colors"
                    title="Ouvrir ce parcours sur le front public (nouvel onglet)"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <code className="font-mono underline-offset-2 group-hover:underline">{publicUrl}</code>
                  </a>
                </div>
              </div>
            </details>
            <Suspense fallback={null}>
              <HistoryButton slug={slug} loadVersions={loadVersionsAction} restoreAction={restoreAction} />
            </Suspense>
          </div>
        </div>
      </div>
      {/* La bande ParcoursTabs (Chapitres / Bibliothèque) a été
          supprimée : la nav entre Chapitres et la sous-section
          bibliothèque se fait maintenant via un bouton « →
          Bibliothèque » dans le header de la card Chapitres, et un
          retour « ← Chapitres » prepended dans le LibrarySectionTabs.
          La bande indépendante représentait ~44 px de chrome sur
          toutes les pages parcours non-chapter, pour ne montrer que
          2 onglets — l'audit UX a tranché en faveur du retrait. */}
      <div className="mx-auto max-w-[1400px] space-y-4 px-[30px] py-6">
        {/* DraftStatusBar pinned to the top of the viewport while the
            visitor scrolls long chapter / block lists. Without sticky,
            the author lost sight of whether the current edits land in
            the draft or the published version once the page got tall —
            led to surprise "Publier" clicks. z-30 keeps it above
            chapter cards (z-10) and below the global CommandPalette
            (z-50). */}
        <div
          data-draft-status-bar
          className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 -mx-4 px-4 py-2 backdrop-blur"
        >
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
        {/* DockedPreviewLayout wraps the page content with a sticky
            right-side parcours preview on every sub-page EXCEPT the
            chapter editor (which already owns a richer PreviewPanel).
            See the component's docstring for the routing rule. */}
        <DockedPreviewLayout slug={slug}>{children}</DockedPreviewLayout>
      </div>
    </div>
  );
}
