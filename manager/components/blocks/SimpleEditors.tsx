'use client';

import type { ContentBlock } from '@shared/content-schema';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { BlockTypeSelector } from '@/components/BlockTypeSelector';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { blankBlock } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
import { uploadImageDirect } from '@/lib/uploadImageClient';

import { Field, Section } from './Field';
import { ImagePreview } from './ImagePreview';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import { TagsField, TagsHelpBanner } from './TagsField';
import type { PayloadEditorProps } from './editor-types';

// ---------- text ----------
export function TextEditor({
  payload,
  onChange,
  onReplace,
  navbarVariants,
}: PayloadEditorProps<{
  html?: string;
  variant?: string;
  navbar?: { variant: string };
}>) {
  /**
   * When `onReplace` is available (passed by PayloadEditor at the
   * top-level dispatch), the user can promote this `text` block into a
   * `card` container by clicking any "+ sub-block" button. The new card
   * holds the original text + the chosen sample sub-block.
   *
   * After promotion the PayloadEditor re-renders with `block.type === 'card'`
   * and dispatches to CardEditor — the user stays on the same URL and
   * continues editing seamlessly.
   */
  async function promoteToCardWith(chosenType: ContentBlock['type']) {
    if (!onReplace) return;
    const sample = SAMPLE_PAYLOADS[chosenType];
    const newSubBlock: ContentBlock = sample
      ? ({
          type: chosenType,
          payload: JSON.parse(JSON.stringify(sample.payload)),
        } as ContentBlock)
      : blankBlock(chosenType);
    const card: ContentBlock = {
      type: 'card',
      payload: {
        children: [{ type: 'text', payload: { ...payload } } as ContentBlock, newSubBlock],
      },
    } as ContentBlock;
    onReplace(card);
  }

  return (
    <div className="space-y-3">
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
      <Field label="Contenu HTML" path="html">
        <Textarea
          rows={8}
          value={payload.html ?? ''}
          onChange={(e) => onChange({ ...payload, html: e.target.value })}
        />
      </Field>
      <Field label="Variante" path="variant">
        <select
          className="border-border bg-surface h-9 rounded-md border px-3 text-sm"
          value={payload.variant ?? 'default'}
          onChange={(e) => onChange({ ...payload, variant: e.target.value })}
        >
          <option value="default">default</option>
          <option value="lg">lg</option>
          <option value="sm">sm</option>
        </select>
      </Field>

      {/*
        Promotion zone : visible only when the editor frame exposes
        `onReplace` (i.e. the top-level BlockEditor — not in places where
        the text editor is rendered for inspection only).
      */}
      {onReplace && (
        <Section title="Sous-blocs additionnels" accentColor="purple">
          <p className="text-muted-foreground mb-2 text-[11px]">
            Ajouter un sous-bloc transformera ce bloc texte en <strong>card</strong> contenant ton texte + le nouveau
            sous-bloc.
          </p>
          <BlockTypeSelector
            onInsert={(t) => promoteToCardWith(t)}
            excludeTypes={new Set(['heroTitle', 'componentRef'])}
            insertTarget="children"
          />
        </Section>
      )}
    </div>
  );
}

// ---------- video ----------
type VideoPayload = {
  vimeoSrc?: string;
  contentId?: string;
  contentClass?: string;
  navbar?: { variant: string };
  /** Internal label shown in the manager's block row + ⌘K search. Never
   *  rendered by the front. See `VideoBlock.managerTitle` in the schema. */
  managerTitle?: string;
  /** Inline maintenance tag IDs, used when this VideoBlock appears
   *  nested inside another block. Top-level instances ignore this. */
  tagIds?: string[];
};

export function VideoEditor({ payload, onChange, navbarVariants, depth = 0 }: PayloadEditorProps<VideoPayload>) {
  // Top-level Video blocks get their TagsField rendered centrally by
  // BlockEditor (in a "Tags de maintenance" section common to every
  // block type — see BlockEditor.tsx). Nested videos (depth > 0) have
  // no `block_tag` row of their own, so we keep an inline controlled
  // TagsField here targeting `payload.tagIds`.
  const isNested = depth > 0;
  return (
    <div className="space-y-3">
      <Field
        label="Titre interne (manager)"
        path="managerTitle"
        hint="Affiché dans la liste + ⌘K seulement, jamais en front."
      >
        <Input
          value={payload.managerTitle ?? ''}
          onChange={(e) => onChange({ ...payload, managerTitle: e.target.value })}
          placeholder="Ex. Présentation du dossier patient"
        />
      </Field>
      <Field
        label="Source vidéo"
        path="vimeoSrc"
        hint="URL Vimeo / MP4 / WebM / MOV, ou upload (.mp4 / .webm / .mov, 200 MB)."
      >
        <div className="space-y-2">
          <Input
            value={payload.vimeoSrc ?? ''}
            onChange={(e) => onChange({ ...payload, vimeoSrc: e.target.value })}
            placeholder="vimeo/123456789?hash=abcdef  ou  https://…/clip.mp4"
          />
          <VideoUploadButton onUploaded={(url) => onChange({ ...payload, vimeoSrc: url })} />
        </div>
      </Field>
      <Field label="Content ID (ancre facultative)" path="contentId">
        <Input
          value={payload.contentId ?? ''}
          onChange={(e) => onChange({ ...payload, contentId: e.target.value })}
          placeholder="appointment-section"
        />
      </Field>
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
      {payload.vimeoSrc && <VimeoPreview src={payload.vimeoSrc} />}
      {isNested && (
        <>
          <TagsHelpBanner contextHint="Décris ici les interfaces / fonctionnalités produit que cette vidéo montre (ex. fiche patient, agenda, messagerie)." />
          <Field label="Tags de maintenance" path="tags">
            <TagsField
              target={{
                kind: 'controlled',
                valueIds: payload.tagIds ?? [],
                onChange: (ids) => onChange({ ...payload, tagIds: ids }),
              }}
            />
          </Field>
        </>
      )}
    </div>
  );
}

function VimeoPreview({ src }: { src: string }) {
  // Vimeo provider syntax → embed iframe
  const vimeoMatch = src.match(/^vimeo\/(\d+)(?:\?hash=(\w+))?/);
  if (vimeoMatch) {
    const [, id, hash] = vimeoMatch;
    const url = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium">Preview</p>
        <div className="border-border aspect-video w-full max-w-md overflow-hidden rounded-md border bg-black">
          <iframe src={url} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" />
        </div>
      </div>
    );
  }
  // Direct HTTP URL → HTML5 <video>
  if (/^https?:\/\//.test(src)) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium">Preview</p>
        <div className="border-border aspect-video w-full max-w-md overflow-hidden rounded-md border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={src} controls className="h-full w-full" />
        </div>
      </div>
    );
  }
  return null;
}

/**
 * File-picker button that uploads a video DIRECTLY to Supabase Storage from
 * the browser, with realtime progress + clear success/error feedback.
 *
 * Why client-side and not a server action ?
 *   - Next.js App Router server actions cap the body at ~1 MB by default
 *     (configurable but still buffers the whole file in server memory).
 *   - Server actions don't expose upload progress to the browser.
 *   - Direct-to-Storage from the browser uses the user's authenticated
 *     session, respects bucket RLS (migration 0029), avoids the Next.js
 *     middle-tier entirely, and supports XHR `upload.progress` events.
 */
const VIDEO_BUCKET = 'videos';
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
const VIDEO_ALLOWED_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function buildVideoStoragePath(userId: string, file: File) {
  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const baseName =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'video';
  return `${userId}/${Date.now()}-${baseName}.${ext}`;
}

function VideoUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [pending, setPending] = useState(false);
  // 0..100, null when not uploading.
  const [progress, setProgress] = useState<number | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>('');

  function reset() {
    setPending(false);
    setProgress(null);
    setStatusLabel('');
    xhrRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }

  function cancel() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    reset();
    toast.info('Upload annulé.');
  }

  async function handleFile(file: File) {
    // ----- Client-side validation (matches bucket policy migration 0029) -----
    if (file.size === 0) {
      toast.error('Fichier vide.');
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error(`Vidéo trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 200 MB.`);
      return;
    }
    if (!VIDEO_ALLOWED_MIME.has(file.type)) {
      toast.error(`Format non supporté (${file.type || 'inconnu'}). Utilise mp4, webm ou mov.`);
      return;
    }

    setPending(true);
    setProgress(0);
    setStatusLabel('Authentification…');

    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        toast.error('Tu dois être connecté pour uploader.');
        reset();
        return;
      }
      const userId = session.user.id;
      const path = buildVideoStoragePath(userId, file);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.error('Configuration Supabase manquante.');
        reset();
        return;
      }
      const endpoint = `${supabaseUrl}/storage/v1/object/${VIDEO_BUCKET}/${encodeURI(path)}`;

      setStatusLabel('Upload…');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'false');

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(pct);
          setStatusLabel(
            `Upload ${pct}% — ${(event.loaded / 1024 / 1024).toFixed(1)} / ${(event.total / 1024 / 1024).toFixed(1)} MB`,
          );
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Try to surface Supabase's JSON error message.
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
        xhr.onabort = () => reject(new Error('Upload annulé.'));

        xhr.send(file);
      });

      // Upload OK — get public URL.
      const { data: pub } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      onUploaded(pub.publicUrl);
      setStatusLabel('Terminé');
      toast.success(`Vidéo uploadée (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      reset();
    } catch (e) {
      console.error('[VideoUploadButton] upload failed', e);
      toast.error(`Upload échoué : ${e instanceof Error ? e.message : String(e)}`);
      reset();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          {pending ? 'Upload en cours…' : 'Uploader une vidéo'}
        </Button>
        {pending && (
          <Button type="button" variant="ghost" size="sm" onClick={cancel}>
            Annuler
          </Button>
        )}
        {statusLabel && !pending && (
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300">{statusLabel}</span>
        )}
      </div>
      {pending && progress != null && (
        <div className="space-y-1">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-brand-primary-500 h-full transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-[10px]">{statusLabel}</p>
        </div>
      )}
    </div>
  );
}

// ---------- heroTitle ----------
type HeroPayload = {
  title?: string;
  sectionTitle?: string;
  number?: number;
  illustration?: string;
  /** Inline maintenance tag IDs used when this heroTitle is nested. */
  tagIds?: string[];
};

export function HeroTitleEditor({ payload, onChange, depth = 0 }: PayloadEditorProps<HeroPayload>) {
  const isNested = depth > 0;
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const res = await uploadImageDirect(file);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Upload échoué.');
        return;
      }
      onChange({ ...payload, illustration: res.url });
      toast.success('Illustration uploadée.');
    } catch (e) {
      console.error('[HeroTitleEditor] image upload failed', e);
      toast.error(`Upload échoué : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Titre" path="title">
        <Input value={payload.title ?? ''} onChange={(e) => onChange({ ...payload, title: e.target.value })} />
      </Field>
      <Field
        label="Sur-titre (section)"
        path="sectionTitle"
        hint="Étiquette affichée au-dessus du titre (nom de section)."
      >
        <Input
          value={payload.sectionTitle ?? ''}
          onChange={(e) => onChange({ ...payload, sectionTitle: e.target.value || undefined })}
          placeholder="Ex. : Partie 2"
        />
      </Field>
      <Field label="Numéro" path="number">
        <Input
          type="number"
          value={payload.number ?? 1}
          onChange={(e) => onChange({ ...payload, number: Number(e.target.value) })}
          className="max-w-[80px]"
        />
      </Field>
      <Field
        label="Illustration"
        path="illustration"
        hint="URL ou upload d'image (.jpg / .png / .webp / .gif, 5 MB max)."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={payload.illustration ?? ''}
            onChange={(e) => onChange({ ...payload, illustration: e.target.value || undefined })}
            placeholder="/illustrations/toolbox1-header.webp ou URL"
            className="h-8 flex-1 text-xs"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            title="Uploader une illustration"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? '…' : ''}
          </Button>
          {payload.illustration && (
            <div className="basis-full">
              <ImagePreview src={payload.illustration} alt="Aperçu illustration" objectFit="contain" />
            </div>
          )}
        </div>
      </Field>
      {isNested && (
        <>
          <TagsHelpBanner contextHint="Décris ici ce que l'illustration représente (ex. fiche patient, agenda, page d'accueil)." />
          <Field label="Tags de maintenance" path="tags">
            <TagsField
              target={{
                kind: 'controlled',
                valueIds: payload.tagIds ?? [],
                onChange: (ids) => onChange({ ...payload, tagIds: ids }),
              }}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ---------- componentRef ----------
interface CustomComponentMeta {
  name: string;
  description: string;
}

const CLIENT_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CLIENT_URL) || 'http://localhost:3100';

export function ComponentRefEditor({
  payload,
  onChange,
}: PayloadEditorProps<{ name?: string; props?: Record<string, unknown> }>) {
  const [list, setList] = useState<CustomComponentMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${CLIENT_URL}/api/custom-components`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as CustomComponentMeta[];
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = list?.find((c) => c.name === payload.name);
  const isUnknown = list && payload.name && !selected;

  return (
    <div className="space-y-3">
      <Field
        label="Composant custom"
        path="name"
        hint={
          error
            ? `Erreur de chargement : ${error} (l'app cliente est-elle démarrée sur ${CLIENT_URL} ?)`
            : list
              ? `${list.length} composant(s) disponible(s) — la liste vient de l'app cliente.`
              : 'Chargement…'
        }
      >
        <select
          className="border-border bg-surface h-9 w-full rounded-md border px-3 text-sm"
          value={payload.name ?? ''}
          onChange={(e) => onChange({ ...payload, name: e.target.value || undefined })}
          disabled={!list}
        >
          <option value="">— Choisir un composant —</option>
          {list?.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
          {isUnknown && <option value={payload.name}>{payload.name} (introuvable dans le registre)</option>}
        </select>
      </Field>

      {selected && (
        <div className="border-border bg-muted/30 text-muted-foreground rounded-md border p-2 text-xs">
          {selected.description}
        </div>
      )}

      <ComponentRefPropsEditor value={payload.props} onChange={(props) => onChange({ ...payload, props })} />

      {isUnknown && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-2 text-xs">
          Le composant <code>{payload.name}</code> n&apos;est pas enregistré dans l&apos;app cliente. Ajoute-le dans{' '}
          <code>src/components/modules/home/renderer/customComponents.tsx</code> ET dans{' '}
          <code>customComponents.meta.ts</code> pour qu&apos;il apparaisse ici.
        </div>
      )}

      <details className="border-border bg-surface rounded-md border p-2 text-xs">
        <summary className="text-muted-foreground cursor-pointer font-medium">
          Comment importer un nouveau composant custom ?
        </summary>
        <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-4">
          <li>
            Crée ton composant Solid quelque part dans <code>src/components/</code> de l&apos;app cliente (signature :{' '}
            <code>Component&lt;HOME_SECTION_PROPS&gt;</code>).
          </li>
          <li>
            Ouvre <code>src/components/modules/home/renderer/customComponents.meta.ts</code> et ajoute une entrée{' '}
            <code>{'{ name, description }'}</code>.
          </li>
          <li>
            Ouvre <code>src/components/modules/home/renderer/customComponents.tsx</code> et importe ton composant +
            ajoute-le au record <code>CUSTOM_COMPONENT_RUNTIME</code> avec le même <code>name</code>.
          </li>
          <li>
            Recharge cette page : ton composant apparaît dans le dropdown et peut être référencé depuis n&apos;importe
            quel bloc <code>componentRef</code>.
          </li>
        </ol>
      </details>
    </div>
  );
}

/**
 * Free-form JSON editor for the `props` forwarded to a custom Solid component.
 * Lives next to ComponentRefEditor; kept simple on purpose — the schemas of
 * each custom component vary too much to build dedicated UIs in v1.
 */
function ComponentRefPropsEditor({
  value,
  onChange,
}: {
  value?: Record<string, unknown>;
  onChange: (next: Record<string, unknown> | undefined) => void;
}) {
  const [draft, setDraft] = useState<string>(() =>
    value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '',
  );
  const [error, setError] = useState<string | null>(null);

  // Re-sync draft when an external update lands (e.g. block reload).
  useEffect(() => {
    const next = value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';
    setDraft((cur) => (cur === next ? cur : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  function handleChange(text: string) {
    setDraft(text);
    if (text.trim() === '') {
      setError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('Doit être un objet JSON ({ ... })');
        return;
      }
      setError(null);
      onChange(parsed as Record<string, unknown>);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Field label="Props (JSON)" path="props" hint="Props JSON passées au composant. Vide = aucune.">
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={5}
        className="border-border bg-surface w-full rounded-md border p-2 font-mono text-xs"
        placeholder='{"subTitle": "Découvrez MadeForMed"}'
      />
      {error && <p className="text-destructive mt-1 text-[10px]">JSON invalide : {error}</p>}
    </Field>
  );
}
