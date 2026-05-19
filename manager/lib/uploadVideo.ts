'use server';

import { createClient } from '@/lib/supabase/server';

const BUCKET = 'videos';
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — matches migration 0029 bucket policy
const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
]);

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Server action: uploads a video to the Supabase `videos` bucket and
 * returns its public URL. Called from `VideoEditor` (or any block editor
 * that surfaces a video upload affordance) when a file is selected via
 * the file picker.
 *
 * Requires an authenticated session (RLS enforced by migration 0029).
 *
 * Mirrors `uploadImage.ts` — kept as a parallel module for now rather
 * than a generic helper to minimise the blast radius of changes. If a
 * third upload type appears (audio, PDF…) we'll unify into a generic
 * `uploadFile.ts`.
 */
export async function uploadVideo(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Aucun fichier reçu.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Fichier vide.' };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Vidéo trop volumineuse (${(file.size / 1024 / 1024).toFixed(
        1,
      )} MB). Maximum 200 MB.`,
    };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Format non supporté (${
        file.type || 'inconnu'
      }). Utilise mp4, webm ou mov.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Tu dois être connecté pour uploader.' };
  }

  // Same path scheme as uploadImage : <user-id>/<timestamp>-<slug>.<ext>
  // — traceable by user, sortable by upload time, collision-free.
  const ext =
    (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'mp4';
  const baseName =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'video';
  const path = `${user.id}/${Date.now()}-${baseName}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return { ok: false, error: `Upload échoué : ${uploadErr.message}` };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
}
