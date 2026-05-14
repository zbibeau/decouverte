-- =====================================================================
-- 0018 — Re-seed PRESENTATION blocks (canonical order).
-- A previous edit dropped the BrandHeader block and duplicated the
-- NextButton; this restores the 4-block layout from 0005 without
-- touching the chapter row itself (preserves id, order, wrapper_class).
-- Idempotent.
-- =====================================================================

do $$
declare
  v_version_id uuid;
  v_chapter_id uuid;
begin
  select published_version_id into v_version_id
  from public.parcours where slug = 'demo-ventes';

  if v_version_id is null then
    raise exception 'demo-ventes published version not found';
  end if;

  select id into v_chapter_id
  from public.chapter
  where version_id = v_version_id and slug = 'PRESENTATION';

  if v_chapter_id is null then
    raise exception 'PRESENTATION chapter not found';
  end if;

  -- Wipe existing blocks (top-level + nested children) for this chapter.
  delete from public.block where chapter_id = v_chapter_id;

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
