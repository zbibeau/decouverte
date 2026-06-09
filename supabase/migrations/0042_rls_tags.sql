-- =====================================================================
-- 0042_rls_tags.sql
-- =====================================================================
-- Active Row Level Security sur les 3 tables du système de tags de
-- maintenance (`tag`, `block_tag`, `chapter_tag`). Sans ça, elles
-- étaient exposées via PostgREST avec la clé anon — n'importe quel
-- visiteur du front public pouvait lire ET ÉCRIRE le vocabulaire de
-- tags du manager. Le Supabase Security Advisor remontait ces 3
-- alertes « RLS Disabled in Public ».
--
-- Modèle d'accès aligné sur `0002_rls_policies.sql` :
--   - anon (front Solid public)  : AUCUN accès. Les tags sont purement
--                                    internes au manager, le front n'en
--                                    a pas besoin pour rendre un parcours.
--                                    RLS activée + aucune policy `to anon`
--                                    = tout est interdit par défaut.
--   - authenticated (manager)     : full CRUD (single-admin actuel).
--
-- Ces tables ont été créées initialement par des migrations 0036/0038
-- appliquées directement via le SQL Editor du dashboard Supabase, sans
-- être versionnées dans ce repo. Cette migration rectifie l'oubli.
-- Si tu re-crées la DB from scratch un jour, il faudra reconstituer
-- les CREATE TABLE manquants avant cette migration.
-- =====================================================================

alter table public.tag          enable row level security;
alter table public.block_tag    enable row level security;
alter table public.chapter_tag  enable row level security;

-- ---------- authenticated: full CRUD ----------

create policy "auth full access tag"
  on public.tag for all
  to authenticated using (true) with check (true);

create policy "auth full access block_tag"
  on public.block_tag for all
  to authenticated using (true) with check (true);

create policy "auth full access chapter_tag"
  on public.chapter_tag for all
  to authenticated using (true) with check (true);

-- Note : pas de policy `to anon` volontaire. Le front public n'a pas
-- besoin du vocabulaire tags ; toute lecture / écriture anon sera
-- bloquée par RLS, c'est exactement le comportement attendu.
