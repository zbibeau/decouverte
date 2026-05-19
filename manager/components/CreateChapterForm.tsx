'use client';

import { useRef, useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  /** Server action that creates a chapter. Accepts FormData. Throws on
   *  duplicate slug / missing fields. */
  createAction: (formData: FormData) => Promise<void>;
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
 */
export function CreateChapterForm({ createAction }: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedSlug = slug.trim();
    const trimmedTitle = title.trim();
    if (!trimmedSlug || !trimmedTitle) {
      toast.error('Slug et titre requis.');
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('slug', trimmedSlug);
        fd.set('title', trimmedTitle);
        await createAction(fd);
        // Server action succeeded → revalidatePath refreshes the list.
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <Input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="STEP_NEW_THING"
        required
        className="sm:max-w-[200px]"
      />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre du chapitre"
        required
        className="flex-1"
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Création…' : 'Créer'}
      </Button>
    </form>
  );
}
