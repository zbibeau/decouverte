import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LibraryBlockCard } from '@/components/library/LibraryBlockCard';
import { LibraryTabs } from '@/components/library/LibraryTabs';
import { TagsAdmin } from '@/components/library/TagsAdmin';
import { getEditingVersionId, insertSampleBlock } from '@/lib/actions';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { FamilyIcon } from '@/lib/familyIcons';
import { createClient } from '@/lib/supabase/server';

/**
 * Visual catalogue of every block type + administration of
 * maintenance tags. Two tabs :
 *
 *   - Blocs : each card renders the block live (via the Solid
 *     `/preview-block` route) using a curated sample payload so
 *     authors can browse "what does this look like ?" instead of
 *     guessing from the type name.
 *
 *   - Tags : a CRUD table for the global maintenance-tag vocabulary
 *     (rename, recolor, delete). Tags are global to the whole app
 *     (cross-parcours) — see `manager/lib/tags.ts`.
 */
export default async function LibraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Chapters of the current editing version (draft if any, else published)
  // — feeds the "Insérer dans…" dropdown in each card.
  const versionId = await getEditingVersionId(slug);
  const { data: allChapters } = await supabase
    .from('chapter')
    .select('id, slug, title, "order"')
    .eq('version_id', versionId ?? '')
    .order('order', { ascending: true });
  const chapters = (allChapters ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
  }));

  async function insertAction(type: string, payload: Record<string, unknown>, targetChapterId: string) {
    'use server';
    return await insertSampleBlock(slug, targetChapterId, type, payload);
  }

  const blocksPanel = (
    <>
      <p className="text-muted-foreground mb-4 text-xs">
        Tous les types de blocs disponibles avec un aperçu live. Pour chaque carte tu peux voir ce que le bloc rend, et
        l&apos;insérer dans le chapitre de ton choix avec un contenu d&apos;exemple. Tes modifications passent par le
        brouillon (rien n&apos;est publié jusqu&apos;à ce que tu cliques « Publier »).
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {BLOCK_TYPES_ORDER.map((type) => (
          <LibraryBlockCard
            key={type}
            type={type}
            label={BLOCK_TYPE_LABELS[type]}
            sample={SAMPLE_PAYLOADS[type]}
            chapters={chapters}
            insertAction={insertAction}
          />
        ))}
      </div>
    </>
  );

  const tagsPanel = (
    <>
      <p className="text-muted-foreground mb-4 text-xs">
        Vocabulaire des tags de maintenance (cross-parcours). Renomme, recolore ou supprime un tag — les changements
        sont propagés instantanément à tous les blocs qui le portent. Aucun cycle « brouillon / publier » : les tags ne
        touchent pas le contenu des parcours.
      </p>
      <TagsAdmin />
    </>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FamilyIcon family="library" className="h-4 w-4" />
            Bibliothèque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LibraryTabs blocksPanel={blocksPanel} tagsPanel={tagsPanel} />
        </CardContent>
      </Card>
    </div>
  );
}
