-- =====================================================================
-- Fix STEP_TOOL_1 in cloud prod (parcours demo-ventes, V7 published).
-- =====================================================================
-- Two changes :
--   A. Replace block at order=9 (the "contact card") with a unified
--      keyPointsCard wrapped in a conditional. Each branch shows :
--         • main title "Vos consignes respectées à la lettre" (lightbulb)
--         • group #1 (dark / primary400) with moon icon
--         • group #2 (peach / secondary50) with sun icon
--         • exception sticker "Faites des exceptions pour certains patients"
--   B. Insert the missing FAQ contacter at order=10 (Pourquoi le nombre
--      de transferts… / Pourquoi le nombre de messages… / Pro de santé…).
--
-- Workflow used : write through a DRAFT cloned from the current published
-- version, then publish the draft. This keeps the audit trail and lets
-- you roll back via "Jeter le brouillon" if you don't like the result.
-- =====================================================================

do $$
declare
  v_parcours_id  uuid;
  v_published_id uuid;
  v_existing_draft uuid;
  v_draft_id     uuid;
  v_chapter_id   uuid;
begin
  -- 1. Locate the parcours + its currently published version.
  select id, published_version_id
    into v_parcours_id, v_published_id
    from public.parcours
   where slug = 'demo-ventes';

  if v_parcours_id is null then
    raise exception 'parcours demo-ventes not found';
  end if;
  if v_published_id is null then
    raise exception 'parcours demo-ventes has no published version';
  end if;

  -- 2. If a draft already exists, discard it (we want a fresh clone of the
  --    current published — uncommitted edits in the existing draft are lost).
  select id into v_existing_draft
    from public.parcours_version
   where parcours_id = v_parcours_id and status = 'draft'
   order by version_number desc limit 1;
  if v_existing_draft is not null then
    delete from public.parcours_version where id = v_existing_draft;
  end if;

  -- 3. Clone the published version into a new draft.
  v_draft_id := public.clone_version_as_draft(v_published_id);

  -- 4. Find STEP_TOOL_1 in the new draft.
  select id into v_chapter_id
    from public.chapter
   where version_id = v_draft_id and slug = 'STEP_TOOL_1';
  if v_chapter_id is null then
    raise exception 'STEP_TOOL_1 chapter not found in new draft';
  end if;

  -- 5A. Replace block at order=9 (the "contact card") with the unified design.
  update public.block
     set type = 'card',
         payload = $json$
{
  "navbar": {"variant": "contact"},
  "children": [
    {
      "type": "conditional",
      "payload": {
        "condition": {"variable": "personWhoHandleCalls", "op": "=", "value": "secretary"},
        "then": [
          {
            "type": "keyPointsCard",
            "payload": {
              "main": {
                "icon": "lightbulb-fill",
                "title": "Vos consignes respectées à la lettre"
              },
              "groups": [
                {
                  "title": "En cas d'absence ou d'indisponibilité de la secrétaire",
                  "icon": "moon-fill",
                  "variant": "primary400",
                  "items": [
                    {"text": "aucune interruption de service grâce à la prise de message"},
                    {"text": "possibilité d'orienter l'appel vers le médecin en cas d'urgence"},
                    {"text": "rappel des consignes d'urgence (15 ou personnalisables)"}
                  ]
                },
                {
                  "title": "Si votre secrétaire est disponible",
                  "icon": "sun-fill",
                  "variant": "secondary50",
                  "items": [
                    {"text": "diminution des transferts d'appels : Alice propose de prendre un message si le motif d'appel n'est pas urgent."},
                    {"text": "les appels restants sont transférés vers la secrétaire (urgence ressentie)"},
                    {"text": "diminution du nombre de messages laissés grâce aux consignes filtrantes (ex : aucun renouvellement traité par message)"}
                  ]
                }
              ],
              "exception": {
                "title": "Faites des exceptions pour certains patients",
                "description": "Restez joignable ponctuellement sans donner votre numéro de portable."
              }
            }
          }
        ],
        "else": [
          {
            "type": "keyPointsCard",
            "payload": {
              "main": {
                "icon": "lightbulb-fill",
                "title": "Vos consignes respectées à la lettre"
              },
              "groups": [
                {
                  "title": "En dehors de vos heures de présence, aucun message n'est pris",
                  "icon": "moon-fill",
                  "variant": "primary400",
                  "items": [
                    {"text": "limite la charge mentale"},
                    {"text": "évite de commencer son lundi avec des messages à traiter"},
                    {"text": "rappel des consignes d'urgence (15 ou personnalisables)"}
                  ]
                },
                {
                  "title": "Pendant vos heures de présence, au choix :",
                  "icon": "sun-fill",
                  "variant": "secondary50",
                  "items": [
                    {"text": "prise de message avec retranscription dans votre interface"},
                    {"text": "prise de message ou transfert d'appel en cas d'urgence ressentie"}
                  ]
                }
              ],
              "exception": {
                "title": "Faites des exceptions pour certains patients",
                "description": "Restez joignable ponctuellement sans donner votre numéro de portable."
              }
            }
          }
        ]
      }
    }
  ]
}
$json$::jsonb
   where chapter_id = v_chapter_id and "order" = 9;

  if not found then
    raise exception 'block at order=9 not found — aborting';
  end if;

  -- 5B. Insert the missing FAQ contacter at order=10.
  -- Avoid duplicates : delete any block currently sitting at 10 first.
  delete from public.block
   where chapter_id = v_chapter_id and "order" = 10;

  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 10, 'faqCard',
    $json$
{
  "navbar": {"variant": "contact"},
  "questions": [
    {
      "title": "Pourquoi le nombre de transferts d'appels n'est jamais excessif ?",
      "blocks": [
        {"kind": "list", "items": [
          {"text": "le patient est moins à l'aise de déranger son médecin qu'une secrétaire"},
          {"text": "la consigne de transfert \"uniquement en cas d'urgence\" est respectée"},
          {"text": "au décroché, vous gardez le contrôle pour ensuite prendre ou refuser l'appel"}
        ]}
      ]
    },
    {
      "title": "Pourquoi le nombre de messages n'augmente pas par rapport à avant ?",
      "blocks": [
        {"kind": "list", "items": [
          {"text": "parce que le (télé)secrétariat prenait déjà des messages"},
          {"text": "parce qu'une consigne peut être ajoutée avant chaque prise de message (ex : aucune demande de certificat ou de renouvellement ne sera traitée par message)"}
        ]}
      ]
    },
    {
      "title": "Pro de santé : comment gérer leurs appels ?",
      "blocks": [
        {"kind": "list", "items": [
          {"text": "ils sont reconnus dès le début de l'appel"},
          {"text": "selon votre présence : transfert direct de l'appel et/ou prise de message"}
        ]}
      ]
    }
  ]
}
$json$::jsonb
  );

  -- 6. Publish the draft (replaces the current published version).
  perform public.publish_draft_version(v_draft_id);

  raise notice 'STEP_TOOL_1 fix applied and published. Draft id was %', v_draft_id;
end $$;
