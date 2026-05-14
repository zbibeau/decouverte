-- =====================================================================
-- 0010 — Seed STEP_TOOL_3 (Outil 3 : communication)
-- heroTitle + video + componentRef HomeTool3Sections + componentRef HomeTool3_Summary
-- Le corps bespoke (6 content sections + sticky nav) reste en code via un
-- wrapper custom component, pour conserver les interactions scroll/visibilité.
-- Re-seed complet (idempotent).
-- =====================================================================

do $$
declare
  v_version_id uuid;
  v_chapter_id uuid;
  v_order      int;
begin
  select published_version_id into v_version_id
  from public.parcours where slug = 'demo-ventes';

  if v_version_id is null then
    raise exception 'demo-ventes published version not found — run 0003 first';
  end if;

  delete from public.block where chapter_id in (
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_3'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_3';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_TOOL_3', 'Outil 3 — Communication', v_order)
  returning id into v_chapter_id;

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{
      "title":"Des outils de communication",
      "sectionTitle":"La boite à outils du médecin",
      "number":3,
      "illustration":"/illustrations/toolbox3-header.webp"
    }'::jsonb
  );

  -- 2. Vidéo pleine largeur
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'video',
    '{"vimeoSrc":"vimeo/927968390?hash=eb84ad4872"}'::jsonb
  );

  -- 3. Corps bespoke (6 sections + sticky nav)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'componentRef',
    '{"name":"HomeTool3Sections","props":{}}'::jsonb
  );

  -- 4. Bilan custom
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'componentRef',
    '{"name":"HomeTool3_Summary","props":{}}'::jsonb
  );

end $$;
