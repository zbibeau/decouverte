-- =====================================================================
-- 0013 — Seed END (écran final "Merci !")
-- Un seul bloc componentRef HomeEndBody (tout le contenu est bespoke).
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
    select id from public.chapter where version_id = v_version_id and slug = 'END'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'END';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'END', 'Fin', v_order)
  returning id into v_chapter_id;

  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'componentRef',
    '{"name":"HomeEndBody","props":{}}'::jsonb
  );

end $$;
