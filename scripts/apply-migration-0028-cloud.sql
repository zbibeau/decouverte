-- =====================================================================
-- Apply migration 0028 (parcours.host column) on Supabase CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Mirrors `supabase/migrations/0028_parcours_host.sql`. Idempotent — uses
-- `IF NOT EXISTS` everywhere so it's safe to run twice. After running,
-- PostgREST reloads its schema cache automatically within a few seconds.
--
-- How to apply :
--   1. Open Supabase Studio of project cixcaysppiwxkqjvlkrd
--   2. SQL Editor → New query
--   3. Paste this file's contents
--   4. Run
-- =====================================================================

alter table public.parcours
  add column if not exists host text;

create unique index if not exists parcours_host_unique_idx
  on public.parcours (host)
  where host is not null;

comment on column public.parcours.host is
  'Optional public hostname (e.g. acme.example.com) at which this parcours is served. NULL = served only via slug-based URL. Lookup precedence in the client: host > url slug.';

-- Sanity check : list parcours rows with their host status.
select slug, name, host from public.parcours order by slug;
