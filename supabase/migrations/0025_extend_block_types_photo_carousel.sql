-- =====================================================================
-- 0025 — Add 'photoCarousel' to block.type CHECK constraint.
-- Full-width immersive photo carousel block. Payload shape defined in
-- shared/content-schema.ts (PhotoCarouselBlock).
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
    'photoCarousel'
  ));
