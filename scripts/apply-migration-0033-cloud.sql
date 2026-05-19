-- =====================================================================
-- Apply migration 0033 on CLOUD : fix `clone_version_as_draft` to carry
-- over `section_label` + `section_order` when cloning published → draft.
-- =====================================================================
-- Also includes a one-shot to restore lost section data on Odaiji's
-- current published version (v18) by pulling them from the archived v16
-- that still has them. Matches by chapter slug.
-- =====================================================================

-- 1. Replace the RPC.
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

  update public.chapter c
     set next_chapter_id = m.new_id
    from _chapter_map cm,
         public.chapter src,
         _chapter_map m
   where cm.new_id = c.id
     and src.id    = cm.old_id
     and m.old_id  = src.next_chapter_id;

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

-- 2. One-shot : restore Odaiji's section_label/section_order on the live
--    published version by matching slugs with the archived v16 that still
--    carries the data. Idempotent : runs nothing if section_label already
--    set on a chapter.
do $$
declare
  v_parcours_id      uuid;
  v_published_id     uuid;
  v_archived_id      uuid;
  ch                 record;
begin
  select id, published_version_id into v_parcours_id, v_published_id
    from public.parcours where slug = 'odaiji';
  if v_published_id is null then
    raise notice 'Odaiji has no published version, nothing to restore.';
    return;
  end if;

  -- Pick the most recent ARCHIVED version that has at least one chapter
  -- with section_label set.
  select pv.id into v_archived_id
    from public.parcours_version pv
   where pv.parcours_id = v_parcours_id
     and pv.status = 'archived'
     and exists (
       select 1 from public.chapter c
        where c.version_id = pv.id
          and c.section_label is not null
     )
   order by pv.version_number desc
   limit 1;

  if v_archived_id is null then
    raise notice 'No archived version with section data found, skipping.';
    return;
  end if;

  for ch in
    select pub.id as pub_id, arc.section_label, arc.section_order
      from public.chapter pub
      join public.chapter arc
        on arc.slug = pub.slug
       and arc.version_id = v_archived_id
     where pub.version_id = v_published_id
       and pub.section_label is null  -- only restore where missing
       and arc.section_label is not null
  loop
    update public.chapter
       set section_label = ch.section_label,
           section_order = ch.section_order
     where id = ch.pub_id;
  end loop;

  raise notice 'Section data restored on Odaiji published version from archived %.', v_archived_id;
end $$;

-- Verify.
select slug, title, section_label, section_order
  from public.chapter
 where version_id = (select published_version_id from public.parcours where slug = 'odaiji')
 order by "order";
