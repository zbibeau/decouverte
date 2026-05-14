import { notFound } from 'next/navigation';

import { DraftStatusBar } from '@/components/DraftStatusBar';
import { ParcoursTabs } from '@/components/ParcoursTabs';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { Badge } from '@/components/ui/Badge';
import { getDraftStatus, listVersions, restoreVersionAsDraft } from '@/lib/actions';
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

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id, slug, name, published_version_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!parcours) notFound();

  // Initial snapshot for the history dialog — the client refetches when opened.
  const [versions, draftStatus] = await Promise.all([
    listVersions(slug),
    getDraftStatus(slug),
  ]);

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
      <div className="border-b border-border bg-white">
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            slug : <code>{parcours.slug}</code>
          </p>
          <ParcoursTabs slug={slug} />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] space-y-4 px-8 py-6">
        <DraftStatusBar parcoursSlug={slug} />
        {children}
      </div>
    </div>
  );
}
