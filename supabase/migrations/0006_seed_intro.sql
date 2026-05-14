-- =====================================================================
-- 0006 — Phase 3 / chapter INTRO (data-driven, Option B)
-- =====================================================================
-- Seeds the INTRO chapter inside the published 'demo-ventes' parcours.
-- Layout = hybrid: brand header (reused from PRESENTATION) + IntroFormFields
-- (encapsulates the whole modular-forms questionnaire since its fields are
-- bound 1-1 to IntroSchema keys and can't be decomposed into generic blocks
-- until Phase 3 #17 makes variables first-class).
-- Idempotent.
-- =====================================================================

do $$
declare
  v_version_id uuid;
  v_chapter_id uuid;
  v_order      int;
begin
  select published_version_id into v_version_id
  from public.parcours
  where slug = 'demo-ventes';

  if v_version_id is null then
    raise exception 'demo-ventes published version not found — run 0003 first';
  end if;

  delete from public.block where chapter_id in (
    select id from public.chapter where version_id = v_version_id and slug = 'INTRO'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'INTRO';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order", wrapper_class)
  values (
    v_version_id,
    'INTRO',
    'Introduction — questionnaire',
    v_order,
    'h-dvh w-dvw overflow-auto bg-secondary-50'
  )
  returning id into v_chapter_id;

  -- 1. Brand header (reused from PRESENTATION)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'componentRef',
    '{"name":"PresentationBrandHeader","props":{"subTitle":"Découvrez MadeForMed"}}'::jsonb
  );

  -- 2. Intro form card (modular-forms questionnaire)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'componentRef',
    '{
      "name":"IntroFormFields",
      "props":{
        "cardIcon":"check-line",
        "cardTitle":"Pour une démo personnalisée",
        "cardDescription":"Merci de répondre à ces quelques questions :",
        "nextButtonText":"Suivant",
        "loadingText":"Veuillez patienter, nous accédons aux derniers échanges avec vous…",
        "nextStep":"STEP_OBSERVATION"
      }
    }'::jsonb
  );

end $$;
