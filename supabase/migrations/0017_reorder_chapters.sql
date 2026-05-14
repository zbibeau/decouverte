-- =====================================================================
-- 0017 — Réordonne les chapitres demo-ventes dans l'ordre canonique.
-- Les re-seeds successifs ont décalé certains chapitres en fin de liste.
-- =====================================================================

do $$
declare
  v_version_id uuid;
  v_slug text;
  v_order int := 0;
  canonical text[] := array[
    'PRESENTATION',
    'INTRO',
    'STEP_OBSERVATION',
    'STEP_TOOL_1',
    'STEP_TOOL_2',
    'STEP_TOOL_3',
    'STEP_NEXT_PRICING',
    'STEP_NEXT_TRANSITION',
    'END'
  ];
begin
  select published_version_id into v_version_id
  from public.parcours where slug = 'demo-ventes';

  if v_version_id is null then
    raise exception 'demo-ventes published version not found';
  end if;

  -- Phase 1 : déplacer tous les chapitres dans une plage temporaire
  -- pour éviter les collisions sur (version_id, "order").
  update public.chapter
    set "order" = "order" + 1000
    where version_id = v_version_id;

  -- Phase 2 : assigner l'ordre canonique.
  foreach v_slug in array canonical loop
    v_order := v_order + 1;
    update public.chapter
      set "order" = v_order
      where version_id = v_version_id and slug = v_slug;
  end loop;
end $$;
