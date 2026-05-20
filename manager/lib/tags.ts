'use server';

import { createClient } from '@/lib/supabase/server';
import { isTagColor, type Tag, type TagColor } from '@/lib/tagColors';

/**
 * Maintenance-tag system server actions.
 *
 * Tags live in two first-class tables (migration 0036) :
 *   - `tag` : the tag itself (slug, label, color, timestamps)
 *   - `block_tag` : many-to-many bridge to `block`
 *
 * Why first-class tables rather than JSONB in `block.payload` :
 *   - Renaming a tag = UPDATE 1 row → propagates everywhere
 *   - Colors are a real column, no per-block touch
 *   - Tagging a block does NOT mutate `block.payload` → no draft /
 *     publish cycle triggered by adding maintenance tags (the
 *     publish flow concerns content versioning ; tags are a search
 *     index, orthogonal to publication)
 *   - The cross-parcours vocabulary is just `SELECT * FROM tag`
 *
 * Pure types (TagColor, palette classNames, isTagColor) live in
 * `manager/lib/tagColors.ts` — they can't be co-located here because
 * `'use server'` files only allow async function exports.
 *
 * All actions in this file are meant to be called directly from
 * client components. They throw on validation errors so callers can
 * surface a toast.
 */

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------

/** All tags in the app, sorted by label. Powers the autocomplete in
 *  TagsField and the library admin table. */
export async function loadAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tag')
    .select('id, slug, label, color')
    .order('label', { ascending: true });
  if (error) {
    console.error('[loadAllTags] supabase error', error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    label: r.label as string,
    color: isTagColor(r.color) ? r.color : 'amber',
  }));
}

/** Tags currently attached to a single block. Used by TagsField on
 *  mount to populate the pills. */
export async function loadBlockTags(blockId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('block_tag')
    .select('tag:tag(id, slug, label, color)')
    .eq('block_id', blockId);
  if (error) {
    console.error('[loadBlockTags] supabase error', error);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      // Supabase types the FK join as either an object or an array
      // depending on cardinality inference. Normalise both.
      const r = (row as { tag: Tag | Tag[] | null }).tag;
      if (!r) return null;
      const t = Array.isArray(r) ? r[0] : r;
      if (!t) return null;
      return {
        id: t.id,
        slug: t.slug,
        label: t.label,
        color: isTagColor(t.color) ? t.color : 'amber',
      };
    })
    .filter((t): t is Tag => t !== null)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

// ---------------------------------------------------------------------
// Mutate (instant — no draft/publish cycle, see file-level doc)
// ---------------------------------------------------------------------

/** Find a tag by its canonical slug. Returns null if not found. Used
 *  by `createTag` to be idempotent on slug collisions. */
async function findTagBySlug(slug: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('tag').select('id, slug, label, color').eq('slug', slug).maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    slug: data.slug as string,
    label: data.label as string,
    color: isTagColor(data.color) ? data.color : 'amber',
  };
}

/**
 * Create a tag from a user-typed label (case-preserving for the
 * label, lowercased for the slug). If a tag with the same slug
 * already exists, returns it unchanged — this lets the editor's
 * "Enter → create" flow be idempotent. */
export async function createTag(label: string, color: TagColor = 'amber'): Promise<Tag> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Le tag ne peut pas être vide.');
  const slug = slugify(trimmed);
  const existing = await findTagBySlug(slug);
  if (existing) return existing;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tag')
    .insert({ slug, label: trimmed, color })
    .select('id, slug, label, color')
    .single();
  if (error || !data) {
    // Surface the Supabase error to the server logs — the message that
    // bubbles up to the toast is sometimes truncated by the UI, but
    // the full thing (e.g. `relation "public.tag" does not exist`)
    // makes the root cause obvious in the terminal.
    console.error('[createTag] supabase error', error);
    throw new Error(`Création du tag impossible : ${error?.message ?? 'erreur inconnue'}`);
  }
  return {
    id: data.id as string,
    slug: data.slug as string,
    label: data.label as string,
    color: isTagColor(data.color) ? data.color : 'amber',
  };
}

/** Edit the display label of a tag (does NOT rename the slug — that
 *  would break referential integrity if the user later re-types the
 *  original casing). Library admin only. */
export async function renameTag(id: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Le label du tag ne peut pas être vide.');
  const supabase = await createClient();
  const { error } = await supabase.from('tag').update({ label: trimmed }).eq('id', id);
  if (error) throw new Error(`Renommage impossible : ${error.message}`);
}

export async function setTagColor(id: string, color: TagColor): Promise<void> {
  if (!isTagColor(color)) throw new Error(`Couleur invalide : ${color}`);
  const supabase = await createClient();
  const { error } = await supabase.from('tag').update({ color }).eq('id', id);
  if (error) {
    console.error('[setTagColor] supabase error', error);
    throw new Error(`Changement de couleur impossible : ${error.message}`);
  }
}

/** Permanently delete a tag. ON DELETE CASCADE drops its `block_tag`
 *  rows automatically. */
export async function deleteTag(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('tag').delete().eq('id', id);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
}

/**
 * Replace the set of tags attached to a block with the provided
 * `tagIds`. Implemented as DELETE + INSERT so the editor doesn't have
 * to compute the diff client-side.
 *
 * Atomicity : the two queries run sequentially. In the unlikely event
 * of the INSERT failing after the DELETE succeeded, the block ends up
 * with no tags — call it again with the same payload to recover.
 * That edge case isn't worth a stored procedure for v1.
 */
export async function setBlockTags(blockId: string, tagIds: string[]): Promise<void> {
  const supabase = await createClient();
  const { error: delErr } = await supabase.from('block_tag').delete().eq('block_id', blockId);
  if (delErr) throw new Error(`Mise à jour des tags impossible : ${delErr.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ block_id: blockId, tag_id }));
  const { error: insErr } = await supabase.from('block_tag').insert(rows);
  if (insErr) throw new Error(`Insertion des tags impossible : ${insErr.message}`);
}

// ---------------------------------------------------------------------
// Chapter-scoped tag operations (mirror of the block ones)
// ---------------------------------------------------------------------

/** Tags currently attached to a single chapter (covering the
 *  chapter's `card_image`). Mirror of `loadBlockTags`. */
export async function loadChapterTags(chapterId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chapter_tag')
    .select('tag:tag(id, slug, label, color)')
    .eq('chapter_id', chapterId);
  if (error) {
    console.error('[loadChapterTags] supabase error', error);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      const r = (row as { tag: Tag | Tag[] | null }).tag;
      if (!r) return null;
      const t = Array.isArray(r) ? r[0] : r;
      if (!t) return null;
      return {
        id: t.id,
        slug: t.slug,
        label: t.label,
        color: isTagColor(t.color) ? t.color : 'amber',
      };
    })
    .filter((t): t is Tag => t !== null)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Replace the set of tags attached to a chapter. Mirror of
 *  `setBlockTags` — same atomicity caveats. */
export async function setChapterTags(chapterId: string, tagIds: string[]): Promise<void> {
  const supabase = await createClient();
  const { error: delErr } = await supabase.from('chapter_tag').delete().eq('chapter_id', chapterId);
  if (delErr) throw new Error(`Mise à jour des tags impossible : ${delErr.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ chapter_id: chapterId, tag_id }));
  const { error: insErr } = await supabase.from('chapter_tag').insert(rows);
  if (insErr) throw new Error(`Insertion des tags impossible : ${insErr.message}`);
}
