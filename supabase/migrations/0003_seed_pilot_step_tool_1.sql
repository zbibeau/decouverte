-- =====================================================================
-- Seed: pilot parcours "demo-ventes" with chapter STEP_TOOL_1
-- =====================================================================
-- Mirrors the hardcoded HomeTool1.tsx (textes + vidéos Vimeo + branchings
-- sur personWhoHandleCalls et isInGroup) into the new content schema.
-- Idempotent: can be re-run safely.
-- =====================================================================

-- ---------------------------------------------------------------------
-- This seed inserts blocks of type `heroTitle`, `keyPointsCard`, `card`,
-- `faqCard`, `componentRef` — types only enabled in migration 0004. When
-- migrations run strictly in order (local Supabase CLI), 0003 fires
-- before 0004 and the inserts hit the original check constraint from
-- 0001 (text/video/list/conditional only). We pre-extend the constraint
-- here so the seed can run; 0004 will re-drop and re-create it with the
-- same body.
-- ---------------------------------------------------------------------
alter table public.block
  drop constraint if exists block_type_check;
alter table public.block
  add constraint block_type_check
  check (type in (
    'text',
    'video',
    'list',
    'conditional',
    'heroTitle',
    'keyPointsCard',
    'faqCard',
    'card',
    'componentRef'
  ));

do $$
declare
  v_parcours_id uuid;
  v_version_id  uuid;
  v_chapter_id  uuid;
begin
  -- ---------- parcours ----------
  insert into public.parcours (slug, name)
  values ('demo-ventes', 'Découverte autonome — démo ventes')
  on conflict (slug) do update set name = excluded.name
  returning id into v_parcours_id;

  if v_parcours_id is null then
    select id into v_parcours_id from public.parcours where slug = 'demo-ventes';
  end if;

  -- ---------- variables ----------
  insert into public.variable (parcours_id, key, label, type, options) values
    (v_parcours_id, 'isDoctor',             'Est médecin',                    'boolean', '[]'::jsonb),
    (v_parcours_id, 'isDoingVAD',           'Fait des visites à domicile',    'boolean', '[]'::jsonb),
    (v_parcours_id, 'isInGroup',            'Cabinet de groupe',              'boolean', '[]'::jsonb),
    (v_parcours_id, 'acceptNewPatient',     'Accepte les nouveaux patients',  'boolean', '[]'::jsonb),
    (v_parcours_id, 'personWhoHandleCalls', 'Qui répond au téléphone',        'enum',
      '[{"value":"doctor","label":"Le médecin"},{"value":"secretary","label":"Une secrétaire"},{"value":"remote-secretary","label":"Un télésecrétariat"}]'::jsonb)
  on conflict (parcours_id, key) do update set
    label   = excluded.label,
    type    = excluded.type,
    options = excluded.options;

  -- ---------- version (draft v1) ----------
  insert into public.parcours_version (parcours_id, version_number, status)
  values (v_parcours_id, 1, 'published')
  on conflict (parcours_id, version_number) do update set status = 'published'
  returning id into v_version_id;

  if v_version_id is null then
    select id into v_version_id
    from public.parcours_version
    where parcours_id = v_parcours_id and version_number = 1;
  end if;

  update public.parcours
  set published_version_id = v_version_id
  where id = v_parcours_id;

  -- ---------- chapter STEP_TOOL_1 ----------
  -- Wipe-and-rewrite to keep this script idempotent.
  delete from public.block where chapter_id in (
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_1'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_1';

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_TOOL_1', 'Filtrer les demandes', 1)
  returning id into v_chapter_id;

  -- ---------- blocks (top-level only — children inline in payload) ----------

  -- 1. Hero title
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{"title":"Filtrez toutes les demandes venant d''internet et du téléphone","number":1,"illustration":"/illustrations/toolbox1-header.webp"}'::jsonb
  );

  -- 2. Intro video (appointment)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'video',
    '{"vimeoSrc":"vimeo/907882115?hash=2d4027711d","contentId":"appointment-section","navbar":{"variant":"appointment"}}'::jsonb
  );

  -- 3. Key points: rules + exceptions
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'keyPointsCard',
    '{
      "navbar":{"variant":"appointment"},
      "main":{
        "icon":"team-fill",
        "title":"Définissez vos règles générales",
        "description":"Réglez en toute autonomie vos horaires et vos actes :<br/><i>durée, noms et consignes, ouverture aux nouveaux patients (ou non), etc.</i>"
      },
      "exception":{
        "icon":"user-fill",
        "title":"Faites des exceptions pour certains patients",
        "items":[
          {"text":"pour un patient polypathologique, ouvrez-lui un acte de 30 min"},
          {"text":"en cas d''abus, retirez l''accès à la consultation d''urgence "},
          {"text":"pour un patient indésirable, bloquez-lui la prise de rdv"}
        ]
      }
    }'::jsonb
  );

  -- 4. Conditional video on personWhoHandleCalls
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'conditional',
    '{
      "condition":{"variable":"personWhoHandleCalls","op":"=","value":"secretary"},
      "then":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/911368892?hash=b932549495","navbar":{"variant":"appointment"}}}
      ],
      "else":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/911368493?hash=4fb90c43a2","navbar":{"variant":"appointment"}}}
      ]
    }'::jsonb
  );

  -- 5. Key points: adapt
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 5, 'keyPointsCard',
    '{
      "navbar":{"variant":"appointment"},
      "main":{
        "icon":"team-fill",
        "title":"Une prise de rendez-vous adaptée à tous vos patients :",
        "items":[
          {"text":"par internet, sur votre site Internet dédié"},
          {"text":"par téléphone de façon automatisée 24/7"}
        ]
      },
      "exception":{
        "icon":"user-fill",
        "title":"Faites des exceptions pour certains patients",
        "description":"Transférez vos patients les plus à la marge vers votre (télé)secrétaire, sans appui touche."
      }
    }'::jsonb
  );

  -- 6. Alice FAQ
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 6, 'faqCard',
    '{
      "navbar":{"variant":"appointment"},
      "questions":[
        {
          "title":"Comment Alice identifie le patient ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"si le patient a déjà une fiche avec un numéro de portable ou de fixe renseigné, il sera reconnu automatiquement grâce à son numéro"}
            ]},
            {"kind":"callout","html":"si plusieurs patients ont le même numéro de téléphone associé (ex : la fiche d''un enfant a le même numéro que la fiche du parent), Alice demandera de préciser pour qui l''appelant souhaite prendre rendez-vous."},
            {"kind":"list","items":[
              {"text":"si le patient n''a aucune fiche, elle sera créée automatiquement lors de sa première demande de rendez-vous"}
            ]},
            {"kind":"callout","html":"un import de votre base patient est possible (gratuit)"}
          ]
        },
        {
          "title":"Et pour les patients qui appellent depuis un téléphone fixe ?",
          "blocks":[
            {"kind":"text","html":"Ils pourront aussi prendre RDV avec Alice :"},
            {"kind":"list","items":[
              {"text":"si un email ou un portable est aussi attaché à leur fiche, ils recevront la confirmation du rendez-vous par sms ou e-mail"},
              {"text":"s''ils n''ont qu''un téléphone fixe renseigné, aucune notification ne pourra être envoyée."}
            ]}
          ]
        },
        {
          "title":"Comment Alice propose les prochains créneaux disponibles ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"pour les patients âgés, elle privilégie les créneaux en pleine journée"},
              {"text":"pour un patient en âge d''être actif, elle proposera plutôt ceux en début ou en fin de journée"}
            ]}
          ]
        },
        {
          "title":"Et si les 3 propositions de rendez-vous ne conviennent pas ?",
          "blocks":[
            {"kind":"text","html":"Si le premier créneau proposé ne convient pas, le patient pourra demander les créneaux disponibles pour la date de son choix."},
            {"kind":"audio","url":"/mp3/hometool-1-2-example-rdv.mp3"}
          ]
        },
        {
          "title":"Comment gérer le SNP ?",
          "blocks":[
            {"kind":"text","html":"Lorsqu''il n''y a plus de place et selon votre présence, Alice pourra :"},
            {"kind":"conditional","condition":{"variable":"isInGroup","op":"=","value":true},
              "then":[{"kind":"list","items":[{"text":"orienter le patient vers un autre médecin du cabinet"}]}],
              "else":[]
            },
            {"kind":"list","items":[
              {"text":"rappeler les consignes d''urgence et/ou de régulation"},
              {"text":"vous transférer l''appel"},
              {"text":"prendre un message, retranscrit dans votre interface"}
            ]}
          ]
        }
      ]
    }'::jsonb
  );

  -- 7. Conditional video — contact section
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 7, 'conditional',
    '{
      "condition":{"variable":"personWhoHandleCalls","op":"=","value":"secretary"},
      "then":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/912892586?hash=117005f42b","contentId":"contact-section","navbar":{"variant":"contact"}}}
      ],
      "else":[
        {"type":"video","payload":{"vimeoSrc":"vimeo/912891919?hash=54efed44af","contentId":"contact-section","navbar":{"variant":"contact"}}}
      ]
    }'::jsonb
  );

  -- 8. Contact rules card (conditional title/items inside)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 8, 'card',
    '{
      "navbar":{"variant":"contact"},
      "children":[
        {"type":"conditional","payload":{
          "condition":{"variable":"personWhoHandleCalls","op":"=","value":"secretary"},
          "then":[
            {"type":"keyPointsCard","payload":{
              "main":{"icon":"team-fill","title":"En cas d''absence ou d''indisponibilité de la secrétaire",
                "items":[
                  {"text":"aucune interruption de service grâce à la prise de message"},
                  {"text":"possibilité d''orienter l''appel vers le médecin en cas d''urgence"},
                  {"text":"rappel des consignes d''urgence (15 ou personnalisables)"}
                ]
              }
            }}
          ],
          "else":[
            {"type":"keyPointsCard","payload":{
              "main":{"icon":"team-fill","title":"En dehors de vos heures de présence, aucun message n''est pris.",
                "items":[
                  {"text":"limite la charge mentale"},
                  {"text":"évite de commencer son lundi avec des messages à traiter"},
                  {"text":"rappel des consignes d''urgence (15 ou personnalisables)"}
                ]
              },
              "exception":{"title":"Faites des exceptions pour certains patients",
                "description":"Restez joignable ponctuellement sans donner votre numéro de portable."}
            }}
          ]
        }},
        {"type":"conditional","payload":{
          "condition":{"variable":"personWhoHandleCalls","op":"=","value":"secretary"},
          "then":[
            {"type":"keyPointsCard","payload":{
              "main":{"icon":"team-fill","title":"Si votre secrétaire est disponible",
                "items":[
                  {"text":"diminution des transferts d''appels : Alice propose de prendre un message si le motif d''appel n''est pas urgent."},
                  {"text":"les appels restants sont transférés vers la secrétaire (urgence ressentie)"},
                  {"text":"diminution du nombre de messages laissés grâce aux consignes filtrantes (ex : aucun renouvellement traité par message)"}
                ]
              }
            }}
          ],
          "else":[
            {"type":"keyPointsCard","payload":{
              "main":{"icon":"team-fill","title":"Pendant vos heures de présence, au choix :",
                "items":[
                  {"text":"prise de message avec retranscription dans votre interface"},
                  {"text":"prise de message ou transfert d''appel en cas d''urgence ressentie"}
                ]
              }
            }}
          ]
        }}
      ]
    }'::jsonb
  );

  -- 9. Contact FAQ (with conditional question on telesec)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 9, 'faqCard',
    '{
      "navbar":{"variant":"contact"},
      "questions":[
        {
          "title":"Pourquoi le nombre de transferts d''appels n''est jamais excessif ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"le patient est moins à l''aise de déranger son médecin qu''une secrétaire"},
              {"text":"la consigne de transfert \"uniquement en cas d''urgence\" est respectée"},
              {"text":"au décroché, vous gardez le contrôle pour ensuite prendre ou refuser l''appel"}
            ]}
          ]
        },
        {
          "title":"Pourquoi le nombre de messages n''augmente pas par rapport à avant ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"parce que le (télé)secrétariat prenait déjà des messages"},
              {"text":"parce qu''une consigne peut être ajoutée avant chaque prise de message (ex : aucune demande de certificat ou de renouvellement ne sera traitée par message)"}
            ]}
          ]
        },
        {
          "title":"Pro de santé : comment gérer leurs appels ?",
          "blocks":[
            {"kind":"list","items":[
              {"text":"ils sont reconnus dès le début de l''appel"},
              {"text":"selon votre présence : transfert direct de l''appel et/ou prise de message"}
            ]}
          ]
        }
      ]
    }'::jsonb
  );

  -- 10. Summary (escape hatch — keep existing component)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 10, 'componentRef',
    '{"name":"HomeTool1_Summary"}'::jsonb
  );

end $$;
