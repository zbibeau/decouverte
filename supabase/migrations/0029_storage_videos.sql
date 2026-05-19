-- 0029_storage_videos.sql
--
-- Creates a public Supabase Storage bucket `videos` used by the video block
-- (direct upload from the manager). Mirrors migration 0026 (carousel-photos)
-- but with video MIME types and a higher size cap.
--
-- - Public reads: any URL https://<project>.supabase.co/storage/v1/object/public/videos/...
--   can be embedded directly in the rendered parcours (Vidstack plays MP4/WebM natively).
-- - Writes: only authenticated users (the manager UI) can upload.
-- - Updates / deletes: only authenticated users.
--
-- Re-runnable: uses `on conflict do update` + drop/recreate policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  209715200, -- 200 MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "videos: public read" on storage.objects;
create policy "videos: public read"
  on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "videos: authenticated insert" on storage.objects;
create policy "videos: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos');

drop policy if exists "videos: authenticated update" on storage.objects;
create policy "videos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'videos')
  with check (bucket_id = 'videos');

drop policy if exists "videos: authenticated delete" on storage.objects;
create policy "videos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos');
