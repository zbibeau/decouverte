import type { BlockWithId, Chapter } from '@shared/content-schema';

import { getSupabase } from '../../../../services/supabase';

/**
 * Load a chapter by parcours slug + chapter slug.
 *
 * By default reads from the most recent PUBLISHED version of the parcours.
 * Pass an explicit `versionId` to read from another version (e.g. the draft
 * when the manager preview iframe has `?version=<draft_id>` in its URL).
 *
 * Returns null if Supabase is not configured or no chapter is found.
 */
export async function loadPublishedChapter(
  parcoursSlug: string,
  chapterSlug: string,
  versionId?: string,
): Promise<Chapter | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let effectiveVersionId = versionId;

  if (!effectiveVersionId) {
    const { data: parcours, error: parcoursErr } = await supabase
      .from('parcours')
      .select('id, published_version_id')
      .eq('slug', parcoursSlug)
      .maybeSingle();

    if (parcoursErr || !parcours?.published_version_id) {
      if (parcoursErr) console.error('[loadChapter] parcours error', parcoursErr);
      return null;
    }
    effectiveVersionId = parcours.published_version_id;
  }

  const { data: chapter, error: chapterErr } = await supabase
    .from('chapter')
    .select('id, version_id, slug, title, "order", next_chapter_id, branching_next, wrapper_class')
    .eq('version_id', effectiveVersionId)
    .eq('slug', chapterSlug)
    .maybeSingle();

  if (chapterErr || !chapter) {
    if (chapterErr) console.error('[loadChapter] chapter error', chapterErr);
    return null;
  }

  const { data: blockRows, error: blockErr } = await supabase
    .from('block')
    .select('id, "order", type, payload')
    .eq('chapter_id', chapter.id)
    .is('parent_block_id', null)
    .order('order', { ascending: true });

  if (blockErr) {
    console.error('[loadChapter] blocks error', blockErr);
    return null;
  }

  const blocks: BlockWithId[] = (blockRows ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
  })) as BlockWithId[];

  return {
    id: chapter.id,
    versionId: chapter.version_id,
    slug: chapter.slug,
    title: chapter.title,
    order: chapter.order,
    wrapperClass: chapter.wrapper_class ?? undefined,
    blocks,
    branchingNext: chapter.branching_next ?? [],
  };
}

/**
 * Ordered list of chapters of a parcours (just metadata — no blocks).
 *
 * Used by the dynamic stepper to know what chapters exist for a custom
 * parcours and in which order to navigate. Reads the published version
 * by default, falls back to the parcours' draft if no `versionId` is
 * provided AND no published version exists yet.
 */
export interface ChapterStub {
  id: string;
  slug: string;
  title: string;
  order: number;
}
export async function loadChapterSequence(
  parcoursSlug: string,
  versionId?: string,
): Promise<ChapterStub[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let effectiveVersionId = versionId;

  if (!effectiveVersionId) {
    const { data: parcours } = await supabase
      .from('parcours')
      .select('id, published_version_id')
      .eq('slug', parcoursSlug)
      .maybeSingle();
    if (!parcours) return [];
    if (parcours.published_version_id) {
      effectiveVersionId = parcours.published_version_id;
    } else {
      // No published version yet — fall back to the most recent draft so
      // that a freshly-created parcours is at least viewable while its
      // author iterates.
      const { data: draft } = await supabase
        .from('parcours_version')
        .select('id')
        .eq('parcours_id', parcours.id)
        .eq('status', 'draft')
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!draft?.id) return [];
      effectiveVersionId = draft.id;
    }
  }

  const { data: rows } = await supabase
    .from('chapter')
    .select('id, slug, title, "order"')
    .eq('version_id', effectiveVersionId)
    .order('order', { ascending: true });

  return (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    order: r.order,
  }));
}
