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
import { SearchHighlightBanner } from '@/components/SearchHighlightBanner';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import {
  findMatchingFieldPaths,
  findMatchingFieldSnippets,
  findMissingNestedTagSlots,
  harvestNestedTagIds,
} from '@/lib/blockSearch';
import { loadBlockTags } from '@/lib/tags';

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
    // Only re-seed when the URL query itself changes — otherwise editing a
    // matched field would clear the input the instant the substring goes away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  const searchQuery = localSearch.trim();
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
      {/* ⌘K search context surfaced when arriving from the palette. */}
      <SearchHighlightBanner />
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

      {/* Central "Tags de maintenance" section — shared by every block type. */}
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
  );
}

export function SaveIndicator({ status, manualSave }: { status: SaveStatus; manualSave?: boolean }) {
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
 * Banner pinned at the top of the block editor that surfaces every EMPTY
 * maintenance-tag slot in the current block (top-level via `block_tag` +
 * nested children slots). Read-only checklist ; the actual TagsField widgets
 * live in their sub-sections. Disappears once all slots are filled.
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
