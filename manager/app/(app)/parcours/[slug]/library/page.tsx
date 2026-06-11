import { LibraryBlockCard } from '@/components/library/LibraryBlockCard';
import { LibrarySectionHeader } from '@/components/library/LibrarySectionHeader';
import { LibrarySectionTabs } from '@/components/library/LibrarySectionTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getEditingVersionId, insertSampleBlock } from '@/lib/actions';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { FamilyIcon } from '@/lib/familyIcons';
import { createClient } from '@/lib/supabase/server';

/**
 * Catalogue visuel des blocs disponibles avec aperçu live. Chaque carte
 * monte le rendu Solid (via `/preview-block`) avec une payload d'exemple
 * curée, plus un bouton « Insérer dans… » qui pousse ce sample dans le
 * chapitre choisi.
 *
 * Sous-section « Bibliothèque » → onglet « Blocs ». Le composant
 * `LibrarySectionTabs` en tête de page permet de naviguer vers les autres
 * sous-sections (Top bar, Variables, Tags) — chacune sur sa propre URL.
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

  return (
    <div className="space-y-4">
      <LibrarySectionHeader
        eyebrow="Bibliothèque · Blocs"
        title="Galerie de blocs"
        description="Aperçu live de chaque type de bloc disponible. Insère un exemple directement dans un chapitre — l'ajout passe par le brouillon."
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FamilyIcon family="block" className="h-4 w-4" />
            Blocs
          </CardTitle>
          <LibrarySectionTabs slug={slug} />
        </CardHeader>
        <CardContent>
          <p className="text-text-muted mb-4 text-xs">
            Aperçu live de chaque type de bloc. Insère dans un chapitre avec un exemple — passe par le brouillon.
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
        </CardContent>
      </Card>
    </div>
  );
}
