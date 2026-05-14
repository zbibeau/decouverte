'use client';

import type { FAQQuestionContent } from '@shared/content-schema';
import { useCallback } from 'react';

import { useRegisterAddScope } from './AddActionsContext';
import { ItemsList } from './ItemsList';

/**
 * `list`-kind FAQ content — split out as its own component so the
 * `useRegisterAddScope` hook can be called at top-level (no conditional
 * hook inside a switch).
 *
 * Publishes "Ajouter un point" as the deepest scope (depth 30+) so it
 * shows up at the very top of the ⌘K palette when the user is editing
 * this list.
 */
export function FaqListEditor({
  content,
  onChange,
  questionIdx,
  scopeLabel,
  blockIdx,
}: {
  content: Extract<FAQQuestionContent, { kind: 'list' }>;
  onChange: (next: FAQQuestionContent) => void;
  questionIdx: number | undefined;
  scopeLabel: string | undefined;
  blockIdx: number;
}) {
  const addItem = useCallback(() => {
    onChange({ ...content, items: [...content.items, { text: '' }] });
  }, [content, onChange]);

  const heading = scopeLabel
    ? `${scopeLabel} > Liste #${blockIdx + 1}`
    : questionIdx != null
      ? `Question ${questionIdx + 1} > Liste #${blockIdx + 1}`
      : `Liste #${blockIdx + 1}`;

  useRegisterAddScope(
    {
      id: `faq-list-${questionIdx ?? '?'}-${blockIdx}-${scopeLabel ?? ''}`,
      label: heading,
      depth: 30 + content.items.length,
      actions: [
        {
          id: 'add-point',
          label: 'Ajouter un point',
          description: `Point #${content.items.length + 1}`,
          run: addItem,
        },
      ],
    },
    [addItem, heading, content.items.length],
  );

  return (
    <ItemsList
      items={content.items}
      onChange={(items) => onChange({ ...content, items })}
    />
  );
}
