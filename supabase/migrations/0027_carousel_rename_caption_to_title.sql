-- 0027_carousel_rename_caption_to_title.sql
--
-- For every photoCarousel block, rename the `caption` key on each photo
-- to `title`. The new schema (shared/content-schema.ts) introduces:
--   - `title`       (was `caption`)
--   - `description` (new, multi-line — left untouched here, defaults to absent)
--
-- Idempotent: photos that no longer have `caption` (already migrated, or
-- created fresh after this migration runs) pass through unchanged.

update public.block
set payload = jsonb_set(
  payload,
  '{photos}',
  coalesce(
    (
      select jsonb_agg(
        case
          when p ? 'caption' then
            (p - 'caption') || jsonb_build_object('title', p->'caption')
          else p
        end
      )
      from jsonb_array_elements(payload->'photos') p
    ),
    '[]'::jsonb
  )
)
where type = 'photoCarousel'
  and payload ? 'photos'
  and jsonb_typeof(payload->'photos') = 'array';
