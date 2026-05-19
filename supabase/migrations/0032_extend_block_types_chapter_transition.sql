-- =====================================================================
-- 0032 — Add 'chapterTransition' to block.type CHECK constraint.
-- New visual block that renders the chapters of the same sidebar section
-- as a grid of cards (active card highlighted, others act as nav links).
-- Payload shape defined in shared/content-schema.ts (ChapterTransitionBlock).
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
    'form',
    'photoCarousel',
    'chapterTransition'
  ));
