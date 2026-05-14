-- =====================================================================
-- Découverte Autonome — Content Schema (Phase 0)
-- =====================================================================
-- 5 tables:
--   parcours         : a discovery journey (e.g. "demo-ventes")
--   parcours_version : draft/published snapshots of a parcours
--   variable         : branching variables defined per parcours
--   chapter          : ordered chapters inside a version
--   block            : ordered content blocks inside a chapter
--                      (text / video / list / conditional, tree via parent_block_id)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- parcours ----------
create table public.parcours (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  published_version_id uuid, -- FK added after parcours_version exists
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------- parcours_version ----------
create table public.parcours_version (
  id             uuid primary key default gen_random_uuid(),
  parcours_id    uuid not null references public.parcours(id) on delete cascade,
  version_number int  not null,
  status         text not null check (status in ('draft', 'published', 'archived')),
  created_at     timestamptz not null default now(),
  unique (parcours_id, version_number)
);

alter table public.parcours
  add constraint parcours_published_version_fk
  foreign key (published_version_id)
  references public.parcours_version(id)
  on delete set null;

create index parcours_version_parcours_idx on public.parcours_version(parcours_id);

-- ---------- variable ----------
-- Branching variables (e.g. personWhoHandleCalls, acceptNewPatient).
-- type: 'boolean' | 'enum' | 'string' | 'number'
-- options: for enums, a JSON array of { value, label }
create table public.variable (
  id          uuid primary key default gen_random_uuid(),
  parcours_id uuid not null references public.parcours(id) on delete cascade,
  key         text not null,
  label       text not null,
  type        text not null check (type in ('boolean', 'enum', 'string', 'number')),
  options     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (parcours_id, key)
);

create index variable_parcours_idx on public.variable(parcours_id);

-- ---------- chapter ----------
-- branching_next: optional jsonb describing conditional navigation, e.g.
--   [{ "condition": { "variable": "isDoctor", "op": "=", "value": true },
--      "nextChapterId": "<uuid>" }]
create table public.chapter (
  id              uuid primary key default gen_random_uuid(),
  version_id      uuid not null references public.parcours_version(id) on delete cascade,
  slug            text not null,
  title           text not null,
  "order"         int  not null,
  next_chapter_id uuid references public.chapter(id) on delete set null,
  branching_next  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (version_id, slug),
  unique (version_id, "order") deferrable initially deferred
);

create index chapter_version_idx on public.chapter(version_id);

-- ---------- block ----------
-- Tree of blocks inside a chapter.
-- type: 'text' | 'video' | 'list' | 'conditional'
-- payload shape depends on type:
--   text        : { "markdown": "..." }
--   video       : { "vimeoHash": "...", "title": "...", "caption": "..." }
--   list        : { "items": ["...", "..."] }
--   conditional : { "condition": { "variable": "...", "op": "=", "value": ... },
--                   "branch": "then" | "else" }   -- children live as rows
-- For conditional blocks, child blocks use parent_block_id and carry
-- payload.branch to mark which side of the condition they belong to.
create table public.block (
  id              uuid primary key default gen_random_uuid(),
  chapter_id      uuid not null references public.chapter(id) on delete cascade,
  parent_block_id uuid references public.block(id) on delete cascade,
  "order"         int  not null,
  type            text not null check (type in ('text', 'video', 'list', 'conditional')),
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index block_chapter_idx on public.block(chapter_id);
create index block_parent_idx  on public.block(parent_block_id);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger parcours_set_updated_at
  before update on public.parcours
  for each row execute function public.set_updated_at();

create trigger chapter_set_updated_at
  before update on public.chapter
  for each row execute function public.set_updated_at();

create trigger block_set_updated_at
  before update on public.block
  for each row execute function public.set_updated_at();
