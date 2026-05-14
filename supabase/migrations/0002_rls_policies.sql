-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Read model:
--   anon role (app cliente Solid Start) : SELECT only on published content
--   authenticated role (manager)         : full CRUD
-- =====================================================================

alter table public.parcours         enable row level security;
alter table public.parcours_version enable row level security;
alter table public.variable         enable row level security;
alter table public.chapter          enable row level security;
alter table public.block            enable row level security;

-- ---------- anon: read published content only ----------

create policy "anon reads parcours"
  on public.parcours for select
  to anon
  using (published_version_id is not null);

create policy "anon reads published versions"
  on public.parcours_version for select
  to anon
  using (status = 'published');

create policy "anon reads chapters of published versions"
  on public.chapter for select
  to anon
  using (
    exists (
      select 1 from public.parcours_version pv
      where pv.id = chapter.version_id
        and pv.status = 'published'
    )
  );

create policy "anon reads blocks of published chapters"
  on public.block for select
  to anon
  using (
    exists (
      select 1
      from public.chapter c
      join public.parcours_version pv on pv.id = c.version_id
      where c.id = block.chapter_id
        and pv.status = 'published'
    )
  );

create policy "anon reads variables"
  on public.variable for select
  to anon
  using (true);

-- ---------- authenticated: full CRUD ----------
-- Single-admin model for now; tighten later with a profiles/roles table.

create policy "auth full access parcours"
  on public.parcours for all
  to authenticated using (true) with check (true);

create policy "auth full access parcours_version"
  on public.parcours_version for all
  to authenticated using (true) with check (true);

create policy "auth full access variable"
  on public.variable for all
  to authenticated using (true) with check (true);

create policy "auth full access chapter"
  on public.chapter for all
  to authenticated using (true) with check (true);

create policy "auth full access block"
  on public.block for all
  to authenticated using (true) with check (true);
