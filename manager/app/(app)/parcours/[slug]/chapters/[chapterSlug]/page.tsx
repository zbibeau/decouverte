import { notFound } from 'next/navigation';

import { ChapterEditor } from '@/components/ChapterEditor';
import {
  copyBlockToChapter,
  createBlock,
  deleteBlock,
  duplicateBlock,
  getDraftBlockDiffs,
  getDraftStatus,
  getEditingVersionId,
  getNavbarVariants,
  insertSampleBlock,
  reorderBlocks,
} from '@/lib/actions';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import type { ContentBlock } from '@shared/content-schema';
import { createClient } from '@/lib/supabase/server';

export default async function ChapterEditPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const chapterSlug = decodeURIComponent(raw.chapterSlug);
  const supabase = await createClient();

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  // Prefer the draft version when one exists, fall back to published.
  const versionId = await getEditingVersionId(slug);

  const { data: chapter } = await supabase
    .from('chapter')
    .select('id, slug, title')
    .eq('version_id', versionId ?? '')
    .eq('slug', chapterSlug)
    .maybeSingle();

  if (!chapter) notFound();

  const { data: blocks } = await supabase
    .from('block')
    .select('id, "order", type, payload')
    .eq('chapter_id', chapter.id)
    .is('parent_block_id', null)
    .order('order', { ascending: true });

  const { data: variables } = await supabase
    .from('variable')
    .select('id, key, label, type, options')
    .eq('parcours_id', parcours?.id)
    .order('key', { ascending: true });

  // Bound server actions — passed as props to the client editor.
  async function addBlockAction(type: string) {
    'use server';
    await createBlock(slug, chapterSlug, chapter!.id, type);
  }
  async function deleteBlockAction(blockId: string) {
    'use server';
    await deleteBlock(slug, chapterSlug, blockId);
  }
  async function duplicateBlockAction(blockId: string) {
    'use server';
    return await duplicateBlock(slug, chapterSlug, blockId);
  }
  async function copyBlockToChapterAction(blockId: string, targetChapterId: string) {
    'use server';
    return await copyBlockToChapter(slug, chapterSlug, blockId, targetChapterId);
  }
  async function reorderBlocksAction(orderedIds: string[]) {
    'use server';
    await reorderBlocks(slug, chapterSlug, chapter!.id, orderedIds);
  }
  async function insertSampleBlockAction(type: string): Promise<string> {
    'use server';
    const sample = SAMPLE_PAYLOADS[type as ContentBlock['type']];
    if (!sample) throw new Error(`Type de bloc inconnu : ${type}`);
    const { blockId } = await insertSampleBlock(
      slug,
      chapter!.id,
      type,
      sample.payload,
    );
    // Return the new block id so the client can open its editor right away
    // (router.push from `handleInsertSample` in ChapterEditor). Otherwise the
    // user has to click the inserted row's pencil — an extra step that breaks
    // flow when the typical follow-up to "Ajouter un bloc" is "now fill it
    // in".
    return blockId;
  }

  // Draft id (if any) so the iframe previews the draft version, not the live.
  const draftStatus = await getDraftStatus(slug);
  // Per-block diff state for the badges.
  const blockDiffs = await getDraftBlockDiffs(slug, chapter.id);
  // Sibling chapters — feeds the "Copier vers un autre chapitre" menu.
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

  // Navbar variants registered on this parcours — used to render a small
  // pill next to each block row when the block payload references one.
  const navbarVariants = await getNavbarVariants(slug);

  return (
    <ChapterEditor
      parcoursSlug={slug}
      chapter={{ id: chapter.id, slug: chapter.slug, title: chapter.title }}
      blocks={(blocks ?? []).map((b) => ({
        id: b.id,
        order: b.order,
        type: b.type,
        payload: (b.payload ?? {}) as Record<string, unknown>,
        diff: blockDiffs.get(b.id),
      }))}
      variables={(variables ?? []).map((v) => ({
        id: v.id,
        key: v.key,
        label: v.label,
        type: v.type as 'boolean' | 'enum' | 'string' | 'number',
        options: (v.options as Array<{ value: string; label: string }>) ?? [],
      }))}
      addBlockAction={addBlockAction}
      insertSampleBlockAction={insertSampleBlockAction}
      deleteBlockAction={deleteBlockAction}
      duplicateBlockAction={duplicateBlockAction}
      copyBlockToChapterAction={copyBlockToChapterAction}
      reorderBlocksAction={reorderBlocksAction}
      chapters={chapters}
      navbarVariants={navbarVariants}
      editingVersionId={draftStatus.draftVersionId}
      publishedVersionId={draftStatus.publishedVersionId}
    />
  );
}
