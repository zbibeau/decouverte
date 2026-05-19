-- =====================================================================
-- Apply migration 0030 (parcours.navbar_variants JSONB) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Adds a per-parcours navbar variants registry. Backfills demo-ventes
-- with the historical 'appointment' + 'contact' variants so the live
-- rendering is unchanged at first publish.
-- =====================================================================

alter table public.parcours
  add column if not exists navbar_variants jsonb not null default '[]'::jsonb;

comment on column public.parcours.navbar_variants is
  'List of navbar variants this parcours exposes. Each block stores a `navbar.variant` key referencing one of these. Schema: [{key, title, icon?, color?, percent?}].';

update public.parcours
   set navbar_variants = '[
     {"key":"appointment","title":"Les demandes de rendez-vous","icon":"team-fill","color":"#a78bfa","percent":60},
     {"key":"contact","title":"Les demandes de contact","icon":"team-fill","color":"#a78bfa","percent":40}
   ]'::jsonb
 where slug = 'demo-ventes'
   and (navbar_variants is null or navbar_variants = '[]'::jsonb);

-- Verify.
select slug, name, jsonb_pretty(navbar_variants) as variants
  from public.parcours order by slug;
