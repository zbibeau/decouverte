'use client';

import { useMemo, useRef, useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  /** Server action that creates a chapter. Accepts FormData. Throws on
   *  duplicate slug / missing fields. */
  createAction: (formData: FormData) => Promise<void>;
  /** Slugs already taken in the current parcours — used to validate
   *  uniqueness CLIENT-side (debounce-free, the list is small) and to
   *  auto-suggest an incremented slug when there's a collision. */
  existingSlugs?: string[];
}

/**
 * Slugify : keep alphanumerics, replace whitespace and accents with `-`,
 * lowercase. Mirrors what the server does in `createChapter` so the
 * preview matches what will be persisted.
 */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** When the desired slug is taken, append `-2`, `-3`, … until we find a
 *  free one. The suggestion is shown as a "Use this instead ?" affordance. */
function nextFreeSlug(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  // If desired already ends with -N, bump N. Otherwise start at -2.
  const m = desired.match(/^(.*?)-(\d+)$/);
  let base = desired;
  let n = 2;
  if (m) {
    base = m[1];
    n = Number(m[2]) + 1;
  }
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Inline form to create a new chapter at the bottom of the ChapterListPage.
 *
 * Why a client component instead of a plain `<form action={...}>` ?
 *   - We need to RESET the fields after a successful create. A native form
 *     submit to a server action doesn't clear inputs, so users see their
 *     last slug+title hanging around and (understandably) click Create
 *     again → duplicate slug error.
 *   - We want a success toast confirming the create.
 *   - We want LIVE slug validation (uniqueness, format) so the author sees
 *     the problem before the server roundtrip.
 */
export function CreateChapterForm(props: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');

  const takenSet = useMemo(
    () => new Set((props.existingSlugs ?? []).map((s) => s.trim().toLowerCase())),
    [props.existingSlugs],
  );

  /** Live status of the slug field. `idle` = empty (no message). */
  const slugStatus = useMemo<
    { kind: 'idle' } | { kind: 'invalid'; message: string } | { kind: 'taken'; suggestion: string } | { kind: 'ok' }
  >(() => {
    const trimmed = slug.trim();
    if (!trimmed) return { kind: 'idle' };
    // Format check : slug must match the slugified form. If the raw input
    // contains characters that will be stripped, surface the cleaned
    // version as a hint so the author can adopt it explicitly.
    const cleaned = slugify(trimmed);
    if (!cleaned) {
      return {
        kind: 'invalid',
        message: 'Slug invalide. Utilise des lettres / chiffres / tirets.',
      };
    }
    if (cleaned !== trimmed.toLowerCase()) {
      return {
        kind: 'taken',
        suggestion: cleaned,
      };
    }
    if (takenSet.has(cleaned)) {
      return { kind: 'taken', suggestion: nextFreeSlug(cleaned, takenSet) };
    }
    return { kind: 'ok' };
  }, [slug, takenSet]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedSlug = slug.trim();
    const trimmedTitle = title.trim();
    if (!trimmedSlug || !trimmedTitle) {
      toast.error('Slug et titre requis.');
      return;
    }
    if (slugStatus.kind === 'invalid') {
      toast.error(slugStatus.message);
      return;
    }
    if (slugStatus.kind === 'taken') {
      toast.error(`Slug déjà utilisé. Essaie « ${slugStatus.suggestion} » ou choisis-en un autre.`);
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('slug', trimmedSlug);
        fd.set('title', trimmedTitle);
        await props.createAction(fd);
        toast.success(`Chapitre « ${trimmedTitle} » créé.`);
        setSlug('');
        setTitle('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col sm:max-w-[240px]">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="step-new-thing"
            required
            aria-invalid={slugStatus.kind === 'invalid' || slugStatus.kind === 'taken' ? true : undefined}
            aria-describedby="slug-feedback"
            className={
              slugStatus.kind === 'taken' || slugStatus.kind === 'invalid'
                ? 'border-destructive focus-visible:ring-destructive/40'
                : slugStatus.kind === 'ok'
                  ? 'border-emerald-400'
                  : undefined
            }
          />
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du chapitre"
          required
          className="flex-1"
        />
        <Button type="submit" disabled={pending || slugStatus.kind === 'invalid' || slugStatus.kind === 'taken'}>
          {pending ? 'Création…' : 'Créer'}
        </Button>
      </div>

      {/* Live slug feedback */}
      <div id="slug-feedback" className="min-h-5 text-xs">
        {slugStatus.kind === 'invalid' && <span className="text-destructive">⚠︎ {slugStatus.message}</span>}
        {slugStatus.kind === 'taken' && (
          <span className="text-amber-700">
            ⚠︎ Slug déjà utilisé.{' '}
            <button
              type="button"
              onClick={() => setSlug(slugStatus.suggestion)}
              className="underline hover:text-amber-900"
            >
              Utiliser « {slugStatus.suggestion} »
            </button>
          </span>
        )}
        {slugStatus.kind === 'ok' && <span className="text-emerald-700">✓ Slug disponible</span>}
      </div>
    </form>
  );
}
