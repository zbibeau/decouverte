-- =====================================================================
-- 0021 — Add 'form' to block.type CHECK constraint.
-- Enables a new block type that renders a dynamic questionnaire wired to
-- the `variable` table. Payload shape is defined in
-- shared/content-schema.ts (FormBlock).
-- =====================================================================

alter table public.block
  drop constraint if exists block_type_check;

alter table public.block
  add constraint block_type_check
  check (type in (
    'text',
    'video',
    'list',
    'conditional',
    'heroTitle',
    'keyPointsCard',
    'faqCard',
    'card',
    'componentRef',
    'toolContentSection',
    'form'
  ));
