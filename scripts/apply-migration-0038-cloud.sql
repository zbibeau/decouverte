-- =====================================================================
-- Apply migration 0038 (chapter_tag bridge table) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Extends the maintenance-tag system (introduced by 0036) to chapter
-- card images. A chapter has a `card_image` column (used for the
-- "section panorama" cards) that depicts a product feature just like
-- a video or photo carousel does — when that feature evolves, the
-- editor needs to find the chapters whose card_image is stale.
--
-- Implementation : a parallel `chapter_tag` bridge table that mirrors
-- `block_tag` (same shape, same cascade behaviour). The `tag` table
-- itself stays unchanged — the vocabulary is shared between blocks
-- and chapters (a tag like "fiche patient" can be applied to either).
--
-- RLS is disabled to align with the rest of the schema (see migration
-- 0036/0037 for the rationale).
--
-- Idempotent.
--
-- How to apply :
--   1. Open Supabase Studio of project cixcaysppiwxkqjvlkrd
--   2. SQL Editor → New query
--   3. Paste this file's contents
--   4. Run
-- =====================================================================

create table if not exists public.chapter_tag (
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  tag_id uuid not null references public.tag(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chapter_id, tag_id)
);

create index if not exists chapter_tag_tag_idx on public.chapter_tag (tag_id);

alter table public.chapter_tag disable row level security;
