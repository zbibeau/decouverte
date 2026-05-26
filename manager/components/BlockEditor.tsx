'use client';

import type { ContentBlock } from '@shared/content-schema';
import { GripVertical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { DiffProvider } from '@/components/blocks/DiffContext';
import { Section } from '@/components/blocks/Field';
import { FieldHoverProvider } from '@/components/blocks/FieldHoverContext';
import { PayloadEditor } from '@/components/blocks/PayloadEditor';
import { SearchMatchProvider } from '@/components/blocks/SearchMatchContext';
import { SimulatorProvider } from '@/components/blocks/SimulatorContext';
import { TagsField, TagsHelpBanner } from '@/components/blocks/TagsField';
import type { ChapterMeta, NavbarVariantMeta, VariableMeta } from '@/components/blocks/editor-types';
import { DraftBlockDiffPanel } from '@/components/DraftBlockDiffPanel';
import { InPageSearchInput } from '@/components/InPageSearchInput';
import { PreviewPanel } from '@/components/PreviewPanel';
import { SearchHighlightBanner } from '@/components/SearchHighlightBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/Toaster';
import {
  findMatchingFieldPaths,
  findMatchingFieldSnippets,
  findMissingNestedTagSlots,
  harvestNestedTagIds,
} from '@/lib/blockSearch';
import { loadBlockTags } from '@/lib/tags';
import { summarizeBlock } from '@/lib/blockSummary';
import { FIELD_RAIL_COLORS } from '@/lib/fieldRailColors';
import { useBackArrowToParent } from '@/lib/useListKeyboardNav';
import { extractUsedVariableKeys } from '@/lib/usedVariables';

interface Props {
  blockId: string;
  chapterSlug: string;
  parcoursSlug: string;
  isNew: boolean;
  type: ContentBlock['type'];
  initialPayload: Record<string, unknown>;
  variables: VariableMeta[];
  /** All chapters of the parcours (draft view) — used by dropdowns like `nextStep`. */
  chapters?: ChapterMeta[];
  /** Navbar variants registered on this parcours — fed to editors that surface
   *  a `payload.navbar.variant` dropdown. */
  navbarVariants?: NavbarVariantMeta[];
  /** Slug of the chapter that owns the block — propagated to editors that
   *  need to scope their behaviour to the current chapter's section (see
   *  `ChapterTransitionEditor`). */
  // NB: already available via `props.chapterSlug` above; kept implicit.
  /**
   * Other blocks of the chapter (excluding the one being edited). Used to
   * compute which variables to expose in the preview simulator. In draft
   * (creation) mode the parent passes [] since the preview is isolated.
   */
  chapterBlocks?: ContentBlock[];
  /**
   * Persist the block payload. Returns the block id that was actually
   * written to — may differ from the current one when a published-era id was
   * translated to its draft twin (on first edit after publish). The client
   * then router.replace-es to the draft URL.
   */
  saveAction: (payload: Record<string, unknown>) => Promise<string | void>;
  /**
   * When provided, the editor is in "draft creation" mode: nothing is in DB
   * yet. Manual save calls this action which inserts the row and returns the
   * new block id; the client then navigates to the real edit URL.
   */
  createAction?: (payload: Record<string, unknown>) => Promise<string>;
  /** parcours_version id the preview iframe should read from (draft or null). */
  editingVersionId?: string | null;
  /** Published parcours_version id — enables the draft/published toggle. */
  publishedVersionId?: string | null;
  /** Draft diff status for this block vs published ('new' | 'modified' | 'pristine'). */
  draftStatus?: 'new' | 'modified' | 'pristine';
  /** Published source payload — null if the block is new in the draft. */
  sourcePayload?: Record<string, unknown> | null;
}

type SaveStatus = 'idle' | 'dirty' | 'pending' | 'saving' | 'saved' | 'error';

const AUTO_SAVE_DELAY = 600;

export function BlockEditor(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  // ← (or h) returns to the chapter's block list. Disabled while typing in
  // an input/textarea so it doesn't steal cursor-left in form fields.
  useBackArrowToParent(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}`);
  const [block, setBlock] = useState<ContentBlock>({ type: props.type, payload: props.initialPayload } as ContentBlock);
  // True until the user has saved at least once.
  // Tracks whether we're in "creation" mode (manual save) or "edition" mode (auto-save).
  const [isCreating, setIsCreating] = useState(props.isNew);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [isPending, startTransition] = useTransition();
  // `componentRef` blocks opt out of auto-save so the user can freely browse the
  // component bank and preview different components without each change being
  // persisted. They must click "Enregistrer" (or "Annuler") explicitly.
  const isManualSave = props.type === 'componentRef';
  // Field hover state — drives the preview-iframe field highlight overlay.
  // The Field component (deep in the editor tree) updates this via context;
  // we forward it to PreviewPanel as a prop so the iframe gets a
  // `preview:highlightField` postMessage.
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // ⌘K search context — the palette appends `?q=<query>` to the
  // navigation URL when the user picks a result. The yellow banner
  // (rendered below) reads that URL directly. The in-page filter
  // input is a SEPARATE source of truth (`localSearch`) so the user
  // can keep filtering AFTER dismissing the banner.
  //
  // Seeding rule : when arriving from ⌘K, we only pre-fill the
  // in-page input if there is at least one MATCHING FIELD in the
  // payload. If the block was matched by something other than its
  // field values (e.g. a maintenance tag, or its `summarizeBlock`
  // output), pre-filling would be misleading — the user would type
  // nothing yet see "pa" in the input with no field highlighted.
  // Better to start blank ; the user can re-type if they want to
  // search within fields.
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [localSearch, setLocalSearch] = useState(() => {
    if (!urlQuery) return '';
    const matches = findMatchingFieldPaths(props.initialPayload as unknown, urlQuery);
    return matches.length > 0 ? urlQuery : '';
  });
  useEffect(() => {
    if (!urlQuery) {
      setLocalSearch('');
      return;
    }
    const matches = findMatchingFieldPaths(block.payload, urlQuery);
    setLocalSearch(matches.length > 0 ? urlQuery : '');
    // Intentionally NOT depending on `block.payload` — we only re-seed
    // when the URL query itself changes, otherwise typing in a matched
    // field would clear the input the instant the user removes the
    // matching substring (annoying).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // The effective query used everywhere downstream : local input
  // wins so typing after clearing the banner keeps the experience
  // interactive without bouncing back to URL state.
  const searchQuery = localSearch.trim();
  const searchMatchPaths = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    return new Set(findMatchingFieldPaths(block.payload, searchQuery));
  }, [searchQuery, block.payload]);
  // Snippets — keyed by the same JSON paths. Field consumes both via
  // SearchMatchContext to render the "matched text" preview line.
  const searchMatchSnippets = useMemo(() => {
    if (!searchQuery) return new Map<string, string>();
    return findMatchingFieldSnippets(block.payload, searchQuery, 32);
  }, [searchQuery, block.payload]);

  // Auto-scroll the first matched field into view on mount + when
  // the query changes (typing in the in-page input retriggers a
  // scroll to the first match so the user sees the new result
  // without scrolling manually).
  useEffect(() => {
    if (!searchQuery || searchMatchPaths.size === 0) return;
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('[data-search-match="true"]');
      if (first) {
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
    // We intentionally watch `searchQuery` only — re-walking the
    // payload on every keystroke is fine, but re-running the scroll
    // on every payload tick would steal focus from the field the
    // user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Visible block tracking — used to decide if the block being edited is
  // currently in the iframe viewport, and on which side (above/below) it
  // is when scrolled offscreen, so the floating "Revenir" banner can point
  // to the right direction.
  const [visibleBlockId, setVisibleBlockId] = useState<string | null>(null);

  // Field-rail positions reported by the Solid renderer for the currently
  // edited block. The PreviewPanel draws them as coloured vertical bars in
  // the gutter beside the iframe.
  const [fieldRails, setFieldRails] = useState<Array<{ key: string; top: number; height: number }>>([]);

  // ---- Lifted variable-simulator state (shared between PreviewPanel and
  //      inline simulators inside child editors). String-formed so it can
  //      flow directly through the iframe postMessage protocol. ----
  const [simValues, setSimValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of props.variables) {
      if (v.type === 'boolean') init[v.key] = 'false';
      else if (v.type === 'enum') init[v.key] = v.options[0]?.value ?? '';
      else init[v.key] = '';
    }
    return init;
  });
  // Keep `simValues` in sync with the parcours variable set: add new keys
  // with their default, leave existing keys untouched, drop removed ones.
  useEffect(() => {
    setSimValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of props.variables) {
        if (v.key in prev) {
          next[v.key] = prev[v.key];
        } else if (v.type === 'boolean') {
          next[v.key] = 'false';
        } else if (v.type === 'enum') {
          next[v.key] = v.options[0]?.value ?? '';
        } else {
          next[v.key] = '';
        }
      }
      return next;
    });
  }, [props.variables]);

  // ---- Resizable splitter between editor column and preview column ----
  // Stored in localStorage so the user's preferred width sticks across
  // navigations and reloads. Default 420px (the previous fixed value).
  const SPLIT_STORAGE_KEY = 'mfm.blockEditor.leftWidth';
  const SPLIT_MIN = 280;
  const SPLIT_MAX = 900;
  /** Reserve at least this many px for the preview column so it never
   *  collapses to invisible — a common cause of "I lost my preview". */
  const PREVIEW_MIN_WIDTH = 320;
  /** Clamp a desired left width against both the absolute bounds and the
   *  current viewport so the preview column never falls below
   *  PREVIEW_MIN_WIDTH. Safe to call on the server (returns the input). */
  function clampLeftWidth(desired: number): number {
    if (typeof window === 'undefined') return desired;
    const vw = window.innerWidth || 0;
    // Account for handle width (~16px) — minor, ignored.
    const maxAgainstViewport = Math.max(SPLIT_MIN, vw - PREVIEW_MIN_WIDTH);
    return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.min(desired, maxAgainstViewport)));
  }
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 420;
    const raw = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    const initial = Number.isFinite(n) && n >= SPLIT_MIN && n <= SPLIT_MAX ? n : 420;
    return clampLeftWidth(initial);
  });
  const splitRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  /** Track lg breakpoint client-side so we only apply the inline width on desktop. */
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      setLeftWidth(clampLeftWidth(e.clientX - rect.left));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    function onWindowResize() {
      // Re-clamp on viewport shrink so the preview never goes < PREVIEW_MIN_WIDTH.
      setLeftWidth((w) => clampLeftWidth(w));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', onWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Persist the chosen width whenever it changes (throttled by React batching).
  useEffect(() => {
    try {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(leftWidth));
    } catch {
      // localStorage may be blocked — non-fatal.
    }
  }, [leftWidth]);
  const editedBlockOffscreen = useMemo<'above' | 'below' | null>(() => {
    if (isCreating || !visibleBlockId || visibleBlockId === props.blockId) return null;
    const list = props.chapterBlocks ?? [];
    const visibleIdx = list.findIndex((b) => (b as { id?: string }).id === visibleBlockId);
    const editingIdx = list.findIndex((b) => (b as { id?: string }).id === props.blockId);
    if (visibleIdx < 0 || editingIdx < 0) return null;
    return visibleIdx < editingIdx ? 'below' : 'above';
  }, [isCreating, visibleBlockId, props.blockId, props.chapterBlocks]);

  // Short summary of the block we're editing — shown inside the banner.
  const editedBlockSummary = useMemo(() => {
    return summarizeBlock(block.type, block.payload as Record<string, unknown>);
  }, [block.type, block.payload]);

  // Compute the variable keys actually referenced by the previewed content.
  // - Edit mode: full chapter is rendered → look at all chapter blocks (the
  //   currently edited block is overridden live, so use its current state).
  // - Draft mode: preview is isolated to the current block being created.
  const activeVariables = useMemo(() => {
    const blocksForScan: ContentBlock[] = isCreating
      ? [block]
      : (props.chapterBlocks ?? []).map((b) => ((b as { id?: string }).id === props.blockId ? block : b));
    const usedKeys = extractUsedVariableKeys(blocksForScan);
    return props.variables.filter((v) => usedKeys.has(v.key));
  }, [isCreating, block, props.chapterBlocks, props.blockId, props.variables]);

  // Last payload we successfully persisted, used to skip redundant auto-saves.
  const lastSavedRef = useRef<string>(JSON.stringify(props.initialPayload));

  async function persist(payload: Record<string, unknown>) {
    setStatus('saving');
    try {
      const result = await props.saveAction(payload);
      lastSavedRef.current = JSON.stringify(payload);
      setStatus('saved');
      // Reset to idle after a moment so the indicator doesn't stay green forever.
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      // First edit after a publish: server translated the published block id
      // into its draft twin. Swap the URL over so subsequent edits go
      // through without further translations.
      if (typeof result === 'string' && result !== props.blockId) {
        toast.info('Brouillon créé automatiquement pour ce bloc');
        router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${result}`, {
          scroll: false,
        });
        router.refresh();
      }
    } catch (e) {
      console.error('[BlockEditor] save failed', e);
      setStatus('error');
      toast.error("Échec de l'enregistrement — voir la console.");
    }
  }

  // Manual save (creation mode): persist + leave creation mode + drop the ?new=1 from URL.
  function handleManualSave() {
    startTransition(async () => {
      const payload = block.payload as Record<string, unknown>;
      // Draft mode: insert in DB then navigate to the real block URL.
      if (props.createAction) {
        setStatus('saving');
        try {
          const newId = await props.createAction(payload);
          lastSavedRef.current = JSON.stringify(payload);
          setStatus('saved');
          toast.success('Bloc créé');
          router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${newId}`, {
            scroll: false,
          });
          router.refresh();
        } catch (e) {
          console.error('[BlockEditor] create failed', e);
          setStatus('error');
          toast.error('Échec de la création du bloc');
        }
        return;
      }
      await persist(payload);
      setIsCreating(false);
      // Strip ?new=1 from the URL without remounting the component.
      router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${props.blockId}`, {
        scroll: false,
      });
      router.refresh();
    });
  }

  // Auto-save in edit mode: debounced after each change. Skipped for
  // `componentRef` blocks (manual save) and while still in creation mode.
  //
  // Special case : when the set of nested `tagIds` changes (the user
  // added or removed a maintenance tag on a nested block), we BYPASS
  // the 600 ms debounce. Discrete pill-clicks don't need to coalesce
  // with surrounding keystrokes, and the user expects immediate
  // persistence — otherwise navigating away within 600 ms loses the
  // tag, with the misleading "Tags enregistrés" toast already shown.
  useEffect(() => {
    if (isCreating) return;
    const serialized = JSON.stringify(block.payload);
    if (serialized === lastSavedRef.current) return;

    if (isManualSave) {
      setStatus((s) => (s === 'saving' ? s : 'dirty'));
      return;
    }

    // Compare nested-tag fingerprints before / after the change.
    // `harvestNestedTagIds` walks the payload and returns the
    // deduplicated set of all `tagIds` arrays found at any depth.
    // Sorted join makes the comparison order-insensitive.
    const lastPayload = (() => {
      try {
        return JSON.parse(lastSavedRef.current);
      } catch {
        return {};
      }
    })();
    const tagsBefore = [...harvestNestedTagIds(lastPayload)].sort().join(',');
    const tagsAfter = [...harvestNestedTagIds(block.payload)].sort().join(',');
    if (tagsBefore !== tagsAfter) {
      setStatus('pending');
      void persist(block.payload as Record<string, unknown>);
      return;
    }

    setStatus('pending');
    const t = setTimeout(() => {
      void persist(block.payload as Record<string, unknown>);
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, isCreating, isManualSave]);

  // Revert local edits to the last persisted payload (manual-save mode only).
  function handleRevert() {
    try {
      const lastSaved = JSON.parse(lastSavedRef.current) as Record<string, unknown>;
      setBlock({ type: props.type, payload: lastSaved } as ContentBlock);
      setStatus('idle');
    } catch (e) {
      console.error('[BlockEditor] revert failed', e);
    }
  }

  // Manual save handler for `componentRef` (edit mode).
  function handleEditSave() {
    startTransition(async () => {
      await persist(block.payload as Record<string, unknown>);
    });
  }

  const isDirty = status === 'dirty' || status === 'pending' || status === 'error';

  // ---- Click-to-edit from the preview iframe -----------------------------
  // When the user clicks a block in the preview, we want to switch the
  // editor pane on the left to that block. If the current block has unsaved
  // edits (or we're still in creation mode), we ask for confirmation first
  // via a small inline modal.
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  function navigateToBlock(targetId: string) {
    router.push(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${targetId}`);
  }

  function handlePreviewBlockClick(clickedId: string) {
    // Already editing this block → no-op.
    if (clickedId === props.blockId) return;
    // Clean state → navigate immediately.
    if (!isDirty && !isCreating) {
      navigateToBlock(clickedId);
      return;
    }
    // Dirty or in-creation → ask for confirmation.
    setPendingNavigation(clickedId);
  }

  async function confirmSaveThenNavigate() {
    if (!pendingNavigation) return;
    const target = pendingNavigation;
    setPendingNavigation(null);
    try {
      if (isCreating && props.createAction) {
        const newId = await props.createAction(block.payload as Record<string, unknown>);
        lastSavedRef.current = JSON.stringify(block.payload);
        toast.success('Bloc créé');
        // The just-created block now has a real id; we still navigate to the
        // clicked target, not to the newly-created one — the user chose to
        // open the clicked block.
        void newId;
      } else {
        await persist(block.payload as Record<string, unknown>);
      }
    } catch (e) {
      console.error('[BlockEditor] save-then-navigate failed', e);
      toast.error("Échec de l'enregistrement — bloc non modifié.");
      return;
    }
    navigateToBlock(target);
  }

  function confirmDiscardThenNavigate() {
    if (!pendingNavigation) return;
    const target = pendingNavigation;
    setPendingNavigation(null);
    navigateToBlock(target);
  }

  // Stable handler for the simulator context — keeps a single object
  // reference unless props.variables changes, so children don't re-render
  // on unrelated state updates.
  const simulatorContextValue = useMemo(
    () => ({
      values: simValues,
      setValue: (key: string, value: string) => setSimValues((prev) => ({ ...prev, [key]: value })),
      variables: props.variables,
    }),
    [simValues, props.variables],
  );

  // Memoise `blockOverride` so its object identity is stable while the
  // user hasn't actually edited the block. Without this, every BlockEditor
  // render creates a new object → PreviewPanel's useEffect re-fires → a
  // fresh `preview:setBlockOverride` is posted → the renderer remounts the
  // block in the iframe (`<Show keyed>`) → internal component state inside
  // that block (e.g. the FAQ accordion's "which question is open" signal)
  // gets reset. Result : clicking a FAQ question in the preview opened
  // and immediately closed it. Memoising fixes that.
  const blockOverride = useMemo(
    () => ({
      blockId: props.blockId,
      block: { type: block.type, payload: block.payload as Record<string, unknown> },
    }),
    [props.blockId, block.type, block.payload],
  );

  return (
    <div ref={splitRef} className="flex flex-col gap-0 lg:h-[calc(100vh-96px)] lg:flex-row">
      <div
        className="w-full space-y-4 lg:h-full lg:overflow-y-auto lg:pr-3"
        style={isLg ? { width: leftWidth, flexShrink: 0 } : undefined}
      >
        {/* Surface the ⌘K search context when the user landed on this
            block editor from the palette (via the pencil on a matched
            row in the chapter, or directly clicking a block result). */}
        <SearchHighlightBanner />
        {/* In-page filter — persists across banner dismissal so the
            user can keep searching field values without re-opening
            ⌘K. Seeded from `?q=` on mount, but independent afterwards. */}
        <InPageSearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="🔍 Filtrer les champs de ce bloc…"
        />
        {!isCreating && (
          <MissingTagsBanner
            blockId={props.blockId}
            payload={block.payload as Record<string, unknown>}
            blockType={props.type}
          />
        )}
        {!isCreating && (
          <DraftBlockDiffPanel
            status={props.draftStatus}
            currentPayload={block.payload as Record<string, unknown>}
            sourcePayload={props.sourcePayload ?? null}
          />
        )}
        <DiffProvider
          current={block.payload}
          source={isCreating ? null : (props.sourcePayload ?? null)}
          blockIsNew={props.draftStatus === 'new'}
        >
          <FieldHoverProvider setHoveredField={setHoveredField}>
            <SimulatorProvider value={simulatorContextValue}>
              <SearchMatchProvider query={searchQuery} paths={searchMatchPaths} snippets={searchMatchSnippets}>
                <PayloadEditor
                  block={block}
                  onChange={setBlock}
                  variables={props.variables}
                  chapters={props.chapters}
                  currentChapterSlug={props.chapterSlug}
                  navbarVariants={props.navbarVariants}
                />
              </SearchMatchProvider>
            </SimulatorProvider>
          </FieldHoverProvider>
        </DiffProvider>

        {/* Central "Tags de maintenance" section — pinned at the end of
            the left pane, shared by EVERY block type. Lifting this
            here (rather than letting each per-type editor render its
            own TagsField at depth 0) guarantees parity between :
              - the MissingTagsBanner up top, which detects missing
                top-level tags via loadBlockTags for any block id, and
              - the TagsField actually exposed to the editor below
            so the banner's "Tag à ajouter" claim always maps to an
            actionable widget. Type-specific editors still render
            their own TagsField when nested (controlled mode targeting
            payload.tagIds in the parent's children[]). */}
        {!isCreating && (
          <Section title="Tags de maintenance" accentColor="slate">
            <TagsHelpBanner contextHint="Aide à retrouver ce bloc via ⌘K quand une fonctionnalité produit évolue." />
            <TagsField />
          </Section>
        )}

        <div className="border-border sticky bottom-0 flex items-center gap-3 rounded-md border bg-white/95 p-2 shadow-sm backdrop-blur">
          {isCreating ? (
            <>
              <Button onClick={handleManualSave} disabled={isPending || status === 'saving'}>
                {status === 'saving' ? 'Création…' : 'Créer le bloc'}
              </Button>
              <span className="text-muted-foreground text-[10px]">
                Premier enregistrement manuel. Les modifications suivantes seront sauvegardées automatiquement.
              </span>
            </>
          ) : isManualSave ? (
            <>
              <Button onClick={handleEditSave} disabled={!isDirty || isPending || status === 'saving'}>
                {status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button variant="outline" onClick={handleRevert} disabled={!isDirty || isPending || status === 'saving'}>
                Annuler
              </Button>
              <SaveIndicator status={status} manualSave />
            </>
          ) : (
            <SaveIndicator status={status} />
          )}
        </div>
      </div>

      {/* Resize handle — drag to make the editor column match the preview width. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner les colonnes"
        onMouseDown={startResize}
        onDoubleClick={() => setLeftWidth(420)}
        title="Glisser pour redimensionner — double-clic pour réinitialiser"
        className="group relative hidden w-4 cursor-col-resize items-center justify-center lg:flex lg:h-full"
      >
        <div className="bg-border group-hover:bg-primary/60 h-16 w-[3px] rounded-full transition-colors" />
        <GripVertical className="text-muted-foreground/40 group-hover:text-primary pointer-events-none absolute h-4 w-4 transition-colors" />
      </div>

      <div className="hidden min-w-0 flex-1 lg:block lg:h-full lg:overflow-y-auto lg:pl-3">
        <PreviewPanel
          chapterSlug={props.chapterSlug}
          parcoursSlug={props.parcoursSlug}
          variables={activeVariables}
          values={simValues}
          onValuesChange={setSimValues}
          selectedBlockId={isCreating ? null : props.blockId}
          mode={isCreating ? 'isolatedBlock' : 'chapter'}
          isolatedBlockType={block.type}
          versionId={props.editingVersionId}
          publishedVersionId={props.publishedVersionId}
          hoveredField={hoveredField}
          hoveredFieldBlockId={props.blockId}
          editingBlockId={isCreating ? null : props.blockId}
          editedBlockOffscreen={editedBlockOffscreen}
          editedBlockSummary={editedBlockSummary}
          fieldRails={fieldRails}
          onFieldRails={setFieldRails}
          fieldRailColors={FIELD_RAIL_COLORS}
          onVisibleBlock={setVisibleBlockId}
          onBlockClicked={handlePreviewBlockClick}
          blockOverride={blockOverride}
        />
      </div>

      {/* Confirmation modal — shown when the user clicks another block in
          the preview while the current one has unsaved edits or is being
          created from scratch. */}
      {pendingNavigation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setPendingNavigation(null)}
        >
          <div
            className="border-border w-full max-w-md rounded-lg border bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-sm font-semibold">Modifications non sauvegardées</h3>
            <p className="text-muted-foreground mt-2 text-xs">
              {isCreating
                ? "Ce bloc n'est pas encore créé. Tu peux le créer maintenant avant d'ouvrir l'autre bloc, ou abandonner sa création."
                : 'Tu as des modifs en cours sur ce bloc. Comment veux-tu continuer ?'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPendingNavigation(null)}>
                Annuler
              </Button>
              <Button variant="outline" size="sm" onClick={confirmDiscardThenNavigate}>
                {isCreating ? 'Abandonner la création' : 'Ouvrir sans sauvegarder'}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void confirmSaveThenNavigate();
                }}
                disabled={status === 'saving'}
              >
                {status === 'saving' ? 'Enregistrement…' : isCreating ? 'Créer puis ouvrir' : 'Enregistrer puis ouvrir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status, manualSave }: { status: SaveStatus; manualSave?: boolean }) {
  switch (status) {
    case 'dirty':
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Modifications non enregistrées
        </span>
      );
    case 'pending':
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Modifications en attente…
        </span>
      );
    case 'saving':
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          Enregistrement…
        </span>
      );
    case 'saved':
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Enregistré
        </span>
      );
    case 'error':
      return (
        <span className="text-destructive flex items-center gap-1.5 text-xs">
          <span className="bg-destructive h-1.5 w-1.5 rounded-full" />
          Échec de l&apos;enregistrement
        </span>
      );
    case 'idle':
    default:
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="bg-muted-foreground/30 h-1.5 w-1.5 rounded-full" />
          {manualSave ? 'Enregistrement manuel' : 'Auto-enregistrement actif'}
        </span>
      );
  }
}

/* --------------------------------------------------------------------- */
/* MissingTagsBanner                                                     */
/* --------------------------------------------------------------------- */

/**
 * Banner pinned at the top of the block editor that surfaces every
 * EMPTY maintenance-tag slot in the current block, both :
 *   - the **top-level** slot (`block_tag` join, one per block), and
 *   - the **nested** slots (children of Video / HeroTitle /
 *     PhotoCarousel / ToolContentSection in `payload.children[]`).
 *
 * Each slot renders as a small amber chip. The chips are read-only
 * indicators ; the actual TagsField widgets stay in their natural
 * sub-sections (the user said : « les avoir aussi dans les bonnes
 * sous-sections si nécessaire »). Their presence at the very top is
 * meant as a checklist — once a slot is filled, the corresponding
 * chip disappears.
 *
 * The top-level slot is detected via a `loadBlockTags()` client fetch
 * (one query per block-edit-page mount). The nested slots are derived
 * synchronously from `payload` via {@link findMissingNestedTagSlots},
 * so they update live as the user adds tags inside a child without
 * re-fetching.
 */
function MissingTagsBanner({
  blockId,
  payload,
  blockType,
}: {
  blockId: string;
  payload: Record<string, unknown>;
  blockType: string;
}) {
  const [topLevelHasTag, setTopLevelHasTag] = useState<boolean | null>(null);

  // Re-fetch when the blockId changes (cross-block navigation) AND
  // when the local payload mutates — saving a tag via TagsField in
  // `block` mode hits the DB directly, so a re-fetch keeps the banner
  // honest. `payload` reference equality is enough : `setBlock` always
  // produces a fresh object.
  useEffect(() => {
    let cancelled = false;
    loadBlockTags(blockId)
      .then((tags) => {
        if (!cancelled) setTopLevelHasTag(tags.length > 0);
      })
      .catch(() => {
        if (!cancelled) setTopLevelHasTag(true); // optimistic — don't nag on a transient fetch error
      });
    return () => {
      cancelled = true;
    };
  }, [blockId, payload]);

  const nestedSlots = useMemo(() => findMissingNestedTagSlots(payload), [payload]);
  const topLevelMissing = topLevelHasTag === false;
  const totalMissing = (topLevelMissing ? 1 : 0) + nestedSlots.length;
  if (totalMissing === 0) return null;

  // Map technical block type to a friendlier label for the top-level
  // chip. The nested chips already carry their own label from the
  // schema lookup table.
  const TOP_LEVEL_LABEL: Record<string, string> = {
    video: 'Vidéo',
    heroTitle: 'Bandeau de titre',
    photoCarousel: 'Photo carousel',
    toolContentSection: 'Tool section',
    card: 'Card',
    keyPointsCard: 'Key points',
    faqCard: 'FAQ',
    text: 'Texte',
    form: 'Formulaire',
    conditional: 'Conditionnel',
    componentRef: 'Composant custom',
    chapterTransition: 'Transition de chapitre',
  };
  const topLabel = TOP_LEVEL_LABEL[blockType] ?? blockType;

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      data-testid="missing-tags-banner"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">🏷 Tags à ajouter ({totalMissing}) —</span>
        {topLevelMissing && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium"
            title="Le bloc lui-même n'a pas encore de tag de maintenance"
          >
            <span aria-hidden="true">⚠</span>
            <span>Ce bloc ({topLabel})</span>
          </span>
        )}
        {nestedSlots.map((slot, i) => (
          <span
            key={`${slot.path}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium"
            title={`Sous-bloc ${slot.label} sans tag (path : ${slot.path})`}
          >
            <span aria-hidden="true">⚠</span>
            <span>Sous-bloc {slot.label}</span>
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] italic text-amber-700/80">
        Ces tags se renseignent dans les sous-sections « Tags de maintenance » ci-dessous. Cette zone disparaît dès que
        tous les slots sont remplis.
      </p>
    </div>
  );
}
