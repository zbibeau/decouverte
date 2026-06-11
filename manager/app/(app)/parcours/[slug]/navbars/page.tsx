import { LibrarySectionHeader } from '@/components/library/LibrarySectionHeader';
import { LibrarySectionTabs } from '@/components/library/LibrarySectionTabs';
import { NavbarVariantsEditor } from '@/components/NavbarVariantsEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getNavbarVariants, setNavbarVariants } from '@/lib/actions';
import type { NavbarVariant } from '@/lib/actions';
import { FamilyIcon } from '@/lib/familyIcons';

/**
 * Édition des variantes de top bar (= « navbars pilote » côté schéma, qu'on
 * rend dans le front au-dessus de chaque chapitre selon `payload.navbar.variant`).
 * Sous-section « Bibliothèque » → onglet « Top bar ». L'URL `/navbars` est
 * conservée pour les deep-links et la nomenclature du schéma ; on rebaptise
 * uniquement à l'affichage user-facing.
 */
export default async function NavbarsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const variants = await getNavbarVariants(slug);

  async function saveAction(next: NavbarVariant[]) {
    'use server';
    await setNavbarVariants(slug, next);
  }

  return (
    <div className="space-y-4">
      <LibrarySectionHeader
        eyebrow="Bibliothèque · Top bar"
        title="Variantes de navbar"
        description="Variantes de barre supérieure (= navbars pilote) rendues au-dessus de chaque chapitre selon `payload.navbar.variant`."
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FamilyIcon family="navbar" className="h-4 w-4" />
            Top bar
          </CardTitle>
          <LibrarySectionTabs slug={slug} />
        </CardHeader>
        <CardContent>
          <NavbarVariantsEditor parcoursSlug={slug} initial={variants} saveAction={saveAction} />
        </CardContent>
      </Card>
    </div>
  );
}
