-- =====================================================================
-- 0005 — Phase 3 / chapter PRESENTATION (data-driven, Option C)
-- =====================================================================
-- 1. Adds an optional `wrapper_class` column to `chapter` so chapters can
--    declare custom outer styling (used by PRESENTATION for its full-dvh
--    background). Defaults to NULL → existing chapters unaffected.
-- 2. Seeds the PRESENTATION chapter inside the published 'demo-ventes'
--    parcours, with three componentRef snippets (brand header, inline video,
--    next button) framing one keyPointsCard for "Bon à savoir".
-- Idempotent.
-- =====================================================================

alter table public.chapter
  add column if not exists wrapper_class text;

do $$
declare
  v_parcours_id uuid;
  v_version_id  uuid;
  v_chapter_id  uuid;
begin
  select id, published_version_id
    into v_parcours_id, v_version_id
  from public.parcours
  where slug = 'demo-ventes';

  if v_parcours_id is null or v_version_id is null then
    raise exception 'demo-ventes parcours / published version not found — run 0003 first';
  end if;

  -- ---------- chapter PRESENTATION ----------
  delete from public.block where chapter_id in (
    select id from public.chapter where version_id = v_version_id and slug = 'PRESENTATION'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'PRESENTATION';

  insert into public.chapter (version_id, slug, title, "order", wrapper_class)
  values (
    v_version_id,
    'PRESENTATION',
    'Présentation MadeForMed',
    0,
    'h-dvh w-dvw overflow-auto bg-secondary-50'
  )
  returning id into v_chapter_id;

  -- ---------- blocks ----------
  -- 1. Brand header (logo + centered subtitle)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'componentRef',
    '{"name":"PresentationBrandHeader","props":{"subTitle":"Découvrez MadeForMed"}}'::jsonb
  );

  -- 2. Inline rounded Vimeo video
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'componentRef',
    '{"name":"PresentationInlineVideo","props":{"src":"vimeo/927968331?hash=60cac6bde6"}}'::jsonb
  );

  -- 3. "Bon à savoir" key points card
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'keyPointsCard',
    '{
      "contentClass":"max-w-[600px]",
      "main":{
        "icon":"home-fill",
        "title":"Bon à savoir",
        "description":"La durée de cette démo est estimée à <span class=\"font-medium\">30 minutes</span> mais vous avez la possibilité de quitter et reprendre à tout moment votre découverte en repassant par le lien que vous avez reçu par email."
      }
    }'::jsonb
  );

  -- 4. Next button → INTRO
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'componentRef',
    '{"name":"PresentationNextButton","props":{"text":"C''est parti","nextStep":"INTRO"}}'::jsonb
  );

end $$;
