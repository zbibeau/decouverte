-- =====================================================================
-- 0012 — Seed STEP_NEXT_TRANSITION (Phase next : transition)
-- heroTitle + video + componentRef HomeTransitionBody
-- (vidéo "no meeting" retenue : contactInformations.meeting n'est jamais hydraté
-- dans l'app actuelle, donc la branche "else" est toujours prise.)
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
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_NEXT_TRANSITION'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_NEXT_TRANSITION';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_NEXT_TRANSITION', 'Transition', v_order)
  returning id into v_chapter_id;

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{
      "title":"Pour une transition réussie",
      "sectionTitle":"La suite avec nous",
      "number":2,
      "illustration":"/illustrations/transition-header.webp"
    }'::jsonb
  );

  -- 2. Vidéo pleine largeur
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'video',
    '{"vimeoSrc":"vimeo/911374534?hash=38b3bf0076"}'::jsonb
  );

  -- 3. Corps bespoke (info card + TakeAppointment + bouton next)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'componentRef',
    '{"name":"HomeTransitionBody","props":{}}'::jsonb
  );

end $$;
