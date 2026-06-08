'use client';

import type { ContentBlock } from '@shared/content-schema';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { DiffProvider } from '@/components/blocks/DiffContext';
import type { ChapterMeta, NavbarVariantMeta, VariableMeta } from '@/components/blocks/editor-types';
import { Section } from '@/components/blocks/Field';
import { FieldHoverProvider } from '@/components/blocks/FieldHoverContext';
import {
  type CreateNavbarVariantFn,
  NavbarVariantCreateProvider,
} from '@/components/blocks/NavbarVariantCreateContext';
import { PayloadEditor } from '@/components/blocks/PayloadEditor';
import { SearchMatchProvider } from '@/components/blocks/SearchMatchContext';
import { SimulatorProvider } from '@/components/blocks/SimulatorContext';
import { TagsField, TagsHelpBanner } from '@/components/blocks/TagsField';
import { DraftBlockDiffPanel } from '@/components/DraftBlockDiffPanel';
import { InPageSearchInput } from '@/components/InPageSearchInput';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import {
  findMatchingFieldPaths,
  findMatchingFieldSnippets,
  findMissingNestedTagSlots,
  harvestNestedTagIds,
} from '@/lib/blockSearch';
import { isTagColor, TAG_COLOR_HEX, type Tag } from '@/lib/tagColors';

/**
 * Headless-ish block editor BODY extracted from `BlockEditor.tsx`.
 *
 * Renders the left-pane editing UI (search banners + PayloadEditor + central
 * TagsField + save/status bar) WITHOUT any preview iframe. All preview-facing
 * state is LIFTED to the host:
 *   - the live `block` is reported via `onBlockChange` (host builds the
 *     `blockOverride` it pushes to the shared PreviewPanel),
 *   - `isDirty` / `isCreating` are reported so the host can drive its
 *     beforeunload guard + click-to-navigate modal,
 *   - `hoveredField` is forwarded through the host-owned setter,
 *   - the variable simulator (`simValues`) is a controlled, host-owned prop so
 *     a single simulator can be shared across the whole chapter.
 * Routing side-effects on save (published→draft id swap, creation,
 * strip ?new=1) are delegated to the host through `onPersistedId` /
 * `onCreatedId` / `onStrippedNew`, keeping this component router-free so it can
 * be mounted N times inside a chapter list (Phase 2).
 */
export type SaveStatus = 'idle' | 'dirty' | 'pending' | 'saving' | 'saved' | 'error';

const AUTO_SAVE_DELAY = 600;

interface Props {
  blockId: string;
  chapterSlug: string;
  parcoursSlug: string;
  isNew: boolean;
  type: ContentBlock['type'];
  initialPayload: Record<string, unknown>;
  variables: VariableMeta[];
  chapters?: ChapterMeta[];
  navbarVariants?: NavbarVariantMeta[];
  /** Inline « + Nouvelle navbar… » create callback, surfaced to the navbar
   *  picker via context. Omit to hide the inline-create option. */
  onCreateNavbarVariant?: CreateNavbarVariantFn;
  saveAction: (payload: Record<string, unknown>) => Promise<string | void>;
  createAction?: (payload: Record<string, unknown>) => Promise<string>;
  draftStatus?: 'new' | 'modified' | 'pristine';
  sourcePayload?: Record<string, unknown> | null;

  /**
   * Whether this editor is the ACTIVE one (default true). In the chapter view
   * several rows can be expanded at once, but only the active one drives the
   * single shared preview — so `onBlockChange` (block override) and the
   * hovered-field highlight are reported up ONLY when active. Autosave + dirty
   * reporting stay on regardless so background rows keep saving.
   */
  active?: boolean;

  // ---- Lifted / controlled state (owned by the host) ----
  /** Shared variable-simulator values (one simulator per chapter). */
  simValues: Record<string, string>;
  setSimValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Host-owned hovered-field setter — forwarded to FieldHoverProvider so the
   *  host can light up the matching `[data-field-path]` in the preview. */
  setHoveredField: (path: string | null) => void;

  // ---- Report-up callbacks ----
  onBlockChange?: (block: ContentBlock) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onCreatingChange?: (isCreating: boolean) => void;

  // ---- Routing delegation (host owns the router) ----
  /** Called when a save returns a different block id (published→draft twin). */
  onPersistedId?: (newId: string) => void;
  /** Called after a draft-creation insert returns the new block id. */
  onCreatedId?: (newId: string) => void;
  /** Called after the first manual save in edit mode (host strips ?new=1). */
  onStrippedNew?: () => void;
}

export function InlineBlockEditor(props: Props) {
  const toast = useToast();
  const searchParams = useSearchParams();

  const [block, setBlock] = useState<ContentBlock>({
    type: props.type,
    payload: props.initialPayload,
  } as ContentBlock);
  // Creation mode (manual save) vs edition mode (auto-save).
  const [isCreating, setIsCreating] = useState(props.isNew);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [isPending, startTransition] = useTransition();
  // `componentRef` blocks opt out of auto-save (browse the component bank
  // freely); they require an explicit "Enregistrer" / "Annuler".
  const isManualSave = props.type === 'componentRef';
  // Active = drives the shared preview. Defaults to true (per-block page use).
  const active = props.active ?? true;

  // ---- ⌘K search context ------------------------------------------------
  // urlQuery drives the SILENT field-level highlight pass (so the
  // editor sees which inputs matched their palette query without
  // re-typing). The visible "Filtrer les champs" input keeps its own
  // state, starting empty — we no longer auto-fill it from urlQuery
  // because the user found that combo of pre-populated input + yellow
  // banner too noisy. Manual input takes over the moment they type ;
  // clear it back to empty and urlQuery rules again.
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = localSearch.trim() || urlQuery;
  const searchMatchPaths = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    return new Set(findMatchingFieldPaths(block.payload, searchQuery));
  }, [searchQuery, block.payload]);
  const searchMatchSnippets = useMemo(() => {
    if (!searchQuery) return new Map<string, string>();
    return findMatchingFieldSnippets(block.payload, searchQuery, 32);
  }, [searchQuery, block.payload]);

  // Auto-scroll the first matched field into view on mount + query change.
  useEffect(() => {
    if (!searchQuery || searchMatchPaths.size === 0) return;
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('[data-search-match="true"]');
      if (first) {
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ---- Current block tags + missing-tag detection ----
  // `currentBlockTags` is null while the fetch is in-flight (so we
  // don't flash an amber "à ajouter" state during the first paint).
  // The TagsField below pushes its loaded list up via
  // `onCurrentTagsChange`, replacing the redundant `loadBlockTags`
  // call we used to do here and giving the Section header live tag
  // pills that follow add/remove operations without a refetch.
  const [currentBlockTags, setCurrentBlockTags] = useState<Tag[] | null>(null);
  const handleCurrentTagsChange = useCallback((tags: Tag[]) => {
    setCurrentBlockTags(tags);
  }, []);
  const nestedMissingSlots = useMemo(() => findMissingNestedTagSlots(block.payload), [block.payload]);
  const topLevelMissing = currentBlockTags !== null && currentBlockTags.length === 0;
  const missingTagsCount = (topLevelMissing ? 1 : 0) + nestedMissingSlots.length;

  // Last payload we successfully persisted, used to skip redundant auto-saves.
  const lastSavedRef = useRef<string>(JSON.stringify(props.initialPayload));

  async function persist(payload: Record<string, unknown>) {
    setStatus('saving');
    try {
      const result = await props.saveAction(payload);
      lastSavedRef.current = JSON.stringify(payload);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      // First edit after a publish: server translated the published block id
      // into its draft twin. Delegate the URL swap to the host.
      if (typeof result === 'string' && result !== props.blockId) {
        props.onPersistedId?.(result);
      }
    } catch (e) {
      console.error('[InlineBlockEditor] save failed', e);
      setStatus('error');
      toast.error("Échec de l'enregistrement — voir la console.");
    }
  }

  // Manual save (creation mode): persist + leave creation mode.
  function handleManualSave() {
    startTransition(async () => {
      const payload = block.payload as Record<string, unknown>;
      // Draft mode: insert in DB, then let the host navigate to the real URL.
      if (props.createAction) {
        setStatus('saving');
        try {
          const newId = await props.createAction(payload);
          lastSavedRef.current = JSON.stringify(payload);
          setStatus('saved');
          toast.success('Bloc créé');
          props.onCreatedId?.(newId);
        } catch (e) {
          console.error('[InlineBlockEditor] create failed', e);
          setStatus('error');
          toast.error('Échec de la création du bloc');
        }
        return;
      }
      await persist(payload);
      setIsCreating(false);
      props.onStrippedNew?.();
    });
  }

  // Auto-save in edit mode: debounced after each change. Skipped for
  // `componentRef` (manual save) and while still in creation mode. Nested
  // `tagIds` changes BYPASS the debounce (discrete pill-clicks need immediate
  // persistence — otherwise navigating away within 600ms loses the tag).
  useEffect(() => {
    if (isCreating) return;
    const serialized = JSON.stringify(block.payload);
    if (serialized === lastSavedRef.current) return;

    if (isManualSave) {
      setStatus((s) => (s === 'saving' ? s : 'dirty'));
      return;
    }

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
      console.error('[InlineBlockEditor] revert failed', e);
    }
  }

  // Manual save handler for `componentRef` (edit mode).
  function handleEditSave() {
    startTransition(async () => {
      await persist(block.payload as Record<string, unknown>);
    });
  }

  const isDirty = status === 'dirty' || status === 'pending' || status === 'error';

  // ---- Report state up to the host (preview / modal / beforeunload) ----
  // Destructured so the callbacks can sit in the dep arrays (exhaustive-deps
  // clean). They're stable setState-style fns in practice; re-running on a new
  // identity merely re-reports the same value (the host's setters bail on
  // equality, so this can't loop).
  const { onBlockChange, onDirtyChange, onCreatingChange, setHoveredField } = props;
  // Block override is preview-facing → only the ACTIVE editor reports it.
  useEffect(() => {
    if (active) onBlockChange?.(block);
  }, [block, active, onBlockChange]);
  // Dirty + creating are reported regardless (the host ORs dirty across every
  // open row for its beforeunload guard).
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onCreatingChange?.(isCreating);
  }, [isCreating, onCreatingChange]);

  // Field-hover highlight is preview-facing → gate on active so a background
  // row's hover doesn't light up the wrong block in the shared preview.
  const reportHoveredField = useCallback(
    (path: string | null) => {
      if (active) setHoveredField(path);
    },
    [active, setHoveredField],
  );

  // Stable simulator-context value built from the host-owned shared state.
  const setSimValues = props.setSimValues;
  const simulatorContextValue = useMemo(
    () => ({
      values: props.simValues,
      setValue: (key: string, value: string) => setSimValues((prev) => ({ ...prev, [key]: value })),
      variables: props.variables,
    }),
    [props.simValues, props.variables, setSimValues],
  );

  return (
    <div className="space-y-4">
      {/* Le bandeau jaune "Recherche : X" a été retiré : urlQuery
          ci-dessus pilote silencieusement les highlights de champs
          quand on arrive depuis ⌘K, et la barre de filtre reste
          vide. Le user peut taper à tout moment pour affiner. */}
      <InPageSearchInput
        value={localSearch}
        onChange={setLocalSearch}
        placeholder="🔍 Filtrer les champs de ce bloc…"
      />
      {/* Central "Tags de maintenance" section — moved up here so the
          editor sees the tag status BEFORE the payload editor. When at
          least one tag slot is empty (top-level OR a nested
          taggable child), the whole section turns amber via
          `tone="warning"` and the count is reflected in the title.
          The dedicated MissingTagsBanner that previously sat in this
          position has been removed — its information is now folded
          into this single visual surface. */}
      {!isCreating && (
        <Section
          title={missingTagsCount > 0 ? `Tags de maintenance — ${missingTagsCount} à ajouter` : 'Tags de maintenance'}
          accentColor="slate"
          tone={missingTagsCount > 0 ? 'warning' : 'neutral'}
          collapsible
          // Folded by default — the amber title + "N à ajouter" count
          // (when warning) AND the inline coloured pills (when tags
          // exist) already give the editor everything they need to
          // scan the tag status. They unfold only when they want to
          // act (add / remove).
          defaultOpen={false}
          action={
            currentBlockTags && currentBlockTags.length > 0 ? (
              <div className="flex items-center gap-1 whitespace-nowrap">
                {currentBlockTags.map((t) => {
                  const hex = isTagColor(t.color) ? TAG_COLOR_HEX[t.color] : TAG_COLOR_HEX.amber;
                  return (
                    <span
                      key={t.id}
                      className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: hex.chip, color: hex.text }}
                      title={`Tag de maintenance : ${t.label}`}
                    >
                      {t.label}
                    </span>
                  );
                })}
              </div>
            ) : null
          }
        >
          <TagsHelpBanner contextHint="Aide à retrouver ce bloc via ⌘K quand une fonctionnalité produit évolue." />
          {/* Explicit blockId : the unified chapter view's URL doesn't carry
              the block id (it's `/parcours/<slug>/chapters/<chapter>?block=…`,
              not the legacy `/blocks/<id>` route), so without this prop the
              TagsField falls back to URL parsing → null → renders the
              misleading "save first" placeholder for already-saved blocks. */}
          <TagsField target={{ kind: 'block', blockId: props.blockId }} onCurrentTagsChange={handleCurrentTagsChange} />
        </Section>
      )}
      {!isCreating && (
        <DraftBlockDiffPanel
          status={props.draftStatus}
          currentPayload={block.payload as Record<string, unknown>}
          sourcePayload={props.sourcePayload ?? null}
        />
      )}
      <NavbarVariantCreateProvider onCreate={props.onCreateNavbarVariant}>
        <DiffProvider
          current={block.payload}
          source={isCreating ? null : (props.sourcePayload ?? null)}
          blockIsNew={props.draftStatus === 'new'}
        >
          <FieldHoverProvider setHoveredField={reportHoveredField}>
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
      </NavbarVariantCreateProvider>

      {/* "Tags de maintenance" was here historically — it has been
          relocated to the top of the form (see above) so the editor
          sees the tag status BEFORE diving into the payload. */}

      <div className="border-border bg-surface/95 sticky bottom-0 flex items-center gap-3 rounded-md border p-2 shadow-sm backdrop-blur">
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
  );
}

export function SaveIndicator({ status, manualSave }: { status: SaveStatus; manualSave?: boolean }) {
  switch (status) {
    case 'dirty':
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
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

/* MissingTagsBanner has been removed — its information is now folded
 * into the central "Tags de maintenance" Section at the top of the
 * form, which turns amber (tone="warning") with a "N à ajouter"
 * suffix in the title when at least one tag slot is empty (top-level
 * OR any nested taggable child). See `missingTagsCount` upstream. */
