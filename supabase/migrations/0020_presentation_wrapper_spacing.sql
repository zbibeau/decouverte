-- Restore vertical spacing between PRESENTATION chapter blocks.
-- Migration 0019 switched the keyPointsCard to inline mode, removing the
-- AfterHeroContainer wrapper that previously provided spacing. Add space-y-8
-- to the chapter wrapper so the video, "Bon à savoir" card, and "C'est parti"
-- button are visually separated again.

update public.chapter
   set wrapper_class = 'h-dvh w-dvw overflow-auto bg-secondary-50 space-y-8'
 where slug = 'PRESENTATION';
