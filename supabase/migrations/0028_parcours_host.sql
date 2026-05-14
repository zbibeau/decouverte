-- 0028_parcours_host.sql
--
-- Adds an optional `host` column to `parcours`. Empty for V1 (we serve
-- every parcours from `/parcours/<slug>` on the single Solid client),
-- but the slot is in place so we can later route from the Host header
-- (multi-tenant subdomain or custom domain) without a schema change.
--
-- A partial unique index allows many rows with host = NULL while still
-- enforcing uniqueness when a host is actually set.

alter table public.parcours
  add column if not exists host text;

create unique index if not exists parcours_host_unique_idx
  on public.parcours (host)
  where host is not null;

comment on column public.parcours.host is
  'Optional public hostname (e.g. acme.example.com) at which this parcours is served. NULL = served only via slug-based URL. Lookup precedence in the client: host > url slug.';
