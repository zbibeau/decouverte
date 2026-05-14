'use client';

import { AddBlockButton } from '@/components/AddBlockButton';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';

interface Props {
  /**
   * Insert a sample block (with the curated payload from `SAMPLE_PAYLOADS`)
   * at the end of the current chapter. Each button opens a popover with the
   * live preview, and clicking "Insérer cet exemple" calls this callback.
   */
  insertSampleAction: (type: string) => Promise<void>;
}

export function AddBlockForm({ insertSampleAction }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_TYPES_ORDER.map((t) => (
        <AddBlockButton
          key={t}
          type={t}
          label={BLOCK_TYPE_LABELS[t]}
          sample={SAMPLE_PAYLOADS[t]}
          onInsert={insertSampleAction}
        />
      ))}
    </div>
  );
}
