-- 0031_chapter_section.sql
--
-- Adds two columns to `chapter` so each chapter can declare which section
-- it belongs to in the left sidebar (the stepper).
--
--   section_label  : human-readable section title ("CONSTAT", "LA BOITE À
--                    OUTILS DU MÉDECIN", "Onboarding", etc.). NULL = the
--                    chapter is rendered without a section header.
--   section_order  : sort key within a section. Defaults to NULL ; when
--                    two chapters share the same `section_label` they are
--                    grouped and ordered by `section_order` (NULLS LAST),
--                    then by the chapter's own `order` as tiebreaker.
--
-- The front-end stepper builds the section list dynamically from these
-- columns. The legacy `demo-ventes` parcours can keep its hardcoded
-- HOME_STEPS_LAYOUT_VALUE fallback when no `section_label` is set on any
-- of its chapters.

alter table public.chapter
  add column if not exists section_label text,
  add column if not exists section_order int;

comment on column public.chapter.section_label is
  'Optional sidebar section name this chapter belongs to. Chapters sharing the same label are grouped in the stepper. NULL = ungrouped (rendered as a flat list).';
comment on column public.chapter.section_order is
  'Sort key inside the section. NULL = let `chapter.order` decide.';

-- Helpful index for the sidebar query (group by section_label, order by
-- section_order then order).
create index if not exists chapter_section_idx
  on public.chapter (version_id, section_label, section_order, "order");
