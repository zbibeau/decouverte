-- One-shot : clone demo-ventes' published content into test-new.
-- Local-only debug helper, not a migration. Run via:
--   docker exec -i supabase_db_demo-ventes psql -U postgres -d postgres < scripts/clone-parcours-content.sql
--
-- Behaviour:
--   1. Clones every chapter + block from demo-ventes' published version into
--      a new draft version of test-new.
--   2. Copies every variable of demo-ventes into test-new (skips conflicts).
--   3. Publishes the new draft on test-new and archives the previous
--      published version (if any) of test-new.
--
-- Safe to re-run: it always creates a new draft → publishes it → archives
-- the previous published version. Test-new ends up holding a fresh copy.

do $$
declare
  v_src_version_id    uuid;
  v_target_parcours_id uuid;
  v_old_published_id  uuid;
  v_new_version_id    uuid;
  v_next_num          int;
  v_old_id            uuid;
  v_new_id            uuid;
  src_chapter         record;
  src_block           record;
begin
  -- ---- Resolve source + target ----
  select published_version_id into v_src_version_id
    from public.parcours where slug = 'demo-ventes';
  if v_src_version_id is null then
    raise exception 'demo-ventes has no published version';
  end if;

  select id, published_version_id
    into v_target_parcours_id, v_old_published_id
    from public.parcours where slug = 'test-new';
  if v_target_parcours_id is null then
    raise exception 'test-new parcours not found';
  end if;

  -- ---- Drop test-new's current draft (if any) so we can re-run cleanly ----
  delete from public.parcours_version
   where parcours_id = v_target_parcours_id and status = 'draft';

  -- ---- Allocate the next version_number for test-new ----
  select coalesce(max(version_number), 0) + 1 into v_next_num
    from public.parcours_version where parcours_id = v_target_parcours_id;

  insert into public.parcours_version (parcours_id, version_number, status)
  values (v_target_parcours_id, v_next_num, 'draft')
  returning id into v_new_version_id;

  -- ---- Session-scoped id mapping tables ----
  create temp table if not exists _chap_map (old_id uuid primary key, new_id uuid not null) on commit drop;
  create temp table if not exists _blk_map  (old_id uuid primary key, new_id uuid not null) on commit drop;
  truncate _chap_map;
  truncate _blk_map;

  -- ---- Pass 1 : clone chapters (FKs left null, fixed in pass 2) ----
  for src_chapter in
    select * from public.chapter where version_id = v_src_version_id
  loop
    v_old_id := src_chapter.id;
    insert into public.chapter (
      version_id, slug, title, "order", branching_next, wrapper_class
    ) values (
      v_new_version_id,
      src_chapter.slug,
      src_chapter.title,
      src_chapter."order",
      src_chapter.branching_next,
      src_chapter.wrapper_class
    )
    returning id into v_new_id;
    insert into _chap_map(old_id, new_id) values (v_old_id, v_new_id);
  end loop;

  -- ---- Pass 2 : rewrite next_chapter_id on cloned chapters ----
  update public.chapter c
     set next_chapter_id = nm.new_id
    from public.chapter src
    join _chap_map sm on sm.old_id = src.id
    join _chap_map nm on nm.old_id = src.next_chapter_id
   where c.id = sm.new_id and src.next_chapter_id is not null;

  -- ---- Pass 3 : clone blocks (parent FKs deferred) ----
  for src_block in
    select b.*, b.chapter_id as src_chapter_id
      from public.block b
      join public.chapter c on c.id = b.chapter_id
     where c.version_id = v_src_version_id
  loop
    v_old_id := src_block.id;
    insert into public.block (
      chapter_id, "order", type, payload, parent_block_id
    ) values (
      (select new_id from _chap_map where old_id = src_block.src_chapter_id),
      src_block."order",
      src_block.type,
      src_block.payload,
      null  -- patched in pass 4
    )
    returning id into v_new_id;
    insert into _blk_map(old_id, new_id) values (v_old_id, v_new_id);
  end loop;

  -- ---- Pass 4 : wire parent_block_id ----
  update public.block b
     set parent_block_id = pm.new_id
    from public.block src
    join _blk_map sm on sm.old_id = src.id
    join _blk_map pm on pm.old_id = src.parent_block_id
   where b.id = sm.new_id and src.parent_block_id is not null;

  -- ---- Variables : copy missing keys from demo-ventes to test-new ----
  insert into public.variable (parcours_id, key, label, type, options, hubspot_mapping)
    select v_target_parcours_id, src.key, src.label, src.type, src.options, src.hubspot_mapping
      from public.variable src
      join public.parcours p on p.slug = 'demo-ventes'
     where src.parcours_id = p.id
       and not exists (
         select 1 from public.variable t
          where t.parcours_id = v_target_parcours_id and t.key = src.key
       );

  -- ---- Archive previous published, publish the new draft ----
  if v_old_published_id is not null then
    update public.parcours_version set status = 'archived' where id = v_old_published_id;
  end if;
  update public.parcours_version set status = 'published' where id = v_new_version_id;
  update public.parcours set published_version_id = v_new_version_id where id = v_target_parcours_id;

  raise notice 'cloned demo-ventes (v=%) into test-new v% (id=%)',
    v_src_version_id, v_next_num, v_new_version_id;
end $$;

-- Sanity check : how many chapters + blocks did we land?
select
  (select count(*) from public.chapter where version_id = (select published_version_id from public.parcours where slug = 'test-new')) as chapters,
  (select count(*) from public.block b join public.chapter c on c.id = b.chapter_id where c.version_id = (select published_version_id from public.parcours where slug = 'test-new')) as blocks,
  (select count(*) from public.variable where parcours_id = (select id from public.parcours where slug = 'test-new')) as variables;
