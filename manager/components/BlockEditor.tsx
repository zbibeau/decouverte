'use client';

import type { ContentBlock } from '@shared/content-schema';
import { GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChapterMeta, NavbarVariantMeta, VariableMeta } from '@/components/blocks/editor-types';
import { InlineBlockEditor } from '@/components/InlineBlockEditor';
import { PreviewPanel } from '@/components/PreviewPanel';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { summarizeBlock } from '@/lib/blockSummary';
import { FIELD_RAIL_COLORS } from '@/lib/fieldRailColors';
import { extractUsedVariableKeys } from '@/lib/usedVariables';
import { useBackArrowToParent } from '@/lib/useListKeyboardNav';
import { useUnsavedChangesWarning } from '@/lib/useUnsavedChangesWarning';

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

/**
 * Per-block editor PAGE host : a resizable split view = the extracted
 * {@link InlineBlockEditor} body on the left + a single {@link PreviewPanel} on
 * the right. The editor body reports its live state up here (block payload,
 * dirty/creating flags, hovered field) so this host can feed the preview and
 * drive the click-to-navigate confirmation modal. Save side-effects that need
 * the router (published→draft id swap, creation, strip ?new=1) are handled
 * here via the editor's delegation callbacks.
 */
export function BlockEditor(props: Props) {
  const router = useRouter();
  const toast = useToast();
  // ← (or h) returns to the chapter's block list. Disabled while typing in
  // an input/textarea so it doesn't steal cursor-left in form fields.
  useBackArrowToParent(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}`);

  // ---- State mirrored up from InlineBlockEditor (drives the preview) ----
  const [mirrorBlock, setMirrorBlock] = useState<ContentBlock>({
    type: props.type,
    payload: props.initialPayload,
  } as ContentBlock);
  const [isDirty, setIsDirty] = useState(false);
  const [isCreating, setIsCreating] = useState(props.isNew);
  // Field hover state — drives the preview-iframe field highlight overlay.
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // Visible block tracking + field rails — both reported by the preview iframe.
  const [visibleBlockId, setVisibleBlockId] = useState<string | null>(null);
  const [fieldRails, setFieldRails] = useState<Array<{ key: string; top: number; height: number }>>([]);

  // ---- Lifted variable-simulator state (shared between PreviewPanel and
  //      inline simulators inside child editors). ----
  const [simValues, setSimValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of props.variables) {
      if (v.type === 'boolean') init[v.key] = 'false';
      else if (v.type === 'enum') init[v.key] = v.options[0]?.value ?? '';
      else init[v.key] = '';
    }
    return init;
  });
  // Keep `simValues` in sync with the parcours variable set: add new keys with
  // their default, leave existing keys untouched, drop removed ones.
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
  const SPLIT_STORAGE_KEY = 'mfm.blockEditor.leftWidth';
  const SPLIT_MIN = 280;
  const SPLIT_MAX = 900;
  /** Reserve at least this many px for the preview column so it never
   *  collapses to invisible — a common cause of "I lost my preview". */
  const PREVIEW_MIN_WIDTH = 320;
  function clampLeftWidth(desired: number): number {
    if (typeof window === 'undefined') return desired;
    const vw = window.innerWidth || 0;
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

  const editedBlockSummary = useMemo(() => {
    return summarizeBlock(mirrorBlock.type, mirrorBlock.payload as Record<string, unknown>);
  }, [mirrorBlock.type, mirrorBlock.payload]);

  // Variable keys actually referenced by the previewed content.
  const activeVariables = useMemo(() => {
    const blocksForScan: ContentBlock[] = isCreating
      ? [mirrorBlock]
      : (props.chapterBlocks ?? []).map((b) => ((b as { id?: string }).id === props.blockId ? mirrorBlock : b));
    const usedKeys = extractUsedVariableKeys(blocksForScan);
    return props.variables.filter((v) => usedKeys.has(v.key));
  }, [isCreating, mirrorBlock, props.chapterBlocks, props.blockId, props.variables]);

  // Warn on tab-close / refresh while there are unsaved block edits.
  useUnsavedChangesWarning(isDirty);

  // Memoise `blockOverride` so its identity is stable while the user hasn't
  // edited — without this, the iframe remounts the block on every keystroke
  // (`<Show keyed>`) and resets internal component state (e.g. FAQ accordion).
  const blockOverride = useMemo(
    () => ({
      blockId: props.blockId,
      block: { type: mirrorBlock.type, payload: mirrorBlock.payload as Record<string, unknown> },
    }),
    [props.blockId, mirrorBlock.type, mirrorBlock.payload],
  );

  // ---- Routing side-effects delegated by InlineBlockEditor ----
  function handlePersistedId(newId: string) {
    toast.info('Brouillon créé automatiquement pour ce bloc');
    router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${newId}`, { scroll: false });
    router.refresh();
  }
  function handleCreatedId(newId: string) {
    router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${newId}`, { scroll: false });
    router.refresh();
  }
  function handleStrippedNew() {
    router.replace(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${props.blockId}`, {
      scroll: false,
    });
    router.refresh();
  }

  // ---- Click-to-edit from the preview iframe -----------------------------
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  function navigateToBlock(targetId: string) {
    router.push(`/parcours/${props.parcoursSlug}/chapters/${props.chapterSlug}/blocks/${targetId}`);
  }

  function handlePreviewBlockClick(clickedId: string) {
    if (clickedId === props.blockId) return;
    if (!isDirty && !isCreating) {
      navigateToBlock(clickedId);
      return;
    }
    setPendingNavigation(clickedId);
  }

  async function confirmSaveThenNavigate() {
    if (!pendingNavigation) return;
    const target = pendingNavigation;
    setPendingNavigation(null);
    setModalSaving(true);
    try {
      if (isCreating && props.createAction) {
        await props.createAction(mirrorBlock.payload as Record<string, unknown>);
        toast.success('Bloc créé');
      } else {
        await props.saveAction(mirrorBlock.payload as Record<string, unknown>);
      }
    } catch (e) {
      console.error('[BlockEditor] save-then-navigate failed', e);
      toast.error("Échec de l'enregistrement — bloc non modifié.");
      setModalSaving(false);
      return;
    }
    setModalSaving(false);
    navigateToBlock(target);
  }

  function confirmDiscardThenNavigate() {
    if (!pendingNavigation) return;
    const target = pendingNavigation;
    setPendingNavigation(null);
    navigateToBlock(target);
  }

  return (
    <div ref={splitRef} className="flex flex-col gap-0 lg:h-[calc(100vh-96px)] lg:flex-row">
      <div
        className="w-full space-y-4 lg:h-full lg:overflow-y-auto lg:pr-3"
        style={isLg ? { width: leftWidth, flexShrink: 0 } : undefined}
      >
        <InlineBlockEditor
          blockId={props.blockId}
          chapterSlug={props.chapterSlug}
          parcoursSlug={props.parcoursSlug}
          isNew={props.isNew}
          type={props.type}
          initialPayload={props.initialPayload}
          variables={props.variables}
          chapters={props.chapters}
          navbarVariants={props.navbarVariants}
          saveAction={props.saveAction}
          createAction={props.createAction}
          draftStatus={props.draftStatus}
          sourcePayload={props.sourcePayload}
          simValues={simValues}
          setSimValues={setSimValues}
          setHoveredField={setHoveredField}
          onBlockChange={setMirrorBlock}
          onDirtyChange={setIsDirty}
          onCreatingChange={setIsCreating}
          onPersistedId={handlePersistedId}
          onCreatedId={handleCreatedId}
          onStrippedNew={handleStrippedNew}
        />
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
          isolatedBlockType={mirrorBlock.type}
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

      {/* Confirmation modal — shown when the user clicks another block in the
          preview while the current one has unsaved edits or is being created. */}
      {pendingNavigation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setPendingNavigation(null)}
        >
          <div
            className="border-border bg-surface w-full max-w-md rounded-lg border p-5 shadow-lg"
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
                disabled={modalSaving}
              >
                {modalSaving ? 'Enregistrement…' : isCreating ? 'Créer puis ouvrir' : 'Enregistrer puis ouvrir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
