-- 0030_parcours_navbar_variants.sql
--
-- Adds a per-parcours navbar variants registry. Today the "navbar pilote Tool 1"
-- displayed at the top of certain blocks (video / card / faqCard /
-- keyPointsCard) is rendered from a hardcoded enum ('appointment' / 'contact'
-- in `ChapterRenderer.tsx`). Each parcours can now define its own list of
-- variants — title + icon + accent color — keyed by a slug-like string. Block
-- editors offer this list as a dropdown ; the renderer resolves the key at
-- display time.
--
-- Shape stored in JSONB :
--   [
--     { "key": "appointment", "title": "Les demandes de rendez-vous",
--       "icon": "team-fill", "color": "#a78bfa", "percent": 60 },
--     ...
--   ]
--
-- Fields :
--   key      : stable identifier used by `payload.navbar.variant`
--   title    : displayed label
--   icon     : optional icon name (matches the IconPicker library)
--   color    : optional hex accent (CSS color)
--   percent  : optional progress ring percentage (legacy demo-ventes uses
--              60% for appointment and 40% for contact ; kept as opt-in)
--
-- Legacy `appointment` + `contact` variants are seeded on demo-ventes for
-- backward compatibility with all existing blocks.

alter table public.parcours
  add column if not exists navbar_variants jsonb not null default '[]'::jsonb;

comment on column public.parcours.navbar_variants is
  'List of navbar variants this parcours exposes. Each block stores a `navbar.variant` key referencing one of these. Schema: [{key, title, icon?, color?, percent?}].';

-- Seed demo-ventes with the historical appointment + contact variants so
-- nothing visible changes at first publish.
update public.parcours
   set navbar_variants = '[
     {"key":"appointment","title":"Les demandes de rendez-vous","icon":"team-fill","color":"#a78bfa","percent":60},
     {"key":"contact","title":"Les demandes de contact","icon":"team-fill","color":"#a78bfa","percent":40}
   ]'::jsonb
 where slug = 'demo-ventes'
   and (navbar_variants is null or navbar_variants = '[]'::jsonb);
