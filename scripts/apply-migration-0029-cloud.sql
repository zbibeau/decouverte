-- =====================================================================
-- Apply migration 0029 (Supabase Storage bucket `videos`) on CLOUD.
-- =====================================================================
-- Project ref : cixcaysppiwxkqjvlkrd (decouverte.madeformed.com)
--
-- Mirrors `supabase/migrations/0029_storage_videos.sql`. Idempotent.
-- After running, the manager's upload server action can store videos
-- in the public `videos` bucket (200 MB max, mp4/webm/mov only).
--
-- How to apply :
--   1. Open Supabase Studio of project cixcaysppiwxkqjvlkrd
--   2. SQL Editor → New query
--   3. Paste this file's contents
--   4. Run
-- =====================================================================

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

-- Sanity check : confirm bucket exists.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets where id = 'videos';
