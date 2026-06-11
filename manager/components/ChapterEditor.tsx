'use client';

import type { ContentBlock } from '@shared/content-schema';
import { ChevronDown, ChevronRight, Copy, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AddGallery } from '@/components/blocks/AddGallery';
import { BlockThumb } from '@/components/blocks/BlockThumb';
import type { NavbarVariantMeta, VariableMeta } from '@/components/blocks/editor-types';
import { BlockPreview } from '@/components/editor/preview/BlockPreview';
import { LivePreviewIframe } from '@/components/palette/LivePreviewIframe';
import { useConfirm } from '@/components/ConfirmDialog';
import { DuplicateBlockMenu } from '@/components/DuplicateBlockMenu';
import { EditorInspector } from '@/components/editor/EditorInspector';
import { EditorTopbar } from '@/components/editor/EditorTopbar';
import { InlineBlockEditor } from '@/components/InlineBlockEditor';
import { MoveIntoBlockMenu } from '@/components/MoveIntoBlockMenu';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import { Card, CardContent } from '@/components/ui/Card';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
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

/**
 * Hauteur de l'iframe Solid (LivePreviewIframe) côté canvas quand le
 * bloc est sélectionné, par type. Le front utilise `h-dvh` sur Hero —
 * dans l'iframe ça devient la hauteur du wrapper, donc plus c'est
 * haut, plus le Hero est lisible. Pour les blocs courts (text,
 * conditional), on réduit pour ne pas créer de gros vide blanc en
 * dessous du contenu utile.
 */
const IFRAME_HEIGHT_BY_TYPE: Record<string, string> = {
  heroTitle: 'h-[640px]',
  toolContentSection: 'h-[600px]',
  video: 'h-[520px]',
  photoCarousel: 'h-[520px]',
  form: 'h-[560px]',
  keyPointsCard: 'h-[480px]',
  faqCard: 'h-[480px]',
  card: 'h-[440px]',
  conditional: 'h-[360px]',
  text: 'h-[300px]',
  componentRef: 'h-[280px]',
  _default: 'h-[480px]',
};

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
  /** Server action publishing the current draft of the parcours.
   *  Direction B Lot 5 v6 — câble le bouton Publier de la topbar
   *  directement sur le vrai flow (avec TagReviewModal). */
  publishDraftAction?: () => Promise<void>;
  /** Numéro de version du brouillon (utilisé dans le confirmMessage du
   *  PublishDraftButton — « Publier le brouillon v83 ? »). */
  draftVersionNumber?: number | null;
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
  // Direction C (Lot 5) — le CTA « Ajouter un bloc » dans le header
  // de la card ouvre désormais DIRECTEMENT la galerie modale (au
  // lieu d'un panneau replié contenant un autre bouton qui ouvre
  // la galerie — redondance héritée de la migration Lot 2).
  const [galleryOpen, setGalleryOpen] = useState(false);
  // Compact filter — la grosse barre « 🔍 Filtrer les blocs… » au-dessus
  // de la card a été remplacée par une petite loupe dans le header (à
  // gauche du CTA « Ajouter un bloc »). Click sur la loupe → input
  // inline qui apparaît dans le header, auto-focus. Click sur ✕ ou
  // submit Esc → ferme + clear.
  const [filterOpen, setFilterOpen] = useState(false);
  // Preview device mode — pilote la largeur de la colonne du
  // PreviewPanel dans le grid 3-col. Mobile = 380 px (phone-like),
  // Desktop = 720 px (le front Solid rend alors sa version desktop
  // car il voit un viewport plus large dans l'iframe). Le toggle
  // vit dans le header de PreviewPanel — l'état est lifté ici parce
  // que c'est lui qui pilote la grille.
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // ---- Optimistic UI for fresh inserts -------------------------------
  // `handleInsertSample` paints the new block IMMEDIATELY in the list
  // using a hand-forged row (id + sample payload + diff='new'), so the
  // editor opens without waiting for the `router.refresh()` round-trip
  // (which re-fetches every Supabase query for the chapter — typically
  // 500ms-1s on a non-trivial parcours). Once the refresh lands and
  // `props.blocks` contains the real row, the cleanup effect below
  // drops the optimistic clone — the rendered row swap is invisible
  // because we key by id (stable across the swap).
  const [optimisticBlocks, setOptimisticBlocks] = useState<BlockRow[]>([]);

  // Direction B (Lot 4) — raccourci global `/` ouvre AddGallery,
  // sauf si l'éditeur est en train de taper dans un input / textarea
  // / contenteditable, ou si une modale concurrente est déjà ouverte
  // (palette ⌘K, AddGallery elle-même). Pattern Notion-like.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      // Skip si la palette ⌘K ou la gallery sont déjà ouvertes.
      if (galleryOpen) return;
      if (document.querySelector('.mfm-palette')) return;
      e.preventDefault();
      setGalleryOpen(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryOpen]);

  useEffect(() => {
    const serverIds = new Set(props.blocks.map((b) => b.id));
    setOptimisticBlocks((prev) => {
      const next = prev.filter((o) => !serverIds.has(o.id));
      return next.length === prev.length ? prev : next;
    });
  }, [props.blocks]);
  const displayBlocks = useMemo<BlockRow[]>(() => {
    if (optimisticBlocks.length === 0) return props.blocks;
    const serverIds = new Set(props.blocks.map((b) => b.id));
    const opt = optimisticBlocks.filter((o) => !serverIds.has(o.id));
    if (opt.length === 0) return props.blocks;
    return [...props.blocks, ...opt];
  }, [props.blocks, optimisticBlocks]);

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
  // At the CHAPTER level we deliberately ignore `urlQuery` — when
  // the editor arrives from the palette we want a clean folded list,
  // not an auto-expanded match with a snippet line and a centered
  // scroll. The visible "Filtrer les blocs" input keeps its own
  // state and starts empty ; only what the editor explicitly types
  // here drives `matchedBlockIds` / `snippetByBlockId` / the auto-
  // scroll effect below.
  //
  // Field-level highlights inside an OPENED block still consume
  // `?q=` (see InlineBlockEditor) — so the editor's palette query
  // surfaces the matching field the moment they click into the row,
  // without polluting the chapter list on arrival.
  const [localSearch, setLocalSearch] = useState('');
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
    try {
      const newBlockId = await props.insertSampleBlockAction(type);
      // Optimistic UI : peindre la row immédiatement avec le sample
      // payload pour que l'éditeur s'ouvre sans attendre le
      // `router.refresh()` (qui re-fetch tout le chapitre côté
      // serveur). Une fois le refresh propagé, la ligne ci-dessous
      // est dédupliquée par l'`useEffect` sur `props.blocks`.
      const sample = SAMPLE_PAYLOADS[type as keyof typeof SAMPLE_PAYLOADS];
      const samplePayload = sample ? (JSON.parse(JSON.stringify(sample.payload)) as Record<string, unknown>) : {};
      const lastOrder = props.blocks.length > 0 ? props.blocks[props.blocks.length - 1].order : 0;
      const opt: BlockRow = {
        id: newBlockId,
        type,
        payload: samplePayload,
        order: lastOrder + 1,
        diff: 'new',
        tags: [],
      };
      setOptimisticBlocks((prev) => [...prev.filter((p) => p.id !== newBlockId), opt]);
      setPendingScrollToId(newBlockId);
      setPreviewReloadKey((k) => k + 1);
      void openBlock(newBlockId);
      // Refresh en arrière-plan via une transition non-bloquante.
      startTransition(() => router.refresh());
    } catch (e) {
      console.error('[ChapterEditor] insertSample failed', e);
      toast.error(`Échec de l'insertion : ${(e as Error).message}`);
    }
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

  // Direction B (Lot 1 du handoff Studio Découverte) — nouvelle
  // structure de l'éditeur : Topbar fine en haut (breadcrumb + status +
  // actions Aperçu/Publier), puis main 2-col Canvas papier (fond
  // `--surface-2`, 1fr) | Inspecteur (296 px). La docked PreviewPanel
  // a été retirée : le bouton « Aperçu » de la topbar ouvre le front
  // dans un onglet. Pour Lot 1 le contenu central garde la liste
  // actuelle de blocs (rows InlineBlockEditor) ; les BlockPreview
  // React et la sélection contextuelle viendront en Lot 2 et 3.
  const parcoursName = props.parcoursSlug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  const previewUrl = `http://localhost:3100/parcours/${props.parcoursSlug}/?preview=1&step=${props.chapter.slug}`;
  // Lot 5 — Status badge dérivé des props serveur. Heuristique :
  //   - editing+published : version publiée existe ET un brouillon
  //     est ouvert → « À relire » (review) le temps que l'éditeur le
  //     valide. C'est le cas dominant en édition.
  //   - editing seul : brouillon sans version publiée → « Brouillon »
  //     (draft) — première écriture du chapitre.
  //   - published seul : version publiée, pas d'édition en cours →
  //     « Publié » (published).
  //   - aucun : nouveau chapitre fraîchement créé → « Nouveau » (new).
  //
  // On lit ces props depuis le ChapterEditor existant — pas de fetch
  // supplémentaire. Le contrôle plus fin (modifié vs nouveau vs à
  // mettre à jour) viendra quand on aura un endpoint draft-status
  // par chapitre (aujourd'hui DraftStatusBar agrège au niveau
  // parcours).
  const topbarStatus: 'review' | 'draft' | 'published' | 'new' =
    props.editingVersionId && props.publishedVersionId
      ? 'review'
      : props.editingVersionId
        ? 'draft'
        : props.publishedVersionId
          ? 'published'
          : 'new';

  // Lot 5 v6 — confirmMessage composé pour le PublishDraftButton
  // rendu directement dans la EditorTopbar. Le vrai flow (TagReviewModal
  // + publishDraft server action) est désormais déclenché depuis la
  // topbar, plus besoin d'aliaser la DraftStatusBar (qui est masquée
  // dans l'éditeur depuis Lot 5 v2).
  const publishConfirmMessage = props.draftVersionNumber
    ? `Publier le brouillon v${props.draftVersionNumber} ?\n\nLes utilisateurs finaux verront ces changements immédiatement. L'ancienne version sera archivée.`
    : `Publier le brouillon ?\n\nLes utilisateurs finaux verront ces changements immédiatement.`;

  // Bouton Aperçu médecin (eye) : popup window dédiée pour
  // visualiser le rendu sans quitter le manager. Window features
  // restreintes (pas de barre d'outils) — l'éditeur reste focus sur
  // l'aperçu. Si le popup est bloqué, on retombe sur un onglet
  // standard via window.open(url, '_blank').
  const handlePreviewMedecin = useCallback(() => {
    const features = 'popup=yes,width=440,height=820,scrollbars=yes,resizable=yes';
    const win = window.open(previewUrl, 'mfm-medecin-preview', features);
    if (!win) {
      window.open(previewUrl, '_blank', 'noreferrer');
    }
  }, [previewUrl]);

  return (
    <div className="-mx-6 -my-4 flex h-[calc(100vh-4rem)] flex-col">
      <EditorTopbar
        parcoursSlug={props.parcoursSlug}
        parcoursName={parcoursName}
        chapterTitle={props.chapter.title}
        status={topbarStatus}
        previewUrl={previewUrl}
        onPreviewMedecin={handlePreviewMedecin}
        publishAction={props.publishDraftAction}
        publishConfirmMessage={publishConfirmMessage}
      />
      <div className="flex min-h-0 flex-1">
        {/* Canvas papier — la Card existante des blocs vit ici. La
            forme finale (max-w 720 + padding 40/48 + rendu BlockPreview
            React) arrive en Lot 2. Pour Lot 1 on offre l'enveloppe et
            on garde la liste de blocs telle quelle. */}
        <main className="bg-surface-2 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[820px] px-6 py-7">
            {/* Direction B Lot 5 v3 — ChapterHeader inline dans le
                canvas papier. Remplace l'ancien mini-header (Retour
                aux chapitres + h2 + slug code) qui faisait double
                emploi avec le breadcrumb de la topbar. Pattern :
                eyebrow `<Parcours> · Chapitre <slug>` puis le H1 du
                chapitre (30 px / 700 / tracking tight) comme dans la
                maquette Direction B. Donne le feel « début du
                document » sans chrome inutile. */}
            <header className="mb-6">
              <div className="text-text-muted mb-3 inline-flex items-center gap-2 text-[12.5px] font-semibold">
                <span>{parcoursName}</span>
                <span className="text-text-faint" aria-hidden="true">
                  ·
                </span>
                <span className="text-text-faint font-mono">
                  Chapitre <code>{props.chapter.slug}</code>
                </span>
              </div>
              <h1 className="text-text text-[30px] font-bold leading-tight tracking-tight">{props.chapter.title}</h1>
            </header>

            {/* Direction B Lot 5 — la CardHeader interne (titre "Blocs"
                + sous-titre + filter loupe + bouton primary Ajouter)
                a été retirée : la topbar (breadcrumb + status pill) et
                le bouton dashed du bas suffisent comme entry-points.
                La AddGallery modale reste rendue ici pour rester
                proche du déclencheur dans le tree React. */}
            {galleryOpen && (
              <AddGallery
                insertTarget="chapter"
                onPick={async (t) => {
                  setGalleryOpen(false);
                  await handleInsertSample(t);
                }}
                onClose={() => setGalleryOpen(false)}
              />
            )}
            <Card className="mt-6">
              <CardContent ref={listRef} className="max-h-[calc(100vh-160px)] overflow-y-auto pt-5">
                <SortableList
                  items={displayBlocks}
                  onReorder={handleReorder}
                  itemClassName="border-b border-border last:border-b-0"
                  renderItem={(b, dragHandle, idx) => {
                    const isSelected = selectedBlockId === b.id;
                    const isActive = activeBlockId === b.id;
                    const isExpanded = expandedIds.has(b.id);
                    const isInspected = inspectedBlockId === b.id;
                    const isKbd = kbdActive && kbdIdx === idx;
                    // Scroll-gate divider : matérialise dans la liste que le
                    // bloc qui suit un FORM est "gated" — côté front, le
                    // visiteur doit valider le formulaire (bouton Continuer)
                    // avant que la suite ne défile. Recalculé à chaque render
                    // depuis la liste, donc le drag-and-drop le repositionne
                    // automatiquement (pas de tracking en état).
                    const showGateDivider = idx > 0 && displayBlocks[idx - 1]?.type === 'form';
                    const isMatch = matchedBlockIds.has(b.id);
                    const isMoveHoverDest = moveHoverDestId === b.id;
                    const snippet = snippetByBlockId.get(b.id);
                    return (
                      <>
                        {showGateDivider && (
                          <div
                            className="bg-primary/40 mx-2 my-2 h-px rounded-full"
                            aria-hidden="true"
                            title="Visible côté front uniquement après validation du formulaire ci-dessus."
                          />
                        )}
                        <div
                          data-row-id={b.id}
                          className={cn(
                            'relative py-3 transition-colors',
                            (isSelected || isActive) && 'bg-primary/5 -mx-5 px-5',
                            isActive && 'ring-primary/30 rounded-md ring-1',
                            isInspected &&
                              '!bg-amber-100 ring-2 ring-amber-300 dark:!bg-amber-900/60 dark:ring-amber-500/60',
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
                          {/* Direction B (Lot 5 v5) — row chrome compact
                              (handle + chevron + thumb + eyebrow + summary
                              + tags + diff + actions) AFFICHÉE UNIQUEMENT
                              quand le bloc n'est pas sélectionné. En
                              mode sélectionné, le chip type + la
                              mini-toolbar flottants au-dessus du
                              BlockPreview prennent le relais — pattern
                              papier net comme la maquette Direction B.
                              Drag handle reste accessible : l'éditeur
                              peut déselectionner (✕ inspecteur ou click
                              ailleurs) pour réordonner. */}
                          <div className={cn('flex items-center gap-2', isActive && 'hidden')}>
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
                              <span className="text-text-faint w-5 shrink-0 font-mono text-xs">{b.order}</span>
                              <BlockThumb type={b.type as ContentBlock['type']} />
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-text-faint font-mono text-[9px] uppercase tracking-[0.12em]">
                                  {(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type}
                                </span>
                                <span
                                  className={cn(
                                    'min-w-0 truncate text-sm',
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
                              </span>
                              {(() => {
                                const variantKey = (b.payload as { navbar?: { variant?: string } } | null)?.navbar
                                  ?.variant;
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
                            {/* Direction C — picto suppression discret (icbtn) :
                          monochrome gris au repos, fond rouge translucide
                          au hover. Le rouge plein-temps de Trash2 attirait
                          l'œil en permanence. */}
                            <button
                              type="button"
                              disabled={isPending}
                              title="Supprimer ce bloc"
                              onClick={() => handleDelete(b.id)}
                              className="text-text-muted inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {/* Direction B (Lot 3+5v4) — BlockPreview cliquable
                              avec halo de sélection. Click sur le wrapper
                              sélectionne le bloc → l'Inspector droit
                              affiche son PayloadEditor.
                              Lot 5 v4 : on est passé d'un <button> à un
                              <div role="button"> pour pouvoir nester la
                              mini-toolbar flottante (Duplicate + Trash)
                              en haut-droite sur sélection. */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => void openBlock(b.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void openBlock(b.id);
                              }
                            }}
                            aria-pressed={isActive}
                            aria-label={`Sélectionner le bloc ${b.type}`}
                            className={cn(
                              'group relative mt-2 block w-full cursor-pointer rounded-2xl text-left transition-all',
                              'focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-2',
                              isActive && 'ring-primary/60 ring-offset-surface-2 ring-2 ring-offset-2',
                            )}
                            style={{ marginLeft: 44 }}
                          >
                            {/* Chip de type flottant en haut-gauche
                                (révélé sur sélection). */}
                            {isActive && (
                              <span
                                aria-hidden="true"
                                className="bg-primary text-on-primary absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider shadow-sm"
                              >
                                {(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type}
                              </span>
                            )}
                            {/* Mini-toolbar flottante haut-droite — Lot
                                5 v4. Visible sur sélection. Click
                                stoppe la propagation pour ne pas
                                re-déclencher openBlock. Trash en danger
                                (rose) pour signaler l'action
                                destructive. */}
                            {isActive && (
                              <div
                                className="bg-surface border-border shadow-app-sm absolute -top-3.5 right-3 inline-flex items-center gap-0.5 rounded-md border p-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={isPending}
                                  title="Dupliquer ce bloc"
                                  aria-label="Dupliquer"
                                  onClick={() => handleDuplicate(b.id)}
                                  className="text-text-muted hover:bg-muted hover:text-text inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-40"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  title="Supprimer ce bloc"
                                  aria-label="Supprimer"
                                  onClick={() => handleDelete(b.id)}
                                  className="text-text-muted inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            {/* Direction B Lot 5 v7 — quand le bloc est
                                sélectionné, on remplace le BlockPreview
                                React mirror par une VRAIE iframe Solid
                                du front (LivePreviewIframe) — l'éditeur
                                voit le rendu réel pendant qu'il édite à
                                droite dans l'Inspector. previewId
                                `canvas-live` distinct de `palette-live`
                                de la palette ⌘K pour éviter conflit
                                postMessage si les deux sont ouverts.
                                Hauteur fixée à 480 px (la plupart des
                                blocs y rentrent ; Hero plein écran est
                                clippé mais lisible). */}
                            {isActive ? (
                              <LivePreviewIframe
                                previewId="canvas-live"
                                block={{
                                  type: b.type,
                                  payload:
                                    (activeBlock?.block?.payload as Record<string, unknown> | undefined) ?? b.payload,
                                }}
                                /* Hauteur adaptée au type — Hero
                                   immersif et Tool section ont besoin
                                   de plus, text/conditional sont
                                   compacts par nature. Le front Solid
                                   utilise `h-dvh` sur Hero ; à
                                   l'intérieur de l'iframe ça devient
                                   la hauteur de l'iframe → plus c'est
                                   haut, plus le Hero est lisible. */
                                className={cn(
                                  'bg-bg block w-full rounded-2xl border-0',
                                  IFRAME_HEIGHT_BY_TYPE[b.type as keyof typeof IFRAME_HEIGHT_BY_TYPE] ??
                                    IFRAME_HEIGHT_BY_TYPE._default,
                                )}
                              />
                            ) : (
                              <BlockPreview type={b.type} payload={b.payload} />
                            )}
                          </div>
                          {snippet && (
                            <p className="text-muted-foreground mt-1 pl-[44px] text-[11px] italic leading-snug">
                              <HighlightedSnippet snippet={snippet} query={searchQuery} />
                            </p>
                          )}
                        </div>
                      </>
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
                      Click sur « + Ajouter un bloc » ci-dessous ou tapez{' '}
                      <kbd className="border-border bg-surface rounded border px-1 py-0.5 text-[10px]">/</kbd> n'importe
                      où dans le chapitre.
                    </p>
                  </div>
                )}
                {/* Direction B (Lot 4) — CTA pointillé sous la liste
                    des blocs, pour ajouter un bloc à la suite. Pattern
                    Notion-like : pointillé doux, raccourci `/`
                    indiqué en hint. Reuse `setGalleryOpen` (l'AddGallery
                    modale du Lot 2). */}
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="border-border-strong text-text-muted hover:bg-primary/5 hover:border-primary/40 hover:text-primary-on mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un bloc
                  <span className="text-text-faint ml-2 inline-flex items-center gap-1 text-xs">
                    ou tapez <kbd className="border-border bg-surface rounded border px-1 py-0.5 text-[10px]">/</kbd>
                  </span>
                </button>
              </CardContent>
            </Card>
          </div>
        </main>
        {/* Inspecteur de bloc (Direction B Lot 3) — contextuel sur le
            bloc actif. Quand un bloc est sélectionné dans le canvas,
            son InlineBlockEditor est monté ici (au lieu de
            l'expansion inline sous la row, désormais retirée).
            Bouton fermer ✕ désélectionne, Dupliquer / Supprimer
            câblés sur les handlers existants. */}
        <div className="hidden lg:block">
          {(() => {
            const activeRow = activeBlockId ? displayBlocks.find((b) => b.id === activeBlockId) : null;
            return (
              <EditorInspector
                selectedBlock={activeRow ? { id: activeRow.id, type: activeRow.type } : null}
                onClose={activeRow ? () => setActiveBlockId(null) : undefined}
                onDuplicate={activeRow ? () => handleDuplicate(activeRow.id) : undefined}
                onDelete={activeRow ? () => handleDelete(activeRow.id) : undefined}
              >
                {activeRow && (
                  <InlineBlockEditor
                    key={activeRow.id}
                    blockId={activeRow.id}
                    chapterSlug={props.chapter.slug}
                    parcoursSlug={props.parcoursSlug}
                    isNew={false}
                    type={activeRow.type as ContentBlock['type']}
                    initialPayload={activeRow.payload}
                    variables={props.variables}
                    chapters={props.chapters}
                    navbarVariants={props.navbarVariants}
                    onCreateNavbarVariant={onCreateNavbarVariant}
                    saveAction={(payload) => props.saveBlockAction(activeRow.id, payload)}
                    draftStatus={activeRow.diff}
                    sourcePayload={null}
                    simValues={simValues}
                    setSimValues={setSimValues}
                    setHoveredField={setHoveredField}
                    active={true}
                    onBlockChange={(blk) =>
                      setActiveBlock((prev) =>
                        prev && prev.id === activeRow.id && prev.block === blk
                          ? prev
                          : { id: activeRow.id, block: blk },
                      )
                    }
                    onDirtyChange={(d) =>
                      setDirtyMap((prev) => (prev[activeRow.id] === d ? prev : { ...prev, [activeRow.id]: d }))
                    }
                    onPersistedId={handlePersistedId}
                  />
                )}
              </EditorInspector>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
