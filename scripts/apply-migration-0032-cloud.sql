-- =====================================================================
-- Apply migration 0032 (add 'chapterTransition' to block_type_check) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- The manager's editor exposes the new "Transition de chapitre" block type
-- but the DB's CHECK constraint still rejects it (Postgres error 23514).
-- This migration drop/recreates the constraint with `chapterTransition`
-- added.
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
