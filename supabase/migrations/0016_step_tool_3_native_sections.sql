-- =====================================================================
-- 0015 — Décomposition STEP_TOOL_3 en blocs natifs
-- Remplace le composant custom HomeTool3Sections par 6 blocs
-- `toolContentSection` éditables depuis le manager.
-- Re-seed complet du chapitre (idempotent).
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
    select id from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_3'
  );
  delete from public.chapter where version_id = v_version_id and slug = 'STEP_TOOL_3';

  select coalesce(max("order"), 0) + 1 into v_order
  from public.chapter where version_id = v_version_id;

  insert into public.chapter (version_id, slug, title, "order")
  values (v_version_id, 'STEP_TOOL_3', 'Outil 3 — Communication', v_order)
  returning id into v_chapter_id;

  -- 1. Hero
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 1, 'heroTitle',
    '{"title":"Des outils de communication","sectionTitle":"La boite à outils du médecin","number":3,"illustration":"/illustrations/toolbox3-header.webp"}'::jsonb
  );

  -- 2. Vidéo pleine largeur
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 2, 'video',
    '{"vimeoSrc":"vimeo/927968390?hash=eb84ad4872"}'::jsonb
  );

  -- 3. Section Messagerie (vidéo variante par personWhoHandleCalls)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 3, 'toolContentSection',
    '{
      "name":"Messagerie",
      "anchorId":"section-message",
      "title":"Maîtrisez les échanges avec vos patients",
      "subtitle":"Sans être dérangé",
      "video":{
        "kind":"branchOnPersonWhoHandleCalls",
        "doctor":"vimeo/915668303?hash=727a6f95ba",
        "secretary":"vimeo/915668374?hash=88a8a33be2",
        "remote-secretary":"vimeo/915668441?hash=7a77fc5c28"
      },
      "advantageTitle":"Les avantages",
      "advantagePoints":[
        "finies les interprétations (retranscription avec source audio)",
        "messagerie ouverte selon vos règles",
        "réponse rapide par sms",
        "interactions rapides : (télé)consultation, envoi de document, accès fiche patient, ..."
      ]
    }'::jsonb
  );

  -- 4. Section SMS
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 4, 'toolContentSection',
    '{
      "name":"SMS",
      "anchorId":"section-sms",
      "title":"Le SMS masqué",
      "subtitle":"Plus rapide qu''un coup de fil",
      "video":{"kind":"fixed","src":"vimeo/915668571?hash=9f2732547a"},
      "advantageTitle":"Les avantages",
      "advantagePoints":[
        "répondre sans partager vos coordonnées",
        "éviter un appel sortant et gagner du temps",
        "renforcer la relation patient / médecin",
        "manifester votre soutien, sans être trop intrusif",
        "5 fois plus lu qu’un e-mail"
      ]
    }'::jsonb
  );

  -- 5. Section Imprévus (paragraphe)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 5, 'toolContentSection',
    '{
      "name":"Imprévus",
      "anchorId":"section-unforeseen",
      "title":"La gestion des imprévus",
      "subtitle":"Restez flexible !",
      "video":{"kind":"fixed","src":"https://player.vimeo.com/video/1008363164?h=add4c825d0"},
      "advantageTitle":"Les avantages",
      "advantageText":"En cas d’absence ou d’annulation de vos consultations, retards, objets trouvés... informez facilement vos patients concernés, grâce à l’envoi de SMS ou d’e-mails groupés."
    }'::jsonb
  );

  -- 6. Section Campagnes (paragraphe)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 6, 'toolContentSection',
    '{
      "name":"Campagnes",
      "anchorId":"section-campaign",
      "title":"Les campagnes",
      "subtitle":"Communiquez de façon plus large",
      "video":{"kind":"fixed","src":"https://player.vimeo.com/video/1008363110?h=e14d1a7977"},
      "advantageTitle":"Les avantages",
      "advantageText":"Campagne de prévention, déménagement, arrivée ou départ d’un associé, cabinet en grève, ... Contactez en quelques clics toute ou partie de vos patients par SMS ou mail."
    }'::jsonb
  );

  -- 7. Section Annonces (paragraphe)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 7, 'toolContentSection',
    '{
      "name":"Annonces",
      "anchorId":"section-announcement",
      "title":"Les annonces",
      "subtitle":"Évitez de vous répéter !",
      "video":{"kind":"fixed","src":"https://player.vimeo.com/video/1008363043?h=7114b3c277"},
      "advantageTitle":"Les avantages",
      "advantageText":"Paramétrez un message qui sera systématiquement lu par votre standardiste virtuelle et affiché sur votre site web pendant la durée de votre choix."
    }'::jsonb
  );

  -- 8. Section Site Internet
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 8, 'toolContentSection',
    '{
      "name":"Site Internet",
      "anchorId":"section-website",
      "title":"Votre site internet indépendant",
      "subtitle":"Votre place n’est pas sur une plateforme",
      "video":{"kind":"fixed","src":"vimeo/911373095?hash=381aa9aa75"},
      "advantageTitle":"Les avantages",
      "advantagePoints":[
        "facilitez la prise de rendez-vous de vos patients les plus connectés",
        "vous n’êtes pas sur une plateforme, vous êtes indépendant",
        "vous êtes propriétaire du nom de domaine (www.docteur-démo.fr)",
        "ajoutez des contenus, sans modération de notre part"
      ]
    }'::jsonb
  );

  -- 9. Bilan custom (inchangé)
  insert into public.block (chapter_id, "order", type, payload) values (
    v_chapter_id, 9, 'componentRef',
    '{"name":"HomeTool3_Summary","props":{}}'::jsonb
  );

end $$;
