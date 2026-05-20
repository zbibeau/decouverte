import { ChapterList } from '@/components/ChapterList';
import { CreateChapterForm } from '@/components/CreateChapterForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createChapter,
  deleteChapter,
  duplicateChapter,
  getDraftChapterDiffs,
  getEditingVersionId,
  getNavbarVariants,
  moveSectionRelative,
  reorderChapters,
  updateChapterMeta,
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

export default async function ChapterListPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Prefer the draft version when one exists, fall back to published.
  const versionId = await getEditingVersionId(slug);

  const { data: chapters } = await supabase
    .from('chapter')
    .select('id, slug, title, "order", section_label, section_order, card_image, card_short_title')
    .eq('version_id', versionId ?? '')
    .order('order', { ascending: true });

  const createChapterAction = createChapter.bind(null, slug);

  async function reorderChaptersAction(orderedIds: string[]) {
    'use server';
    await reorderChapters(slug, orderedIds);
  }
  async function deleteChapterAction(chapterId: string) {
    'use server';
    await deleteChapter(slug, chapterId);
  }
  async function duplicateChapterAction(chapterId: string) {
    'use server';
    return await duplicateChapter(slug, chapterId);
  }
  async function updateChapterAction(
    chapterId: string,
    title: string,
    newSlug: string,
    sectionLabel: string | null,
    sectionOrder: number | null,
    cardImage: string | null,
    cardShortTitle: string | null,
  ) {
    'use server';
    const fd = new FormData();
    fd.set('title', title);
    fd.set('slug', newSlug);
    fd.set('sectionLabel', sectionLabel ?? '');
    fd.set('sectionOrder', sectionOrder == null ? '' : String(sectionOrder));
    fd.set('cardImage', cardImage ?? '');
    fd.set('cardShortTitle', cardShortTitle ?? '');
    await updateChapterMeta(slug, chapterId, fd);
  }
  async function moveSectionAction(sectionLabel: string | null, direction: -1 | 1) {
    'use server';
    await moveSectionRelative(slug, sectionLabel, direction);
  }

  const diffs = await getDraftChapterDiffs(slug);

  // Per-chapter list of navbar variants used by top-level blocks. Helps the
  // author scan at a glance which chapter is split into which sub-parts
  // (Tool 1 navbars = sous-parties visuelles d'un chapitre).
  const chapterIds = (chapters ?? []).map((c) => c.id);
  const navbarUsageByChapter = new Map<string, string[]>();
  const allNavbarVariants = await getNavbarVariants(slug);
  if (chapterIds.length > 0) {
    const { data: blockRows } = await supabase.from('block').select('chapter_id, payload').in('chapter_id', chapterIds);
    for (const b of blockRows ?? []) {
      const variant = (b.payload as { navbar?: { variant?: string } } | null)?.navbar?.variant;
      if (!variant) continue;
      const arr = navbarUsageByChapter.get(b.chapter_id) ?? [];
      if (!arr.includes(variant)) arr.push(variant);
      navbarUsageByChapter.set(b.chapter_id, arr);
    }
  }
  // Tiny lookup so the list shows the human title + colour rather than the
  // raw key (falls back to the key when a variant is missing in the
  // registry — typically an undeclared legacy value).
  const navbarVariantByKey = new Map(allNavbarVariants.map((v) => [v.key, v]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chapitres</CardTitle>
          <p className="text-muted-foreground text-xs">{(chapters ?? []).length} chapitre(s)</p>
        </CardHeader>
        <CardContent>
          <ChapterList
            parcoursSlug={slug}
            chapters={(chapters ?? []).map((c) => ({
              id: c.id,
              slug: c.slug,
              title: c.title,
              order: c.order,
              sectionLabel: c.section_label,
              sectionOrder: c.section_order,
              cardImage: (c as { card_image?: string | null }).card_image,
              cardShortTitle: (c as { card_short_title?: string | null }).card_short_title,
              diff: diffs.get(c.id),
              navbars: (navbarUsageByChapter.get(c.id) ?? []).map((key) => {
                const v = navbarVariantByKey.get(key);
                return { key, title: v?.title ?? key, color: v?.color };
              }),
            }))}
            reorderAction={reorderChaptersAction}
            deleteAction={deleteChapterAction}
            duplicateAction={duplicateChapterAction}
            updateAction={updateChapterAction}
            moveSectionAction={moveSectionAction}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un chapitre</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateChapterForm createAction={createChapterAction} existingSlugs={(chapters ?? []).map((c) => c.slug)} />
        </CardContent>
      </Card>
    </div>
  );
}
