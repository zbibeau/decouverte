-- =====================================================================
-- Extend block.type CHECK to include the richer block vocabulary used
-- by the renderer (heroTitle, keyPointsCard, faqCard, card, componentRef).
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
    'componentRef'
  ));
