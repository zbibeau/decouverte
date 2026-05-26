'use client';

import type { CarouselPhoto, PhotoCarouselBlock } from '@shared/content-schema';
import { ArrowDown, ArrowUp, ImageUp, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { uploadImageDirect } from '@/lib/uploadImageClient';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { Field, Section } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import { TagsField, TagsHelpBanner } from './TagsField';
import type { PayloadEditorProps } from './editor-types';

type Payload = PhotoCarouselBlock['payload'];

const ASPECT_OPTIONS: Array<NonNullable<Payload['aspectRatio']>> = ['16/9', '4/3', '3/2', '1/1', '21/9'];

export function PhotoCarouselEditor({ payload, onChange, navbarVariants, depth = 0 }: PayloadEditorProps<Payload>) {
  // See `VideoEditor` comment about the depth-based switch : nested
  // photoCarousels keep their tag IDs inline in their payload, top-
  // level instances write to the `block_tag` join table via URL.
  const isNested = depth > 0;
  const photos = payload.photos ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  /** Index of the photo whose "Remplacer" button was clicked. Set just
   *  before opening replaceInputRef so the onChange handler knows where
   *  to write. Using a ref (not state) because state updates are async. */
  const pendingReplaceIdxRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  function updatePhotos(next: CarouselPhoto[]) {
    onChange({ ...payload, photos: next });
  }
  function updatePhoto(idx: number, patch: Partial<CarouselPhoto>) {
    const next = [...photos];
    next[idx] = { ...next[idx], ...patch };
    updatePhotos(next);
  }
  function removePhoto(idx: number) {
    updatePhotos(photos.filter((_, i) => i !== idx));
  }
  const addPhoto = useCallback(() => {
    updatePhotos([...photos, { url: '' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  useRegisterAddScope(
    {
      id: 'photo-carousel',
      label: 'Carrousel photos',
      depth: 10,
      actions: [
        {
          id: 'add-photo',
          label: 'Ajouter une photo (URL manuelle)',
          description: `Photo #${photos.length + 1}`,
          run: addPhoto,
        },
      ],
    },
    [addPhoto, photos.length],
  );
  function movePhoto(idx: number, dir: -1 | 1) {
    const t = idx + dir;
    if (t < 0 || t >= photos.length) return;
    const next = [...photos];
    [next[idx], next[t]] = [next[t], next[idx]];
    updatePhotos(next);
  }

  /**
   * Upload one or more files to Supabase Storage and append them as new
   * photos. Used by both drag-and-drop and the file picker.
   */
  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      setUploadError('Aucune image détectée. Glisse un fichier jpg, png, webp ou gif.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });

    const uploaded: CarouselPhoto[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      // Direct browser → Supabase upload : bypasses the Next.js server
      // action 1 MB body limit so phone-sized photos (2-8 MB) go through.
      const res = await uploadImageDirect(file);
      if (res.ok && res.url) {
        uploaded.push({
          url: res.url,
          alt: file.name.replace(/\.[^.]+$/, ''),
        });
      } else {
        setUploadError(res.error ?? "Erreur inconnue lors de l'upload.");
        break;
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }

    if (uploaded.length > 0) {
      updatePhotos([...photos, ...uploaded]);
    }
    setUploading(false);
    setUploadProgress(null);
  }

  /**
   * Replace an existing photo's image (url + alt) without touching its
   * title / description / etc. Triggered by the per-photo "Remplacer
   * l'image" button.
   */
  async function replacePhotoFile(idx: number, file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Format non supporté. Utilise jpg, png, webp ou gif.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    setReplacingIdx(idx);

    // Direct browser → Supabase (same reason as above).
    const res = await uploadImageDirect(file);

    if (res.ok && res.url) {
      // Only overwrite url; preserve alt unless it was empty, in which case
      // fall back to the new filename. Title/description remain untouched.
      const current = photos[idx];
      const nextAlt = current?.alt && current.alt.length > 0 ? current.alt : file.name.replace(/\.[^.]+$/, '');
      updatePhoto(idx, { url: res.url, alt: nextAlt });
    } else {
      setUploadError(res.error ?? "Erreur inconnue lors de l'upload.");
    }

    setUploading(false);
    setReplacingIdx(null);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <ScopeRoot scopeId="photo-carousel" className="-m-1 space-y-3 rounded-md p-1">
      <Section title="Style du carrousel" accentColor="slate">
        <Field label="Navbar pilote" path="navbar">
          <NavbarVariantSelect
            value={payload.navbar?.variant}
            onChange={(key) =>
              onChange({
                ...payload,
                navbar: key ? { variant: key } : undefined,
              })
            }
            variants={navbarVariants}
          />
        </Field>
        <Field label="Format d'image (ratio)" path="aspectRatio">
          <select
            className="border-border h-9 w-full rounded-md border bg-white px-3 text-sm"
            value={payload.aspectRatio ?? '16/9'}
            onChange={(e) =>
              onChange({
                ...payload,
                aspectRatio: e.target.value as NonNullable<Payload['aspectRatio']>,
              })
            }
          >
            {ASPECT_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} {r === '16/9' ? '(par défaut, paysage)' : r === '1/1' ? '(carré)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Défilement automatique (ms)"
          path="autoplayMs"
          hint="0 ou vide pour désactiver. 4000 = défile toutes les 4 secondes. Pause au survol."
        >
          <Input
            type="number"
            min="0"
            step="500"
            value={payload.autoplayMs ?? 0}
            onChange={(e) =>
              onChange({
                ...payload,
                autoplayMs: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
          />
        </Field>
      </Section>

      <Section
        title={`Photos (${photos.length})`}
        accentColor="rose"
        action={
          <Button size="sm" variant="outline" onClick={addPhoto} disabled={uploading}>
            <Plus className="mr-1 h-3.5 w-3.5" /> URL manuelle
          </Button>
        }
      >
        {/* Cached file picker — used by the dropzone (multi, append) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void uploadFiles(e.target.files);
              e.target.value = ''; // allow re-picking the same file
            }
          }}
        />

        {/* Cached file picker — used by per-photo "Remplacer l'image" buttons (single, in-place) */}
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const idx = pendingReplaceIdxRef.current;
            e.target.value = '';
            pendingReplaceIdxRef.current = null;
            if (file && idx != null) {
              void replacePhotoFile(idx, file);
            }
          }}
        />

        {/* Drop zone — accepts multiple files, uploads them, appends as new photos */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={[
            'mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-4 text-center text-xs transition-colors',
            dragOver
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-border bg-muted/30 text-muted-foreground hover:border-rose-300 hover:bg-rose-50/50',
            uploading ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
              <span>
                Upload en cours
                {uploadProgress ? ` (${uploadProgress.done}/${uploadProgress.total})` : ''}…
              </span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>
                <strong>Glisse-dépose</strong> tes images ici, ou clique pour les choisir.
              </span>
              <span className="text-[10px]">jpg / png / webp / gif — max 5 MB par fichier</span>
            </>
          )}
        </div>

        {uploadError && (
          <p className="border-destructive/30 bg-destructive/5 text-destructive mb-3 rounded-md border px-3 py-2 text-xs">
            {uploadError}
          </p>
        )}

        {photos.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Aucune photo. Glisse une image dans la zone ci-dessus, ou clique sur « URL manuelle » pour saisir une URL.
          </p>
        ) : (
          <div className="space-y-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="border-border space-y-2 rounded-md border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                    Photo #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Remplacer l'image"
                      disabled={uploading}
                      onClick={() => {
                        pendingReplaceIdxRef.current = idx;
                        replaceInputRef.current?.click();
                      }}
                    >
                      {uploading && replacingIdx === idx ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <ImageUp className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => movePhoto(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => movePhoto(idx, 1)}
                      disabled={idx === photos.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removePhoto(idx)}>
                      <Trash2 className="text-destructive h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Field label="URL de l'image" path={`photos[${idx}].url`}>
                  <Input
                    value={photo.url}
                    onChange={(e) => updatePhoto(idx, { url: e.target.value })}
                    placeholder="https://… ou /illustrations/ma-photo.webp"
                  />
                </Field>

                <Field
                  label="Titre (facultatif)"
                  path={`photos[${idx}].title`}
                  hint="Affiché en bas de la photo, en surimpression sur un fond translucide."
                >
                  <Input
                    value={photo.title ?? ''}
                    onChange={(e) => updatePhoto(idx, { title: e.target.value })}
                    placeholder="La salle d'attente refaite en 2024"
                  />
                </Field>

                <Field
                  label="Description (facultative)"
                  path={`photos[${idx}].description`}
                  hint="Texte affiché sous le carrousel. Sauts de ligne préservés."
                >
                  <textarea
                    value={photo.description ?? ''}
                    onChange={(e) => updatePhoto(idx, { description: e.target.value })}
                    placeholder="Travaux réalisés en mars 2024.&#10;Mobilier en chêne, éclairage LED."
                    rows={3}
                    className="border-border focus-visible:ring-ring w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
                  />
                </Field>

                <Field
                  label="Texte alternatif (alt) — accessibilité"
                  path={`photos[${idx}].alt`}
                  hint="Lu par les lecteurs d'écran. Si vide, le titre sera utilisé."
                >
                  <Input
                    value={photo.alt ?? ''}
                    onChange={(e) => updatePhoto(idx, { alt: e.target.value })}
                    placeholder="Vue intérieure de la salle d'attente"
                  />
                </Field>

                {/* Mini-preview de l'image pour confort */}
                {photo.url && (
                  <div className="border-border bg-muted/30 mt-2 overflow-hidden rounded-md border">
                    <img
                      src={photo.url}
                      alt={photo.alt ?? photo.title ?? `Photo ${idx + 1}`}
                      className="max-h-32 w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
      <TagsHelpBanner contextHint="Ces tags s'appliquent au carrousel entier (pas à chaque photo). Décris la fonctionnalité produit que les photos illustrent." />
      <Field label="Tags de maintenance" path="tags">
        {isNested ? (
          <TagsField
            target={{
              kind: 'controlled',
              valueIds: payload.tagIds ?? [],
              onChange: (ids) => onChange({ ...payload, tagIds: ids }),
            }}
          />
        ) : (
          <TagsField />
        )}
      </Field>
    </ScopeRoot>
  );
}
