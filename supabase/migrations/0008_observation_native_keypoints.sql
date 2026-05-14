-- =====================================================================
-- 0008 — Remplace le custom ObservationKeyPointsCard par un keyPointsCard
-- natif, en utilisant le nouveau schema `main.extraDescriptions` + `groups`
-- avec items conditionnels sur `acceptNewPatient`.
-- Re-seed complet du chapitre STEP_OBSERVATION pour rester idempotent.
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
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_OBSERVATION'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_OBSERVATION';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_OBSERVATION', 'Constat — le téléphone', v_order)
  returning id into v_chapter_id;

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{
      "title":"Le téléphone reste un problème",
      "sectionTitle":"Constat",
      "illustration":"/illustrations/observation-illu.webp"
    }'::jsonb
  );

  -- 2. Conditional video (acceptNewPatient == false → variant A)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'conditional',
    '{
      "condition":{"variable":"acceptNewPatient","op":"=","value":false},
      "then":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/907879935?hash=ecb2787474"}}
      ],
      "else":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/907879916?hash=049ef84dd0"}}
      ]
    }'::jsonb
  );

  -- 3. Native keyPointsCard with extraDescriptions + two groups
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'keyPointsCard',
    '{
      "main":{
        "title":"",
        "extraDescriptions":[
          "40% des appels sont des “demandes de contact”.",
          "60% des appels concernent les rendez-vous.",
          "Tout le monde n’est pas capable de prendre rendez-vous en ligne."
        ]
      },
      "groups":[
        {
          "title":"Les solutions existantes créent de nouveaux problèmes :",
          "variant":"secondary50",
          "items":[
            {"text":"consignes non respectées"},
            {"text":"patients mécontents du temps d’attente, notamment les lundis matin"},
            {
              "conditional":{"variable":"acceptNewPatient","op":"=","value":false},
              "then":{"text":"1€ par appel juste pour dire non"},
              "else":{"text":"beaucoup de messages pour rien"}
            },
            {
              "conditional":{"variable":"acceptNewPatient","op":"=","value":false},
              "then":{"text":"des secrétaires usées et une ligne saturée par des demandes de nouveaux patients"},
              "else":{"text":"l’impression de payer cher par rapport à la qualité de service fournie"}
            }
          ]
        },
        {
          "title":"Les solutions MadeForMed traitent toutes les demandes",
          "variant":"primary50",
          "items":[
            {"text":"par internet ou téléphone"},
            {"text":"pour un rendez-vous ou pour échanger avec le cabinet"}
          ]
        }
      ]
    }'::jsonb
  );

  -- 4. Toolbox stepper (currentStep=1)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'componentRef',
    '{"name":"DoctorToolboxStepsRef","props":{"currentStep":1}}'::jsonb
  );

end $$;
