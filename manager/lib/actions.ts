'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { BLANK_PAYLOADS } from '@/lib/blockDefaults';
import { extractBlockSearchText } from '@/lib/blockSearch';
import { summarizeBlock } from '@/lib/blockSummary';
import { slugifyForParcours } from '@/lib/parcoursSlug';
import { randomPastel } from '@/lib/pastelColors';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// Helpers
// ============================================================

async function getPublishedVersionId(parcoursSlug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('parcours')
    .select('published_version_id')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  return data?.published_version_id ?? null;
}

/** Fetch parcours id + published_version_id + current draft (if any) in one shot. */
async function getParcoursVersionInfo(parcoursSlug: string): Promise<{
  parcoursId: string | null;
  publishedVersionId: string | null;
  draftVersionId: string | null;
  draftVersionNumber: number | null;
  publishedVersionNumber: number | null;
}> {
  const supabase = await createClient();
  const { data: parcours } = await supabase
    .from('parcours')
    .select('id, published_version_id')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  if (!parcours?.id) {
    return {
      parcoursId: null,
      publishedVersionId: null,
      draftVersionId: null,
      draftVersionNumber: null,
      publishedVersionNumber: null,
    };
  }
  const { data: draft } = await supabase
    .from('parcours_version')
    .select('id, version_number')
    .eq('parcours_id', parcours.id)
    .eq('status', 'draft')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  let publishedVersionNumber: number | null = null;
  if (parcours.published_version_id) {
    const { data: pub } = await supabase
      .from('parcours_version')
      .select('version_number')
      .eq('id', parcours.published_version_id)
      .maybeSingle();
    publishedVersionNumber = pub?.version_number ?? null;
  }
  return {
    parcoursId: parcours.id,
    publishedVersionId: parcours.published_version_id ?? null,
    draftVersionId: draft?.id ?? null,
    draftVersionNumber: draft?.version_number ?? null,
    publishedVersionNumber,
  };
}

/**
 * Return the id of the version the manager is currently editing. Prefers the
 * existing draft; falls back to the published version if no draft exists.
 * Used for READ pages (chapter listing, block editor loads).
 */
export async function getEditingVersionId(parcoursSlug: string): Promise<string | null> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  return info.draftVersionId ?? info.publishedVersionId ?? null;
}

/**
 * Return the id of the draft version to WRITE into. If no draft exists, clone
 * the published version on the fly (via the `clone_version_as_draft` RPC) and
 * return the new id. All mutating server actions route through here.
 */
async function getOrCreateDraftVersionId(parcoursSlug: string): Promise<string> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (info.draftVersionId) return info.draftVersionId;
  if (!info.publishedVersionId) {
    throw new Error('Aucune version publiée — impossible de créer un brouillon.');
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('clone_version_as_draft', {
    src_version_id: info.publishedVersionId,
  });
  if (error) throw error;
  if (!data) throw new Error('clone_version_as_draft a renvoyé null');
  return data as string;
}

/**
 * Resolve a chapter id so it always points to the draft version of that
 * chapter. If the id already belongs to the draft, return as-is. If it
 * belongs to the published version, clone (if needed) and return the draft
 * twin — looked up via `cloned_from_chapter_id`.
 *
 * Throws when the chapter belongs to neither the draft nor the published
 * version (e.g. an archived version).
 */
export async function ensureDraftChapterId(
  parcoursSlug: string,
  chapterId: string,
): Promise<string> {
  const supabase = await createClient();
  // Which version does this chapter belong to?
  const { data: chapter } = await supabase
    .from('chapter')
    .select('id, version_id')
    .eq('id', chapterId)
    .maybeSingle();
  if (!chapter) throw new Error(`Chapter ${chapterId} introuvable`);

  const info = await getParcoursVersionInfo(parcoursSlug);
  if (info.draftVersionId && chapter.version_id === info.draftVersionId) {
    return chapterId;
  }
  if (chapter.version_id !== info.publishedVersionId) {
    throw new Error(
      `Chapter ${chapterId} n'appartient ni à la version publiée ni au brouillon`,
    );
  }

  // Published chapter → ensure draft exists + find the twin.
  const draftVersionId = await getOrCreateDraftVersionId(parcoursSlug);
  const { data: twin } = await supabase
    .from('chapter')
    .select('id')
    .eq('version_id', draftVersionId)
    .eq('cloned_from_chapter_id', chapterId)
    .maybeSingle();
  if (!twin?.id) {
    throw new Error(
      `Pas de jumeau draft trouvé pour chapter ${chapterId} (version ${draftVersionId})`,
    );
  }
  return twin.id;
}

/**
 * Resolve a block id so it always points to the draft version of that block.
 * Same semantics as `ensureDraftChapterId`, but walks block → chapter →
 * version internally.
 *
 * Returns the possibly-translated block id. Safe to call even if no
 * translation is needed.
 */
export async function ensureDraftBlockId(
  parcoursSlug: string,
  blockId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data: block } = await supabase
    .from('block')
    .select('id, chapter_id, chapter:chapter_id (version_id)')
    .eq('id', blockId)
    .maybeSingle();
  if (!block) throw new Error(`Block ${blockId} introuvable`);

  // Supabase returns chapter as an array OR a single object depending on
  // the FK cardinality — normalise.
  const chapterRef = Array.isArray((block as { chapter: unknown }).chapter)
    ? ((block as { chapter: { version_id: string }[] }).chapter[0] ?? null)
    : ((block as { chapter: { version_id: string } | null }).chapter ?? null);
  const blockVersionId = chapterRef?.version_id;
  if (!blockVersionId) throw new Error(`Impossible de résoudre la version de block ${blockId}`);

  const info = await getParcoursVersionInfo(parcoursSlug);
  if (info.draftVersionId && blockVersionId === info.draftVersionId) return blockId;
  if (blockVersionId !== info.publishedVersionId) {
    throw new Error(
      `Block ${blockId} n'appartient ni à la version publiée ni au brouillon`,
    );
  }

  // Published block → ensure draft exists + find the twin.
  await getOrCreateDraftVersionId(parcoursSlug);
  const { data: twin } = await supabase
    .from('block')
    .select('id')
    .eq('cloned_from_block_id', blockId)
    .maybeSingle();
  if (!twin?.id) {
    throw new Error(`Pas de jumeau draft trouvé pour block ${blockId}`);
  }
  return twin.id;
}

// ============================================================
// Draft / Publish workflow
// ============================================================

/** Read-only summary of the draft/publish status for a parcours. */
export async function getDraftStatus(parcoursSlug: string) {
  const info = await getParcoursVersionInfo(parcoursSlug);
  return {
    hasDraft: !!info.draftVersionId,
    draftVersionNumber: info.draftVersionNumber,
    publishedVersionNumber: info.publishedVersionNumber,
    draftVersionId: info.draftVersionId,
    publishedVersionId: info.publishedVersionId,
  };
}

/**
 * Promote the current draft to published; the old published version becomes
 * archived. Atomic — all three updates happen inside the RPC.
 */
export async function publishDraft(parcoursSlug: string) {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (!info.draftVersionId) throw new Error('Aucun brouillon à publier.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('publish_draft_version', {
    draft_version_id: info.draftVersionId,
  });
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}`, 'layout');
}

export type DraftDiffStatus = 'new' | 'modified' | 'pristine';

/**
 * For each chapter in the current draft, tell whether it's new (no twin in
 * the published version), modified (meta OR any block differs from published),
 * or pristine (identical to published).
 *
 * Returns an empty map if no draft exists.
 */
export async function getDraftChapterDiffs(
  parcoursSlug: string,
): Promise<Map<string, DraftDiffStatus>> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (!info.draftVersionId) return new Map();
  const supabase = await createClient();

  const CHAPTER_DIFF_FIELDS =
    'id, slug, title, wrapper_class, branching_next, "order", section_label, section_order, card_image, card_short_title';

  const { data: draftChapters } = await supabase
    .from('chapter')
    .select(CHAPTER_DIFF_FIELDS)
    .eq('version_id', info.draftVersionId);
  if (!draftChapters) return new Map();

  // Always compare against the CURRENT published version, regardless of how
  // the draft was created (fresh clone of published, or restored from an old
  // version via `restoreVersionAsDraft`). Comparing against `cloned_from_*`
  // would give wrong "no changes" results after a restore because the
  // lineage pointer in that case points to the OLD version, not the live
  // published one.
  const publishedChapters: Array<{
    id: string;
    slug: string;
    title: string | null;
    wrapper_class: string | null;
    branching_next: unknown;
    order: number;
    section_label: string | null;
    section_order: number | null;
    card_image: string | null;
    card_short_title: string | null;
  }> = [];
  if (info.publishedVersionId) {
    const { data: pubs } = await supabase
      .from('chapter')
      .select(CHAPTER_DIFF_FIELDS)
      .eq('version_id', info.publishedVersionId);
    if (pubs) publishedChapters.push(...((pubs as unknown) as typeof publishedChapters));
  }
  const publishedChapterBySlug = new Map<string, (typeof publishedChapters)[number]>();
  for (const p of publishedChapters) publishedChapterBySlug.set(p.slug, p);

  // Fetch draft blocks for every draft chapter.
  const { data: draftBlocks } = await supabase
    .from('block')
    .select('id, chapter_id, "order", type, payload')
    .in('chapter_id', draftChapters.map((c) => c.id));
  // Fetch published blocks for every matching published chapter.
  const publishedBlocks: Array<{
    chapter_id: string;
    order: number;
    type: string;
    payload: unknown;
  }> = [];
  if (publishedChapters.length > 0) {
    const { data: pubBlocks } = await supabase
      .from('block')
      .select('chapter_id, "order", type, payload')
      .in(
        'chapter_id',
        publishedChapters.map((p) => p.id),
      );
    if (pubBlocks) publishedBlocks.push(...((pubBlocks as unknown) as typeof publishedBlocks));
  }
  // Key published blocks by (chapter_slug, order) for cross-version matching.
  const publishedChapterIdToSlug = new Map<string, string>();
  for (const p of publishedChapters) publishedChapterIdToSlug.set(p.id, p.slug);
  const publishedBlockByKey = new Map<string, (typeof publishedBlocks)[number]>();
  for (const b of publishedBlocks) {
    const slug = publishedChapterIdToSlug.get(b.chapter_id);
    if (!slug) continue;
    publishedBlockByKey.set(`${slug}::${b.order}`, b);
  }
  const publishedBlockCountByChapterSlug = new Map<string, number>();
  for (const b of publishedBlocks) {
    const slug = publishedChapterIdToSlug.get(b.chapter_id);
    if (!slug) continue;
    publishedBlockCountByChapterSlug.set(
      slug,
      (publishedBlockCountByChapterSlug.get(slug) ?? 0) + 1,
    );
  }
  const draftBlocksByChapter = new Map<string, NonNullable<typeof draftBlocks>>();
  for (const b of draftBlocks ?? []) {
    const arr = draftBlocksByChapter.get(b.chapter_id) ?? [];
    arr.push(b as never);
    draftBlocksByChapter.set(b.chapter_id, arr);
  }

  const result = new Map<string, DraftDiffStatus>();
  for (const c of draftChapters) {
    const pub = publishedChapterBySlug.get(c.slug);
    if (!pub) {
      // No chapter with that slug in published → it's a new chapter.
      result.set(c.id, 'new');
      continue;
    }
    // Meta diff against the published twin. Includes every editable field
    // surfaced in the manager UI — `getDraftChapterDiffs` is the single
    // source of truth for the "is the Publish button enabled" signal, so any
    // editable column added later (migrations 0031 section_*, 0034 card_*…)
    // MUST be added here, otherwise updating it won't enable Publish.
    const metaChanged =
      pub.title !== c.title ||
      pub.wrapper_class !== c.wrapper_class ||
      pub.order !== c.order ||
      (pub.section_label ?? null) !== (c.section_label ?? null) ||
      (pub.section_order ?? null) !== (c.section_order ?? null) ||
      (pub.card_image ?? null) !== (c.card_image ?? null) ||
      (pub.card_short_title ?? null) !== (c.card_short_title ?? null) ||
      JSON.stringify(pub.branching_next ?? []) !==
        JSON.stringify(c.branching_next ?? []);

    const dBlocks = draftBlocksByChapter.get(c.id) ?? [];
    const pubCount = publishedBlockCountByChapterSlug.get(c.slug) ?? 0;
    let blocksChanged = dBlocks.length !== pubCount;
    if (!blocksChanged) {
      for (const b of dBlocks) {
        const pb = publishedBlockByKey.get(`${c.slug}::${b.order}`);
        if (
          !pb ||
          pb.type !== b.type ||
          JSON.stringify(pb.payload) !== JSON.stringify(b.payload)
        ) {
          blocksChanged = true;
          break;
        }
      }
    }

    result.set(c.id, metaChanged || blocksChanged ? 'modified' : 'pristine');
  }

  return result;
}

/**
 * Count chapters that exist in the published version but NOT in the draft —
 * i.e. chapters the author has just removed. `getDraftChapterDiffs` only
 * surfaces NEW / MODIFIED rows (because deleted chapters have no draft id
 * to key by), so the Publish button used to mistakenly look "nothing to
 * publish" when the only change was a deletion. Returns 0 when there is no
 * draft yet.
 */
export async function getDraftDeletedChapterCount(
  parcoursSlug: string,
): Promise<number> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (!info.draftVersionId || !info.publishedVersionId) return 0;
  const supabase = await createClient();
  const [draftRes, pubRes] = await Promise.all([
    supabase
      .from('chapter')
      .select('slug')
      .eq('version_id', info.draftVersionId),
    supabase
      .from('chapter')
      .select('slug')
      .eq('version_id', info.publishedVersionId),
  ]);
  const draftSlugs = new Set((draftRes.data ?? []).map((r) => r.slug as string));
  let removed = 0;
  for (const p of pubRes.data ?? []) {
    if (!draftSlugs.has(p.slug as string)) removed++;
  }
  return removed;
}

/**
 * Fetch the published source payload (and diff status) for a given draft
 * block — used by the block editor to render a "modifications since
 * published" summary panel. Returns null source when the block is brand new
 * in the draft (no `cloned_from_block_id`).
 */
export async function getBlockDraftDiff(
  blockId: string,
): Promise<{
  status: DraftDiffStatus;
  sourcePayload: Record<string, unknown> | null;
}> {
  const supabase = await createClient();
  // Look up the draft block + its chapter slug + its parcours' currently
  // published version id, so we can match against the published twin by
  // (chapter_slug, order) regardless of how the draft was created.
  const { data: block } = await supabase
    .from('block')
    .select('id, chapter_id, "order", type, payload')
    .eq('id', blockId)
    .maybeSingle();
  if (!block) return { status: 'pristine', sourcePayload: null };
  // Fetch the chapter separately to avoid PostgREST embed type complexity.
  const { data: blockChapter } = await supabase
    .from('chapter')
    .select('slug, version_id')
    .eq('id', block.chapter_id)
    .maybeSingle();
  if (!blockChapter) return { status: 'pristine', sourcePayload: null };

  // Resolve the parcours' currently published version.
  const { data: ver } = await supabase
    .from('parcours_version')
    .select('parcours_id')
    .eq('id', blockChapter.version_id)
    .maybeSingle();
  if (!ver) return { status: 'new', sourcePayload: null };
  const { data: parcours } = await supabase
    .from('parcours')
    .select('published_version_id')
    .eq('id', ver.parcours_id)
    .maybeSingle();
  if (!parcours?.published_version_id) {
    return { status: 'new', sourcePayload: null };
  }

  // Find the published chapter with the same slug.
  const { data: pubChapter } = await supabase
    .from('chapter')
    .select('id')
    .eq('version_id', parcours.published_version_id)
    .eq('slug', blockChapter.slug)
    .maybeSingle();
  if (!pubChapter) return { status: 'new', sourcePayload: null };

  // Find the published block at the same order in that chapter.
  const { data: src } = await supabase
    .from('block')
    .select('"order", type, payload')
    .eq('chapter_id', pubChapter.id)
    .eq('order', block.order)
    .maybeSingle();
  if (!src) return { status: 'new', sourcePayload: null };

  const changed =
    src.type !== block.type ||
    JSON.stringify(src.payload) !== JSON.stringify(block.payload);
  return {
    status: changed ? 'modified' : 'pristine',
    sourcePayload: (src.payload ?? {}) as Record<string, unknown>,
  };
}

/**
 * Per-block diff map for a given draft chapter: each block is either new,
 * modified, or pristine vs its published twin.
 */
export async function getDraftBlockDiffs(
  parcoursSlug: string,
  draftChapterId: string,
): Promise<Map<string, DraftDiffStatus>> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (!info.draftVersionId) return new Map();
  const supabase = await createClient();

  const { data: draftBlocks } = await supabase
    .from('block')
    .select('id, "order", type, payload')
    .eq('chapter_id', draftChapterId);
  if (!draftBlocks) return new Map();

  // Resolve this draft chapter's slug, then find the published twin by slug
  // and compare blocks by `order`. This is robust to draft-from-restore
  // (where `cloned_from_block_id` points to the restored old version, not
  // the current published one).
  const { data: draftChapter } = await supabase
    .from('chapter')
    .select('slug')
    .eq('id', draftChapterId)
    .maybeSingle();
  const result = new Map<string, DraftDiffStatus>();
  if (!draftChapter || !info.publishedVersionId) {
    // No published version → everything is new.
    for (const b of draftBlocks) result.set(b.id, 'new');
    return result;
  }
  const { data: pubChapter } = await supabase
    .from('chapter')
    .select('id')
    .eq('version_id', info.publishedVersionId)
    .eq('slug', draftChapter.slug)
    .maybeSingle();
  if (!pubChapter) {
    for (const b of draftBlocks) result.set(b.id, 'new');
    return result;
  }
  const { data: pubBlocks } = await supabase
    .from('block')
    .select('"order", type, payload')
    .eq('chapter_id', pubChapter.id);
  const pubByOrder = new Map<number, { order: number; type: string; payload: unknown }>();
  for (const b of pubBlocks ?? []) pubByOrder.set(b.order, b as never);

  for (const b of draftBlocks) {
    const pb = pubByOrder.get(b.order);
    if (!pb) {
      result.set(b.id, 'new');
      continue;
    }
    if (pb.type !== b.type || JSON.stringify(pb.payload) !== JSON.stringify(b.payload)) {
      result.set(b.id, 'modified');
    } else {
      result.set(b.id, 'pristine');
    }
  }
  return result;
}

/**
 * Discard the current draft entirely (cascade removes chapters + blocks).
 * Always redirects the user to the chapter list, because the URL they
 * discarded from may contain a draft chapter/block id that no longer exists.
 */
export async function discardDraft(parcoursSlug: string) {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (info.draftVersionId) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('parcours_version')
      .delete()
      .eq('id', info.draftVersionId);
    if (error) throw error;
    revalidatePath(`/parcours/${parcoursSlug}`, 'layout');
  }
  redirect(`/parcours/${parcoursSlug}`);
}

// ============================================================
// Version history — list + restore
// ============================================================

export type VersionStatus = 'draft' | 'published' | 'archived';

export interface VersionSummary {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  createdAt: string;
  /** Number of chapters in this version (cheap aggregate). */
  chapterCount: number;
  /** Number of blocks across all chapters of this version. */
  blockCount: number;
  /** True iff this row is the parcours' current published_version_id. */
  isCurrentPublished: boolean;
}

/**
 * List every `parcours_version` for a parcours, newest first, with
 * cheap aggregate counts (chapters, blocks). Used by the version history
 * dialog. Returns an empty array if the parcours does not exist.
 */
export async function listVersions(parcoursSlug: string): Promise<VersionSummary[]> {
  const supabase = await createClient();
  const { data: parcours } = await supabase
    .from('parcours')
    .select('id, published_version_id')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  if (!parcours?.id) return [];

  const { data: rows } = await supabase
    .from('parcours_version')
    .select('id, version_number, status, created_at')
    .eq('parcours_id', parcours.id)
    .order('version_number', { ascending: false });
  if (!rows) return [];

  // Aggregate counts in a single roundtrip per version family. For V1, a
  // simple per-version count is fine (10s of versions max in practice).
  const ids = rows.map((r) => r.id);
  const { data: chapterRows } = await supabase
    .from('chapter')
    .select('id, version_id')
    .in('version_id', ids);
  const chaptersByVersion = new Map<string, string[]>();
  for (const c of chapterRows ?? []) {
    const arr = chaptersByVersion.get(c.version_id) ?? [];
    arr.push(c.id);
    chaptersByVersion.set(c.version_id, arr);
  }
  const allChapterIds = (chapterRows ?? []).map((c) => c.id);
  let blocksByChapter = new Map<string, number>();
  if (allChapterIds.length > 0) {
    const { data: blockRows } = await supabase
      .from('block')
      .select('id, chapter_id')
      .in('chapter_id', allChapterIds);
    for (const b of blockRows ?? []) {
      blocksByChapter.set(b.chapter_id, (blocksByChapter.get(b.chapter_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => {
    const chapters = chaptersByVersion.get(r.id) ?? [];
    const blockCount = chapters.reduce(
      (sum, cid) => sum + (blocksByChapter.get(cid) ?? 0),
      0,
    );
    return {
      id: r.id,
      versionNumber: r.version_number,
      status: r.status as VersionStatus,
      createdAt: r.created_at,
      chapterCount: chapters.length,
      blockCount,
      isCurrentPublished: r.id === parcours.published_version_id,
    };
  });
}

/**
 * Clone an existing version (archived OR published) into a fresh draft.
 * Refuses to run when a draft already exists — caller must discard the
 * current draft first (the dialog asks for explicit confirmation).
 *
 * Returns the new draft version id.
 */
export async function restoreVersionAsDraft(
  parcoursSlug: string,
  sourceVersionId: string,
): Promise<string> {
  const info = await getParcoursVersionInfo(parcoursSlug);
  if (info.draftVersionId) {
    throw new Error(
      'Un brouillon existe déjà. Jette-le ou publie-le avant de restaurer une autre version.',
    );
  }
  const supabase = await createClient();

  // Sanity check : the source version must belong to the same parcours.
  if (!info.parcoursId) throw new Error('Parcours introuvable.');
  const { data: src } = await supabase
    .from('parcours_version')
    .select('id, parcours_id')
    .eq('id', sourceVersionId)
    .maybeSingle();
  if (!src) throw new Error(`Version ${sourceVersionId} introuvable.`);
  if (src.parcours_id !== info.parcoursId) {
    throw new Error('Cette version n\'appartient pas à ce parcours.');
  }

  const { data, error } = await supabase.rpc('clone_version_as_draft', {
    src_version_id: sourceVersionId,
  });
  if (error) throw error;
  if (!data) throw new Error('clone_version_as_draft a renvoyé null');

  revalidatePath(`/parcours/${parcoursSlug}`, 'layout');
  return data as string;
}

// ============================================================
// Chapters
// ============================================================

/** Force a slug to URL/DB-safe characters: letters, digits, _ and -. */
function sanitizeSlug(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export async function createChapter(parcoursSlug: string, formData: FormData) {
  const supabase = await createClient();
  // Writes always go to the draft version — auto-created from the published
  // version if it doesn't exist yet.
  const versionId = await getOrCreateDraftVersionId(parcoursSlug);

  const slug = sanitizeSlug(String(formData.get('slug') ?? ''));
  const title = String(formData.get('title') ?? '').trim();
  if (!slug || !title) throw new Error('slug et title requis');

  // Pre-check for slug collision in this version so the user gets a clear
  // error rather than a raw Postgres 23505 (unique_violation).
  const { data: existing } = await supabase
    .from('chapter')
    .select('id, slug')
    .eq('version_id', versionId)
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    throw new Error(
      `Un chapitre avec le slug « ${slug} » existe déjà dans ce parcours. Choisis un slug différent.`,
    );
  }

  const { data: maxOrder } = await supabase
    .from('chapter')
    .select('order')
    .eq('version_id', versionId)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.order ?? 0) + 1;

  // Default wrapper: occupy the available content area (not the viewport
  // width) so the StepperLayout sidebar doesn't push the content past the
  // right edge. `w-full` lets the chapter take whatever space its parent
  // gives ; `min-h-dvh` ensures the wrapper still fills the screen
  // vertically even when the content is short.
  const DEFAULT_WRAPPER_CLASS =
    'min-h-dvh w-full overflow-x-hidden bg-secondary-50 space-y-8';

  const { error } = await supabase.from('chapter').insert({
    version_id: versionId,
    slug,
    title,
    order: nextOrder,
    wrapper_class: DEFAULT_WRAPPER_CLASS,
  });

  if (error) {
    // Surface a friendly message for the common collision cases.
    if (error.code === '23505') {
      const detail = error.message || '';
      if (detail.toLowerCase().includes('slug')) {
        throw new Error(`Un chapitre avec le slug « ${slug} » existe déjà.`);
      }
      if (detail.toLowerCase().includes('order')) {
        throw new Error(
          `Conflit d'ordre lors de la création (place ${nextOrder} déjà prise). Recharge la page et réessaie.`,
        );
      }
    }
    throw error;
  }
  revalidatePath(`/parcours/${parcoursSlug}`);
}

export async function deleteChapter(parcoursSlug: string, chapterId: string) {
  const supabase = await createClient();
  const draftChapterId = await ensureDraftChapterId(parcoursSlug, chapterId);
  const { error } = await supabase.from('chapter').delete().eq('id', draftChapterId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}`);
}

/**
 * Duplicate a chapter (with all its top-level blocks) at the end of the
 * draft version's chapter list. The new chapter:
 *   - gets a fresh slug "<source-slug>-copy" (with auto-incremented suffix
 *     if that slug already exists, e.g. "-copy-2")
 *   - title prefixed with "Copie — "
 *   - `cloned_from_chapter_id` is NOT set: the duplicate counts as a NEW
 *     chapter for the draft-diff system, with a blue "Nouveau" badge.
 *   - all top-level blocks duplicated in the same order.
 *   - `next_chapter_id` is cleared (the duplicate sits at the end alone).
 */
export async function duplicateChapter(parcoursSlug: string, chapterId: string) {
  const supabase = await createClient();
  // Resolve source: translate to draft twin first so we always operate on
  // the editing version's rows (the user expects to duplicate WHAT THEY
  // SEE in the manager).
  const draftSourceId = await ensureDraftChapterId(parcoursSlug, chapterId);
  const { data: src } = await supabase
    .from('chapter')
    .select('version_id, slug, title, branching_next, wrapper_class')
    .eq('id', draftSourceId)
    .maybeSingle();
  if (!src) throw new Error(`Chapter ${draftSourceId} introuvable`);

  // Pick a unique slug — append "-copy" then "-copy-2", "-copy-3"…
  const baseSlug = src.slug;
  let candidate = `${baseSlug}-copy`;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: clash } = await supabase
      .from('chapter')
      .select('id')
      .eq('version_id', src.version_id)
      .eq('slug', candidate)
      .maybeSingle();
    if (!clash) break;
    candidate = `${baseSlug}-copy-${n++}`;
    if (n > 50) throw new Error('Trop de copies — choisis manuellement un autre slug.');
  }

  // Insert the new chapter at the end.
  const { data: maxOrder } = await supabase
    .from('chapter')
    .select('order')
    .eq('version_id', src.version_id)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  const { data: created, error: insertErr } = await supabase
    .from('chapter')
    .insert({
      version_id: src.version_id,
      slug: candidate,
      title: `Copie — ${src.title}`,
      order: nextOrder,
      branching_next: src.branching_next,
      wrapper_class: src.wrapper_class,
    })
    .select('id, slug')
    .single();
  if (insertErr) throw insertErr;

  // Clone the top-level blocks (parent_block_id IS NULL).
  const { data: srcBlocks } = await supabase
    .from('block')
    .select('"order", type, payload')
    .eq('chapter_id', draftSourceId)
    .is('parent_block_id', null)
    .order('order', { ascending: true });

  if (srcBlocks && srcBlocks.length > 0) {
    const rows = srcBlocks.map((b) => ({
      chapter_id: created.id,
      order: b.order,
      type: b.type,
      payload: b.payload,
    }));
    const { error: bErr } = await supabase.from('block').insert(rows);
    if (bErr) throw bErr;
  }

  revalidatePath(`/parcours/${parcoursSlug}`);
  return { id: created.id as string, slug: created.slug as string };
}

export async function updateChapterMeta(
  parcoursSlug: string,
  chapterId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const draftChapterId = await ensureDraftChapterId(parcoursSlug, chapterId);
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!title || !slug) throw new Error('title et slug requis');

  // Optional sidebar grouping. Empty string clears the section assignment so
  // the chapter goes back to "ungrouped" in the stepper.
  const sectionLabelRaw = formData.get('sectionLabel');
  const sectionOrderRaw = formData.get('sectionOrder');
  const cardImageRaw = formData.get('cardImage');
  const cardShortTitleRaw = formData.get('cardShortTitle');
  const update: {
    title: string;
    slug: string;
    section_label?: string | null;
    section_order?: number | null;
    card_image?: string | null;
    card_short_title?: string | null;
  } = { title, slug };
  if (sectionLabelRaw !== null) {
    const v = String(sectionLabelRaw).trim();
    update.section_label = v === '' ? null : v;
  }
  if (sectionOrderRaw !== null) {
    const raw = String(sectionOrderRaw).trim();
    if (raw === '') update.section_order = null;
    else {
      const n = Number(raw);
      update.section_order = Number.isFinite(n) ? Math.round(n) : null;
    }
  }
  if (cardImageRaw !== null) {
    const v = String(cardImageRaw).trim();
    update.card_image = v === '' ? null : v;
  }
  if (cardShortTitleRaw !== null) {
    const v = String(cardShortTitleRaw).trim();
    update.card_short_title = v === '' ? null : v;
  }

  const { error } = await supabase
    .from('chapter')
    .update(update)
    .eq('id', draftChapterId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}`);
}

// ============================================================
// Blocks
// ============================================================

/**
 * Open the block creation flow. We do NOT insert a row in DB at this point —
 * the user might bail out without filling anything in. The actual insert
 * happens on first manual save via `createBlockWithPayload`.
 */
export async function createBlock(
  parcoursSlug: string,
  chapterSlug: string,
  _chapterId: string,
  type: string,
) {
  if (!BLANK_PAYLOADS[type as keyof typeof BLANK_PAYLOADS]) {
    throw new Error(`Type de bloc inconnu : ${type}`);
  }
  redirect(`/parcours/${parcoursSlug}/chapters/${chapterSlug}/blocks/new?type=${type}`);
}

/**
 * Persist a brand-new block (called from the draft editor on first save).
 * Returns the new block id so the client can navigate to its edit URL.
 */
export async function createBlockWithPayload(
  parcoursSlug: string,
  chapterSlug: string,
  chapterId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = await createClient();
  if (!BLANK_PAYLOADS[type as keyof typeof BLANK_PAYLOADS]) {
    throw new Error(`Type de bloc inconnu : ${type}`);
  }

  const draftChapterId = await ensureDraftChapterId(parcoursSlug, chapterId);

  const { data: maxOrder } = await supabase
    .from('block')
    .select('order')
    .eq('chapter_id', draftChapterId)
    .is('parent_block_id', null)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.order ?? 0) + 1;

  const { data, error } = await supabase
    .from('block')
    .insert({ chapter_id: draftChapterId, order: nextOrder, type, payload })
    .select('id')
    .single();

  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
  return data.id as string;
}

/**
 * Insert a curated sample block (coming from the visual library) into a
 * target chapter. Thin wrapper around `createBlockWithPayload` that also
 * resolves the chapter slug for revalidation.
 *
 * The chapter is auto-translated to its draft twin via `createBlockWithPayload`
 * → `ensureDraftChapterId`, so picking a published chapter from the library
 * dropdown safely creates a draft instead of mutating the live version.
 */
export async function insertSampleBlock(
  parcoursSlug: string,
  targetChapterId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<{ blockId: string; chapterSlug: string }> {
  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from('chapter')
    .select('slug')
    .eq('id', targetChapterId)
    .maybeSingle();
  if (!chapter?.slug) throw new Error(`Chapter ${targetChapterId} introuvable`);
  const blockId = await createBlockWithPayload(
    parcoursSlug,
    chapter.slug,
    targetChapterId,
    type,
    payload,
  );
  return { blockId, chapterSlug: chapter.slug };
}

/**
 * Update a block's payload. Returns the block id that was actually written to —
 * which may differ from the input when a published-era id was translated to
 * its draft twin. The client uses that to update its URL via router.replace.
 */
export async function updateBlockPayload(
  parcoursSlug: string,
  chapterSlug: string,
  blockId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = await createClient();
  const draftBlockId = await ensureDraftBlockId(parcoursSlug, blockId);
  const { error } = await supabase.from('block').update({ payload }).eq('id', draftBlockId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}/blocks/${draftBlockId}`);
  return draftBlockId;
}

export async function deleteBlock(parcoursSlug: string, chapterSlug: string, blockId: string) {
  const supabase = await createClient();
  const draftBlockId = await ensureDraftBlockId(parcoursSlug, blockId);
  const { error } = await supabase.from('block').delete().eq('id', draftBlockId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
}

/**
 * Duplicate a block right after the original, inside the same chapter.
 * - Copies type + payload as-is.
 * - Inserts at `order = source.order + 1`, shifting every block below by +1
 *   (two-phase to avoid the unique constraint on (chapter_id, order)).
 * - `cloned_from_block_id` is NOT set: the duplicate counts as NEW (blue
 *   badge) in the draft-diff system.
 * - Top-level blocks only for now (parent_block_id IS NULL). Nested blocks
 *   inside `card` / `conditional` payloads are still copied because they
 *   live inside the payload JSON — they're not separate rows.
 */
export async function duplicateBlock(
  parcoursSlug: string,
  chapterSlug: string,
  blockId: string,
): Promise<string> {
  const supabase = await createClient();
  const draftBlockId = await ensureDraftBlockId(parcoursSlug, blockId);

  const { data: src } = await supabase
    .from('block')
    .select('chapter_id, "order", type, payload, parent_block_id')
    .eq('id', draftBlockId)
    .maybeSingle();
  if (!src) throw new Error(`Block ${draftBlockId} introuvable`);
  if (src.parent_block_id) {
    throw new Error(
      'La duplication des blocs imbriqués (parent_block_id != null) n\'est pas encore supportée.',
    );
  }

  const targetOrder = src.order + 1;

  // Phase 1: push every block below the source into a negative range to
  // free the unique-key on (chapter_id, "order"). We use 1..N offsets so
  // the bumps don't collide with each other either.
  const { data: toShift } = await supabase
    .from('block')
    .select('id, "order"')
    .eq('chapter_id', src.chapter_id)
    .is('parent_block_id', null)
    .gte('order', targetOrder)
    .order('order', { ascending: true });

  for (let i = 0; i < (toShift?.length ?? 0); i++) {
    const row = toShift![i];
    const { error } = await supabase
      .from('block')
      .update({ order: -(i + 1) })
      .eq('id', row.id);
    if (error) throw error;
  }
  // Phase 2: assign the final shifted positions.
  for (let i = 0; i < (toShift?.length ?? 0); i++) {
    const row = toShift![i];
    const { error } = await supabase
      .from('block')
      .update({ order: row.order + 1 })
      .eq('id', row.id);
    if (error) throw error;
  }

  // Insert the duplicate right after the source.
  const { data: created, error: insertErr } = await supabase
    .from('block')
    .insert({
      chapter_id: src.chapter_id,
      order: targetOrder,
      type: src.type,
      payload: src.payload,
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
  return created.id as string;
}

/**
 * Copy a top-level block into another chapter, appended at the end.
 * Like `duplicateBlock` but the target chapter can be different from the
 * source. Both chapters must belong to the current editing version (draft
 * if any, else published) — they're auto-translated to their draft twins
 * if needed, so the cloud / published version stays untouched.
 *
 * Returns the new block id (in the target chapter).
 */
export async function copyBlockToChapter(
  parcoursSlug: string,
  sourceChapterSlug: string,
  sourceBlockId: string,
  targetChapterId: string,
): Promise<{ blockId: string; chapterId: string; chapterSlug: string }> {
  const supabase = await createClient();
  const draftSourceBlockId = await ensureDraftBlockId(parcoursSlug, sourceBlockId);
  const draftTargetChapterId = await ensureDraftChapterId(parcoursSlug, targetChapterId);

  const { data: src } = await supabase
    .from('block')
    .select('"order", type, payload, parent_block_id')
    .eq('id', draftSourceBlockId)
    .maybeSingle();
  if (!src) throw new Error(`Block ${draftSourceBlockId} introuvable`);
  if (src.parent_block_id) {
    throw new Error(
      'La copie des blocs imbriqués (parent_block_id != null) n\'est pas encore supportée.',
    );
  }

  // Append at the end of the target chapter.
  const { data: maxOrder } = await supabase
    .from('block')
    .select('order')
    .eq('chapter_id', draftTargetChapterId)
    .is('parent_block_id', null)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  const { data: created, error: insertErr } = await supabase
    .from('block')
    .insert({
      chapter_id: draftTargetChapterId,
      order: nextOrder,
      type: src.type,
      payload: src.payload,
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  // Look up target chapter slug for routing/revalidation.
  const { data: targetChapter } = await supabase
    .from('chapter')
    .select('slug')
    .eq('id', draftTargetChapterId)
    .maybeSingle();

  revalidatePath(`/parcours/${parcoursSlug}/chapters/${sourceChapterSlug}`);
  if (targetChapter?.slug) {
    revalidatePath(`/parcours/${parcoursSlug}/chapters/${targetChapter.slug}`);
  }
  return {
    blockId: created.id as string,
    chapterId: draftTargetChapterId,
    chapterSlug: targetChapter?.slug ?? '',
  };
}

export async function moveBlock(
  parcoursSlug: string,
  chapterSlug: string,
  chapterId: string,
  blockId: string,
  direction: 'up' | 'down',
) {
  const supabase = await createClient();
  const draftChapterId = await ensureDraftChapterId(parcoursSlug, chapterId);
  const draftBlockId = await ensureDraftBlockId(parcoursSlug, blockId);

  const { data: blocks } = await supabase
    .from('block')
    .select('id, "order"')
    .eq('chapter_id', draftChapterId)
    .is('parent_block_id', null)
    .order('order', { ascending: true });

  if (!blocks) return;

  const idx = blocks.findIndex((b) => b.id === draftBlockId);
  if (idx < 0) return;

  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= blocks.length) return;

  const current = blocks[idx];
  const other = blocks[swapWith];

  // Two-step swap to avoid unique constraint conflict on (chapter_id, order).
  await supabase.from('block').update({ order: -1 }).eq('id', current.id);
  await supabase.from('block').update({ order: current.order }).eq('id', other.id);
  await supabase.from('block').update({ order: other.order }).eq('id', current.id);

  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
}

/**
 * Reorder blocks of a chapter according to `orderedIds`. Two-phase update:
 * first push every order into a non-colliding range, then write the final
 * 1..N values. Avoids unique-constraint violations on (chapter_id, order).
 *
 * chapterId and each orderedId are translated to their draft twins so reorders
 * on the currently-published chapter auto-create a draft.
 */
export async function reorderBlocks(
  parcoursSlug: string,
  chapterSlug: string,
  chapterId: string,
  orderedIds: string[],
) {
  const supabase = await createClient();
  const draftChapterId = await ensureDraftChapterId(parcoursSlug, chapterId);
  const draftOrderedIds = await Promise.all(
    orderedIds.map((id) => ensureDraftBlockId(parcoursSlug, id)),
  );

  // Phase 1 — move everything into a temporary range (negative).
  for (let i = 0; i < draftOrderedIds.length; i++) {
    const { error } = await supabase
      .from('block')
      .update({ order: -(i + 1) })
      .eq('id', draftOrderedIds[i])
      .eq('chapter_id', draftChapterId);
    if (error) throw error;
  }
  // Phase 2 — assign final 1..N.
  for (let i = 0; i < draftOrderedIds.length; i++) {
    const { error } = await supabase
      .from('block')
      .update({ order: i + 1 })
      .eq('id', draftOrderedIds[i])
      .eq('chapter_id', draftChapterId);
    if (error) throw error;
  }

  revalidatePath(`/parcours/${parcoursSlug}/chapters/${chapterSlug}`);
}

/**
 * Reorder chapters of the current editing (draft) version. Same two-phase
 * trick to avoid collisions on (version_id, "order").
 */
/**
 * Move an entire section (group of chapters sharing the same `section_label`)
 * up or down relative to its neighbour in the chapter list. Operates on the
 * draft version.
 *
 * The chapter list groups by section in the order each section first appears
 * (= the minimum `order` of any chapter it contains). Moving a section up is
 * therefore a matter of swapping the chapter blocks of two adjacent sections
 * in the global `order` sequence.
 *
 * `sectionLabel = null` targets the "(sans section)" pseudo-group.
 *
 * No-op (silently) when the section is already at the requested boundary
 * (first section + dir = -1, last + dir = +1).
 */
export async function moveSectionRelative(
  parcoursSlug: string,
  sectionLabel: string | null,
  direction: -1 | 1,
): Promise<void> {
  const supabase = await createClient();
  const versionId = await getOrCreateDraftVersionId(parcoursSlug);

  const { data: rows } = await supabase
    .from('chapter')
    .select('id, section_label, "order"')
    .eq('version_id', versionId)
    .order('order', { ascending: true });
  if (!rows || rows.length === 0) return;

  // Group chapters by section in first-appearance order (mirrors the UI
  // grouping in `ChapterList.tsx` exactly so the "up/down" arrows match
  // what the user sees on screen).
  type Row = { id: string; section_label: string | null; order: number };
  const groups = new Map<string, Row[]>();
  const sectionsOrdered: string[] = [];
  for (const r of rows as Row[]) {
    const key = (r.section_label?.trim() || '__none__') as string;
    if (!groups.has(key)) {
      groups.set(key, []);
      sectionsOrdered.push(key);
    }
    groups.get(key)!.push(r);
  }

  const targetKey = sectionLabel?.trim() || '__none__';
  const idx = sectionsOrdered.indexOf(targetKey);
  if (idx === -1) return; // unknown section
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= sectionsOrdered.length) return; // boundary

  // Swap the two adjacent groups, then flatten back into a single ordered
  // list of chapter ids — order WITHIN each section is preserved.
  const a = sectionsOrdered[idx];
  const b = sectionsOrdered[swapIdx];
  sectionsOrdered[idx] = b;
  sectionsOrdered[swapIdx] = a;

  const orderedIds = sectionsOrdered.flatMap((k) =>
    (groups.get(k) ?? []).map((r) => r.id),
  );
  return reorderChapters(parcoursSlug, orderedIds);
}

export async function reorderChapters(parcoursSlug: string, orderedIds: string[]) {
  const supabase = await createClient();
  const versionId = await getOrCreateDraftVersionId(parcoursSlug);

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('chapter')
      .update({ order: -(i + 1) })
      .eq('id', orderedIds[i])
      .eq('version_id', versionId);
    if (error) throw error;
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('chapter')
      .update({ order: i + 1 })
      .eq('id', orderedIds[i])
      .eq('version_id', versionId);
    if (error) throw error;
  }

  revalidatePath(`/parcours/${parcoursSlug}`);
}

// ============================================================
// Variables
// ============================================================

/**
 * Rename the technical key + label of an existing variable. Updates only the
 * variable row — references in block payloads (conditional blocks, form
 * fields, key points conditional rows, etc.) are NOT migrated, so the user
 * is responsible for fixing them manually. The UI surfaces a warning before
 * confirming the rename.
 *
 * The new key must be unique among the parcours' variables (excluding the
 * one being renamed). Both `key` and `label` can be edited in one call ;
 * pass the same value when only one of them is changing.
 */
export async function renameVariable(
  parcoursSlug: string,
  variableId: string,
  nextKey: string,
  nextLabel: string,
): Promise<void> {
  const key = nextKey.trim();
  const label = nextLabel.trim();
  if (!key || !label) throw new Error('Clé et label requis.');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
    throw new Error(
      'La clé doit commencer par une lettre et ne contenir que des lettres, chiffres et underscores.',
    );
  }

  const supabase = await createClient();
  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  if (!parcours) throw new Error('Parcours introuvable.');

  // Reject key collisions early with a friendly error.
  const { data: clash } = await supabase
    .from('variable')
    .select('id')
    .eq('parcours_id', parcours.id)
    .eq('key', key)
    .neq('id', variableId)
    .maybeSingle();
  if (clash) {
    throw new Error(`Une autre variable utilise déjà la clé « ${key} ».`);
  }

  const { error } = await supabase
    .from('variable')
    .update({ key, label })
    .eq('id', variableId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/variables`);
}

export async function createVariable(parcoursSlug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  if (!parcours) throw new Error('Parcours introuvable');

  const key = String(formData.get('key') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const type = String(formData.get('type') ?? 'boolean');
  const optionsRaw = String(formData.get('options') ?? '[]');
  const hsProperty = String(formData.get('hsProperty') ?? '').trim();
  const hsValueMapRaw = String(formData.get('hsValueMap') ?? '').trim();

  if (!key || !label) throw new Error('key et label requis');

  let options: unknown = [];
  if (type === 'enum') {
    try {
      options = JSON.parse(optionsRaw);
    } catch {
      throw new Error('options doit être un JSON valide');
    }
  }

  let hubspot_mapping: unknown = null;
  if (hsProperty) {
    let valueMap: Record<string, unknown> | undefined;
    if (hsValueMapRaw) {
      try {
        valueMap = JSON.parse(hsValueMapRaw);
      } catch {
        throw new Error('Hubspot valueMap doit être un JSON valide');
      }
    }
    hubspot_mapping = { property: hsProperty, ...(valueMap ? { valueMap } : {}) };
  }

  const { error } = await supabase
    .from('variable')
    .insert({ parcours_id: parcours.id, key, label, type, options, hubspot_mapping });

  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/variables`);
}

export async function updateVariableHubspotMapping(
  parcoursSlug: string,
  variableId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const hsProperty = String(formData.get('hsProperty') ?? '').trim();
  const hsValueMapRaw = String(formData.get('hsValueMap') ?? '').trim();

  let hubspot_mapping: unknown = null;
  if (hsProperty) {
    let valueMap: Record<string, unknown> | undefined;
    if (hsValueMapRaw) {
      try {
        valueMap = JSON.parse(hsValueMapRaw);
      } catch {
        throw new Error('valueMap doit être un JSON valide');
      }
    }
    hubspot_mapping = { property: hsProperty, ...(valueMap ? { valueMap } : {}) };
  }

  const { error } = await supabase
    .from('variable')
    .update({ hubspot_mapping })
    .eq('id', variableId);

  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/variables`);
}

export async function updateVariableOptions(
  parcoursSlug: string,
  variableId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const optionsRaw = String(formData.get('options') ?? '[]');
  let options: unknown;
  try {
    options = JSON.parse(optionsRaw);
  } catch {
    throw new Error('options doit être un JSON valide');
  }
  if (!Array.isArray(options)) {
    throw new Error('options doit être un tableau');
  }
  const { error } = await supabase
    .from('variable')
    .update({ options })
    .eq('id', variableId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/variables`);
}

export async function deleteVariable(parcoursSlug: string, variableId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('variable').delete().eq('id', variableId);
  if (error) throw error;
  revalidatePath(`/parcours/${parcoursSlug}/variables`);
}

// ============================================================
// Command palette (⌘K) — bulk fetch
// ============================================================

export interface PaletteParcours {
  id: string;
  slug: string;
  name: string;
}
export interface PaletteChapter {
  id: string;
  slug: string;
  title: string;
}
export interface PaletteBlock {
  id: string;
  type: string;
  chapterId: string;
  chapterSlug: string;
  chapterTitle: string;
  /** Short label produced by `summarizeBlock` — shown as the row primary text. */
  summary: string;
  /** Pre-extracted lower-case text harvested from the payload for full-text match. */
  searchText: string;
}
export interface PaletteVariable {
  id: string;
  key: string;
  label: string;
  type: string;
}
export interface PaletteData {
  parcours: PaletteParcours[];
  /** Filled only when `currentParcoursSlug` is provided. */
  chapters: PaletteChapter[];
  blocks: PaletteBlock[];
  variables: PaletteVariable[];
}

/**
 * Bulk-fetch everything the ⌘K palette needs in a single roundtrip.
 *
 * - When `currentParcoursSlug` is provided, returns the parcours' chapters,
 *   blocks (with `summarizeBlock`-derived summaries + recursive payload
 *   text for full-text search), and variables.
 * - When absent, returns only the list of all parcours.
 *
 * Reads the **draft version** when a draft exists, else the published
 * version, to mirror what the user sees in the editor.
 *
 * The result is small enough to ship to the client in one go (a typical
 * parcours has < 100 blocks). The client then runs cmdk's matcher on it
 * — no per-keystroke server roundtrip.
 */
export async function loadPaletteData(currentParcoursSlug?: string): Promise<PaletteData> {
  const supabase = await createClient();

  const { data: allParcours } = await supabase
    .from('parcours')
    .select('id, slug, name')
    .order('name', { ascending: true });

  const result: PaletteData = {
    parcours: (allParcours ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    chapters: [],
    blocks: [],
    variables: [],
  };

  if (!currentParcoursSlug) return result;

  const info = await getParcoursVersionInfo(currentParcoursSlug);
  const versionId = info.draftVersionId ?? info.publishedVersionId;
  if (!info.parcoursId || !versionId) return result;

  // Chapters (ordered) + variables in parallel.
  const [{ data: chapters }, { data: variables }] = await Promise.all([
    supabase
      .from('chapter')
      .select('id, slug, title, "order"')
      .eq('version_id', versionId)
      .order('order', { ascending: true }),
    supabase
      .from('variable')
      .select('id, key, label, type')
      .eq('parcours_id', info.parcoursId)
      .order('key', { ascending: true }),
  ]);

  result.chapters = (chapters ?? []).map((c) => ({ id: c.id, slug: c.slug, title: c.title }));
  result.variables = (variables ?? []).map((v) => ({
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type,
  }));

  // Blocks for those chapters.
  const chapterIds = result.chapters.map((c) => c.id);
  if (chapterIds.length === 0) return result;

  const { data: blocks } = await supabase
    .from('block')
    .select('id, type, payload, chapter_id, "order"')
    .in('chapter_id', chapterIds)
    .order('order', { ascending: true });

  const chapterById = new Map(result.chapters.map((c) => [c.id, c] as const));
  result.blocks = (blocks ?? []).map((b) => {
    const ch = chapterById.get(b.chapter_id);
    const payload = (b.payload ?? {}) as Record<string, unknown>;
    return {
      id: b.id,
      type: b.type,
      chapterId: b.chapter_id,
      chapterSlug: ch?.slug ?? '',
      chapterTitle: ch?.title ?? '',
      summary: summarizeBlock(b.type, payload),
      searchText: extractBlockSearchText(payload),
    };
  });

  return result;
}

// ============================================================
// Parcours creation (wizard)
// ============================================================

/**
 * Create a brand-new parcours. Inserts:
 *   1. A `parcours` row (slug + name + optional host).
 *   2. A first `parcours_version` row with status='draft' and version_number=1.
 *
 * No chapters are created — the user adds them via the standard chapter UI.
 * The parcours has no published version yet ; visiting its public URL
 * falls back to the draft (see loadChapterSequence's draft fallback).
 *
 * Returns the new parcours slug, ready to redirect to.
 */
export async function createParcours(input: {
  slug: string;
  name: string;
  host?: string | null;
}): Promise<{ slug: string }> {
  const slug = slugifyForParcours(input.slug);
  if (!slug) throw new Error('Slug invalide.');
  if (!input.name.trim()) throw new Error('Nom requis.');

  const supabase = await createClient();

  // Reject collisions early with a clear error message.
  const { data: existing } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    throw new Error(`Un parcours avec le slug « ${slug} » existe déjà.`);
  }
  if (input.host) {
    const { data: hostClash } = await supabase
      .from('parcours')
      .select('id, slug')
      .eq('host', input.host)
      .maybeSingle();
    if (hostClash) {
      throw new Error(
        `Le host « ${input.host} » est déjà attribué au parcours « ${hostClash.slug} ».`,
      );
    }
  }

  // 1. parcours row.
  // Build the insert payload defensively : only include `host` when an
  // actual value is provided. This way the insert works on clouds where the
  // `host` column hasn't been added yet (migration 0028 not applied) — a
  // schema drift the manager has to tolerate while we onboard new envs.
  // Same defensive approach for `theme_color` (migration 0035) — included
  // only when its column exists (we attempt with it, retry without on
  // schema error).
  const insertPayload: {
    slug: string;
    name: string;
    host?: string;
    theme_color?: string;
  } = {
    slug,
    name: input.name.trim(),
    theme_color: randomPastel(),
  };
  if (input.host) insertPayload.host = input.host;
  let { data: parcours, error: pErr } = await supabase
    .from('parcours')
    .insert(insertPayload)
    .select('id, slug')
    .single();
  // Retry without `theme_color` if the column doesn't exist yet on the
  // target DB (migration 0035 not applied). Same tolerance as `host` :
  // we don't want a fresh deploy to break parcours creation.
  if (
    pErr &&
    insertPayload.theme_color &&
    /column .*theme_color.* does not exist/i.test(pErr.message)
  ) {
    const { theme_color: _omit, ...fallbackPayload } = insertPayload;
    void _omit;
    const retry = await supabase
      .from('parcours')
      .insert(fallbackPayload)
      .select('id, slug')
      .single();
    parcours = retry.data;
    pErr = retry.error;
  }
  if (pErr || !parcours) {
    throw new Error(`Création du parcours échouée : ${pErr?.message ?? 'unknown'}`);
  }

  // 2. first draft version (v1).
  const { error: vErr } = await supabase
    .from('parcours_version')
    .insert({
      parcours_id: parcours.id,
      version_number: 1,
      status: 'draft',
    });
  if (vErr) {
    // Rollback the parcours row to avoid orphans.
    await supabase.from('parcours').delete().eq('id', parcours.id);
    throw new Error(`Création de la version brouillon échouée : ${vErr.message}`);
  }

  revalidatePath('/');
  return { slug: parcours.slug };
}

// ============================================================
// Navbar variants (per-parcours navbar pilote registry)
// ============================================================

export interface NavbarVariant {
  key: string;
  title: string;
  icon?: string;
  color?: string;
  /** Optional 0-100 progress ring percentage (legacy demo-ventes uses 40/60). */
  percent?: number;
}

/**
 * Read the navbar variants registry of a parcours. Returns [] when the
 * parcours doesn't exist or has no variants defined. Safe to call from
 * any server action / page loader.
 */
export async function getNavbarVariants(parcoursSlug: string): Promise<NavbarVariant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('parcours')
    .select('navbar_variants')
    .eq('slug', parcoursSlug)
    .maybeSingle();
  const raw = (data as { navbar_variants?: unknown } | null)?.navbar_variants;
  return Array.isArray(raw) ? (raw as NavbarVariant[]) : [];
}

function normalizeVariantKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

/**
 * Replace the entire variants registry of a parcours. Validates keys are
 * unique + non-empty + slug-safe. Used by the manager admin UI.
 */
export async function setNavbarVariants(
  parcoursSlug: string,
  variants: NavbarVariant[],
): Promise<void> {
  // Server-side validation : drop empty rows + de-duplicate keys + clamp percent.
  const clean: NavbarVariant[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const key = normalizeVariantKey(String(v.key ?? ''));
    const title = String(v.title ?? '').trim();
    if (!key || !title) continue;
    if (seen.has(key)) {
      throw new Error(`Clé de variant en double : « ${key} ».`);
    }
    seen.add(key);
    const next: NavbarVariant = { key, title };
    if (v.icon) next.icon = String(v.icon).trim();
    if (v.color) next.color = String(v.color).trim();
    if (typeof v.percent === 'number' && v.percent >= 0 && v.percent <= 100) {
      next.percent = Math.round(v.percent);
    }
    clean.push(next);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('parcours')
    .update({ navbar_variants: clean })
    .eq('slug', parcoursSlug);
  if (error) throw new Error(`Mise à jour des variants échouée : ${error.message}`);

  revalidatePath(`/parcours/${parcoursSlug}`, 'layout');
}
