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
  reorderAndReassignChapters,
  updateChapterMeta,
} from '@/lib/actions';
import { harvestNestedTagIds } from '@/lib/blockSearch';
import { createClient } from '@/lib/supabase/server';

export default async function ChapterListPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Prefer the draft version when one exists, fall back to published.
  const versionId = await getEditingVersionId(slug);

  const { data: chapters } = await supabase
    .from('chapter')
    .select('id, slug, title, "order", section_label, section_order, card_image, card_short_title, hidden_from_nav')
    .eq('version_id', versionId ?? '')
    .order('order', { ascending: true });

  const createChapterAction = createChapter.bind(null, slug);

  async function reorderChaptersAction(orderedItems: Array<{ id: string; sectionLabel: string | null }>) {
    'use server';
    // Rich payload : each chapter carries its (potentially new) section
    // assignment. The server updates `order` AND `section_label` in one
    // atomic-ish pass, so cross-section drag-and-drop in the
    // ChapterList just needs a single roundtrip.
    await reorderAndReassignChapters(slug, orderedItems);
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
    hiddenFromNav: boolean,
  ) {
    'use server';
    const fd = new FormData();
    fd.set('title', title);
    fd.set('slug', newSlug);
    fd.set('sectionLabel', sectionLabel ?? '');
    fd.set('sectionOrder', sectionOrder == null ? '' : String(sectionOrder));
    fd.set('cardImage', cardImage ?? '');
    fd.set('cardShortTitle', cardShortTitle ?? '');
    // Boolean flatpacked as "1"/"" so FormData round-tripping stays
    // consistent with the other optional fields above.
    fd.set('hiddenFromNav', hiddenFromNav ? '1' : '');
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
  // PLUS : count of untagged blocks per chapter, surfaced as a "🏷 N sans
  // tag" pill on each row so the editor sees coverage gaps at a glance.
  const chapterIds = (chapters ?? []).map((c) => c.id);
  const navbarUsageByChapter = new Map<string, string[]>();
  const untaggedBlockCountByChapter = new Map<string, number>();
  const allNavbarVariants = await getNavbarVariants(slug);
  if (chapterIds.length > 0) {
    const { data: blockRows } = await supabase
      .from('block')
      .select('id, chapter_id, payload')
      .in('chapter_id', chapterIds)
      .is('parent_block_id', null);
    // Walk navbar variants (existing logic, untouched).
    for (const b of blockRows ?? []) {
      const variant = (b.payload as { navbar?: { variant?: string } } | null)?.navbar?.variant;
      if (!variant) continue;
      const arr = navbarUsageByChapter.get(b.chapter_id) ?? [];
      if (!arr.includes(variant)) arr.push(variant);
      navbarUsageByChapter.set(b.chapter_id, arr);
    }
    // Untagged-block computation : a block counts as "tagged" if it has
    // EITHER a row in `block_tag` (top-level) OR a non-empty `tagIds`
    // array nested somewhere in its payload (via the existing
    // harvestNestedTagIds walker). Same semantics as the publish-time
    // tag review so the counts match between the bandeau / la modale.
    const allBlockIds = (blockRows ?? []).map((b) => b.id as string);
    const taggedBlockIds = new Set<string>();
    if (allBlockIds.length > 0) {
      const { data: btRows } = await supabase.from('block_tag').select('block_id').in('block_id', allBlockIds);
      for (const r of btRows ?? []) taggedBlockIds.add((r as { block_id: string }).block_id);
    }
    for (const b of blockRows ?? []) {
      const isTopLevelTagged = taggedBlockIds.has(b.id as string);
      const hasNestedTags = harvestNestedTagIds(b.payload).size > 0;
      if (isTopLevelTagged || hasNestedTags) continue;
      untaggedBlockCountByChapter.set(b.chapter_id, (untaggedBlockCountByChapter.get(b.chapter_id) ?? 0) + 1);
    }
  }
  // Tiny lookup so the list shows the human title + colour rather than the
  // raw key (falls back to the key when a variant is missing in the
  // registry — typically an undeclared legacy value).
  const navbarVariantByKey = new Map(allNavbarVariants.map((v) => [v.key, v]));

  // Parcours-wide total of untagged blocks (sum of all per-chapter
  // counts). Surfaced in the card header so the editor sees coverage
  // at a glance even on the published view (where DraftStatusBar's
  // counter is hidden).
  const totalUntaggedBlocks = [...untaggedBlockCountByChapter.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chapitres</CardTitle>
          <p className="text-muted-foreground text-xs">
            {(chapters ?? []).length} chapitre(s)
            {totalUntaggedBlocks > 0 && (
              <>
                {' · '}
                <span className="font-medium text-amber-700">
                  🏷 {totalUntaggedBlocks} bloc{totalUntaggedBlocks > 1 ? 's' : ''} sans tag
                </span>
              </>
            )}
          </p>
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
              hiddenFromNav: (c as { hidden_from_nav?: boolean | null }).hidden_from_nav ?? false,
              diff: diffs.get(c.id),
              navbars: (navbarUsageByChapter.get(c.id) ?? []).map((key) => {
                const v = navbarVariantByKey.get(key);
                return { key, title: v?.title ?? key, color: v?.color };
              }),
              untaggedBlockCount: untaggedBlockCountByChapter.get(c.id) ?? 0,
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
