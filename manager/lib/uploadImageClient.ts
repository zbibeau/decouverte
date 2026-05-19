'use client';

import { createClient as createBrowserSupabase } from '@/lib/supabase/client';

/**
 * Client-side image upload helper — uploads directly from the browser to
 * Supabase Storage, bypassing the Next.js server action layer.
 *
 * Why this exists (and not just `uploadCarouselPhoto` in `uploadImage.ts`) :
 * Next.js server actions cap request bodies at 1 MB by default. Most photos
 * from a phone or camera weigh 2–8 MB, so the server action silently fails
 * with an opaque error (« Body exceeded 1 MB limit ») before our own
 * validation ever runs. By POSTing the file directly to Supabase Storage
 * (via the user's authenticated session), we sidestep that ceiling and gain
 * upload-progress events for free.
 *
 * Same pattern as `VideoUploadButton` in `components/blocks/SimpleEditors.tsx`.
 *
 * The return shape matches the original server action's `UploadResult` so
 * call sites can swap one for the other with minimal diff.
 */

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

export interface UploadImageOptions {
  /** Called periodically with the percentage uploaded (0-100). */
  onProgress?: (pct: number) => void;
}

function buildImageStoragePath(userId: string, file: File) {
  const ext =
    (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'bin';
  const baseName =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'photo';
  return `${userId}/${Date.now()}-${baseName}.${ext}`;
}

/**
 * Upload an image to the `carousel-photos` bucket using the current user's
 * Supabase session. Resolves with the public URL on success.
 *
 * @example
 * const res = await uploadImageDirect(file);
 * if (res.ok && res.url) setEditCardImage(res.url);
 * else toast.error(res.error);
 */
export async function uploadImageDirect(
  file: File,
  options: UploadImageOptions = {},
): Promise<UploadResult> {
  // Client-side validation mirroring the bucket policy (migration 0026).
  if (file.size === 0) return { ok: false, error: 'Fichier vide.' };
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(
        1,
      )} MB). Maximum 5 MB.`,
    };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Format non supporté (${file.type || 'inconnu'}). Utilise jpg, png, webp ou gif.`,
    };
  }

  const supabase = createBrowserSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return { ok: false, error: 'Tu dois être connecté pour uploader.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, error: 'Configuration Supabase manquante.' };
  }

  const path = buildImageStoragePath(session.user.id, file);
  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURI(path)}`;

  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('x-upsert', 'false');

      if (options.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          options.onProgress!(pct);
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          // Surface Supabase's JSON error message when possible.
          let errMsg = `HTTP ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errMsg = parsed.message;
            else if (parsed?.error) errMsg = parsed.error;
          } catch {
            if (xhr.responseText) errMsg = xhr.responseText.slice(0, 200);
          }
          reject(new Error(errMsg));
        }
      };
      xhr.onerror = () => reject(new Error('Erreur réseau.'));

      xhr.send(file);
    });

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  } catch (e) {
    return {
      ok: false,
      error: `Upload échoué : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
