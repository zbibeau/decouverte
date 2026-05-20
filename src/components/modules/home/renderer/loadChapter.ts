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
    .select(
      'id, version_id, slug, title, "order", next_chapter_id, branching_next, wrapper_class, card_image, card_short_title',
    )
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
    cardImage: (chapter as { card_image?: string | null }).card_image ?? undefined,
    cardShortTitle: (chapter as { card_short_title?: string | null }).card_short_title ?? undefined,
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
  /** Sidebar grouping (matches `chapter.section_label`). NULL means
   *  ungrouped — the stepper renders it as a top-level item. */
  sectionLabel?: string | null;
  /** Sort key within a section. NULL = let `order` decide. */
  sectionOrder?: number | null;
  /** Background image URL displayed on the chapter card in section
   *  panoramas (chapterTransition block + auto next-chapter transition). */
  cardImage?: string | null;
  /** Short label displayed in the chapter card. Falls back to `title` when null. */
  cardShortTitle?: string | null;
  /** TRUE iff at least one top-level block of this chapter has `type='form'`.
   *  Drives the "Retour au formulaire" button shown on the very next chapter
   *  in the reading flow so visitors (and the dev) can revisit their answers. */
  hasForm?: boolean;
}
export async function loadChapterSequence(parcoursSlug: string, versionId?: string): Promise<ChapterStub[]> {
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
    .select('id, slug, title, "order", section_label, section_order, card_image, card_short_title')
    .eq('version_id', effectiveVersionId)
    .order('order', { ascending: true });

  // Pre-compute which chapters contain a form block, in one round-trip,
  // so the chapter sequence carries a `hasForm` flag the renderer can use
  // without re-loading each chapter's content. This drives the "Retour au
  // formulaire" button shown on the chapter right after a form chapter.
  const chapterIds = (rows ?? []).map((r) => r.id as string);
  const chaptersWithForm = new Set<string>();
  if (chapterIds.length > 0) {
    const { data: formBlockRows } = await supabase
      .from('block')
      .select('chapter_id')
      .eq('type', 'form')
      .in('chapter_id', chapterIds);
    for (const b of formBlockRows ?? []) {
      chaptersWithForm.add((b as { chapter_id: string }).chapter_id);
    }
  }

  return (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    order: r.order,
    sectionLabel: (r as { section_label?: string | null }).section_label ?? null,
    sectionOrder: (r as { section_order?: number | null }).section_order ?? null,
    cardImage: (r as { card_image?: string | null }).card_image ?? null,
    cardShortTitle: (r as { card_short_title?: string | null }).card_short_title ?? null,
    hasForm: chaptersWithForm.has(r.id as string),
  }));
}

/** Shape of a single navbar variant stored in `parcours.navbar_variants`. */
export interface NavbarVariant {
  key: string;
  title: string;
  icon?: string;
  color?: string;
  percent?: number;
}

/**
 * Load the navbar variants registry for a parcours. Returns [] when the
 * parcours has no row or no variants yet — the renderer then falls back to
 * a graceful no-op (no Tool1 navbar rendered).
 */
export async function loadNavbarVariants(parcoursSlug: string): Promise<NavbarVariant[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('parcours').select('navbar_variants').eq('slug', parcoursSlug).maybeSingle();
  const raw = (data as { navbar_variants?: unknown } | null)?.navbar_variants;
  return Array.isArray(raw) ? (raw as NavbarVariant[]) : [];
}

/**
 * Load the pastel `theme_color` stored on the parcours row. Returns
 * `null` when:
 *   - The column doesn't exist yet on this DB (migration 0035 not yet
 *     applied) — caught by the defensive try/catch.
 *   - The parcours has never been assigned a color (NULL in DB).
 *   - Supabase isn't configured (server / preview).
 * The renderer's css-vars effect applies a parcours-tinted accent
 * across the front when this value is set, falling back to the
 * default Tailwind theme otherwise.
 */
export async function loadParcoursThemeColor(parcoursSlug: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('parcours')
      .select('theme_color')
      .eq('slug', parcoursSlug)
      .maybeSingle();
    if (error) return null;
    const color = (data as { theme_color?: string | null } | null)?.theme_color;
    return color && typeof color === 'string' && color.startsWith('#') ? color : null;
  } catch {
    return null;
  }
}
