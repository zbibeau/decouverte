-- =====================================================================
-- 0024 — Allow anon to read non-published versions (draft / archived).
--
-- The manager iframe loads a draft via `?version=<draft_id>`. With the
-- previous RLS, the anon role was blocked on `status != 'published'` — so
-- the preview returned no chapters/blocks. We loosen the read filter so
-- anon can read ANY version it has the id for. UUIDs are not guessable, and
-- the public site (without `?version`) still resolves through
-- `parcours.published_version_id` so it only shows published content.
-- =====================================================================

-- parcours_version: read any version
drop policy if exists "anon reads published versions" on public.parcours_version;
create policy "anon reads parcours_version"
  on public.parcours_version for select
  to anon
  using (true);

-- chapter: read chapters of any version
drop policy if exists "anon reads chapters of published versions" on public.chapter;
create policy "anon reads chapter"
  on public.chapter for select
  to anon
  using (true);

-- block: read blocks of any chapter (any version)
drop policy if exists "anon reads blocks of published chapters" on public.block;
create policy "anon reads block"
  on public.block for select
  to anon
  using (true);
