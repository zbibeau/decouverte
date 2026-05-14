'use client';

import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import type { ContentBlock } from '@shared/content-schema';
import { extractUsedVariableKeys } from '@/lib/usedVariables';

import { AddBlockForm } from '@/components/AddBlockForm';
import { DuplicateBlockMenu } from '@/components/DuplicateBlockMenu';
import { PreviewPanel } from '@/components/PreviewPanel';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import type { VariableMeta } from '@/components/blocks/editor-types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { summarizeBlock } from '@/lib/blockSummary';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';
import { cn } from '@/lib/utils';

interface BlockRow {
  id: string;
  order: number;
  type: string;
  payload: Record<string, unknown>;
  /** Draft diff: 'new', 'modified', 'pristine', or undefined (no draft). */
  diff?: 'new' | 'modified' | 'pristine';
}

interface Props {
  parcoursSlug: string;
  chapter: { id: string; slug: string; title: string };
  blocks: BlockRow[];
  variables: VariableMeta[];
  addBlockAction: (type: string) => Promise<void>;
  /**
   * Insert a sample block (curated payload from `SAMPLE_PAYLOADS`) at the
   * end of the current chapter. Powers the popover-driven "Ajouter un bloc"
   * UI that lets the user pick visually before inserting.
   */
  insertSampleBlockAction: (type: string) => Promise<void>;
  deleteBlockAction: (blockId: string) => Promise<void>;
  duplicateBlockAction: (blockId: string) => Promise<string>;
  copyBlockToChapterAction: (
    blockId: string,
    targetChapterId: string,
  ) => Promise<{ blockId: string; chapterId: string; chapterSlug: string }>;
  /** All chapters of the parcours (draft view) — used by the "Copy to…" menu. */
  chapters?: { id: string; slug: string; title: string }[];
  reorderBlocksAction: (orderedIds: string[]) => Promise<void>;
  /** parcours_version id the preview iframe should read from (draft or null). */
  editingVersionId?: string | null;
  /** Published parcours_version id — enables the draft/published toggle. */
  publishedVersionId?: string | null;
}

function BlockDiffBadge({ diff }: { diff?: BlockRow['diff'] }) {
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

export function ChapterEditor(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    props.blocks[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();

  // Keyboard nav over the block list:
  //   ↑↓ to highlight a block, Enter to open its editor, Esc → chapter list.
  const { selectedIdx: kbdIdx, isClient: kbdActive } = useListKeyboardNav(
    props.blocks,
    (b) =>
      `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${b.id}`,
    `/parcours/${props.parcoursSlug}`,
  );

  // Variables actually referenced by this chapter's content. The simulator
  // hides itself when this set is empty.
  const activeVariables = useMemo(() => {
    const usedKeys = extractUsedVariableKeys(props.blocks as unknown as ContentBlock[]);
    return props.variables.filter((v) => usedKeys.has(v.key));
  }, [props.blocks, props.variables]);

  // Timestamp of the last manual click in the list. While we're inside a
  // 1.2s window after a click, we ignore visibleBlock messages from the
  // iframe so the smooth-scroll doesn't make the highlight flicker through
  // the intermediate blocks.
  const manualScrollAtRef = useRef<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Where the most recent selectedBlockId update came from. We use this to
  // decide whether to auto-scroll the list — only on clicks, never on
  // preview scrolls (otherwise the visual focus jumps from the preview to
  // the list, which is annoying when the user is reading the preview).
  const lastSourceRef = useRef<'click' | 'preview'>('click');

  function selectBlock(id: string) {
    lastSourceRef.current = 'click';
    manualScrollAtRef.current = Date.now();
    setSelectedBlockId(id);
  }

  // Sync coming back from the iframe when the user scrolls the preview.
  const handleVisibleBlock = useCallback((id: string) => {
    if (Date.now() - manualScrollAtRef.current < 1200) return;
    lastSourceRef.current = 'preview';
    setSelectedBlockId((prev) => (prev === id ? prev : id));
  }, []);

  // Click-to-inspect: the user clicked an actual block inside the preview
  // iframe. Behave like a click in the list (scroll the row into view, full
  // attention) AND show a transient ambar flash + a small tooltip with the
  // block type for ~3s.
  const [inspectedBlockId, setInspectedBlockId] = useState<string | null>(null);
  const [inspectedBlockType, setInspectedBlockType] = useState<string | null>(null);
  const handleBlockClicked = useCallback(
    (id: string, type?: string) => {
      lastSourceRef.current = 'click';
      manualScrollAtRef.current = Date.now();
      setSelectedBlockId(id);
      setInspectedBlockId(id);
      setInspectedBlockType(type ?? null);
      setTimeout(() => {
        setInspectedBlockId((cur) => (cur === id ? null : cur));
      }, 3000);
      // Navigate to the block edit page so the editor opens on the clicked
      // block. The chapter list page is a navigator — clicking in the
      // preview is the fastest path to the per-block editor.
      router.push(
        `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${id}`,
      );
    },
    [router, props.parcoursSlug, props.chapter.slug],
  );

  // Auto-scroll the list ONLY when the change came from a click. Preview
  // scrolls just update the highlight without grabbing focus.
  useEffect(() => {
    if (!selectedBlockId || !listRef.current) return;
    if (lastSourceRef.current === 'preview') return;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-row-id="${selectedBlockId}"]`,
    );
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedBlockId]);

  function withRefresh<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
    return (...args: T) =>
      startTransition(async () => {
        await fn(...args);
        router.refresh();
      });
  }

  const deleteWithRefresh = withRefresh(props.deleteBlockAction);
  function handleDelete(blockId: string) {
    const block = props.blocks.find((b) => b.id === blockId);
    const summary = block ? summarizeBlock(block.type, block.payload) : '';
    if (
      !window.confirm(
        `Supprimer ce bloc${summary ? ` (${summary})` : ''} ?\n\nLe brouillon sera créé si nécessaire ; la version publiée reste intacte tant que tu ne cliques pas « Publier ».`,
      )
    ) {
      return;
    }
    deleteWithRefresh(blockId);
  }
  function handleDuplicate(blockId: string) {
    startTransition(async () => {
      try {
        await props.duplicateBlockAction(blockId);
        toast.success('Bloc dupliqué — copie ajoutée juste après');
        router.refresh();
      } catch (e) {
        console.error('[ChapterEditor] duplicate failed', e);
        toast.error(`Échec de la duplication : ${(e as Error).message}`);
      }
    });
  }
  function handleCopyTo(blockId: string, targetChapterId: string) {
    startTransition(async () => {
      try {
        const result = await props.copyBlockToChapterAction(blockId, targetChapterId);
        const targetTitle =
          props.chapters?.find((c) => c.id === targetChapterId)?.title ?? result.chapterSlug;
        toast.success(`Bloc copié vers « ${targetTitle} »`);
        router.refresh();
      } catch (e) {
        console.error('[ChapterEditor] copy-to failed', e);
        toast.error(`Échec de la copie : ${(e as Error).message}`);
      }
    });
  }
  const handleReorder = withRefresh(props.reorderBlocksAction);
  const handleAdd = withRefresh(props.addBlockAction);
  // Insert with sample payload — called from the new popover-driven Add UI.
  // We wrap with router.refresh so the chapter list re-renders with the new
  // block, but we DON'T swallow errors — the popover surfaces them via toast.
  const handleInsertSample = async (type: string) => {
    await props.insertSampleBlockAction(type);
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,560px]">
      <div className="space-y-6">
        <div>
          <Link href={`/parcours/${props.parcoursSlug}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux chapitres
            </Button>
          </Link>
          <h2 className="mt-3 text-lg font-semibold">{props.chapter.title}</h2>
          <p className="text-xs text-muted-foreground">
            <code>{props.chapter.slug}</code>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Blocs</CardTitle>
            <p className="text-xs text-muted-foreground">
              {props.blocks.length} bloc(s). Clique sur un bloc pour le centrer dans la preview, sur
              le crayon pour l&apos;éditer.
            </p>
          </CardHeader>
          <CardContent ref={listRef} className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <SortableList
              items={props.blocks}
              onReorder={handleReorder}
              itemClassName="border-b border-border last:border-b-0"
              renderItem={(b, dragHandle, idx) => {
                const isSelected = selectedBlockId === b.id;
                const isInspected = inspectedBlockId === b.id;
                const isKbd = kbdActive && kbdIdx === idx;
                return (
                  <div
                    data-row-id={b.id}
                    className={cn(
                      'relative flex items-center gap-2 py-3 transition-colors',
                      isSelected && '-mx-5 bg-primary/5 px-5',
                      isInspected && '!bg-amber-100 ring-2 ring-amber-300',
                      isKbd && !isInspected && 'ring-1 ring-brand-primary-300/60',
                    )}
                  >
                    {isInspected && (
                      <div className="absolute -top-7 left-0 z-20 rounded-md bg-amber-900 px-2 py-1 text-[10px] font-medium text-white shadow">
                        Bloc {(BLOCK_TYPE_LABELS as Record<string, string>)[inspectedBlockType ?? ''] ??
                          inspectedBlockType ??
                          b.type}
                        {' '} — clique ✏️ pour éditer
                      </div>
                    )}
                    {dragHandle}
                    <button
                      type="button"
                      onClick={() => selectBlock(b.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                      title="Centrer dans la preview"
                    >
                      <span className="w-6 font-mono text-xs text-muted-foreground">{b.order}</span>
                      <span className="inline-flex h-6 items-center rounded bg-muted px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type}
                      </span>
                      <span className="flex-1 truncate text-sm">
                        {summarizeBlock(b.type, b.payload)}
                      </span>
                      <BlockDiffBadge diff={b.diff} />
                    </button>
                    <Link
                      href={`/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${b.id}`}
                    >
                      <Button variant="ghost" size="sm" title="Éditer">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DuplicateBlockMenu
                      chapters={props.chapters ?? []}
                      currentChapterSlug={props.chapter.slug}
                      disabled={isPending}
                      onDuplicateHere={() => handleDuplicate(b.id)}
                      onCopyTo={(targetChapterId) => handleCopyTo(b.id, targetChapterId)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Supprimer"
                      disabled={isPending}
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              }}
            />
            {props.blocks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun bloc.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajouter un bloc</CardTitle>
          </CardHeader>
          <CardContent>
            <AddBlockForm insertSampleAction={handleInsertSample} />
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block">
        <PreviewPanel
          chapterSlug={props.chapter.slug}
          parcoursSlug={props.parcoursSlug}
          variables={activeVariables}
          selectedBlockId={selectedBlockId}
          onVisibleBlock={handleVisibleBlock}
          onBlockClicked={handleBlockClicked}
          versionId={props.editingVersionId}
          publishedVersionId={props.publishedVersionId}
        />
      </div>
    </div>
  );
}
