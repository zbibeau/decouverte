-- =====================================================================
-- Apply migration 0031 (chapter.section_label + section_order) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Adds the data model for the dynamic left-sidebar (stepper) sections.
-- =====================================================================

alter table public.chapter
  add column if not exists section_label text,
  add column if not exists section_order int;

comment on column public.chapter.section_label is
  'Optional sidebar section name this chapter belongs to. Chapters sharing the same label are grouped in the stepper. NULL = ungrouped.';
comment on column public.chapter.section_order is
  'Sort key inside the section. NULL = let `chapter.order` decide.';

create index if not exists chapter_section_idx
  on public.chapter (version_id, section_label, section_order, "order");

-- Verify schema.
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'chapter'
   and column_name in ('section_label', 'section_order');
