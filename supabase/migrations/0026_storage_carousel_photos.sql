-- 0026_storage_carousel_photos.sql
--
-- Creates a public Supabase Storage bucket `carousel-photos` used by the
-- photo carousel block (drag-and-drop upload from the manager).
--
-- - Public reads: any URL https://<project>.supabase.co/storage/v1/object/public/carousel-photos/...
--   can be embedded directly in the rendered parcours.
-- - Writes: only authenticated users (the manager UI) can upload.
-- - Updates / deletes: only authenticated users.
--
-- Re-runnable: uses `on conflict do nothing` + `create policy if not exists`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'carousel-photos',
  'carousel-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Drop-and-recreate policies to make the migration idempotent across Postgres versions
-- (older PG doesn't support `create policy if not exists`).

drop policy if exists "carousel-photos: public read" on storage.objects;
create policy "carousel-photos: public read"
  on storage.objects for select
  using (bucket_id = 'carousel-photos');

drop policy if exists "carousel-photos: authenticated insert" on storage.objects;
create policy "carousel-photos: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'carousel-photos');

drop policy if exists "carousel-photos: authenticated update" on storage.objects;
create policy "carousel-photos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'carousel-photos')
  with check (bucket_id = 'carousel-photos');

drop policy if exists "carousel-photos: authenticated delete" on storage.objects;
create policy "carousel-photos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'carousel-photos');
