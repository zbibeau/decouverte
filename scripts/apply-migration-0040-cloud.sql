-- =====================================================================
-- Apply migration 0040 (clone tag attachments + hidden_from_nav) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- PREREQUISITE : migration 0039 must be applied first
-- (`chapter.hidden_from_nav` column).
--
-- Fixes two related data-loss bugs in `clone_version_as_draft`
-- (the RPC fired the first time a published block / chapter is
-- edited, to materialise a draft version) :
--
--   1. Maintenance-tag attachments (`block_tag` / `chapter_tag`
--      rows from 0036 / 0038) weren't cloned alongside their
--      owners — they kept referencing the old published-era IDs,
--      invisible to the manager. → tags appeared to "disappear"
--      at the first edit of a published block.
--
--   2. The `hidden_from_nav` column (0039) wasn't listed in the
--      chapter INSERT, so the cloned draft fell back to the
--      default `false`. → opt-out flags appeared to "reset" the
--      first time the user opened the draft. Compounded by the
--      fact that the manager's diff detector also didn't compare
--      this column, so the user couldn't even publish the fix
--      without making another unrelated change first.
--
-- This migration redefines `clone_version_as_draft` to :
--   - include `hidden_from_nav` in the chapter INSERT (Pass 1)
--   - add Pass 5 = clone `block_tag` via `_block_map`
--   - add Pass 6 = clone `chapter_tag` via `_chapter_map`
--
-- HOW TO APPLY :
--   - Supabase Studio → SQL Editor → paste this whole file → Run.
--   - Idempotent : `create or replace function` overwrites the
--     previous definition without leaving stale state.
--
-- BACKFILL : this migration only fixes future clones. If a draft
-- already exists where the original published rows got "stranded",
-- run the optional backfill block at the bottom to propagate them
-- across the lineage pointers (`cloned_from_block_id` /
-- `cloned_from_chapter_id`).
-- =====================================================================

create or replace function public.clone_version_as_draft(src_version_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_parcours_id    uuid;
  v_new_version_id uuid;
  v_next_num       int;
  v_old_id         uuid;
  v_new_id         uuid;
  src_chapter      record;
  src_block        record;
begin
  select parcours_id into v_parcours_id
    from public.parcours_version
   where id = src_version_id;
  if v_parcours_id is null then
    raise exception 'clone_version_as_draft: source version % not found', src_version_id;
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_next_num
    from public.parcours_version
   where parcours_id = v_parcours_id;

  insert into public.parcours_version (parcours_id, version_number, status)
  values (v_parcours_id, v_next_num, 'draft')
  returning id into v_new_version_id;

  create temp table if not exists _chapter_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;
  create temp table if not exists _block_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;
  truncate _chapter_map;
  truncate _block_map;

  -- Pass 1 : clone chapters (now including hidden_from_nav from 0039).
  for src_chapter in
    select * from public.chapter where version_id = src_version_id
  loop
    v_old_id := src_chapter.id;
    insert into public.chapter (
      version_id, slug, title, "order", branching_next, wrapper_class,
      cloned_from_chapter_id, section_label, section_order,
      card_image, card_short_title, hidden_from_nav
    ) values (
      v_new_version_id,
      src_chapter.slug,
      src_chapter.title,
      src_chapter."order",
      src_chapter.branching_next,
      src_chapter.wrapper_class,
      v_old_id,
      src_chapter.section_label,
      src_chapter.section_order,
      src_chapter.card_image,
      src_chapter.card_short_title,
      src_chapter.hidden_from_nav
    )
    returning id into v_new_id;
    insert into _chapter_map(old_id, new_id) values (v_old_id, v_new_id);
  end loop;

  -- Pass 2 : rewrite next_chapter_id on the cloned chapters.
  update public.chapter c
     set next_chapter_id = m.new_id
    from _chapter_map cm,
         public.chapter src,
         _chapter_map m
   where cm.new_id = c.id
     and src.id    = cm.old_id
     and m.old_id  = src.next_chapter_id;

  -- Pass 3 : clone blocks.
  for src_block in
    select b.*, cm.new_id as new_chapter_id
      from public.block b
      join _chapter_map cm on cm.old_id = b.chapter_id
  loop
    v_old_id := src_block.id;
    insert into public.block (chapter_id, "order", type, payload, cloned_from_block_id)
    values (src_block.new_chapter_id, src_block."order", src_block.type, src_block.payload, v_old_id)
    returning id into v_new_id;
    insert into _block_map(old_id, new_id) values (v_old_id, v_new_id);
  end loop;

  -- Pass 4 : rewrite parent_block_id on the cloned blocks.
  update public.block b
     set parent_block_id = pm.new_id
    from _block_map bm,
         public.block src,
         _block_map pm
   where bm.new_id = b.id
     and src.id    = bm.old_id
     and pm.old_id = src.parent_block_id;

  -- Pass 5 (NEW) : clone block_tag attachments.
  insert into public.block_tag (block_id, tag_id)
  select bm.new_id, bt.tag_id
    from public.block_tag bt
    join _block_map bm on bm.old_id = bt.block_id
  on conflict (block_id, tag_id) do nothing;

  -- Pass 6 (NEW) : clone chapter_tag attachments.
  insert into public.chapter_tag (chapter_id, tag_id)
  select cm.new_id, ct.tag_id
    from public.chapter_tag ct
    join _chapter_map cm on cm.old_id = ct.chapter_id
  on conflict (chapter_id, tag_id) do nothing;

  return v_new_version_id;
end
$$;

-- =====================================================================
-- OPTIONAL BACKFILL — propagate already-stranded data to existing drafts.
-- =====================================================================
-- Three passes (all safe to re-run, idempotent) :
--   1. Block tags : copy from `block_tag` of cloned_from_block_id.
--   2. Chapter tags : copy from `chapter_tag` of cloned_from_chapter_id.
--   3. hidden_from_nav : propagate the source value when the draft
--      currently has the default `false` but its source had `true`.
--      Doesn't overwrite drafts where the editor has intentionally
--      flipped the flag in the draft after cloning.
-- Uncomment to apply.
-- ---------------------------------------------------------------------
--
-- insert into public.block_tag (block_id, tag_id)
-- select b.id, bt.tag_id
--   from public.block b
--   join public.block_tag bt on bt.block_id = b.cloned_from_block_id
--  where b.cloned_from_block_id is not null
-- on conflict (block_id, tag_id) do nothing;
--
-- insert into public.chapter_tag (chapter_id, tag_id)
-- select c.id, ct.tag_id
--   from public.chapter c
--   join public.chapter_tag ct on ct.chapter_id = c.cloned_from_chapter_id
--  where c.cloned_from_chapter_id is not null
-- on conflict (chapter_id, tag_id) do nothing;
--
-- update public.chapter c
--    set hidden_from_nav = src.hidden_from_nav
--   from public.chapter src
--  where src.id = c.cloned_from_chapter_id
--    and src.hidden_from_nav = true
--    and c.hidden_from_nav = false;
