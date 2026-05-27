import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DraftStatusBar } from '@/components/DraftStatusBar';
import { ParcoursTabs } from '@/components/ParcoursTabs';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { Badge } from '@/components/ui/Badge';
import { getDraftStatus, listVersions, restoreVersionAsDraft } from '@/lib/actions';
import { pastelForString, safeThemeColor } from '@/lib/pastelColors';
import { createClient } from '@/lib/supabase/server';

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

  // Try selecting with `theme_color` ; fall back to the legacy 4-column
  // select if the column doesn't exist yet on this DB (migration 0035 not
  // applied). Same defensive pattern as `(app)/layout.tsx` so a fresh
  // deploy doesn't 404 every parcours page until someone runs the SQL.
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

  // Resolve the header tint : explicit `theme_color` wins, else fall back to
  // a deterministic pastel computed from the slug so existing rows still
  // look distinct without a manual migration. `safeThemeColor` validates
  // the hex format and guards against legacy garbage.
  const themeColor = safeThemeColor(parcours.theme_color ?? pastelForString(slug));

  // Initial snapshot for the history dialog — the client refetches when opened.
  const [versions, draftStatus] = await Promise.all([listVersions(slug), getDraftStatus(slug)]);

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
      {/* Header tinted with the parcours' theme color so the author can tell
           at a glance which project they're editing. Inline `background` is
           used (rather than a Tailwind class) because the color is dynamic
           per-parcours. A subtle bottom border keeps the visual separation
           from the content area. */}
      <div className="border-border border-b" style={{ background: themeColor }}>
        <div className="mx-auto max-w-[1400px] px-8 pt-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{parcours.name}</h1>
            {parcours.published_version_id ? (
              <Badge tone="success">publié</Badge>
            ) : (
              <Badge tone="warning">brouillon</Badge>
            )}
            <div className="ml-auto">
              <VersionHistoryDialog
                parcoursSlug={slug}
                versions={versions}
                hasDraft={draftStatus.hasDraft}
                loadVersions={loadVersionsAction}
                restoreAction={restoreAction}
              />
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            slug : <code>{parcours.slug}</code>
          </p>
          <ParcoursTabs slug={slug} />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] space-y-4 px-8 py-6">
        {/* DraftStatusBar pinned to the top of the viewport while the
            visitor scrolls long chapter / block lists. Without sticky,
            the author lost sight of whether the current edits land in
            the draft or the published version once the page got tall —
            led to surprise "Publier" clicks. z-30 keeps it above
            chapter cards (z-10) and below the global CommandPalette
            (z-50). */}
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 -mx-4 px-4 py-2 backdrop-blur">
          {/* DraftStatusBar is an async Server Component that hits
              multiple Supabase queries (draft diffs, deleted count,
              tag review summary). Wrapping it in Suspense lets the
              REST of the page (chapter list, block editor) stream
              independently — the editor sees the layout + page in
              ~100ms instead of waiting 500-2000ms for the bar to
              finish its queries. The fallback is a slim placeholder
              that preserves the bar's vertical space so the page
              doesn't reflow when the bar resolves. */}
          <Suspense
            fallback={
              <div className="text-muted-foreground rounded-md border border-dashed px-4 py-2 text-xs">
                Chargement du statut…
              </div>
            }
          >
            <DraftStatusBar parcoursSlug={slug} />
          </Suspense>
        </div>
        {children}
      </div>
    </div>
  );
}
