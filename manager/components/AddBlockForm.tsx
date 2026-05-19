'use client';

import { BlockTypeSelector } from '@/components/BlockTypeSelector';

interface Props {
  /**
   * Insert a sample block (with the curated payload from `SAMPLE_PAYLOADS`)
   * at the end of the current chapter. Each button opens a popover with the
   * live preview, and clicking "Insérer cet exemple" calls this callback.
   */
  insertSampleAction: (type: string) => Promise<void>;
}

export function AddBlockForm({ insertSampleAction }: Props) {
  return <BlockTypeSelector onInsert={(t) => insertSampleAction(t)} />;
}
