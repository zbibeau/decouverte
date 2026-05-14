-- =====================================================================
-- 0014 — Dynamic Hubspot mapping on variables
-- Each variable can optionally declare how it maps to a Hubspot property:
--   {
--     "property": "ma_propriete_hs",
--     "valueMap": { "small": "Petit", "large": "Grand" }   -- optional
--   }
-- The Solid app merges these dynamic mappings with the legacy hardcoded
-- DemoObjectToHubspotObject so new variables added in the manager are
-- automatically pushed to Hubspot without code changes.
-- =====================================================================

alter table public.variable
  add column if not exists hubspot_mapping jsonb;

comment on column public.variable.hubspot_mapping is
  'Optional dynamic Hubspot mapping: { property: string, valueMap?: Record<string,string> }';
