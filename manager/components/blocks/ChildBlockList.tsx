'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ContentBlock } from '@shared/content-schema';
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { BlockTypeSelector } from '@/components/BlockTypeSelector';
import { BlockThumb } from '@/components/blocks/BlockThumb';
import { Button } from '@/components/ui/Button';
import {
  blankBlock,
  BLOCK_CATEGORIES,
  BLOCK_CATEGORY_ACCENT,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES_ORDER,
} from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { summarizeBlock } from '@/lib/blockSummary';
import { cn } from '@/lib/utils';

/** Block types that don't make sense as a nested sub-block : the hero
 *  title is per-chapter, and component refs are top-level only. */
const NESTED_EXCLUDED_TYPES = new Set<ContentBlock['type']>(['heroTitle', 'componentRef']);

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import type { ChapterMeta, NavbarVariantMeta, VariableMeta } from './editor-types';
import { PayloadEditor } from './PayloadEditor';

interface Props {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
  variables: VariableMeta[];
  chapters?: ChapterMeta[];
  navbarVariants?: NavbarVariantMeta[];
  depth?: number;
  /**
   * Path-like label shown in the ⌘K palette ("Card", "Conditionnel > Alors",
   * "Tool > sous-blocs"…). When omitted the scope is not registered — useful
   * for internal recursive nesting that shouldn't appear at the top level.
   */
  scopeLabel?: string;
}

/**
 * Recursive list of child blocks used inside `card`, both branches of
 * `conditional`, and `toolContentSection`. Each child is rendered as
 * a collapsible row with its `PayloadEditor` inside on expand.
 *
 * Lot 1 of the Direction C refonte unifies the drag gesture between
 * root rows and nested rows : every level uses dnd-kit's
 * `SortableContext`, every row exposes a grip handle in the same
 * spot, ↑↓ arrow buttons are gone. The "frères uniquement" rule from
 * the prototype is enforced naturally by having ONE `DndContext` per
 * `ChildBlockList` instance — drags can't cross over to a parent or
 * sibling list because each list is its own dnd scope.
 */
export function ChildBlockList({
  blocks,
  onChange,
  variables,
  chapters,
  navbarVariants,
  depth = 0,
  scopeLabel,
}: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(blocks.length === 1 ? 0 : null);

  // Refs to each rendered row, indexed by position. Used to scroll the
  // newly-inserted sub-block into view (Bug #2 — "Quand j'ajoute un
  // sous-bloc, merci de me mettre le focus dessus").
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  // When `focusIdx` is set after an insert, scroll the matching row into
  // view and flash an emerald ring around it (Bug #2). The scroll is
  // attempted twice — once on the next animation frame (after the row
  // mounts), then again ~250ms later because the freshly-expanded editor
  // body usually keeps growing as async content (sample HTML, images,
  // form fields) settles. A single immediate `scrollIntoView` would
  // target the row's initial position and miss the final layout.
  useEffect(() => {
    if (focusIdx === null) return;
    let cancelled = false;
    const scroll = () => {
      if (cancelled) return;
      const el = rowRefs.current[focusIdx];
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const rafId = requestAnimationFrame(scroll);
    const t1 = window.setTimeout(scroll, 250);
    // Keep the emerald flash visible long enough to clearly signal "this
    // is the new one" (~3 s), then clear so the row falls back to its
    // normal style.
    const t2 = window.setTimeout(() => setFocusIdx(null), 3000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [focusIdx]);

  // Keep refs to the latest `blocks` / `onChange` so the `add` callback
  // below can stay referentially stable (empty deps array). This matters
  // because `add` is part of the deps of `useRegisterAddScope` — if `add`
  // changed identity on every render, the scope would re-register in a
  // loop and `bump()` inside `register()` would max out React's update
  // depth (the call sites — e.g. ConditionalEditor — pass an inline
  // `onChange` and a `payload.else ?? []` that are fresh each render).
  const blocksRef = useRef(blocks);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    blocksRef.current = blocks;
    onChangeRef.current = onChange;
  });

  function update(idx: number, next: ContentBlock) {
    const copy = blocks.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(blocks.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  }
  /**
   * Append a new sub-block of the given type. Uses the curated sample
   * payload from `SAMPLE_PAYLOADS` so the inserted block immediately
   * renders with meaningful content (same behavior as the top-level
   * AddBlockForm). Falls back to `blankBlock` if no sample exists.
   *
   * Wrapped in a Promise to match the `AddBlockButton` onInsert signature
   * — the popover awaits it before showing success / closing.
   *
   * Stable identity (empty deps) — reads the latest `blocks` / `onChange`
   * from refs maintained above. See the comment on those refs for why.
   */
  const add = useCallback(async (type: ContentBlock['type']) => {
    const sample = SAMPLE_PAYLOADS[type];
    const newBlock: ContentBlock = sample
      ? ({
          type,
          payload: JSON.parse(JSON.stringify(sample.payload)),
        } as ContentBlock)
      : blankBlock(type);
    const currBlocks = blocksRef.current;
    const newIdx = currBlocks.length;
    onChangeRef.current([...currBlocks, newBlock]);
    setOpenIdx(newIdx);
    // Trigger the scroll-into-view + flash on the next render, once the
    // new row has mounted and its ref is populated.
    setFocusIdx(newIdx);
  }, []);

  // Publish "Ajouter un sous-bloc" actions to the ⌘K palette. Depth grows
  // with nesting so an inner card outranks its outer container.
  useRegisterAddScope(
    scopeLabel
      ? {
          id: `children-${scopeLabel.replace(/\s+/g, '_')}-${depth}`,
          label: `${scopeLabel} · sous-blocs`,
          depth: 15 + depth * 5,
          actions: BLOCK_TYPES_ORDER.filter((t) => t !== 'heroTitle' && t !== 'componentRef').map((t) => ({
            id: `add-${t}`,
            label: `Ajouter ${(BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t}`,
            run: () => void add(t),
          })),
        }
      : null,
    [add, scopeLabel, depth],
  );

  const scopeId = scopeLabel ? `children-${scopeLabel.replace(/\s+/g, '_')}-${depth}` : null;

  // ---- dnd-kit setup ---------------------------------------------------
  // We use INDEX-based ids (`nested-${i}`) — stable per position, scoped
  // to THIS list instance. dnd-kit only needs ids unique within its own
  // SortableContext, so collisions across sibling lists are impossible.
  // The "frères uniquement" rule is enforced naturally : each
  // ChildBlockList renders its OWN `<DndContext>`, so a drag started in
  // one list literally cannot drop into another.
  //
  // Position-stability avoids React `key` churn during edits : when the
  // user types in a nested input, the block reference changes but its
  // index doesn't, so the row keeps its identity and the input keeps
  // focus.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const itemIds = blocks.map((_, i) => `nested-${i}`);
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = itemIds.indexOf(String(active.id));
    const newIdx = itemIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(blocks, oldIdx, newIdx);
    // Preserve openIdx / focusIdx position after reorder. If the user
    // had a row expanded, follow it. Same for the just-added flash.
    if (openIdx !== null) {
      const newOpenIdx = openIdx === oldIdx ? newIdx : applyArrayMoveToIdx(openIdx, oldIdx, newIdx);
      setOpenIdx(newOpenIdx);
    }
    if (focusIdx !== null) {
      const newFocusIdx = focusIdx === oldIdx ? newIdx : applyArrayMoveToIdx(focusIdx, oldIdx, newIdx);
      setFocusIdx(newFocusIdx);
    }
    onChange(next);
  }

  const inner: ReactNode = (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {blocks.map((b, idx) => {
            const isOpen = openIdx === idx;
            const justAdded = focusIdx === idx;
            return (
              <NestedRow
                key={idx}
                id={itemIds[idx]}
                refCallback={(el) => {
                  rowRefs.current[idx] = el;
                }}
                justAdded={justAdded}
                accentClass={BLOCK_CATEGORY_ACCENT[BLOCK_CATEGORIES[b.type]]}
              >
                {(handle) => (
                  <>
                    {/*
                      Header row of a child block. Per UX request: clicking
                      here should NOT promote this list's scope in the
                      palette. We stop the mousedown from bubbling to the
                      surrounding ScopeRoot. The inner editor (rendered
                      when isOpen) has its own ScopeRoot that handles
                      selection independently.
                    */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2" onMouseDown={(e) => e.stopPropagation()}>
                      {handle}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setOpenIdx(isOpen ? null : idx)}
                        title={isOpen ? 'Replier' : 'Déplier pour éditer'}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <BlockThumb type={b.type} size="nested" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-text-faint font-mono text-[9px] uppercase tracking-[0.12em]">
                          {BLOCK_TYPE_LABELS[b.type] ?? b.type} · sous-bloc
                        </span>
                        <span className="text-text truncate text-[13px] font-medium">
                          {summarizeBlock(b.type, b.payload as Record<string, unknown>)}
                        </span>
                      </span>
                      {/* Direction C — picto suppression discret : monochrome
                          gris par défaut, fond rouge translucide au hover. Le
                          rouge plein-temps de Lucide Trash2 attirait l'œil
                          en permanence et "lisait" comme un avertissement
                          alors que c'est une action quotidienne. */}
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        title="Supprimer ce sous-bloc"
                        className="text-text-muted inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="border-border bg-muted/20 border-t p-3">
                        <PayloadEditor
                          block={b}
                          onChange={(next) => update(idx, next)}
                          variables={variables}
                          chapters={chapters}
                          navbarVariants={navbarVariants}
                          depth={depth + 1}
                        />
                      </div>
                    )}
                  </>
                )}
              </NestedRow>
            );
          })}
        </SortableContext>
      </DndContext>

      <BlockTypeSelector onInsert={(t) => add(t)} excludeTypes={NESTED_EXCLUDED_TYPES} insertTarget="children" />
    </>
  );
  return scopeId ? (
    <ScopeRoot scopeId={scopeId} className="-m-1 space-y-2 rounded-md p-1">
      {inner}
    </ScopeRoot>
  ) : (
    <div className="space-y-2">{inner}</div>
  );
}

/**
 * One sortable row. Renders the wrapper `<div>` (with the rounded
 * border + emerald flash on `justAdded`) and yields a drag handle to
 * the children so the row can place the grip wherever it makes
 * visual sense. Mirrors the pattern used in `SortableList` at the
 * root level — keeps the drag affordance visually identical across
 * nesting depths.
 */
function NestedRow({
  id,
  refCallback,
  justAdded,
  accentClass,
  children,
}: {
  id: string;
  refCallback: (el: HTMLDivElement | null) => void;
  justAdded: boolean;
  /** Tailwind class for the colored left band — visual key matching
   *  the block category (cf. `BLOCK_CATEGORY_ACCENT`). */
  accentClass: string;
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
      className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
      title="Glisser pour réordonner"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        refCallback(el);
      }}
      style={style}
      className={cn(
        'bg-surface-2 rounded-[10px] border border-l-2 transition-all',
        // Direction C — hover halo violet sur les rows nested (le hover
        // change la border + ajoute un ring violet doux). Pas appliqué
        // sur la row en cours de drag (visuellement bruyant).
        'hover:border-primary/60 hover:shadow-[0_0_24px_-12px_rgba(140,90,235,0.6)]',
        justAdded
          ? 'border-emerald-400 bg-emerald-50 shadow-lg ring-2 ring-emerald-400 ring-offset-2 dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:ring-emerald-500'
          : `border-border ${accentClass}`,
      )}
    >
      {children(handle)}
    </div>
  );
}

/**
 * Reproject an index after an arrayMove. Used to keep `openIdx` /
 * `focusIdx` pointing at the same block after the user drags ANOTHER
 * row past it.
 *
 *   - If `idx` was the dragged row, the caller handles it explicitly.
 *   - Else, depending on the direction of the drag, the position of
 *     `idx` may shift by ±1.
 */
function applyArrayMoveToIdx(idx: number, oldIdx: number, newIdx: number): number {
  if (oldIdx === newIdx) return idx;
  if (oldIdx < newIdx) {
    // Drag forward : items between oldIdx+1 and newIdx (inclusive) shift left by 1.
    if (idx > oldIdx && idx <= newIdx) return idx - 1;
    return idx;
  }
  // Drag backward : items between newIdx and oldIdx-1 (inclusive) shift right by 1.
  if (idx >= newIdx && idx < oldIdx) return idx + 1;
  return idx;
}
