'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  EyeOff,
  GripVertical,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';

import { TagsField, TagsHelpBanner } from '@/components/blocks/TagsField';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { TAG_COLOR_HEX, isTagColor } from '@/lib/tagColors';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';
import { uploadImageDirect } from '@/lib/uploadImageClient';
import { cn } from '@/lib/utils';

interface ChapterRow {
  id: string;
  slug: string;
  title: string;
  order: number;
  /** Sidebar grouping label (NULL = ungrouped). Edited inline in this list. */
  sectionLabel?: string | null;
  /** Optional sort key within a section. NULL = chapter `order` decides. */
  sectionOrder?: number | null;
  /** Background image URL displayed on the chapter card in the section
   *  panorama (chapterTransition / auto next-chapter transition). */
  cardImage?: string | null;
  /** Short title displayed on the chapter card. Falls back to `title`. */
  cardShortTitle?: string | null;
  /** Opt-out flag : when TRUE the chapter is hidden from BOTH the
   *  sidebar AND the ChapterTransitionGrid section panorama. Still
   *  reachable via direct URL / programmatic navigation. */
  hiddenFromNav?: boolean;
  /** Draft diff state: 'new' (created in draft), 'modified' (diff vs published), or undefined (pristine / no draft). */
  diff?: 'new' | 'modified' | 'pristine';
  /** Navbar variants used by top-level blocks of this chapter. Renders as
   *  small colored chips so the author sees at a glance which "sous-parties"
   *  the chapter contains. */
  navbars?: Array<{ key: string; title: string; color?: string }>;
  /** Number of blocks in this chapter that carry NO maintenance tag (neither
   *  top-level via `block_tag` nor nested via `payload.tagIds`). Rendered as
   *  a small amber "🏷 N sans tag" chip on the row so the editor spots
   *  coverage gaps without opening every chapter. Undefined = the page
   *  didn't compute it (legacy callers). */
  untaggedBlockCount?: number;
  /** Compact preview of this chapter's blocks — surfaced when the editor
   *  clicks the row's `>` arrow to expand the chapter inline (rather than
   *  navigating to the chapter editor page). Each entry carries enough
   *  to render a read-only row : type, ordered position, summary text
   *  and the merged tag list. Edit interactions still happen on the
   *  chapter page proper. Empty array = no blocks ; undefined = the
   *  page didn't compute it. */
  blocksPreview?: Array<{
    id: string;
    type: string;
    order: number;
    summary: string;
    tags: { id: string; label: string; color: string }[];
  }>;
}

interface Props {
  parcoursSlug: string;
  chapters: ChapterRow[];
  /** Cross-section drag-and-drop : the payload carries the new
   *  global order PLUS each chapter's (potentially updated) section
   *  assignment. The server then writes both `order` and
   *  `section_label` in one pass. */
  reorderAction: (orderedItems: Array<{ id: string; sectionLabel: string | null }>) => Promise<void>;
  deleteAction: (chapterId: string) => Promise<void>;
  duplicateAction: (chapterId: string) => Promise<{ id: string; slug: string }>;
  /** Server action persisting a chapter title/slug/section/card update.
   *  Writes go through the draft (cf. `updateChapterMeta`). */
  updateAction: (
    chapterId: string,
    title: string,
    slug: string,
    sectionLabel: string | null,
    sectionOrder: number | null,
    cardImage: string | null,
    cardShortTitle: string | null,
    hiddenFromNav: boolean,
  ) => Promise<void>;
  /** Server action swapping a section with its neighbour in the global
   *  chapter order. Powers the ↑ / ↓ buttons in each section header. */
  moveSectionAction: (sectionLabel: string | null, direction: -1 | 1) => Promise<void>;
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
  updateAction,
  moveSectionAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  // Local "edit mode" state — only one row at a time. When set, the row
  // renders an inline edit form instead of the static link.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Chapter ids currently expanded in-place — the > arrow toggles
  // membership. Rendering reads from `c.blocksPreview` so no fetch is
  // needed when the editor opens or closes a chapter ; the preview
  // refreshes on the next router.refresh() (e.g. after a block edit
  // elsewhere reloads the page).
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set());
  function toggleExpand(id: string) {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSectionLabel, setEditSectionLabel] = useState('');
  const [editSectionOrder, setEditSectionOrder] = useState('');
  const [editCardImage, setEditCardImage] = useState('');
  const [editCardShortTitle, setEditCardShortTitle] = useState('');
  const [editHiddenFromNav, setEditHiddenFromNav] = useState(false);
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const cardImageInputRef = useRef<HTMLInputElement | null>(null);

  function startEdit(c: ChapterRow) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditSlug(c.slug);
    setEditSectionLabel(c.sectionLabel ?? '');
    setEditSectionOrder(c.sectionOrder == null ? '' : String(c.sectionOrder));
    setEditCardImage(c.cardImage ?? '');
    setEditCardShortTitle(c.cardShortTitle ?? '');
    setEditHiddenFromNav(c.hiddenFromNav ?? false);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditSlug('');
    setEditSectionLabel('');
    setEditSectionOrder('');
    setEditCardImage('');
    setEditCardShortTitle('');
    setEditHiddenFromNav(false);
  }
  async function handleCardImageUpload(file: File) {
    // Direct browser → Supabase upload : bypasses the Next.js server action
    // 1 MB body limit so photos > 1 MB go through (phone shots are typically
    // 2-8 MB). Same pattern as `VideoUploadButton`.
    setCardImageUploading(true);
    try {
      const res = await uploadImageDirect(file);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Upload échoué.');
        return;
      }
      setEditCardImage(res.url);
      toast.success('Image carte uploadée.');
    } catch (e) {
      console.error('[ChapterList] card image upload failed', e);
      toast.error(`Upload échoué : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCardImageUploading(false);
      if (cardImageInputRef.current) cardImageInputRef.current.value = '';
    }
  }
  function commitEdit(id: string, originalTitle: string) {
    const title = editTitle.trim();
    const slug = editSlug.trim();
    if (!title || !slug) {
      toast.error('Titre et slug requis.');
      return;
    }
    const sectionLabel = editSectionLabel.trim() === '' ? null : editSectionLabel.trim();
    const sectionOrder = editSectionOrder.trim() === '' ? null : Number(editSectionOrder);
    const cardImage = editCardImage.trim() === '' ? null : editCardImage.trim();
    const cardShortTitle = editCardShortTitle.trim() === '' ? null : editCardShortTitle.trim();
    startTransition(async () => {
      try {
        await updateAction(id, title, slug, sectionLabel, sectionOrder, cardImage, cardShortTitle, editHiddenFromNav);
        // Optimistic local update : merge the new values into the
        // displayed chapter immediately. Without this, the UI relied
        // solely on `router.refresh()` to bring back the new title,
        // but the RSC fetch sometimes hits a cache and the user sees
        // the OLD name until they force-reload. By overlaying the
        // fresh values on `optimisticChapters`, the row shows the
        // new title instantly ; once the refresh lands the useEffect
        // below clears the optimistic override and we fall back to
        // the (now-equal) props.
        const base = optimisticChapters ?? chapters;
        setOptimisticChapters(
          base.map((c) =>
            c.id === id
              ? {
                  ...c,
                  title,
                  slug,
                  sectionLabel,
                  sectionOrder,
                  cardImage,
                  cardShortTitle,
                  hiddenFromNav: editHiddenFromNav,
                }
              : c,
          ),
        );
        toast.success(`Chapitre « ${originalTitle} » mis à jour`);
        setEditingId(null);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] update failed', e);
        toast.error(`Échec de la mise à jour de « ${originalTitle} » — ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  // dnd-kit sensors — same defaults as the old SortableList (5 px
  // activation distance so a click on a button inside the row doesn't
  // accidentally start a drag).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Optimistic state for drag-and-drop. When the user drops a chapter
  // we mutate this immediately so the UI reflects the new order +
  // section assignment without waiting for the server roundtrip. The
  // expected order is tracked via `expectedOrderRef` so a stale
  // re-render with the pre-drop props doesn't snap the row back
  // (same trick the legacy SortableList used internally).
  const [optimisticChapters, setOptimisticChapters] = useState<ChapterRow[] | null>(null);
  const expectedOrderRef = useRef<string[] | null>(null);
  const effectiveChapters = optimisticChapters ?? chapters;

  // Flat list of keyboard-navigable rows : chapters first, with their
  // blocks interleaved RIGHT AFTER the chapter when expanded. The
  // selectedIdx returned by useListKeyboardNav points into this
  // virtual list — that lets the editor walk into a chapter's blocks
  // with ↑/↓ without leaving the chapters page.
  type NavItem =
    | { kind: 'chapter'; chapter: ChapterRow }
    | {
        kind: 'block';
        chapter: ChapterRow;
        block: NonNullable<ChapterRow['blocksPreview']>[number];
      };
  const navItems = useMemo<NavItem[]>(() => {
    const out: NavItem[] = [];
    for (const c of effectiveChapters) {
      out.push({ kind: 'chapter', chapter: c });
      if (expandedChapterIds.has(c.id)) {
        for (const b of c.blocksPreview ?? []) out.push({ kind: 'block', chapter: c, block: b });
      }
    }
    return out;
  }, [effectiveChapters, expandedChapterIds]);

  // ↑↓ for selection only — we handle → and Enter ourselves via the
  // custom keydown below so both keys trigger the SAME smart action
  // (otherwise the hook's → would navigate to the chapter page while
  // Enter would expand/edit, which is confusing). `getHref` returns
  // null on every row to suppress the hook's built-in → navigation.
  // ← still works via `parentHref` ('/' = parcours grid).
  const { selectedIdx, isClient } = useListKeyboardNav<NavItem>(navItems, () => null, '/');

  // O(1) lookup of a row's index in `navItems` from its id (chapter
  // or block). Rendered rows use this to decide whether the keyboard
  // cursor lands on them, and to apply the selection highlight.
  const navIdxByKey = useMemo(() => {
    const m = new Map<string, number>();
    navItems.forEach((item, i) => {
      m.set(item.kind === 'chapter' ? `c:${item.chapter.id}` : `b:${item.block.id}`, i);
    });
    return m;
  }, [navItems]);

  // Smart action dispatcher : produces the right behaviour for a given
  // NavItem. Reused by the keyboard handler (Enter / →) AND the slug
  // click handler so the three affordances are always in sync.
  //   - collapsed chapter   → toggle expand
  //   - expanded chapter    → open inline edit form
  //   - block (any state)   → navigate to its block editor
  const dispatchSmartAction = useCallback(
    (item: NavItem) => {
      if (item.kind === 'chapter') {
        if (expandedChapterIds.has(item.chapter.id)) {
          startEdit(item.chapter);
        } else {
          toggleExpand(item.chapter.id);
        }
      } else {
        router.push(`/parcours/${parcoursSlug}/chapters/${item.chapter.slug}/blocks/${item.block.id}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expandedChapterIds, parcoursSlug],
  );

  // Enter + → keyboard handler. Reserved for non-typing targets — the
  // inline edit form's own Enter handler (handleKey in the render
  // loop) takes precedence inside its inputs. Disabled while a
  // chapter is in edit mode so Enter inside the form doesn't fire
  // here too.
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (editingId !== null) return;
      const item = navItems[selectedIdx];
      if (!item) return;
      e.preventDefault();
      dispatchSmartAction(item);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navItems, selectedIdx, editingId, dispatchSmartAction]);

  // Currently-dragging chapter id — drives the DragOverlay below so a
  // ghost of the row follows the cursor even when crossing section
  // boundaries (without this, the original row's transform alone made
  // the visual disappear the moment the cursor left the source
  // SortableContext).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingChapter = draggingId ? (effectiveChapters.find((c) => c.id === draggingId) ?? null) : null;

  // Stable id passed to DndContext. Without this, @dnd-kit assigns an
  // auto-incrementing `aria-describedby="DndDescribedBy-N"` to every
  // draggable for its screen-reader announcements — the counter
  // starts fresh per render pass and easily desynchronises between
  // server (SSR) and client (hydration), producing a hydration
  // mismatch error in the console. `useId()` is SSR-stable so the
  // resulting describedBy ids align on both sides.
  const dndId = useId();

  // Sync optimistic state with the latest props. Two cases :
  //   - drag in flight (`expectedOrderRef` set) : only clear once the
  //     server has reached the expected order, otherwise a stale
  //     props update mid-drag would snap the row back to its old slot.
  //   - no drag (e.g. after a rename or any other refresh) : clear
  //     immediately so the UI follows the fresh props. Without this
  //     branch, a rename's optimistic title override would never be
  //     released and the OLD title could re-appear if props changed
  //     for another reason.
  useEffect(() => {
    if (expectedOrderRef.current) {
      const propsIds = chapters.map((c) => c.id);
      const expected = expectedOrderRef.current;
      const propsMatch = propsIds.length === expected.length && propsIds.every((id, i) => id === expected[i]);
      if (propsMatch) {
        expectedOrderRef.current = null;
        setOptimisticChapters(null);
      }
    } else {
      setOptimisticChapters(null);
    }
  }, [chapters]);

  /**
   * Handles BOTH intra-section reorders and cross-section moves :
   *   - drop on another chapter → adopt its section + slot in at that
   *     position
   *   - drop on a section's empty drop zone → join that section, at
   *     the end
   * The new global ordered list is sent to the server with each
   * chapter's (potentially new) section assignment in one payload.
   */
  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragCancel() {
    setDraggingId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const list = effectiveChapters;
    const activeChap = list.find((c) => c.id === activeId);
    if (!activeChap) return;

    // Compute target section + insertion index in the global order.
    let targetSection: string | null;
    let targetIndex: number;

    const overChap = list.find((c) => c.id === overId);
    if (overChap) {
      // Dropped on another chapter row — adopt its section.
      targetSection = overChap.sectionLabel ?? null;
      targetIndex = list.findIndex((c) => c.id === overId);
    } else if (overId.startsWith('section-drop-')) {
      // Dropped on a section's empty area / footer drop zone — join
      // that section at the END.
      const key = overId.slice('section-drop-'.length);
      targetSection = key === '__none__' ? null : key;
      const sectionItems = list.filter((c) => (c.sectionLabel?.trim() || '__none__') === key);
      if (sectionItems.length === 0) {
        targetIndex = list.length; // empty section — push to end of global list
      } else {
        const last = sectionItems[sectionItems.length - 1];
        targetIndex = list.findIndex((c) => c.id === last.id) + 1;
      }
    } else {
      return;
    }

    // Splice the active chapter at the new position, with possibly
    // updated section. We work on a copy so the original list is
    // untouched until React updates.
    const without = list.filter((c) => c.id !== activeId);
    const activeOldIdx = list.findIndex((c) => c.id === activeId);
    const adjustedIndex = activeOldIdx < targetIndex ? targetIndex - 1 : targetIndex;
    const next: ChapterRow[] = [
      ...without.slice(0, adjustedIndex),
      { ...activeChap, sectionLabel: targetSection },
      ...without.slice(adjustedIndex),
    ];

    // Skip the server roundtrip if nothing actually changed (defensive ;
    // dnd-kit usually filters this out, but the section reassignment
    // logic above might no-op).
    const sameOrder = next.every((c, i) => c.id === list[i]?.id);
    const sameSection = activeChap.sectionLabel === targetSection;
    if (sameOrder && sameSection) return;

    // Optimistic update — UI reflects the new state immediately.
    setOptimisticChapters(next);
    expectedOrderRef.current = next.map((c) => c.id);

    const payload = next.map((c) => ({ id: c.id, sectionLabel: c.sectionLabel ?? null }));
    startTransition(async () => {
      try {
        await reorderAction(payload);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] reorder failed', e);
        toast.error('Échec du déplacement du chapitre.');
        // Roll back the optimistic state — props are still the
        // pre-drop order so just clearing the override re-shows them.
        expectedOrderRef.current = null;
        setOptimisticChapters(null);
      }
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
  async function handleDelete(id: string, title: string) {
    const ok = await confirm({
      title: `Supprimer le chapitre « ${title} » ?`,
      message:
        "Cette action ouvre / modifie le brouillon ; elle ne touche pas la version publiée tant que tu n'as pas cliqué « Publier ».",
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
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
    // Empty state with an explicit affordance : the previous "Aucun
    // chapitre." line was correct but felt like a dead-end. Surfacing
    // the CreateChapterForm right here turns the empty state into the
    // landing CTA — one click and the author is off.
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center">
        <div className="text-3xl" aria-hidden="true">
          📖
        </div>
        <p className="text-sm font-medium">Aucun chapitre pour l&apos;instant</p>
        <p className="text-muted-foreground max-w-md text-xs">
          Un chapitre regroupe les blocs (texte, vidéo, formulaire…) qu&apos;un visiteur va parcourir. Crée le premier
          ci-dessous.
        </p>
      </div>
    );
  }

  // Group chapters by section. Uses `effectiveChapters` (optimistic
  // override during a drag, falling back to props.chapters otherwise)
  // so the UI updates instantly on drop without waiting for the
  // server roundtrip + refresh.
  const groupedChapters = (() => {
    const groups = new Map<string, ChapterRow[]>();
    const order: string[] = [];
    for (const c of effectiveChapters) {
      const key = c.sectionLabel?.trim() || '__none__';
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(c);
    }
    return order.map((key) => ({
      sectionLabel: key === '__none__' ? null : key,
      items: groups.get(key)!,
    }));
  })();

  // Flat list of distinct existing section labels — fuels the dropdown in
  // the edit form so the author picks from existing sections rather than
  // re-typing (and accidentally creating a duplicate).
  const existingSections = groupedChapters.filter((g) => g.sectionLabel != null).map((g) => g.sectionLabel as string);

  // Toolbar state : "Tout déplier" → "Tout replier" switch derived
  // from how many chapters are currently expanded. allExpanded === true
  // when every chapter id sits in `expandedChapterIds` — at that point
  // the action becomes "collapse all". Anything less, we offer "expand
  // all" so a single click reaches a uniform open state.
  const allExpanded = effectiveChapters.length > 0 && expandedChapterIds.size === effectiveChapters.length;
  function expandAll() {
    setExpandedChapterIds(new Set(effectiveChapters.map((c) => c.id)));
  }
  function collapseAll() {
    setExpandedChapterIds(new Set());
  }

  return (
    <div className="space-y-3">
      {groupedChapters.length > 1 && (
        <div className="border-border bg-muted/30 flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
          <span className="text-muted-foreground font-semibold">{groupedChapters.length} section(s) :</span>
          {groupedChapters.map((g, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
              {g.sectionLabel ? (
                <strong className="text-foreground">{g.sectionLabel}</strong>
              ) : (
                <em className="text-muted-foreground">(sans section)</em>
              )}
              <span className="text-muted-foreground">· {g.items.length}</span>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-[11px]"
            onClick={allExpanded ? collapseAll : expandAll}
            disabled={effectiveChapters.length === 0}
            title={
              allExpanded
                ? 'Refermer tous les aperçus de blocs'
                : 'Ouvrir tous les chapitres pour voir leurs blocs en place'
            }
          >
            <ChevronDown className={cn('mr-1 h-3.5 w-3.5 transition-transform', allExpanded ? '' : '-rotate-90')} />
            {allExpanded ? 'Tout replier' : 'Tout déplier'}
          </Button>
        </div>
      )}
      {groupedChapters.length <= 1 && effectiveChapters.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={allExpanded ? collapseAll : expandAll}
            title={
              allExpanded
                ? 'Refermer tous les aperçus de blocs'
                : 'Ouvrir tous les chapitres pour voir leurs blocs en place'
            }
          >
            <ChevronDown className={cn('mr-1 h-3.5 w-3.5 transition-transform', allExpanded ? '' : '-rotate-90')} />
            {allExpanded ? 'Tout replier' : 'Tout déplier'}
          </Button>
        </div>
      )}
      {/* Single DndContext spanning ALL sections so the user can drag
          a chapter between sections (cross-section drag-and-drop).
          The chapter's section_label is auto-updated on drop. The
          `id` prop is required to avoid an SSR hydration mismatch
          on the auto-generated DndDescribedBy ids (see `dndId`
          above). */}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {groupedChapters.map((group, groupIdx) => (
          <div key={group.sectionLabel ?? '__none__'} className="space-y-0">
            <div className="border-border bg-muted/40 text-brand-primary-700 flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
              {group.sectionLabel ? (
                <span>📁 {group.sectionLabel}</span>
              ) : (
                <span className="text-muted-foreground italic">(sans section)</span>
              )}
              <span className="text-muted-foreground/70">· {group.items.length} chapitre(s)</span>
              {/* Section reorder ↑/↓ — swaps the whole group with its
                 neighbour in the chapter list. Disabled at the boundaries
                 so the first section can't go higher and the last can't
                 go lower. */}
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Remonter cette section"
                  disabled={groupIdx === 0 || isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await moveSectionAction(group.sectionLabel, -1);
                        router.refresh();
                      } catch (e) {
                        toast.error(`Déplacement échoué : ${e instanceof Error ? e.message : String(e)}`);
                      }
                    });
                  }}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Descendre cette section"
                  disabled={groupIdx === groupedChapters.length - 1 || isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await moveSectionAction(group.sectionLabel, 1);
                        router.refresh();
                      } catch (e) {
                        toast.error(`Déplacement échoué : ${e instanceof Error ? e.message : String(e)}`);
                      }
                    });
                  }}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="border-border rounded-b-md border">
              <SortableContext items={group.items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <SectionDroppable id={`section-drop-${group.sectionLabel ?? '__none__'}`}>
                  {group.items.map((c, idx) => {
                    const isEditing = editingId === c.id;
                    // Section header is now rendered above each section group, not
                    // inline per row, so we no longer emit it here.
                    void idx;
                    function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEdit(c.id, c.title);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }
                    const chapterNavIdx = navIdxByKey.get(`c:${c.id}`);
                    const isSelectedRow = isClient && chapterNavIdx !== undefined && selectedIdx === chapterNavIdx;
                    return (
                      <SortableChapterRow key={c.id} id={c.id} className="border-border border-b last:border-b-0">
                        {(dragHandle) => (
                          <div
                            className={cn(
                              'rounded px-2 py-3 transition-colors',
                              // Whole-row hover + keyboard-selection background.
                              // Light brand-primary tint so the highlighted row
                              // pops without overpowering the chip / badge
                              // colors already present in the row.
                              'hover:bg-brand-primary-50/40',
                              isSelectedRow && 'bg-brand-primary-50',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {dragHandle}
                              {isEditing ? (
                                <>
                                  <span className="text-muted-foreground font-mono text-xs">{c.order}.</span>
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Titre du chapitre"
                                    className="h-8 flex-1 text-sm"
                                    autoFocus
                                    onKeyDown={handleKey}
                                  />
                                  <Input
                                    value={editSlug}
                                    onChange={(e) => setEditSlug(e.target.value)}
                                    placeholder="STEP_SLUG"
                                    className="h-8 w-[180px] font-mono text-xs"
                                    onKeyDown={handleKey}
                                  />
                                  <Button
                                    variant="default"
                                    size="sm"
                                    title="Enregistrer"
                                    disabled={isPending}
                                    onClick={() => commitEdit(c.id, c.title)}
                                  >
                                    <Check className="h-4 w-4" />
                                    Enregistrer
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Annuler"
                                    disabled={isPending}
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {/*
                  Row layout : the "open chapter" Link is split into two
                  segments around the "expand details" button so the
                  affordance sits visually right after the title. The
                  chevron-down icon signals "déplier / voir plus" — when
                  clicked it expands the inline edit form (title, slug,
                  section, card image, tags, masquer de la navigation…).

                  Two Link nodes pointing to the same destination is a bit
                  redundant but is the cleanest HTML-valid way to interleave
                  a button in the middle of a clickable row (nesting a
                  `<button>` inside `<a>` would be invalid). Both segments
                  share the same href + `hover:underline` so the row reads
                  visually as a single clickable area.
                */}
                                  {/* Order number sits OUTSIDE the navigation
                                      link now — it's just a positional cue,
                                      not a navigation target. Pulling it out
                                      also lets the Pencil edit button slot in
                                      right before the title rather than after,
                                      which the editor finds more natural (the
                                      eye reads ✎ as "this is editable" before
                                      reading the label). */}
                                  <span className="text-muted-foreground shrink-0 font-mono text-xs">{c.order}.</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Éditer les paramètres du chapitre (titre, slug, section, carte, tags…)"
                                    disabled={isPending}
                                    onClick={() => startEdit(c)}
                                  >
                                    {/* Pencil plutôt que ChevronDown : l'ancienne
                                        icône avait la même forme que la flèche
                                        d'expand inline et créait de l'ambiguïté
                                        (« déplier » vs « éditer »). Le crayon
                                        reste l'affordance la plus universelle
                                        pour "modifier les paramètres". */}
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Link
                                    href={`/parcours/${parcoursSlug}/chapters/${c.slug}`}
                                    // No `hover:underline` here : it used to
                                    // decorate the thumbnail / Masqué badge /
                                    // chapter title together, which felt noisy
                                    // and made the badge look clickable for
                                    // navigation. The whole-row violet hover
                                    // already conveys "this is interactive".
                                    className="flex items-center gap-3"
                                  >
                                    {c.cardImage && (
                                      // Small thumbnail of the chapter card image — gives the
                                      // author a visual marker to spot a chapter at a glance
                                      // (same image as the section-panorama card).
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={c.cardImage}
                                        alt=""
                                        className="border-border h-8 w-12 shrink-0 rounded border object-cover"
                                      />
                                    )}
                                    <span className="font-medium">{c.title}</span>
                                    {/* hidden_from_nav marker. The chapter still
                                        exists and is reachable by direct URL /
                                        programmatic navigation, but doesn't
                                        appear in the sidebar nor the section
                                        panorama. Surfaces it inline so the editor
                                        knows at a glance which rows are opt-out
                                        without having to open each one. */}
                                    {c.hiddenFromNav && (
                                      <span
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                                        title="Ce chapitre est masqué de la sidebar et du panorama de section. Reste accessible par URL directe."
                                      >
                                        <EyeOff className="h-3 w-3" />
                                        Masqué
                                      </span>
                                    )}
                                  </Link>
                                  {/* Click on the slug zone fires the SAME smart
                                      action as Enter / → on a selected chapter
                                      row : collapsed → expand, expanded → open
                                      the inline edit form. Wiring this to
                                      dispatchSmartAction directly keeps the three
                                      affordances (clavier, slug click, ↕ chevron)
                                      in lock-step. The pencil button next to the
                                      title remains the one-click "open edit" no
                                      matter the state, for editors who want an
                                      unconditional edit affordance. */}
                                  <button
                                    type="button"
                                    onClick={() => dispatchSmartAction({ kind: 'chapter', chapter: c })}
                                    className="flex flex-1 items-center gap-3 text-left"
                                    title={
                                      expandedChapterIds.has(c.id)
                                        ? 'Éditer les paramètres du chapitre'
                                        : 'Déplier ce chapitre pour voir ses blocs'
                                    }
                                    disabled={isPending}
                                  >
                                    <code className="text-muted-foreground hover:text-foreground text-xs hover:underline">
                                      ({c.slug})
                                    </code>
                                    <DiffBadge diff={c.diff} />
                                    <span className="ml-auto" />
                                  </button>
                                  {/* "Sans tag" chip pinned to the right, OUTSIDE
                                      the Link so it doesn't trigger navigation
                                      (clicking the chip would otherwise feel
                                      like a filter, not a navigation). The mr-3
                                      keeps it visually separated from the
                                      expand chevron so the editor doesn't
                                      target the chip when aiming for the
                                      expand affordance. */}
                                  {(c.untaggedBlockCount ?? 0) > 0 && (
                                    <span
                                      className="mr-3 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                      title={`${c.untaggedBlockCount} bloc(s) de ce chapitre n'ont pas encore de tag de maintenance`}
                                    >
                                      <span aria-hidden="true">🏷</span>
                                      <span>{c.untaggedBlockCount} sans tag</span>
                                    </span>
                                  )}
                                  {/* Toggle inline expand. The > arrow used to
                                      navigate to the chapter edit page (which is
                                      what the chapter title link still does), but
                                      the editor asked for a peek-without-leaving
                                      experience. Clicking now reveals the blocks
                                      preview below. */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title={
                                      expandedChapterIds.has(c.id)
                                        ? 'Refermer le résumé des blocs'
                                        : 'Voir les blocs de ce chapitre (aperçu en place)'
                                    }
                                    disabled={isPending}
                                    onClick={() => toggleExpand(c.id)}
                                    aria-expanded={expandedChapterIds.has(c.id)}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'h-4 w-4 transition-transform',
                                        expandedChapterIds.has(c.id) && 'rotate-90',
                                      )}
                                    />
                                  </Button>
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
                                    <Trash2 className="text-destructive h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                            {isEditing && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                                <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                  Section sidebar
                                </label>
                                <SectionPicker
                                  value={editSectionLabel}
                                  onChange={setEditSectionLabel}
                                  existingSections={existingSections}
                                  currentSection={c.sectionLabel ?? null}
                                />
                                <p className="text-muted-foreground basis-full text-[10px]">
                                  Choisis une section existante dans le dropdown, ou « + Nouvelle section… » pour en
                                  créer une. Vide = chapitre non groupé.
                                </p>
                                <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                  Ordre
                                </label>
                                <Input
                                  type="number"
                                  value={editSectionOrder}
                                  onChange={(e) => setEditSectionOrder(e.target.value)}
                                  placeholder="(auto)"
                                  className="h-8 w-[80px] text-xs"
                                  onKeyDown={handleKey}
                                />
                                <div className="basis-full" />
                                <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                  Titre carte
                                </label>
                                <Input
                                  value={editCardShortTitle}
                                  onChange={(e) => setEditCardShortTitle(e.target.value)}
                                  placeholder={`(défaut : ${c.title})`}
                                  className="h-8 flex-1 text-sm"
                                  onKeyDown={handleKey}
                                />
                                <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                  Image carte
                                </label>
                                <Input
                                  value={editCardImage}
                                  onChange={(e) => setEditCardImage(e.target.value)}
                                  placeholder="URL ou upload"
                                  className="h-8 flex-1 text-xs"
                                  onKeyDown={handleKey}
                                />
                                <input
                                  ref={cardImageInputRef}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleCardImageUpload(file);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={cardImageUploading}
                                  onClick={() => cardImageInputRef.current?.click()}
                                  title="Uploader une image"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  {cardImageUploading ? '…' : ''}
                                </Button>
                                {editCardImage && (
                                  <div className="basis-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={editCardImage}
                                      alt={`Aperçu ${c.title}`}
                                      className="border-border mt-1 h-24 w-auto rounded border object-cover"
                                    />
                                  </div>
                                )}
                                <p className="text-muted-foreground basis-full text-[10px]">
                                  Le titre court et l'image servent au visuel de transition de chapitre (panorama de
                                  section) en fin de chapitre.
                                </p>
                                {/* Opt-out toggle : when checked the chapter is
                            invisible in the sidebar AND in the panorama
                            cards. Useful for "thank you" / 404 /
                            branching-only chapters. */}
                                <label className="mt-2 flex basis-full cursor-pointer items-start gap-2 rounded-md border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editHiddenFromNav}
                                    onChange={(e) => setEditHiddenFromNav(e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-amber-600"
                                  />
                                  <span>
                                    <span className="font-medium text-amber-900">Masquer de la navigation</span>
                                    <br />
                                    <span className="text-muted-foreground text-[10px] leading-snug">
                                      Le chapitre n'apparaîtra ni dans la sidebar ni dans les cartes du panorama de
                                      section. Il reste accessible par URL directe ou via un branchement programmatique.
                                    </span>
                                  </span>
                                </label>
                                {/* Maintenance tags for the chapter's card_image —
                            same vocabulary as block-level tags (the global
                            `tag` table is shared). Persisted directly via
                            `chapter_tag` join, no draft/publish cycle. */}
                                <div className="basis-full space-y-2 pt-2">
                                  <TagsHelpBanner contextHint="Décris ici l'interface produit que l'image-carte de ce chapitre représente (ex. fiche patient, agenda)." />
                                  <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                    Tags de maintenance
                                  </label>
                                  <TagsField target={{ kind: 'chapter', chapterId: c.id }} />
                                </div>
                              </div>
                            )}
                            {/* Navbar chips removed from this row per UX
                              feedback : too noisy in a list of 10+
                              chapters. The chips are still rendered
                              INSIDE the chapter detail view
                              (`ChapterEditor.tsx`), per block, where
                              the context makes the variant relevant. */}
                            {/* Inline expand : read-only preview of the
                                chapter's blocks. Rendered only when the
                                chapter is in `expandedChapterIds` AND
                                not currently being edited (the edit
                                form already takes the full row). The
                                editor still navigates to the chapter
                                page (via the title link) to actually
                                edit ; this preview is just a peek. */}
                            {expandedChapterIds.has(c.id) && !isEditing && (
                              <ChapterBlocksPreview
                                blocks={c.blocksPreview ?? []}
                                chapterSlug={c.slug}
                                parcoursSlug={parcoursSlug}
                                selectedBlockId={(() => {
                                  // Translate the global `selectedIdx` into the
                                  // block id this preview should highlight.
                                  // Walks `navItems` once via the lookup map
                                  // — we're inside a render anyway, no
                                  // additional cost.
                                  if (!isClient) return null;
                                  const item = navItems[selectedIdx];
                                  if (item?.kind === 'block' && item.chapter.id === c.id) {
                                    return item.block.id;
                                  }
                                  return null;
                                })()}
                              />
                            )}
                          </div>
                        )}
                      </SortableChapterRow>
                    );
                  })}
                </SectionDroppable>
              </SortableContext>
            </div>
          </div>
        ))}
        {/* DragOverlay renders a portal-mounted ghost of the row that
          stays glued to the cursor for the whole duration of the drag,
          including when crossing the boundary between two
          SortableContexts (sections). Without it, the dragged row's
          local transform alone made the visual disappear the moment
          it left its source section. */}
        <DragOverlay dropAnimation={null}>
          {draggingChapter ? (
            <div className="border-border bg-background flex items-center gap-2 rounded-md border px-2 py-3 shadow-lg">
              <GripVertical className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground font-mono text-xs">{draggingChapter.order}.</span>
              {draggingChapter.cardImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draggingChapter.cardImage}
                  alt=""
                  className="border-border h-8 w-12 shrink-0 rounded border object-cover"
                />
              )}
              <span className="font-medium">{draggingChapter.title}</span>
              <code className="text-muted-foreground text-xs">({draggingChapter.slug})</code>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/**
 * Dropdown of existing section names + an "+ Nouvelle section…" option
 * that swaps to a free-text input. Used by ChapterList's edit form so the
 * author picks from existing sections rather than re-typing (which would
 * create duplicates with subtle differences like trailing spaces).
 */
function SectionPicker({
  value,
  onChange,
  existingSections,
  currentSection,
}: {
  value: string;
  onChange: (v: string) => void;
  existingSections: string[];
  currentSection: string | null;
}) {
  // When the current value isn't in the existing list, expose a text input
  // (the user is typing a new section name).
  const isCustom = value !== '' && !existingSections.includes(value) && value !== currentSection;
  const [mode, setMode] = useState<'select' | 'custom'>(isCustom ? 'custom' : 'select');

  if (mode === 'custom') {
    return (
      <div className="flex flex-1 items-center gap-1">
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom de la nouvelle section"
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange('');
            setMode('select');
          }}
          title="Annuler la création de section"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <select
      className="border-border h-8 flex-1 rounded-md border bg-white px-2 text-sm"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '__new__') {
          setMode('custom');
          onChange('');
          return;
        }
        onChange(v);
      }}
    >
      <option value="">— Aucune section —</option>
      {existingSections.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value="__new__">+ Nouvelle section…</option>
    </select>
  );
}

/**
 * Per-row dnd-kit wrapper. Uses `useSortable` to register the row in
 * its parent SortableContext, exposes a `dragHandle` JSX node to the
 * child render-prop so the visual handle (GripVertical) sits where
 * the row layout wants it.
 *
 * Identical interaction model to the old `<SortableList>` row
 * (cursor-grab, 0.5 opacity while dragging, 5 px activation distance
 * inherited from the parent sensors).
 */
function SortableChapterRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="text-muted-foreground hover:text-foreground cursor-grab touch-none px-1 active:cursor-grabbing"
      title="Glisser pour réordonner ou changer de section"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style} className={cn(className)}>
      {children(handle)}
    </div>
  );
}

/**
 * Section-level drop zone. The `<SortableContext>` already accepts
 * drops on its sortable items, but it doesn't recognise the empty
 * area below them — so a chapter dragged into a brand-new section
 * (no items yet) wouldn't have a target. `useDroppable` adds that
 * fallback : `id` is the section sentinel (`section-drop-<label>`)
 * that the top-level `handleDragEnd` parses to assign the chapter
 * to the right section.
 */
function SectionDroppable({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn('min-h-[8px] transition-colors', isOver && 'bg-amber-50/50')}>
      {children}
    </div>
  );
}

/**
 * Read-only preview of a chapter's blocks, rendered inline in the
 * ChapterList when the editor clicks the `>` arrow on a row to
 * expand it. Each line shows :
 *   - the order index,
 *   - the type label (« Vidéo », « Texte »…),
 *   - the `summarizeBlock` output (title / first line),
 *   - tag chips (or an amber « Sans tag » placeholder),
 *   - a tiny « Éditer → » link that navigates to the block editor.
 *
 * No interaction beyond the edit link — drag-and-drop, duplicate,
 * delete, etc. all live on the dedicated chapter page. The point is
 * to let the editor scan the contents of all chapters at a glance
 * without leaving the list view.
 */
function ChapterBlocksPreview({
  blocks,
  chapterSlug,
  parcoursSlug,
  selectedBlockId,
}: {
  blocks: Array<{
    id: string;
    type: string;
    order: number;
    summary: string;
    tags: { id: string; label: string; color: string }[];
  }>;
  chapterSlug: string;
  parcoursSlug: string;
  /** Id of the block currently highlighted by the keyboard cursor (the
   *  caller in ChapterList knows the global selectedIdx, this component
   *  only needs to render the highlight). Null when no block of this
   *  chapter is selected. */
  selectedBlockId: string | null;
}) {
  if (blocks.length === 0) {
    return (
      <div className="bg-muted/20 border-border/60 text-muted-foreground mt-2 rounded-md border-l-2 px-3 py-2 pl-8 text-xs italic">
        Aucun bloc dans ce chapitre.
      </div>
    );
  }
  return (
    <div className="bg-muted/20 border-border/60 mt-2 space-y-1 rounded-md border-l-2 px-3 py-2 pl-8">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        Aperçu des blocs ({blocks.length})
      </p>
      {blocks.map((b) => {
        const typeLabel = (BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type;
        const isSelectedBlockRow = selectedBlockId === b.id;
        return (
          // The whole row is the block's edit link — `<Link>` gives us
          // cmd-click-to-open-in-new-tab and right-click context menu
          // for free, and the keyboard nav already handles Enter / →
          // on the parent (see ChapterList). The "Éditer →" suffix is
          // kept as a non-link visual cue.
          <Link
            key={b.id}
            href={`/parcours/${parcoursSlug}/chapters/${chapterSlug}/blocks/${b.id}`}
            title="Ouvrir l'éditeur du bloc"
            className={cn(
              'flex flex-wrap items-center gap-2 rounded border bg-white px-2 py-1.5 text-xs transition-colors',
              // Hover + keyboard-selection treatment, matching the
              // parent chapter row.
              'hover:bg-brand-primary-50/40',
              isSelectedBlockRow ? 'border-brand-primary-200 bg-brand-primary-50' : 'border-border/40',
            )}
          >
            <span className="text-muted-foreground w-5 shrink-0 text-right text-[10px]">{b.order}</span>
            <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {typeLabel}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{b.summary || `Bloc ${b.type}`}</span>
            {b.tags.length === 0 ? (
              <span
                className="mr-3 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                title="Aucun tag de maintenance sur ce bloc"
              >
                <span aria-hidden="true">⚠</span>
                <span>Sans tag</span>
              </span>
            ) : (
              <span className="mr-3 flex shrink-0 flex-wrap items-center gap-1">
                {b.tags.map((t) => {
                  const safe = isTagColor(t.color) ? t.color : 'amber';
                  const hex = TAG_COLOR_HEX[safe];
                  return (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: hex.chip, color: hex.text }}
                      title={`Tag : ${t.label}`}
                    >
                      <span aria-hidden="true">🏷</span>
                      <span>{t.label}</span>
                    </span>
                  );
                })}
              </span>
            )}
            <span className="text-muted-foreground shrink-0 text-[10px]">Éditer →</span>
          </Link>
        );
      })}
    </div>
  );
}
