import { LibrarySectionHeader } from '@/components/library/LibrarySectionHeader';
import { LibrarySectionTabs } from '@/components/library/LibrarySectionTabs';
import { TagsAdmin } from '@/components/library/TagsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FamilyIcon } from '@/lib/familyIcons';

/**
 * CRUD du vocabulaire des tags de maintenance (cross-parcours). Renommer,
 * recolorer ou supprimer un tag → propagation instantanée à tous les blocs
 * qui le portent, sans passer par le cycle brouillon / publier (les tags
 * sont une couche organisationnelle qui ne touche pas le contenu produit).
 *
 * Sous-section « Bibliothèque » → onglet « Tags ». Le composant
 * `LibrarySectionTabs` en tête de page permet de switcher entre Blocs,
 * Top bar, Variables et Tags.
 */
export default async function LibraryTagsPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  return (
    <div className="space-y-4">
      <LibrarySectionHeader
        eyebrow="Bibliothèque · Tags"
        title="Tags de maintenance"
        description="Vocabulaire cross-parcours. Renomme, recolore ou supprime un tag — les changements sont propagés instantanément à tous les blocs qui le portent. Pas de cycle brouillon / publier."
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FamilyIcon family="tag" className="h-4 w-4" />
            Tags
          </CardTitle>
          <LibrarySectionTabs slug={slug} />
        </CardHeader>
        <CardContent>
          <p className="text-text-muted mb-4 text-xs">
            Vocabulaire des tags de maintenance (cross-parcours). Renomme, recolore ou supprime un tag — les changements
            sont propagés instantanément à tous les blocs qui le portent. Aucun cycle « brouillon / publier » : les tags
            ne touchent pas le contenu des parcours.
          </p>
          <TagsAdmin />
        </CardContent>
      </Card>
    </div>
  );
}
