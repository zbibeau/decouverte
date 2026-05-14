'use client';

import type { ContentBlock } from '@shared/content-schema';
import { useEffect, useState } from 'react';

import { AddBlockButton } from '@/components/AddBlockButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS, blankBlock } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';

import { Field, Section } from './Field';
import type { PayloadEditorProps } from './editor-types';

// ---------- text ----------
export function TextEditor({
  payload,
  onChange,
  onReplace,
}: PayloadEditorProps<{ html?: string; variant?: string }>) {
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
        children: [
          { type: 'text', payload: { ...payload } } as ContentBlock,
          newSubBlock,
        ],
      },
    } as ContentBlock;
    onReplace(card);
  }

  return (
    <div className="space-y-3">
      <Field label="Contenu HTML" path="html">
        <Textarea
          rows={8}
          value={payload.html ?? ''}
          onChange={(e) => onChange({ ...payload, html: e.target.value })}
        />
      </Field>
      <Field label="Variante" path="variant">
        <select
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
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
          <p className="mb-2 text-[11px] text-muted-foreground">
            Ajouter un sous-bloc transformera ce bloc texte en{' '}
            <strong>card</strong> contenant ton texte + le nouveau sous-bloc.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_TYPES_ORDER.filter((t) => t !== 'heroTitle' && t !== 'componentRef').map(
              (t) => {
                const sample = SAMPLE_PAYLOADS[t];
                const safeSample = sample ?? {
                  description: `Sous-bloc « ${(BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t} ».`,
                  whenToUse: 'À utiliser comme sous-bloc imbriqué.',
                  payload: blankBlock(t).payload as Record<string, unknown>,
                };
                return (
                  <AddBlockButton
                    key={t}
                    type={t}
                    label={(BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t}
                    sample={safeSample}
                    insertTarget="children"
                    onInsert={() => promoteToCardWith(t)}
                  />
                );
              },
            )}
          </div>
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
  navbar?: { variant: 'appointment' | 'contact' };
};

export function VideoEditor({ payload, onChange }: PayloadEditorProps<VideoPayload>) {
  return (
    <div className="space-y-3">
      <Field label="Source Vimeo" path="vimeoSrc" hint='Format : "vimeo/123456789?hash=abcdef"'>
        <Input
          value={payload.vimeoSrc ?? ''}
          onChange={(e) => onChange({ ...payload, vimeoSrc: e.target.value })}
          placeholder="vimeo/123456789?hash=abcdef"
        />
      </Field>
      <Field label="Content ID (ancre facultative)" path="contentId">
        <Input
          value={payload.contentId ?? ''}
          onChange={(e) => onChange({ ...payload, contentId: e.target.value })}
          placeholder="appointment-section"
        />
      </Field>
      <Field label="Navbar pilote Tool 1" path="navbar">
        <select
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
          value={payload.navbar?.variant ?? ''}
          onChange={(e) =>
            onChange({
              ...payload,
              navbar: e.target.value ? { variant: e.target.value as 'appointment' | 'contact' } : undefined,
            })
          }
        >
          <option value="">(aucune)</option>
          <option value="appointment">appointment</option>
          <option value="contact">contact</option>
        </select>
      </Field>
      {payload.vimeoSrc && <VimeoPreview src={payload.vimeoSrc} />}
    </div>
  );
}

function VimeoPreview({ src }: { src: string }) {
  const match = src.match(/vimeo\/(\d+)(?:\?hash=(\w+))?/);
  if (!match) return null;
  const [, id, hash] = match;
  const url = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">Preview</p>
      <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border border-border bg-black">
        <iframe src={url} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" />
      </div>
    </div>
  );
}

// ---------- heroTitle ----------
type HeroPayload = { title?: string; number?: number; illustration?: string };

export function HeroTitleEditor({ payload, onChange }: PayloadEditorProps<HeroPayload>) {
  return (
    <div className="space-y-3">
      <Field label="Titre" path="title">
        <Input
          value={payload.title ?? ''}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
        />
      </Field>
      <Field label="Numéro" path="number">
        <Input
          type="number"
          value={payload.number ?? 1}
          onChange={(e) => onChange({ ...payload, number: Number(e.target.value) })}
        />
      </Field>
      <Field label="Illustration (chemin public)" path="illustration">
        <Input
          value={payload.illustration ?? ''}
          onChange={(e) => onChange({ ...payload, illustration: e.target.value })}
          placeholder="/illustrations/toolbox1-header.webp"
        />
      </Field>
    </div>
  );
}

// ---------- componentRef ----------
interface CustomComponentMeta {
  name: string;
  description: string;
}

const CLIENT_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CLIENT_URL) || 'http://localhost:3100';

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
          className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm"
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
          {isUnknown && (
            <option value={payload.name}>{payload.name} (introuvable dans le registre)</option>
          )}
        </select>
      </Field>

      {selected && (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          {selected.description}
        </div>
      )}

      <ComponentRefPropsEditor
        value={payload.props}
        onChange={(props) => onChange({ ...payload, props })}
      />

      {isUnknown && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          Le composant <code>{payload.name}</code> n&apos;est pas enregistré dans l&apos;app cliente.
          Ajoute-le dans <code>src/components/modules/home/renderer/customComponents.tsx</code> ET
          dans <code>customComponents.meta.ts</code> pour qu&apos;il apparaisse ici.
        </div>
      )}

      <details className="rounded-md border border-border bg-white p-2 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          Comment importer un nouveau composant custom ?
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
          <li>
            Crée ton composant Solid quelque part dans <code>src/components/</code> de l&apos;app
            cliente (signature : <code>Component&lt;HOME_SECTION_PROPS&gt;</code>).
          </li>
          <li>
            Ouvre{' '}
            <code>src/components/modules/home/renderer/customComponents.meta.ts</code> et ajoute une
            entrée <code>{'{ name, description }'}</code>.
          </li>
          <li>
            Ouvre{' '}
            <code>src/components/modules/home/renderer/customComponents.tsx</code> et importe ton
            composant + ajoute-le au record <code>CUSTOM_COMPONENT_RUNTIME</code> avec le même{' '}
            <code>name</code>.
          </li>
          <li>
            Recharge cette page : ton composant apparaît dans le dropdown et peut être référencé
            depuis n&apos;importe quel bloc <code>componentRef</code>.
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
    <Field
      label="Props (JSON)"
      path="props"
      hint="Forwarded as additional props to the Solid component. Laisser vide si aucun."
    >
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={5}
        className="w-full rounded-md border border-border bg-white p-2 font-mono text-xs"
        placeholder='{"subTitle": "Découvrez MadeForMed"}'
      />
      {error && <p className="mt-1 text-[10px] text-destructive">JSON invalide : {error}</p>}
    </Field>
  );
}
