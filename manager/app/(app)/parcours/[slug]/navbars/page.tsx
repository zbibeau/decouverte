import { NavbarVariantsEditor } from '@/components/NavbarVariantsEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getNavbarVariants, setNavbarVariants } from '@/lib/actions';
import type { NavbarVariant } from '@/lib/actions';

export default async function NavbarsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const variants = await getNavbarVariants(slug);

  async function saveAction(next: NavbarVariant[]) {
    'use server';
    await setNavbarVariants(slug, next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navbars pilote</CardTitle>
      </CardHeader>
      <CardContent>
        <NavbarVariantsEditor
          parcoursSlug={slug}
          initial={variants}
          saveAction={saveAction}
        />
      </CardContent>
    </Card>
  );
}
