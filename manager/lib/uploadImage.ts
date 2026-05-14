'use server';

import { createClient } from '@/lib/supabase/server';

const BUCKET = 'carousel-photos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches migration 0026 bucket policy
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Server action: uploads an image to the Supabase `carousel-photos` bucket
 * and returns its public URL. Called from `PhotoCarouselEditor` when a file
 * is dropped or selected via the file picker.
 *
 * Requires an authenticated session (RLS enforced by migration 0026).
 */
export async function uploadCarouselPhoto(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Aucun fichier reçu.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Fichier vide.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB.` };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: `Format non supporté (${file.type || 'inconnu'}). Utilise jpg, png, webp ou gif.` };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Tu dois être connecté pour uploader.' };
  }

  // Build a unique-but-readable path: <user-id>/<timestamp>-<slugified-name>.<ext>
  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const baseName = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'photo';
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
