-- 0035_parcours_theme_color.sql
--
-- Adds a pastel theme color per parcours, used by the manager UI to tint
-- the header so the author never confuses which project they're editing.
--
-- - Value is a hex color string (`#RRGGBB`) chosen at parcours-creation
--   time from a curated pastel palette (`manager/lib/pastelColors.ts`).
-- - NULL is allowed for legacy rows ; the manager falls back to a neutral
--   gray when absent. Future creates always set a non-null color.
--
-- Re-runnable.

alter table public.parcours
  add column if not exists theme_color text;
