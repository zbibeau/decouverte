'use client';

import type { ContentBlock } from '@shared/content-schema';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';

import { BlockTypeSelector } from '@/components/BlockTypeSelector';
import { Button } from '@/components/ui/Button';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS, blankBlock } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { summarizeBlock } from '@/lib/blockSummary';

/** Block types that don't make sense as a nested sub-block : the hero
 *  title is per-chapter, and component refs are top-level only. */
const NESTED_EXCLUDED_TYPES = new Set<ContentBlock['type']>([
  'heroTitle',
  'componentRef',
]);

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { PayloadEditor } from './PayloadEditor';
import type {
  ChapterMeta,
  NavbarVariantMeta,
  VariableMeta,
} from './editor-types';

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
   */
  const add = useCallback(
    async (type: ContentBlock['type']) => {
      const sample = SAMPLE_PAYLOADS[type];
      const newBlock: ContentBlock = sample
        ? ({
            type,
            payload: JSON.parse(JSON.stringify(sample.payload)),
          } as ContentBlock)
        : blankBlock(type);
      onChange([...blocks, newBlock]);
      setOpenIdx(blocks.length);
    },
    [blocks, onChange],
  );

  // Publish "Ajouter un sous-bloc" actions to the ⌘K palette. Depth grows
  // with nesting so an inner card outranks its outer container.
  useRegisterAddScope(
    scopeLabel
      ? {
          id: `children-${scopeLabel.replace(/\s+/g, '_')}-${depth}`,
          label: `${scopeLabel} · sous-blocs`,
          depth: 15 + depth * 5,
          actions: BLOCK_TYPES_ORDER.filter(
            (t) => t !== 'heroTitle' && t !== 'componentRef',
          ).map((t) => ({
            id: `add-${t}`,
            label: `Ajouter ${(BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t}`,
            run: () => void add(t),
          })),
        }
      : null,
    [add, scopeLabel, depth],
  );

  const scopeId = scopeLabel
    ? `children-${scopeLabel.replace(/\s+/g, '_')}-${depth}`
    : null;
  const inner: ReactNode = (
    <>
      {blocks.map((b, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={idx} className="rounded-md border border-border bg-white">
            {/*
              Header row of a child block — only action is to expand /
              collapse / move / delete. Per UX request: clicking here
              should NOT promote this list's scope in the palette. We
              stop the mousedown from bubbling to the surrounding
              ScopeRoot. The inner editor (rendered when isOpen) has its
              own ScopeRoot that handles selection independently.
            */}
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <span className="inline-flex h-5 items-center rounded bg-muted px-1.5 text-[10px] font-medium uppercase text-muted-foreground">
                {BLOCK_TYPE_LABELS[b.type] ?? b.type}
              </span>
              <span className="flex-1 truncate text-xs">
                {summarizeBlock(b.type, b.payload as Record<string, unknown>)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => move(idx, 1)}
                disabled={idx === blocks.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            {isOpen && (
              <div className="border-t border-border bg-muted/20 p-3">
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

      <BlockTypeSelector
        onInsert={(t) => add(t)}
        excludeTypes={NESTED_EXCLUDED_TYPES}
        insertTarget="children"
      />
    </>
  );
  return scopeId ? (
    <ScopeRoot scopeId={scopeId} className="space-y-2 rounded-md p-1 -m-1">
      {inner}
    </ScopeRoot>
  ) : (
    <div className="space-y-2">{inner}</div>
  );
}
