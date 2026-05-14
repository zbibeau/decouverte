-- =====================================================================
-- 0011 — Seed STEP_NEXT_PRICING (Phase next : tarifs)
-- heroTitle + conditional video (personWhoHandleCalls) + componentRef
-- HomeOurPricingBody + componentRef NextStepsRef(currentStep=2)
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
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_NEXT_PRICING'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_NEXT_PRICING';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_NEXT_PRICING', 'Tarifs', v_order)
  returning id into v_chapter_id;

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{
      "title":"Nos tarifs",
      "sectionTitle":"La suite avec nous",
      "number":1,
      "illustration":"/illustrations/pricing-header.webp"
    }'::jsonb
  );

  -- 2. Vidéo conditionnelle (remote-secretary → variante A)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'conditional',
    '{
      "condition":{"variable":"personWhoHandleCalls","op":"=","value":"remote-secretary"},
      "then":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/911374447?hash=131b4b601f"}}
      ],
      "else":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/911374297?hash=21a9c3f40e"}}
      ]
    }'::jsonb
  );

  -- 3. Corps bespoke (calculateur + partenaires + bandeau conditionnel)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'componentRef',
    '{"name":"HomeOurPricingBody","props":{}}'::jsonb
  );

  -- 4. Stepper next (étape courante = 2 = tarifs)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'componentRef',
    '{"name":"NextStepsRef","props":{"currentStep":2}}'::jsonb
  );

end $$;
