-- =====================================================================
-- 0019 — PRESENTATION : keyPointsCard "Bon à savoir" en mode inline,
-- sans le header "Les points clés", pour resserrer le layout
-- (vidéo → carte → CTA "C'est parti" sur un seul écran).
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

  update public.block
  set payload = '{
    "inline": true,
    "hideHeader": true,
    "contentClass":"m-auto w-full max-w-[600px] px-1 md:px-0",
    "main":{
      "icon":"home-fill",
      "title":"Bon à savoir",
      "description":"La durée de cette démo est estimée à <span class=\"font-medium\">30 minutes</span> mais vous avez la possibilité de quitter et reprendre à tout moment votre découverte en repassant par le lien que vous avez reçu par email."
    }
  }'::jsonb
  where chapter_id = v_chapter_id
    and type = 'keyPointsCard';
end $$;
