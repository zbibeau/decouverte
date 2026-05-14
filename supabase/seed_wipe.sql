-- =====================================================================
-- Wipe content tables before loading the cloud dump (`seed.sql`).
-- =====================================================================
-- Runs first in the [db.seed] sequence. The migrations have already
-- inserted their own demo seed rows (0003/0005/0006/…); we need to clear
-- those before loading the production dump or every INSERT will hit
-- `parcours_slug_key` / `chapter_version_id_slug_key` etc.
--
-- TRUNCATE … CASCADE walks the FK chain:
--   parcours
--     ↳ parcours_version
--          ↳ chapter
--               ↳ block
--     ↳ variable
-- =====================================================================

truncate public.parcours cascade;
