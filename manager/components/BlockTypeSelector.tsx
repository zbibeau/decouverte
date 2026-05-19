'use client';

import type { ContentBlock } from '@shared/content-schema';

import { AddBlockButton } from '@/components/AddBlockButton';
import {
  BLOCK_TYPES_ORDER,
  BLOCK_TYPE_LABELS,
  blankBlock,
} from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';

interface Props {
  /** Called when a block type is picked. Receives the slug. */
  onInsert: (type: ContentBlock['type']) => Promise<void> | void;
  /** Optional set of types to exclude from the picker — e.g. nested
   *  contexts hide `heroTitle` and `componentRef` which only make sense at
   *  the top level of a chapter. */
  excludeTypes?: Set<ContentBlock['type']>;
  /** Visual hint forwarded to AddBlockButton. */
  insertTarget?: 'chapter' | 'children';
}

/**
 * Shared row of "+ <type>" pickers used by :
 *   - `AddBlockForm` (top-level, end-of-chapter)
 *   - `ChildBlockList` (nested, inside card/conditional/toolContentSection)
 *
 * Centralises the BLOCK_TYPES_ORDER iteration + the safeSample fallback so
 * we don't drift between the two usages.
 */
export function BlockTypeSelector({
  onInsert,
  excludeTypes,
  insertTarget,
}: Props) {
  const types = BLOCK_TYPES_ORDER.filter((t) => !excludeTypes?.has(t));
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => {
        const curated = SAMPLE_PAYLOADS[t];
        // Fall back to a minimal stub when no curated sample exists, so the
        // popover preview always renders something (even if blank).
        const safeSample = curated ?? {
          description: `Bloc « ${BLOCK_TYPE_LABELS[t] ?? t} ».`,
          whenToUse: 'À utiliser comme bloc dans un chapitre.',
          payload: blankBlock(t).payload as Record<string, unknown>,
        };
        return (
          <AddBlockButton
            key={t}
            type={t}
            label={BLOCK_TYPE_LABELS[t] ?? t}
            sample={safeSample}
            insertTarget={insertTarget}
            onInsert={() => Promise.resolve(onInsert(t))}
          />
        );
      })}
    </div>
  );
}
