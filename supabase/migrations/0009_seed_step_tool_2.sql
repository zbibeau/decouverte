-- =====================================================================
-- 0009 — Seed STEP_TOOL_2 (Outil 2 : agenda)
-- heroTitle + video + faqCard (4 questions natives) + componentRef HomeTool2_Summary
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
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_2'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_2';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_TOOL_2', 'Outil 2 — Agenda', v_order)
  returning id into v_chapter_id;

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{
      "title":"Un agenda moderne pensé pour la médecine générale",
      "number":2,
      "illustration":"/illustrations/toolbox2-header.webp"
    }'::jsonb
  );

  -- 2. Vidéo pleine largeur
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'video',
    '{"vimeoSrc":"vimeo/911372727?hash=60f4669c7b"}'::jsonb
  );

  -- 3. FAQ 4 questions
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'faqCard',
    '{
      "questions":[
        {
          "title":"Quand mes patients reçoivent-ils des notifications ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"confirmation / rappel de rdv : date, heure, nom du praticien, consignes"},
              {"text":"partage d’un document"},
              {"text":"lien pour accéder à une téléconsultation"},
              {"text":"demande de paiement"}
            ]}
          ]
        },
        {
          "title":"Comment sont notifiés mes patients pour les rendez-vous ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"par un SMS (5x plus lu par vos patients), plutôt qu’un e-mail"},
              {"text":"notification au nom du cabinet médical (marque “MadeForMed” invisible côté patient)"},
              {"text":"consignes personnalisables, acte par acte"}
            ]}
          ]
        },
        {
          "title":"Comment garder la maîtrise de mon organisation ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"réservation possible de créneaux non visibles par les patients"},
              {"text":"possibilité de fixer un rendez-vous à tout moment"}
            ]}
          ]
        },
        {
          "title":"Comment gérer mes quelques VAD ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"autorisation au cas par cas des demandes"},
              {"text":"conversion en 2 clics des demandes en rendez-vous"}
            ]}
          ]
        }
      ]
    }'::jsonb
  );

  -- 4. Bilan custom
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'componentRef',
    '{"name":"HomeTool2_Summary","props":{}}'::jsonb
  );

end $$;
