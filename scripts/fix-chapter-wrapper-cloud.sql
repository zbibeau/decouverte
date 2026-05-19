-- =====================================================================
-- One-shot fix on cloud : the default chapter wrapper used `w-dvw` which
-- forces the chapter content to span the FULL viewport width, including
-- the area covered by the StepperLayout sidebar (~280 px). Result : the
-- chapter overflows the visible area, creating a horizontal scrollbar.
-- This script replaces `w-dvw` with `w-full` in every chapter's
-- wrapper_class so the content fits the available space.
-- =====================================================================

update public.chapter
   set wrapper_class = replace(wrapper_class, 'w-dvw', 'w-full')
 where wrapper_class is not null
   and wrapper_class like '%w-dvw%';

-- Verify.
select slug, title, wrapper_class
  from public.chapter
 where wrapper_class is not null
 order by version_id, "order";
