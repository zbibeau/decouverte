'use client';

import type { ContentBlock } from '@shared/content-schema';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { BlockTypeSelector } from '@/components/BlockTypeSelector';
import { Button } from '@/components/ui/Button';
import { blankBlock, BLOCK_TYPE_LABELS, BLOCK_TYPES_ORDER } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { summarizeBlock } from '@/lib/blockSummary';

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
 * Recursive list of child blocks used inside `card` and both branches of
 * `conditional`. Each child is rendered as a collapsible row with the
 * appropriate PayloadEditor inside.
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
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = blocks.slice();
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
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
  const inner: ReactNode = (
    <>
      {blocks.map((b, idx) => {
        const isOpen = openIdx === idx;
        const justAdded = focusIdx === idx;
        return (
          <div
            key={idx}
            ref={(el) => {
              rowRefs.current[idx] = el;
            }}
            className={
              'bg-surface rounded-md border transition-all ' +
              // Emerald flash = "just added" — distinct from the
              // brand-primary ring/background used elsewhere for the
              // chapter-level *selected* / *active* row, so the user
              // can't confuse "I added this" with "this is selected".
              (justAdded
                ? 'border-emerald-400 bg-emerald-50 shadow-lg ring-2 ring-emerald-400 ring-offset-2 dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:ring-emerald-500'
                : 'border-border')
            }
          >
            {/*
              Header row of a child block — only action is to expand /
              collapse / move / delete. Per UX request: clicking here
              should NOT promote this list's scope in the palette. We
              stop the mousedown from bubbling to the surrounding
              ScopeRoot. The inner editor (rendered when isOpen) has its
              own ScopeRoot that handles selection independently.
            */}
            <div className="flex items-center gap-2 px-2 py-1.5" onMouseDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium uppercase">
                {BLOCK_TYPE_LABELS[b.type] ?? b.type}
              </span>
              <span className="flex-1 truncate text-xs">
                {summarizeBlock(b.type, b.payload as Record<string, unknown>)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(idx)}>
                <Trash2 className="text-destructive h-3 w-3" />
              </Button>
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
          </div>
        );
      })}

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
