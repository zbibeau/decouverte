-- =====================================================================
-- Apply migration 0036 (maintenance tags) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Introduces a proper first-class tag system to replace the
-- short-lived `block.payload.tags` JSONB scheme (migration 0035 +
-- TagsField v1). Two new tables :
--
--   * `tag` — one row per unique maintenance tag, with an editable
--     label + a palette color key. The slug is the canonical
--     lowercase form ; the label is the human-facing form which can
--     be re-cased ("fiche patient" → "Fiche patient") without losing
--     the underlying identity.
--
--   * `block_tag` — pure many-to-many bridge between blocks and tags,
--     with ON DELETE CASCADE so removing a block or a tag cleans up
--     the associations automatically.
--
-- Why a real table rather than a JSONB array ?
--   * Renaming a tag = UPDATE 1 row → propagates everywhere
--   * Coloring a tag = 1 column, no per-block touch
--   * Tagging a block does NOT touch `block.payload`, which means it
--     does NOT enter the parcours draft/publish cycle (the editor's
--     "Publier" button concerns content versioning ; tags are a
--     maintenance index, orthogonal to publication)
--   * Cross-parcours vocabulary becomes a trivial `SELECT * FROM tag`
--
-- Idempotent.
--
-- How to apply :
--   1. Open Supabase Studio of project cixcaysppiwxkqjvlkrd
--   2. SQL Editor → New query
--   3. Paste this file's contents
--   4. Run
-- =====================================================================

create table if not exists public.tag (
  id uuid primary key default gen_random_uuid(),
  -- canonical lowercase form ; lookups/dedup happen on this. Unique
  -- so the autocomplete vocabulary never offers two variants of the
  -- same concept.
  slug text not null unique,
  -- human-facing form ; freely editable in the library admin
  -- (rename) without breaking existing block_tag rows.
  label text not null,
  -- palette key from manager/lib/tags.ts (one of: amber, rose, sky,
  -- emerald, violet, slate, orange, gray). Kept as text (not enum)
  -- so the palette can grow without a migration.
  color text not null default 'amber',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tag_slug_idx on public.tag (slug);
create index if not exists tag_label_idx on public.tag (label);

create table if not exists public.block_tag (
  block_id uuid not null references public.block(id) on delete cascade,
  tag_id uuid not null references public.tag(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (block_id, tag_id)
);

create index if not exists block_tag_tag_idx on public.block_tag (tag_id);

-- Keep updated_at in sync on tag edits.
create or replace function public.touch_tag_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tag_touch on public.tag;
create trigger trg_tag_touch
  before update on public.tag
  for each row
  execute function public.touch_tag_updated_at();

-- Align RLS with the rest of the schema. Supabase auto-enables RLS
-- on freshly-created tables, which rejects every INSERT until a
-- policy is added. The business tables in this project (`block`,
-- `chapter`, `parcours`, …) run WITHOUT RLS — the manager talks to
-- Supabase via admin keys and there's no per-row gating here. We
-- match that convention so the editor can write tags out of the box.
-- (Also fixed by separate migration 0037 if 0036 was applied first.)
alter table public.tag disable row level security;
alter table public.block_tag disable row level security;

-- =====================================================================
-- Note : we do NOT delete `block.payload.tags` for existing blocks.
-- The TagsField was just shipped — no production data has flowed
-- through that field yet (confirmed by Vivien). If you DO find legacy
-- payloads with a tags array, ignore them : the new TagsField reads
-- from block_tag, not payload, so they're effectively dead.
-- =====================================================================
