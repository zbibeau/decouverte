'use client';

import { ChevronRight, Copy, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';

interface ChapterRow {
  id: string;
  slug: string;
  title: string;
  order: number;
  /** Draft diff state: 'new' (created in draft), 'modified' (diff vs published), or undefined (pristine / no draft). */
  diff?: 'new' | 'modified' | 'pristine';
}

interface Props {
  parcoursSlug: string;
  chapters: ChapterRow[];
  reorderAction: (orderedIds: string[]) => Promise<void>;
  deleteAction: (chapterId: string) => Promise<void>;
  duplicateAction: (chapterId: string) => Promise<{ id: string; slug: string }>;
}

function DiffBadge({ diff }: { diff?: ChapterRow['diff'] }) {
  if (diff === 'new') {
    return (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
        Nouveau
      </span>
    );
  }
  if (diff === 'modified') {
    return (
      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
        Modifié
      </span>
    );
  }
  return null;
}

export function ChapterList({
  parcoursSlug,
  chapters,
  reorderAction,
  deleteAction,
  duplicateAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  // ↑↓ / Enter / Esc keyboard navigation. Esc/← goes back to the parcours
  // list (home page).
  const { selectedIdx, isClient } = useListKeyboardNav(
    chapters,
    (c) => `/parcours/${parcoursSlug}/chapters/${c.slug}`,
    '/',
  );

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      await reorderAction(orderedIds);
      router.refresh();
    });
  }
  function handleDuplicate(id: string, title: string) {
    startTransition(async () => {
      try {
        const created = await duplicateAction(id);
        toast.success(`Chapitre dupliqué : « ${title} » → « ${created.slug} »`);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] duplicate failed', e);
        toast.error(`Échec de la duplication de « ${title} »`);
      }
    });
  }
  function handleDelete(id: string, title: string) {
    if (
      !window.confirm(
        `Supprimer le chapitre « ${title} » ?\n\nCette action ouvre/modifie le brouillon ; elle ne touche pas la version publiée tant que tu n'as pas cliqué « Publier ».`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteAction(id);
        toast.success(`Chapitre « ${title} » supprimé du brouillon`);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] delete failed', e);
        toast.error(`Échec de la suppression de « ${title} »`);
      }
    });
  }

  if (chapters.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aucun chapitre.</p>;
  }

  return (
    <SortableList
      items={chapters}
      onReorder={handleReorder}
      itemClassName="border-b border-border last:border-b-0"
      renderItem={(c, dragHandle, idx) => (
        <div
          className={
            'flex items-center gap-2 rounded px-2 py-3 transition-colors ' +
            (isClient && idx === selectedIdx
              ? 'bg-brand-primary-50/60 ring-1 ring-brand-primary-300/50'
              : '')
          }
        >
          {dragHandle}
          <Link
            href={`/parcours/${parcoursSlug}/chapters/${c.slug}`}
            className="flex flex-1 items-center gap-3 hover:underline"
          >
            <span className="font-mono text-xs text-muted-foreground">{c.order}.</span>
            <span className="font-medium">{c.title}</span>
            <code className="text-xs text-muted-foreground">({c.slug})</code>
            <DiffBadge diff={c.diff} />
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            title="Dupliquer"
            disabled={isPending}
            onClick={() => handleDuplicate(c.id, c.title)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Supprimer"
            disabled={isPending}
            onClick={() => handleDelete(c.id, c.title)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    />
  );
}
