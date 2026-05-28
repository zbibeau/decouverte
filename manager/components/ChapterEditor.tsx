'use client';

import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import type { ContentBlock } from '@shared/content-schema';
import { extractUsedVariableKeys } from '@/lib/usedVariables';

import { AddBlockForm } from '@/components/AddBlockForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { DuplicateBlockMenu } from '@/components/DuplicateBlockMenu';
import { InPageSearchInput } from '@/components/InPageSearchInput';
import { PreviewPanel } from '@/components/PreviewPanel';
import { SearchHighlightBanner } from '@/components/SearchHighlightBanner';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import type { VariableMeta } from '@/components/blocks/editor-types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ExpandableCreatePanel } from '@/components/ui/ExpandableCreatePanel';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { extractBlockSearchTextWeighted, extractSnippet } from '@/lib/blockSearch';
import { FamilyIcon } from '@/lib/familyIcons';
import { TAG_COLOR_HEX, isTagColor } from '@/lib/tagColors';
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
  /** Maintenance tags attached to this block (via `block_tag`).
   *  Surfaced as colored chips on the row so the editor sees at a
   *  glance which interfaces each block depicts. */
  tags?: Array<{ id: string; label: string; color: string }>;
}

interface Props {
  parcoursSlug: string;
  chapter: { id: string; slug: string; title: string };
  blocks: BlockRow[];
  variables: VariableMeta[];
  /** Navbar variants registered on this parcours — used to render a small
   *  colored pill on each block row whose payload references one. */
  navbarVariants?: Array<{ key: string; title: string; color?: string }>;
  addBlockAction: (type: string) => Promise<void>;
  /**
   * Insert a sample block (curated payload from `SAMPLE_PAYLOADS`) at the
   * end of the current chapter. Powers the popover-driven "Ajouter un bloc"
   * UI that lets the user pick visually before inserting.
   *
   * Returns the newly-created block id so the client can immediately open
   * its editor (`/blocks/<id>`) — typical follow-up to "Ajouter un bloc" is
   * "now fill it in", so we save the user a manual pencil click.
   */
  insertSampleBlockAction: (type: string) => Promise<string>;
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

/**
 * Renders a snippet with every occurrence of the matching substring
 * wrapped in <mark>. Multiple hits in the same snippet all get the
 * yellow highlight — picking just the first felt inconsistent when
 * the query was short ("pa" appearing twice but only one mark).
 *
 * Local to this file ; the palette's PaletteItem has a similar
 * helper but unexported.
 */
function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{snippet}</>;
  const lower = snippet.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  while (cursor < snippet.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      parts.push(snippet.slice(cursor));
      break;
    }
    if (idx > cursor) parts.push(snippet.slice(cursor, idx));
    parts.push(
      <mark key={`m-${idx}`} className="rounded-sm bg-amber-200 px-0.5 not-italic text-amber-950">
        {snippet.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return <>{parts}</>;
}

/**
 * Renders the maintenance tags attached to a block as colored pills,
 * inline on its row. Same visual contract as the ⌘K palette chips
 * (uses `TAG_COLOR_HEX` so colors render reliably regardless of how
 * Tailwind's JIT scans dynamic classNames). Returns null when there
 * are no tags so the row keeps its layout untouched.
 */
function BlockTagsChips({ tags }: { tags?: BlockRow['tags'] }) {
  if (!tags || tags.length === 0) {
    // Empty state : surface a small amber "Sans tag" badge instead of
    // rendering nothing. Helps the editor spot blocks that still need
    // a maintenance tag at a glance — matches the orange counter shown
    // at the top of the block list.
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
        title="Aucun tag de maintenance sur ce bloc"
      >
        <span aria-hidden="true">⚠</span>
        <span>Sans tag</span>
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1">
      {tags.map((t) => {
        const safe = isTagColor(t.color) ? t.color : 'amber';
        const hex = TAG_COLOR_HEX[safe];
        return (
          <span
            key={t.id}
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: hex.chip, color: hex.text }}
            title={`Tag de maintenance : ${t.label}`}
          >
            <span aria-hidden="true">🏷</span>
            <span>{t.label}</span>
          </span>
        );
      })}
    </span>
  );
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
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(props.blocks[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();

  // ⌘K search context : when the user lands here from the palette,
  // its query is in `?q=`. We use it to (a) show a banner, (b) mark
  // matching blocks with a yellow ring + snippet under their summary,
  // (c) auto-scroll the first match into view.
  //
  // `localSearch` is the in-page filter input — a second source of
  // truth so the user can keep filtering blocks after dismissing the
  // banner. It is seeded from `?q=` on mount + on URL changes (so
  // clearing the banner clears the input too).
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [localSearch, setLocalSearch] = useState(urlQuery);
  useEffect(() => {
    setLocalSearch(urlQuery);
  }, [urlQuery]);
  const searchQuery = localSearch.trim();
  const matchedBlockIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const b of props.blocks) {
      const text = extractBlockSearchTextWeighted(b.payload).full;
      if (text.includes(q)) ids.add(b.id);
    }
    return ids;
  }, [searchQuery, props.blocks]);
  // Snippet ±32 chars around the match per block. Pre-computed once
  // per render rather than inside the For loop so re-renders don't
  // re-walk the payload of unaffected rows.
  const snippetByBlockId = useMemo(() => {
    if (!searchQuery) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const b of props.blocks) {
      const text = extractBlockSearchTextWeighted(b.payload).full;
      const snippet = extractSnippet(text, searchQuery, 32);
      if (snippet) map.set(b.id, snippet);
    }
    return map;
  }, [searchQuery, props.blocks]);

  // Keyboard nav over the block list:
  //   ↑↓ to highlight a block, Enter to open its editor, Esc → chapter list.
  const { selectedIdx: kbdIdx, isClient: kbdActive } = useListKeyboardNav(
    props.blocks,
    (b) => `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${b.id}`,
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
      router.push(`/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${id}`);
    },
    [router, props.parcoursSlug, props.chapter.slug],
  );

  // Auto-scroll the list ONLY when the change came from a click. Preview
  // scrolls just update the highlight without grabbing focus.
  //
  // The FIRST run (initial mount) is skipped on purpose : arriving on the
  // page should land at the top (that's `ScrollResetOnNavigate`'s job),
  // not auto-scroll to whichever block is selected by default. Because
  // ChapterEditor mounts AFTER the layout-level scroll reset has already
  // run, an unguarded `scrollIntoView` here would override it and leave
  // the editor "a bit too low / too far right" on every navigation. We
  // only want this scroll on genuine in-session selection changes.
  const didInitialAutoScrollRef = useRef(false);
  useEffect(() => {
    if (!didInitialAutoScrollRef.current) {
      didInitialAutoScrollRef.current = true;
      return;
    }
    if (!selectedBlockId || !listRef.current) return;
    if (lastSourceRef.current === 'preview') return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-row-id="${selectedBlockId}"]`);
    // `inline: 'nearest'` keeps the horizontal axis put — only the
    // vertical position is adjusted to reveal the row.
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [selectedBlockId]);

  // When the user lands here from a ⌘K search, scroll the first
  // matching block into view + select it in the preview. Runs once
  // per `searchQuery` change so re-opening the same query doesn't
  // re-trigger on every render.
  useEffect(() => {
    if (!searchQuery || matchedBlockIds.size === 0) return;
    const firstMatch = props.blocks.find((b) => matchedBlockIds.has(b.id));
    if (!firstMatch) return;
    lastSourceRef.current = 'click';
    manualScrollAtRef.current = Date.now();
    setSelectedBlockId(firstMatch.id);
    // requestAnimationFrame so the row exists in the DOM before we
    // try to scroll to it (the matchedBlockIds set is built from
    // props.blocks, the DOM mirrors props.blocks → safe).
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${firstMatch.id}"]`);
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function withRefresh<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
    return (...args: T) =>
      startTransition(async () => {
        await fn(...args);
        router.refresh();
      });
  }

  const deleteWithRefresh = withRefresh(props.deleteBlockAction);
  async function handleDelete(blockId: string) {
    const block = props.blocks.find((b) => b.id === blockId);
    const summary = block ? summarizeBlock(block.type, block.payload) : '';
    const ok = await confirm({
      title: `Supprimer ce bloc${summary ? ` (${summary})` : ''} ?`,
      message:
        'Le brouillon sera créé si nécessaire ; la version publiée reste intacte tant que tu ne cliques pas « Publier ».',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
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
        const targetTitle = props.chapters?.find((c) => c.id === targetChapterId)?.title ?? result.chapterSlug;
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
  // After the server action returns the new block id, navigate straight to
  // its editor page (`/blocks/<id>`). Typical user flow after "Ajouter un
  // bloc" is "now fill it in", so saving a pencil click on the just-inserted
  // row keeps momentum. The router.push triggers a fresh server render of
  // the block editor route, so no separate router.refresh() is needed — the
  // chapter list will also be re-fetched when the user comes back via the
  // "Retour aux chapitres" affordance. Errors bubble up to the popover's
  // toast handler.
  const handleInsertSample = async (type: string) => {
    const newBlockId = await props.insertSampleBlockAction(type);
    router.push(`/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${newBlockId}`);
  };

  return (
    // `minmax(0,1fr)` rather than `1fr` for the left track : a bare `1fr`
    // grid track has an implicit `min-width: auto`, so it refuses to
    // shrink below its content's min-content width — a long block summary
    // or the "Ajouter un bloc" row then forces the whole grid wider than
    // the viewport, producing a horizontal scrollbar (the editor arrived
    // scrolled "a bit too far right"). `minmax(0,1fr)` lets the track
    // shrink to 0 and the block rows (which already `truncate`) handle
    // the overflow gracefully.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),560px]">
      <div className="min-w-0 space-y-6">
        <div>
          <Link href={`/parcours/${props.parcoursSlug}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux chapitres
            </Button>
          </Link>
          <h2 className="mt-3 text-lg font-semibold">{props.chapter.title}</h2>
          <p className="text-muted-foreground text-xs">
            <code>{props.chapter.slug}</code>
          </p>
        </div>

        {/* Banner shown only when ?q=<query> is in the URL (i.e. the
            user landed here from a ⌘K search). Surfaces the original
            query + match count + a clear button. */}
        <SearchHighlightBanner matchCount={matchedBlockIds.size} />
        {/* In-page filter — persists across banner dismissal so the
            user can keep filtering blocks without re-opening ⌘K.
            Seeded from `?q=` on mount, independent afterwards. */}
        <InPageSearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="🔍 Filtrer les blocs de ce chapitre…"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FamilyIcon family="block" className="h-4 w-4" />
              Blocs
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {props.blocks.length} bloc(s). Clique sur un bloc pour le centrer dans la preview, sur le crayon pour
              l&apos;éditer.
            </p>
            {/* Permanent untagged-block counter for this chapter. Mirrors
                the parcours-level counter in DraftStatusBar but scoped
                to the current chapter so the editor sees coverage at a
                glance while working inside one. */}
            {(() => {
              const untagged = props.blocks.filter((b) => (b.tags?.length ?? 0) === 0).length;
              if (untagged === 0) {
                return props.blocks.length > 0 ? (
                  <p className="mt-1 text-[11px] text-emerald-700">🏷 Tous les blocs sont taggés</p>
                ) : null;
              }
              return (
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  🏷 {untagged} bloc{untagged > 1 ? 's' : ''} sans tag dans ce chapitre
                </p>
              );
            })()}
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
                const isMatch = matchedBlockIds.has(b.id);
                const snippet = snippetByBlockId.get(b.id);
                return (
                  <div
                    data-row-id={b.id}
                    className={cn(
                      // Single-line layout for the row itself — no
                      // flex-wrap, otherwise long block summaries push
                      // the action buttons (pencil/copy/trash) onto a
                      // second line, creating the visual inconsistency
                      // the user reported. The optional snippet sits
                      // OUTSIDE the flex row, below it.
                      'relative py-3 transition-colors',
                      isSelected && 'bg-primary/5 -mx-5 px-5',
                      isInspected && '!bg-amber-100 ring-2 ring-amber-300',
                      // Match from ⌘K search : yellow ring + tint. Stays
                      // on top of selected styling, gives way to inspected
                      // (which is even stronger).
                      isMatch && !isInspected && 'rounded-md bg-amber-50/70 ring-2 ring-amber-300',
                      isKbd && !isInspected && 'ring-brand-primary-300/60 ring-1',
                    )}
                  >
                    {isInspected && (
                      <div className="absolute -top-7 left-0 z-20 rounded-md bg-amber-900 px-2 py-1 text-[10px] font-medium text-white shadow">
                        Bloc{' '}
                        {(BLOCK_TYPE_LABELS as Record<string, string>)[inspectedBlockType ?? ''] ??
                          inspectedBlockType ??
                          b.type}{' '}
                        — clique ✏️ pour éditer
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {dragHandle}
                      <button
                        type="button"
                        onClick={() => selectBlock(b.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        title="Centrer dans la preview"
                      >
                        <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs">{b.order}</span>
                        <span className="bg-muted text-muted-foreground inline-flex h-6 shrink-0 items-center rounded px-2 text-[11px] font-medium uppercase tracking-wide">
                          {(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{summarizeBlock(b.type, b.payload)}</span>
                        {/* Navbar variant indicator — surfaces the "Tool 1
                            navbar" used by this block at a glance. */}
                        {(() => {
                          const variantKey = (b.payload as { navbar?: { variant?: string } } | null)?.navbar?.variant;
                          if (!variantKey) return null;
                          const v = (props.navbarVariants ?? []).find((x) => x.key === variantKey);
                          return (
                            <span
                              className="border-border inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[10px]"
                              title={`Navbar « ${variantKey} »`}
                            >
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ background: v?.color || '#94a3b8' }}
                              />
                              {v?.title ?? variantKey}
                            </span>
                          );
                        })()}
                        <BlockTagsChips tags={b.tags} />
                        <BlockDiffBadge diff={b.diff} />
                      </button>
                      {/* Snippet, action buttons (pencil/duplicate/delete)
                          continue on the SAME flex row so they sit at
                          the end of the line, never wrap. */}
                      <Link
                        href={
                          // Propagate the search context to the block
                          // editor when the user clicks the pencil on a
                          // matched block — they keep their bearings.
                          searchQuery
                            ? `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${b.id}?q=${encodeURIComponent(searchQuery)}`
                            : `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}/blocks/${b.id}`
                        }
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
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                    {/* Snippet rendered BELOW the row (outside the
                        flex container) so it has full width and
                        doesn't push the action buttons to a new line
                        when the title is long. Only shown when the
                        ⌘K search has a match in the block body. */}
                    {snippet && (
                      <p className="text-muted-foreground mt-1 pl-[44px] text-[11px] italic leading-snug">
                        <HighlightedSnippet snippet={snippet} query={searchQuery} />
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {props.blocks.length === 0 && (
              // Empty state with an explicit nudge towards the
              // "Ajouter un bloc" card below — turn the dead-end "Aucun
              // bloc." line into the first step of a guided flow.
              <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center">
                <div className="text-3xl" aria-hidden="true">
                  🧱
                </div>
                <p className="text-sm font-medium">Aucun bloc dans ce chapitre</p>
                <p className="text-muted-foreground max-w-md text-xs">
                  Choisis un type de bloc ci-dessous (texte, vidéo, formulaire, condition…) — un aperçu live
                  s&apos;ouvre, puis « Insérer cet exemple » t&apos;envoie directement dans l&apos;éditeur du nouveau
                  bloc.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <ExpandableCreatePanel label="Ajouter un bloc">
          <AddBlockForm insertSampleAction={handleInsertSample} />
        </ExpandableCreatePanel>
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
