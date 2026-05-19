-- =====================================================================
-- 0033 — Fix `clone_version_as_draft` to copy section_label + section_order.
-- =====================================================================
-- Migration 0031 added `chapter.section_label` and `chapter.section_order`
-- but the PL/pgSQL function that clones a published version into a fresh
-- draft (used by every "first edit after publish" flow) never received the
-- update — so newly-created drafts lost the sidebar section info, and a
-- subsequent publish wiped the sections from the live version.
-- This migration redefines the function to include both columns.
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

  -- Pass 1: clone chapters with lineage + section info.
  for src_chapter in
    select * from public.chapter where version_id = src_version_id
  loop
    v_old_id := src_chapter.id;
    insert into public.chapter (
      version_id, slug, title, "order", branching_next, wrapper_class,
      cloned_from_chapter_id, section_label, section_order
    ) values (
      v_new_version_id,
      src_chapter.slug,
      src_chapter.title,
      src_chapter."order",
      src_chapter.branching_next,
      src_chapter.wrapper_class,
      v_old_id,
      src_chapter.section_label,
      src_chapter.section_order
    )
    returning id into v_new_id;
    insert into _chapter_map(old_id, new_id) values (v_old_id, v_new_id);
  end loop;

  -- Pass 2: rewrite next_chapter_id on the new chapters.
  update public.chapter c
     set next_chapter_id = m.new_id
    from _chapter_map cm,
         public.chapter src,
         _chapter_map m
   where cm.new_id = c.id
     and src.id    = cm.old_id
     and m.old_id  = src.next_chapter_id;

  -- Pass 3: clone blocks with lineage.
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

  -- Pass 4: rewrite parent_block_id on the new blocks.
  update public.block b
     set parent_block_id = pm.new_id
    from _block_map bm,
         public.block src,
         _block_map pm
   where bm.new_id = b.id
     and src.id    = bm.old_id
     and pm.old_id = src.parent_block_id;

  return v_new_version_id;
end
$$;
