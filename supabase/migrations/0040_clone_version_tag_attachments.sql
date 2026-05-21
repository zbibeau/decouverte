-- 0040_clone_version_tag_attachments.sql
--
-- `clone_version_as_draft` (last redefined in 0034) clones every chapter
-- and block of a source version into a fresh draft, copying their
-- payload + lineage pointers. But it had TWO gaps :
--
--   1. The maintenance-tag attachments — `block_tag` and
--      `chapter_tag` bridge rows (introduced in 0036 / 0038) — were
--      referencing the OLD chapter / block IDs only, so tags appeared
--      to "disappear" the first time a published block was edited
--      (which triggers a draft clone). The tag rows still existed in
--      DB, just bound to the previous version's IDs, invisible to
--      `loadBlockTags(draftBlockId)`.
--
--   2. The `hidden_from_nav` column (introduced in 0039) was not
--      copied when cloning a chapter — the new draft chapter fell
--      back to the default `false`, silently losing the editor's
--      opt-out flag. Same root cause as above : 0034's clone INSERT
--      simply didn't list the column.
--
-- This migration redefines `clone_version_as_draft` to :
--   - include `hidden_from_nav` in the chapter INSERT (Pass 1)
--   - add Pass 5 = clone `block_tag`, using `_block_map`
--   - add Pass 6 = clone `chapter_tag`, using `_chapter_map`
--
-- Tags + opt-out flag follow their owner across versions, same as
-- the payload itself.

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

  -- Pass 1 : clone chapters (without next_chapter_id, rewritten in Pass 2).
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

  -- Pass 3 : clone blocks (without parent_block_id, rewritten in Pass 4).
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

  -- Pass 5 : clone block_tag attachments. For every (old block, tag)
  -- pair, insert the equivalent (new block, tag) row. The mapping
  -- ensures the new draft sees the same tags as the source version.
  -- ON CONFLICT DO NOTHING is defensive : the join shouldn't produce
  -- duplicates given the primary key on the source side, but it
  -- protects against re-running the function with stale state.
  insert into public.block_tag (block_id, tag_id)
  select bm.new_id, bt.tag_id
    from public.block_tag bt
    join _block_map bm on bm.old_id = bt.block_id
  on conflict (block_id, tag_id) do nothing;

  -- Pass 6 : clone chapter_tag attachments. Same logic as Pass 5.
  insert into public.chapter_tag (chapter_id, tag_id)
  select cm.new_id, ct.tag_id
    from public.chapter_tag ct
    join _chapter_map cm on cm.old_id = ct.chapter_id
  on conflict (chapter_id, tag_id) do nothing;

  return v_new_version_id;
end
$$;
