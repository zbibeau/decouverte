import type { ContentBlock } from '@shared/content-schema';
import { notFound } from 'next/navigation';

import { ChapterEditor } from '@/components/ChapterEditor';
import {
  copyBlockToChapter,
  createNavbarVariant,
  deleteBlock,
  duplicateBlock,
  ensureDraftForChapterView,
  getDraftBlockDiffs,
  getDraftStatus,
  getEditingVersionId,
  getNavbarVariants,
  insertSampleBlock,
  moveBlockIntoContainer,
  reorderBlocks,
  updateBlockPayload,
} from '@/lib/actions';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { harvestNestedTagIds } from '@/lib/blockSearch';
import { createClient } from '@/lib/supabase/server';

export default async function ChapterEditPage({ params }: { params: Promise<{ slug: string; chapterSlug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const chapterSlug = decodeURIComponent(raw.chapterSlug);
  const supabase = await createClient();

  const { data: parcours } = await supabase.from('parcours').select('id').eq('slug', slug).maybeSingle();

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
  // « Déplacer dans… » : send a top-level chapter block inside another
  // block's container payload (card/toolContentSection.children or
  // conditional.then/else). Translates both ids to their draft twins.
  async function moveBlockIntoContainerAction(
    sourceBlockId: string,
    destContainerId: string,
    destField: 'children' | 'then' | 'else',
  ) {
    'use server';
    await moveBlockIntoContainer(slug, chapterSlug, sourceBlockId, destContainerId, destField);
  }
  async function insertSampleBlockAction(type: string): Promise<string> {
    'use server';
    const sample = SAMPLE_PAYLOADS[type as ContentBlock['type']];
    if (!sample) throw new Error(`Type de bloc inconnu : ${type}`);
    const { blockId } = await insertSampleBlock(slug, chapter!.id, type, sample.payload);
    // Return the new block id so the client can open its editor right away
    // (router.push from `handleInsertSample` in ChapterEditor). Otherwise the
    // user has to click the inserted row's pencil — an extra step that breaks
    // flow when the typical follow-up to "Ajouter un bloc" is "now fill it
    // in".
    return blockId;
  }
  // Persist a single block's payload from the INLINE editor (unified chapter
  // view). Returns the id actually written — may differ from the input on the
  // first edit after a publish (published id → its draft twin).
  async function saveBlockPayloadAction(blockId: string, payload: Record<string, unknown>): Promise<string> {
    'use server';
    return await updateBlockPayload(slug, chapterSlug, blockId, payload);
  }
  // Edit-intent : ensure a draft version exists before the user starts editing
  // inline, so block ids stay stable for the whole session (see
  // ensureDraftForChapterView). The client refreshes when `created` is true.
  async function ensureDraftAction(): Promise<{ created: boolean }> {
    'use server';
    const res = await ensureDraftForChapterView(slug);
    return { created: res.created };
  }
  // Inline « + Nouvelle navbar… » from a block's navbar picker : create a
  // parcours navbar variant from a free-text name + return it for selection.
  async function createNavbarVariantAction(title: string) {
    'use server';
    return await createNavbarVariant(slug, title);
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

  // Maintenance tags attached to each block via the `block_tag` join
  // table, plus tags found NESTED inside the payload (children of
  // card / toolContentSection / conditional store their tag IDs
  // inline via `payload.tagIds`). Both are merged so the row chip
  // shows the COMPLETE set of tags affecting this block — auditors
  // care about "what does this block touch overall", not where the
  // tag is anchored.
  const blockIds = (blocks ?? []).map((b) => b.id as string);
  const tagsByBlock = new Map<string, Array<{ id: string; label: string; color: string }>>();
  if (blockIds.length > 0) {
    const { data: tagRows } = await supabase
      .from('block_tag')
      .select('block_id, tag:tag(id, label, color)')
      .in('block_id', blockIds);
    for (const row of tagRows ?? []) {
      const bid = (row as { block_id: string }).block_id;
      const t = (
        row as {
          tag: { id: string; label: string; color: string } | { id: string; label: string; color: string }[] | null;
        }
      ).tag;
      if (!t) continue;
      const tag = Array.isArray(t) ? t[0] : t;
      if (!tag) continue;
      const arr = tagsByBlock.get(bid) ?? [];
      arr.push({ id: tag.id, label: tag.label, color: tag.color });
      tagsByBlock.set(bid, arr);
    }
  }

  // Walk each block's payload to harvest nested tag IDs, fetch the
  // matching `tag` rows in one extra roundtrip, then merge into
  // `tagsByBlock` (deduplicated by id).
  const nestedTagIds = new Set<string>();
  for (const b of blocks ?? []) {
    const ids = harvestNestedTagIds(b.payload);
    for (const id of ids) nestedTagIds.add(id);
  }
  if (nestedTagIds.size > 0) {
    const { data: nestedTagRows } = await supabase
      .from('tag')
      .select('id, label, color')
      .in('id', [...nestedTagIds]);
    const tagById = new Map<string, { id: string; label: string; color: string }>();
    for (const r of nestedTagRows ?? []) {
      const row = r as { id: string; label: string; color: string };
      tagById.set(row.id, row);
    }
    for (const b of blocks ?? []) {
      const ids = harvestNestedTagIds(b.payload);
      if (ids.size === 0) continue;
      const arr = tagsByBlock.get(b.id as string) ?? [];
      const known = new Set(arr.map((t) => t.id));
      for (const id of ids) {
        const tag = tagById.get(id);
        if (tag && !known.has(tag.id)) arr.push(tag);
      }
      tagsByBlock.set(b.id as string, arr);
    }
  }

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
        tags: tagsByBlock.get(b.id) ?? [],
      }))}
      variables={(variables ?? []).map((v) => ({
        id: v.id,
        key: v.key,
        label: v.label,
        type: v.type as 'boolean' | 'enum' | 'string' | 'number',
        options: (v.options as Array<{ value: string; label: string }>) ?? [],
      }))}
      insertSampleBlockAction={insertSampleBlockAction}
      deleteBlockAction={deleteBlockAction}
      duplicateBlockAction={duplicateBlockAction}
      copyBlockToChapterAction={copyBlockToChapterAction}
      reorderBlocksAction={reorderBlocksAction}
      moveBlockIntoContainerAction={moveBlockIntoContainerAction}
      saveBlockAction={saveBlockPayloadAction}
      ensureDraftAction={ensureDraftAction}
      createNavbarVariantAction={createNavbarVariantAction}
      chapters={chapters}
      navbarVariants={navbarVariants}
      editingVersionId={draftStatus.draftVersionId}
      publishedVersionId={draftStatus.publishedVersionId}
    />
  );
}
