'use client';

import type { ContentBlock } from '@shared/content-schema';
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AddBlockForm } from '@/components/AddBlockForm';
import type { NavbarVariantMeta, VariableMeta } from '@/components/blocks/editor-types';
import { useConfirm } from '@/components/ConfirmDialog';
import { DuplicateBlockMenu } from '@/components/DuplicateBlockMenu';
import { InlineBlockEditor } from '@/components/InlineBlockEditor';
import { InPageSearchInput } from '@/components/InPageSearchInput';
import { MoveIntoBlockMenu } from '@/components/MoveIntoBlockMenu';
import { PreviewPanel } from '@/components/PreviewPanel';
import { SearchHighlightBanner } from '@/components/SearchHighlightBanner';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { extractBlockSearchTextWeighted, extractSnippet } from '@/lib/blockSearch';
import { summarizeBlock } from '@/lib/blockSummary';
import { FamilyIcon } from '@/lib/familyIcons';
import { FIELD_RAIL_COLORS } from '@/lib/fieldRailColors';
import { isTagColor, TAG_COLOR_HEX } from '@/lib/tagColors';
import { extractUsedVariableKeys } from '@/lib/usedVariables';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';
import { useUnsavedChangesWarning } from '@/lib/useUnsavedChangesWarning';
import { cn } from '@/lib/utils';

interface BlockRow {
  id: string;
  order: number;
  type: string;
  payload: Record<string, unknown>;
  /** Draft diff: 'new', 'modified', 'pristine', or undefined (no draft). */
  diff?: 'new' | 'modified' | 'pristine';
  /** Maintenance tags attached to this block (via `block_tag`). */
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
  /** Move a top-level chapter block into another block's container payload.
   *  Used by the « Déplacer dans… » menu next to each row. */
  moveBlockIntoContainerAction: (
    sourceBlockId: string,
    destContainerId: string,
    destField: 'children' | 'then' | 'else',
  ) => Promise<void>;
  /** Persist a single block's payload from the inline editor. Returns the id
   *  actually written (may differ on the first edit after publish). */
  saveBlockAction: (blockId: string, payload: Record<string, unknown>) => Promise<string | void>;
  /** Edit-intent: ensure a draft version exists before inline editing starts. */
  ensureDraftAction: () => Promise<{ created: boolean }>;
  /** Inline « + Nouvelle navbar… » : crée une variante (nom) + la retourne. */
  createNavbarVariantAction: (title: string) => Promise<NavbarVariantMeta>;
  /** parcours_version id the preview iframe should read from (draft or null). */
  editingVersionId?: string | null;
  /** Published parcours_version id — enables the draft/published toggle. */
  publishedVersionId?: string | null;
}

/**
 * Renders a snippet with every occurrence of the matching substring wrapped
 * in <mark>.
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
      <mark
        key={`m-${idx}`}
        className="rounded-sm bg-amber-200 px-0.5 not-italic text-amber-950 dark:bg-amber-800/60 dark:text-amber-100"
      >
        {snippet.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return <>{parts}</>;
}

/**
 * Renders the maintenance tags attached to a block as colored pills, inline on
 * its row. Returns an amber "Sans tag" badge when there are none.
 */
function BlockTagsChips({ tags }: { tags?: BlockRow['tags'] }) {
  if (!tags || tags.length === 0) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
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
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
        Nouveau
      </span>
    );
  }
  if (diff === 'modified') {
    return (
      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
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

  // Row highlight + list-scroll target (the "centered" block).
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(props.blocks[0]?.id ?? null);
  // What the PREVIEW scrolls to. Decoupled from `selectedBlockId` so a preview
  // scroll (which updates the highlight) doesn't bounce back into a
  // programmatic preview scroll. Set on click / list-follow / search only.
  const [previewTargetId, setPreviewTargetId] = useState<string | null>(props.blocks[0]?.id ?? null);
  // Rows whose inline editor is mounted (lazy — collapsed rows stay summaries).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // The expanded row currently driving the shared preview (override + outline).
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  // Live payload reported by the ACTIVE inline editor (for blockOverride).
  const [activeBlock, setActiveBlock] = useState<{ id: string; block: ContentBlock } | null>(null);
  // Hovered field path reported by the active editor (preview highlight).
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  // Per-block dirty flags → ORed for the beforeunload guard.
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  // Reported by the preview iframe.
  const [visibleBlockId, setVisibleBlockId] = useState<string | null>(null);
  const [fieldRails, setFieldRails] = useState<Array<{ key: string; top: number; height: number }>>([]);
  // Block id being hovered in the « Déplacer dans… » menu — drives a temporary
  // outline on the matching row so the author sees which target their cursor
  // is pointing at without having to read the menu's text summary.
  const [moveHoverDestId, setMoveHoverDestId] = useState<string | null>(null);
  // After a first-edit draft clone, re-expand the block at this order post-refresh.
  const [pendingExpandOrder, setPendingExpandOrder] = useState<number | null>(null);
  // After a fresh insert (handleInsertSample), the new block id lives here
  // until `router.refresh()` propagates it into `props.blocks` — at which
  // point a useEffect below scrolls its row to the top of the list. Without
  // this, `revealRow` fires immediately on the synthetic open and finds no
  // `data-row-id` element in the DOM (the block is in DB, not yet in the
  // rendered tree). By the time the block does appear, `selectedBlockId`
  // already matches → the `selectedBlockId` auto-scroll effect skips it.
  const [pendingScrollToId, setPendingScrollToId] = useState<string | null>(null);
  // Bumped on insert so the PreviewPanel forces its iframe to remount. The
  // Solid front fetches data at load time only — without a fresh URL it would
  // keep showing its pre-insert snapshot, and the `preview:scrollToBlock`
  // sent for the new id would have nothing to target.
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  // Disclosure du panneau « Ajouter un bloc » (la liste des types : HERO,
  // VIDÉO, …). Le CTA vit désormais dans le header de la card « Blocs »
  // (coin haut-droit) au lieu d'un panneau pleine largeur au-dessus — la
  // liste de blocs reste le focus tant que l'utilisateur ne déplie pas.
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const draftEnsuredRef = useRef(false);

  // ---- Shared variable simulator (one per chapter) ----
  const [simValues, setSimValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of props.variables) {
      if (v.type === 'boolean') init[v.key] = 'false';
      else if (v.type === 'enum') init[v.key] = v.options[0]?.value ?? '';
      else init[v.key] = '';
    }
    return init;
  });
  useEffect(() => {
    setSimValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of props.variables) {
        if (v.key in prev) next[v.key] = prev[v.key];
        else if (v.type === 'boolean') next[v.key] = 'false';
        else if (v.type === 'enum') next[v.key] = v.options[0]?.value ?? '';
        else next[v.key] = '';
      }
      return next;
    });
  }, [props.variables]);

  // ---- ⌘K search context ----
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

  // Keyboard nav over the list: ↑↓ to highlight, → opens the block inline
  // (via `?block=<id>` on this same page — soft nav, no redirect bounce),
  // ← → chapter list.
  const { selectedIdx: kbdIdx, isClient: kbdActive } = useListKeyboardNav(
    props.blocks,
    (b) => `/parcours/${props.parcoursSlug}/chapters/${props.chapter.slug}?block=${b.id}`,
    `/parcours/${props.parcoursSlug}`,
  );

  // Variables actually referenced by this chapter's persisted content.
  const activeVariables = useMemo(() => {
    const usedKeys = extractUsedVariableKeys(props.blocks as unknown as ContentBlock[]);
    return props.variables.filter((v) => usedKeys.has(v.key));
  }, [props.blocks, props.variables]);

  // Timestamp of the last time WE programmatically drove the preview (click /
  // list-follow / search). The preview's echoed `visibleBlock` reports are
  // ignored within ~1.2s so the two panes don't fight.
  const manualScrollAtRef = useRef<number>(0);
  // Timestamp of the last time WE programmatically scrolled the LIST (preview
  // follow). The list's `scroll` echo is ignored within this window.
  const listScrollAtRef = useRef<number>(0);
  const LIST_FOLLOW_WINDOW = 900;
  const listRef = useRef<HTMLDivElement>(null);
  const lastSourceRef = useRef<'click' | 'preview' | 'list'>('click');
  // Tracks the last `?block=<id>` deep-link we acted on, so re-renders don't
  // re-open it (the param lingers in the URL after opening).
  const handledBlockParamRef = useRef<string | null>(null);

  // ---- beforeunload guard across every open inline editor ----
  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);
  useUnsavedChangesWarning(anyDirty);

  // ---- Block override fed to the single shared preview (active block only) ----
  // Built only when the reported block actually belongs to the active id, so a
  // switch never pushes a stale (newId + old payload) override to the iframe.
  const blockOverride = useMemo(() => {
    if (!activeBlockId || !activeBlock || activeBlock.id !== activeBlockId) return null;
    return {
      blockId: activeBlockId,
      block: { type: activeBlock.block.type, payload: activeBlock.block.payload as Record<string, unknown> },
    };
  }, [activeBlockId, activeBlock]);

  const editedBlockOffscreen = useMemo<'above' | 'below' | null>(() => {
    if (!activeBlockId || !visibleBlockId || visibleBlockId === activeBlockId) return null;
    const vis = props.blocks.findIndex((b) => b.id === visibleBlockId);
    const act = props.blocks.findIndex((b) => b.id === activeBlockId);
    if (vis < 0 || act < 0) return null;
    return vis < act ? 'below' : 'above';
  }, [activeBlockId, visibleBlockId, props.blocks]);
  const editedBlockSummary = useMemo(() => {
    if (!activeBlockId) return '';
    const row = props.blocks.find((b) => b.id === activeBlockId);
    return row ? summarizeBlock(row.type, row.payload) : '';
  }, [activeBlockId, props.blocks]);

  // Adjacent chapters (by the parcours' chapter order) → fuel the « ← / →
  // Chapitre » nav pills in the preview cluster, so the editor can hop straight
  // to editing the previous / next chapter without going back to the list.
  const chapterNav = useMemo(() => {
    const list = props.chapters ?? [];
    const idx = list.findIndex((c) => c.slug === props.chapter.slug);
    if (idx < 0) return { prev: undefined, next: undefined };
    return {
      prev: idx > 0 ? list[idx - 1] : undefined,
      next: idx < list.length - 1 ? list[idx + 1] : undefined,
    };
  }, [props.chapters, props.chapter.slug]);

  // Centralise selection so the two scroll directions stay decoupled:
  //  - `selectedBlockId` always updates (row highlight + list-follow target),
  //  - `previewTargetId` updates only when the PREVIEW is NOT the source, so a
  //    preview scroll never bounces back into a programmatic preview scroll.
  // Stable (only stable setters/refs) → safe in effect deps.
  const centerOn = useCallback((id: string, source: 'click' | 'preview' | 'list') => {
    lastSourceRef.current = source;
    setSelectedBlockId((prev) => (prev === id ? prev : id));
    if (source !== 'preview') {
      // We're about to programmatically scroll the preview → ignore its echo.
      manualScrollAtRef.current = Date.now();
      setPreviewTargetId((prev) => (prev === id ? prev : id));
    }
  }, []);

  // Bring a row's inline editor to the TOP of the list. Used on explicit open
  // (incl. clicking a sub-block in the preview) so the block "remonte" — even
  // when it was ALREADY selected (the auto-scroll effect keys on
  // `selectedBlockId` and wouldn't re-fire). Re-runs shortly after so the
  // freshly-expanded (taller) row settles at the top, not mid-viewport.
  const revealRow = useCallback((id: string) => {
    const scroll = () => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
      if (!row) return;
      listScrollAtRef.current = Date.now();
      row.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    requestAnimationFrame(scroll);
    window.setTimeout(scroll, 220);
  }, []);

  // ---- Open / collapse / activate a block inline ----
  async function openBlock(id: string) {
    // Edit-intent: when the parcours has no draft yet, clone the whole version
    // ONCE up-front so block ids stay stable for the rest of the session.
    if (!props.editingVersionId && !draftEnsuredRef.current) {
      draftEnsuredRef.current = true;
      try {
        const res = await props.ensureDraftAction();
        if (res?.created) {
          // ids just changed (whole version cloned) → re-render against the
          // draft, then re-expand the same block (matched by its order).
          setPendingExpandOrder(props.blocks.find((b) => b.id === id)?.order ?? null);
          startTransition(() => router.refresh());
          return;
        }
      } catch (e) {
        console.error('[ChapterEditor] ensureDraft failed', e);
        toast.error('Impossible de créer le brouillon — réessaie.');
      }
    }
    setExpandedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setActiveBlockId(id);
    setHoveredField(null);
    centerOn(id, 'click');
    revealRow(id);
  }
  function collapseBlock(id: string) {
    setExpandedIds((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setDirtyMap((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeBlockId === id) {
      setActiveBlockId(null);
      setActiveBlock(null);
      setHoveredField(null);
    }
  }
  function toggleExpand(id: string) {
    if (expandedIds.has(id)) collapseBlock(id);
    else void openBlock(id);
  }

  // Re-expand after a first-edit draft clone (ids changed → match by order).
  useEffect(() => {
    if (pendingExpandOrder == null) return;
    const target = props.blocks.find((b) => b.order === pendingExpandOrder);
    if (target) {
      setExpandedIds((prev) => new Set(prev).add(target.id));
      setActiveBlockId(target.id);
      centerOn(target.id, 'click');
    }
    setPendingExpandOrder(null);
  }, [props.blocks, pendingExpandOrder, centerOn]);

  // After a fresh insert, scroll the newly-appeared row to the top of the
  // list. We wait for `props.blocks` to actually include the id (= the
  // post-`router.refresh()` render) before scrolling, then retry once at
  // 250 ms to let the freshly-expanded inline editor settle (sample HTML,
  // form fields, images). Without the retry the scroll lands on the row's
  // initial height and the bottom of the editor falls below the fold.
  useEffect(() => {
    if (!pendingScrollToId) return;
    const exists = props.blocks.some((b) => b.id === pendingScrollToId);
    if (!exists) return;
    const id = pendingScrollToId;
    setPendingScrollToId(null);
    const scroll = () => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
      if (!row) return;
      // Mark as programmatic so the list-scroll handler doesn't bounce-echo.
      listScrollAtRef.current = Date.now();
      row.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    const rafId = requestAnimationFrame(scroll);
    const t = window.setTimeout(scroll, 250);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(t);
    };
  }, [props.blocks, pendingScrollToId]);

  // Preview scroll → highlight the matching row (no auto-scroll on preview
  // source — Phase 3 adds the soft follow). Gated 1.2s after a manual click.
  // `visibleBlockId` is tracked unconditionally so the "Revenir au bloc"
  // offscreen banner knows whether the active block left the viewport.
  const handleVisibleBlock = useCallback((id: string) => {
    setVisibleBlockId(id);
    if (Date.now() - manualScrollAtRef.current < 1200) return;
    lastSourceRef.current = 'preview';
    setSelectedBlockId((prev) => (prev === id ? prev : id));
  }, []);

  // Click-to-inspect inside the preview → open that block inline + flash its row.
  const [inspectedBlockId, setInspectedBlockId] = useState<string | null>(null);
  const [inspectedBlockType, setInspectedBlockType] = useState<string | null>(null);
  function handleBlockClicked(id: string, type?: string) {
    setInspectedBlockId(id);
    setInspectedBlockType(type ?? null);
    setTimeout(() => setInspectedBlockId((cur) => (cur === id ? null : cur)), 3000);
    void openBlock(id);
  }

  // First save after a publish translates the block's id from `published_id`
  // to its `draft_id` twin (server-side `ensureDraftBlockId`). On `<Inline-
  // BlockEditor key={b.id}>` that's a NEW key the moment `router.refresh()`
  // lands → React unmounts + remounts the editor → the input the author was
  // typing into loses focus → keystrokes silently disappear until they click
  // back in. Symptom : « le champ a l'air d'avoir une limite à ~30 chars ».
  //
  // We deliberately DON'T refresh here. The chapter list keeps the stale
  // published-era id row visible, but every subsequent save still routes
  // through `ensureDraftBlockId` on the server, so saves continue to land
  // on the draft. The next user-driven refresh (nav, reload, drag/drop,
  // delete…) re-syncs the list naturally without yanking focus mid-typing.
  function handlePersistedId() {
    /* no-op : see comment above. */
  }

  // Auto-scroll the list to follow the selected block. First run (mount)
  // skipped so we land at the top. 'list' source = the user is scrolling the
  // list themselves → don't fight them; 'click'/'preview' → reveal the row
  // (gentle 'nearest', a no-op when already visible → this is the preview→list
  // soft follow).
  const didInitialAutoScrollRef = useRef(false);
  useEffect(() => {
    if (!didInitialAutoScrollRef.current) {
      didInitialAutoScrollRef.current = true;
      return;
    }
    if (!selectedBlockId || !listRef.current) return;
    if (lastSourceRef.current === 'list') return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-row-id="${selectedBlockId}"]`);
    if (!row) return;
    // Mark the upcoming scroll as programmatic so the list-scroll handler
    // ignores its echo (avoids a list→preview→list feedback loop).
    listScrollAtRef.current = Date.now();
    // An explicit open (click, incl. clicking a block in the preview) brings
    // the row to the TOP so its freshly-expanded inline editor is visible from
    // its header. A preview-scroll *follow* stays gentle ('nearest').
    const block = lastSourceRef.current === 'preview' ? 'nearest' : 'start';
    row.scrollIntoView({ block, inline: 'nearest', behavior: 'smooth' });
  }, [selectedBlockId]);

  // List scroll → soft-follow the preview to the top-most visible row. Ignores
  // the echo of a programmatic list scroll (preview-follow) via listScrollAtRef.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      if (Date.now() - listScrollAtRef.current < LIST_FOLLOW_WINDOW) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const container = listRef.current;
        if (!container) return;
        const top = container.getBoundingClientRect().top;
        let bestId = '';
        let bestDist = Infinity;
        container.querySelectorAll<HTMLElement>('[data-row-id]').forEach((row) => {
          const id = row.getAttribute('data-row-id');
          if (!id) return;
          const dist = Math.abs(row.getBoundingClientRect().top - top);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
        });
        if (bestId) centerOn(bestId, 'list');
      });
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [centerOn, LIST_FOLLOW_WINDOW]);

  // ⌘K search landing: scroll the first match into view + select it.
  useEffect(() => {
    if (!searchQuery || matchedBlockIds.size === 0) return;
    const firstMatch = props.blocks.find((b) => matchedBlockIds.has(b.id));
    if (!firstMatch) return;
    centerOn(firstMatch.id, 'click');
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${firstMatch.id}"]`);
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Deep-link entry: `?block=<id>` (from ⌘K, the tag-review modal, the parcours
  // chapter list, the retired /blocks/<id> redirect, bookmarks…) opens that
  // block inline. Ref-guarded so the lingering param doesn't re-open it on
  // every re-render. `openBlock` is intentionally omitted from deps (it's a
  // fresh closure each render); the guard makes this run once per param value.
  const urlBlock = searchParams.get('block');
  useEffect(() => {
    if (!urlBlock || handledBlockParamRef.current === urlBlock) return;
    if (!props.blocks.some((b) => b.id === urlBlock)) return;
    handledBlockParamRef.current = urlBlock;
    void openBlock(urlBlock);
  }, [urlBlock, props.blocks]);

  // Wraps a server action so that after it resolves we refresh the manager
  // tree AND bump `previewReloadKey`. The iframe is a separate page that
  // fetches its own data once at load, so `router.refresh()` alone leaves
  // the preview stuck on the pre-action snapshot — e.g. drag-and-dropping
  // a chapter block reorders the manager list but the preview keeps the
  // old order. Bumping the reload key remounts the iframe and re-fetches.
  function withRefresh<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
    return (...args: T) =>
      startTransition(async () => {
        await fn(...args);
        router.refresh();
        setPreviewReloadKey((k) => k + 1);
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
    collapseBlock(blockId);
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
  // Move a top-level block INTO another block's container payload. Confirms
  // before so the user doesn't accidentally collapse a row with tags into a
  // payload position (tags don't survive the move — see the warning in
  // `MoveIntoBlockMenu`). `withRefresh` already bumps `previewReloadKey`,
  // so the iframe will re-fetch the new structure automatically.
  function handleMoveInto(sourceBlockId: string, destContainerId: string, destField: 'children' | 'then' | 'else') {
    const src = props.blocks.find((b) => b.id === sourceBlockId);
    const summary = src ? summarizeBlock(src.type, src.payload) : '';
    void (async () => {
      const ok = await confirm({
        title: `Déplacer ce bloc${summary ? ` (${summary})` : ''} ?`,
        message:
          'Le bloc sera retiré du chapitre et inséré comme sous-bloc dans la cible. Les tags de maintenance attachés à ce bloc seront perdus.',
        confirmLabel: 'Déplacer',
        cancelLabel: 'Annuler',
      });
      if (!ok) return;
      startTransition(async () => {
        try {
          await props.moveBlockIntoContainerAction(sourceBlockId, destContainerId, destField);
          toast.success('Bloc déplacé');
          router.refresh();
          setPreviewReloadKey((k) => k + 1);
        } catch (e) {
          console.error('[ChapterEditor] move-into failed', e);
          toast.error(`Échec du déplacement : ${(e as Error).message}`);
        }
      });
    })();
  }
  // Insert with sample payload — open the new row inline (rather than routing
  // to the full-page editor), keeping the unified-view flow. We arm
  // `pendingScrollToId` so the useEffect above scrolls to the row once
  // `router.refresh()` has actually rendered it (calling `revealRow`
  // synchronously here would target a DOM that doesn't include the row yet),
  // and bump `previewReloadKey` so the iframe remounts and re-fetches —
  // otherwise the preview keeps showing its pre-insert snapshot and the
  // `preview:scrollToBlock` for the new id targets a non-existent element.
  //
  // NOTE: we intentionally call `router.refresh()` OUTSIDE `startTransition`.
  // When wrapped, the refresh runs as a low-priority update and React will
  // happily defer it behind the high-priority state updates that
  // `openBlock` fires right after (setExpandedIds, setActiveBlockId,
  // centerOn, revealRow, …) — so the iframe (which reloads via the
  // synchronous `previewReloadKey` bump) ends up showing the new block
  // before the left-side list does. Sometimes the list never catches up
  // until the user hits the browser refresh button. Calling refresh as
  // a regular urgent update keeps the two panes in sync.
  const handleInsertSample = async (type: string) => {
    const newBlockId = await props.insertSampleBlockAction(type);
    setPendingScrollToId(newBlockId);
    setPreviewReloadKey((k) => k + 1);
    router.refresh();
    void openBlock(newBlockId);
  };

  // Inline navbar creation : persist via the bound action, refresh so the
  // canonical `navbarVariants` prop re-flows to every open picker, and return
  // the created variant for the initiating picker's optimistic display.
  const { createNavbarVariantAction } = props;
  const onCreateNavbarVariant = useCallback(
    async (title: string): Promise<NavbarVariantMeta> => {
      const created = await createNavbarVariantAction(title);
      startTransition(() => router.refresh());
      return created;
    },
    [createNavbarVariantAction, router],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

        <SearchHighlightBanner matchCount={matchedBlockIds.size} />
        <InPageSearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="🔍 Filtrer les blocs de ce chapitre…"
        />

        <Card>
          <CardHeader>
            {/* Header en flex : titre + sous-textes à gauche, CTA « Ajouter
                un bloc » à droite. Le CTA est primary brand-color pour
                rester l'action évidente, et toggle un panneau qui se déplie
                JUSTE DESSOUS (entre header et liste). */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2">
                  <FamilyIcon family="block" className="h-4 w-4" />
                  Blocs
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {props.blocks.length} bloc(s). Clique sur un bloc pour l&apos;éditer ici ; le panneau de droite suit.
                </p>
                {(() => {
                  const untagged = props.blocks.filter((b) => (b.tags?.length ?? 0) === 0).length;
                  if (untagged === 0) {
                    return props.blocks.length > 0 ? (
                      <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                        🏷 Tous les blocs sont taggés
                      </p>
                    ) : null;
                  }
                  return (
                    <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      🏷 {untagged} bloc{untagged > 1 ? 's' : ''} sans tag dans ce chapitre
                    </p>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => setAddBlockOpen((o) => !o)}
                aria-expanded={addBlockOpen}
                className="bg-brand-primary-600 hover:bg-brand-primary-700 shadow-brand inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter un bloc
                <ChevronDown className={cn('h-4 w-4 transition-transform', addBlockOpen && 'rotate-180')} />
              </button>
            </div>
            {/* Panneau de choix des types de blocs. Déplié uniquement quand
                l'utilisateur clique le CTA — sinon le focus reste sur la
                liste existante. Encadré pour matérialiser visuellement
                qu'il est un sous-niveau du header. */}
            {addBlockOpen && (
              <div className="border-border bg-muted/30 mt-3 rounded-lg border p-4">
                <AddBlockForm insertSampleAction={handleInsertSample} />
              </div>
            )}
          </CardHeader>
          <CardContent ref={listRef} className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <SortableList
              items={props.blocks}
              onReorder={handleReorder}
              itemClassName="border-b border-border last:border-b-0"
              renderItem={(b, dragHandle, idx) => {
                const isSelected = selectedBlockId === b.id;
                const isActive = activeBlockId === b.id;
                const isExpanded = expandedIds.has(b.id);
                const isInspected = inspectedBlockId === b.id;
                const isKbd = kbdActive && kbdIdx === idx;
                const isMatch = matchedBlockIds.has(b.id);
                const isMoveHoverDest = moveHoverDestId === b.id;
                const snippet = snippetByBlockId.get(b.id);
                return (
                  <div
                    data-row-id={b.id}
                    className={cn(
                      'relative py-3 transition-colors',
                      (isSelected || isActive) && 'bg-primary/5 -mx-5 px-5',
                      isActive && 'ring-primary/30 rounded-md ring-1',
                      isInspected && '!bg-amber-100 ring-2 ring-amber-300 dark:!bg-amber-900/60 dark:ring-amber-500/60',
                      isMatch &&
                        !isInspected &&
                        'rounded-md bg-amber-50/70 ring-2 ring-amber-300 dark:bg-amber-950/50 dark:ring-amber-700/60',
                      isKbd && !isInspected && 'ring-primary/40 ring-1',
                      // Move-into hover preview wins over the rest visually so the
                      // user can see exactly which row their cursor in the menu
                      // is targeting. Violet to stay distinct from selection
                      // (primary), inspection (amber) and just-added (emerald).
                      isMoveHoverDest &&
                        '!bg-violet-50 ring-2 ring-violet-400 dark:!bg-violet-950/60 dark:bg-violet-950/50 dark:ring-violet-500/60',
                    )}
                  >
                    {isInspected && (
                      <div className="absolute -top-7 left-0 z-20 rounded-md bg-amber-900 px-2 py-1 text-[10px] font-medium text-white shadow">
                        Bloc{' '}
                        {(BLOCK_TYPE_LABELS as Record<string, string>)[inspectedBlockType ?? ''] ??
                          inspectedBlockType ??
                          b.type}{' '}
                        — ouvert ci-dessous
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {dragHandle}
                      <button
                        type="button"
                        onClick={() => toggleExpand(b.id)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        title={isExpanded ? 'Replier' : 'Déplier pour éditer'}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void openBlock(b.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        title="Éditer ce bloc (déplie l'éditeur + centre la preview)"
                      >
                        <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs">{b.order}</span>
                        <span className="bg-muted text-muted-foreground inline-flex h-6 shrink-0 items-center rounded px-2 text-[11px] font-medium uppercase tracking-wide">
                          {(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm',
                            // Hero titles are the chapter's anchor lines — give
                            // them more visual weight in the row list so the
                            // user can scan a chapter's structure at a glance.
                            b.type === 'heroTitle' && 'font-semibold',
                          )}
                        >
                          {summarizeBlock(
                            b.type,
                            // Use the live (unsaved) payload of the active
                            // editor when it matches this row, so editing
                            // e.g. a hero's title immediately updates the row
                            // summary above instead of waiting for autosave +
                            // refresh. Falls back to the server-side payload
                            // for any inactive row.
                            isActive && activeBlock?.block
                              ? (activeBlock.block.payload as Record<string, unknown>)
                              : b.payload,
                          )}
                        </span>
                        {(() => {
                          const variantKey = (b.payload as { navbar?: { variant?: string } } | null)?.navbar?.variant;
                          if (!variantKey) return null;
                          const v = (props.navbarVariants ?? []).find((x) => x.key === variantKey);
                          return (
                            <span
                              className="border-border bg-surface inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
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
                      <DuplicateBlockMenu
                        chapters={props.chapters ?? []}
                        currentChapterSlug={props.chapter.slug}
                        disabled={isPending}
                        onDuplicateHere={() => handleDuplicate(b.id)}
                        onCopyTo={(targetChapterId) => handleCopyTo(b.id, targetChapterId)}
                      />
                      <MoveIntoBlockMenu
                        sourceBlockId={b.id}
                        allBlocks={props.blocks}
                        disabled={isPending}
                        onMove={(destContainerId, destField) => handleMoveInto(b.id, destContainerId, destField)}
                        onHoverDestination={setMoveHoverDestId}
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
                    {snippet && (
                      <p className="text-muted-foreground mt-1 pl-[44px] text-[11px] italic leading-snug">
                        <HighlightedSnippet snippet={snippet} query={searchQuery} />
                      </p>
                    )}
                    {isExpanded && (
                      <div className="border-border bg-muted/20 mt-3 rounded-md border p-3">
                        <InlineBlockEditor
                          key={b.id}
                          blockId={b.id}
                          chapterSlug={props.chapter.slug}
                          parcoursSlug={props.parcoursSlug}
                          isNew={false}
                          type={b.type as ContentBlock['type']}
                          initialPayload={b.payload}
                          variables={props.variables}
                          chapters={props.chapters}
                          navbarVariants={props.navbarVariants}
                          onCreateNavbarVariant={onCreateNavbarVariant}
                          saveAction={(payload) => props.saveBlockAction(b.id, payload)}
                          draftStatus={b.diff}
                          sourcePayload={null}
                          simValues={simValues}
                          setSimValues={setSimValues}
                          setHoveredField={setHoveredField}
                          active={isActive}
                          onBlockChange={(blk) =>
                            setActiveBlock((prev) =>
                              prev && prev.id === b.id && prev.block === blk ? prev : { id: b.id, block: blk },
                            )
                          }
                          onDirtyChange={(d) =>
                            setDirtyMap((prev) => (prev[b.id] === d ? prev : { ...prev, [b.id]: d }))
                          }
                          onPersistedId={handlePersistedId}
                        />
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {props.blocks.length === 0 && (
              <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center">
                <div className="text-3xl" aria-hidden="true">
                  🧱
                </div>
                <p className="text-sm font-medium">Aucun bloc dans ce chapitre</p>
                <p className="text-muted-foreground max-w-md text-xs">
                  Choisis un type de bloc ci-dessus (texte, vidéo, formulaire, condition…) — un aperçu live
                  s&apos;ouvre, puis « Insérer cet exemple » ajoute le bloc et l&apos;ouvre directement pour
                  l&apos;éditer ici.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block">
        <PreviewPanel
          chapterSlug={props.chapter.slug}
          parcoursSlug={props.parcoursSlug}
          variables={activeVariables}
          values={simValues}
          onValuesChange={setSimValues}
          selectedBlockId={previewTargetId}
          versionId={props.editingVersionId}
          publishedVersionId={props.publishedVersionId}
          hoveredField={hoveredField}
          hoveredFieldBlockId={activeBlockId ?? undefined}
          editingBlockId={activeBlockId}
          editedBlockOffscreen={editedBlockOffscreen}
          editedBlockSummary={editedBlockSummary}
          fieldRails={fieldRails}
          onFieldRails={setFieldRails}
          fieldRailColors={FIELD_RAIL_COLORS}
          onVisibleBlock={handleVisibleBlock}
          onBlockClicked={handleBlockClicked}
          onEditVisibleBlock={(id) => void openBlock(id)}
          prevChapter={chapterNav.prev}
          nextChapter={chapterNav.next}
          onGoToChapter={(slug) => router.push(`/parcours/${props.parcoursSlug}/chapters/${slug}`)}
          blockOverride={blockOverride}
          reloadKey={previewReloadKey}
        />
      </div>
    </div>
  );
}
