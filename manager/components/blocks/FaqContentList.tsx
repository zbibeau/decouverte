'use client';

import type { FAQQuestionContent } from '@shared/content-schema';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { blankFaqContent } from '@/lib/blockDefaults';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { ConditionBuilder } from './ConditionBuilder';
import { FaqListEditor } from './FaqListEditor';
import { Field } from './Field';
import type { VariableMeta } from './editor-types';

interface Props {
  blocks: FAQQuestionContent[];
  onChange: (next: FAQQuestionContent[]) => void;
  variables: VariableMeta[];
  depth?: number;
  /**
   * Index of the parent FAQ question. Used to scope ⌘K add-actions
   * ("Question N · Ajouter un texte…") and to namespace registration ids.
   * Optional — when omitted (nested in a conditional branch) we fall back
   * to a generic "Conditionnel · Ajouter…" scope at a slightly deeper level.
   */
  questionIdx?: number;
  /** Path-like label used when nested (e.g. "Q4 > Alors"). */
  scopeLabel?: string;
  /** Depth bump for nested instances (conditional branches). */
  scopeDepthBoost?: number;
}

const KINDS: Array<{ kind: FAQQuestionContent['kind']; label: string }> = [
  { kind: 'text', label: 'Texte' },
  { kind: 'list', label: 'Liste' },
  { kind: 'callout', label: 'Encart' },
  { kind: 'audio', label: 'Audio' },
  { kind: 'conditional', label: 'Conditionnel' },
];

export function FaqContentList({
  blocks,
  onChange,
  variables,
  depth = 0,
  questionIdx,
  scopeLabel,
  scopeDepthBoost = 0,
}: Props) {
  function update(idx: number, next: FAQQuestionContent) {
    const copy = blocks.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(blocks.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = blocks.slice();
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
  }
  const add = useCallback(
    (kind: FAQQuestionContent['kind']) => {
      onChange([...blocks, blankFaqContent(kind)]);
    },
    [blocks, onChange],
  );

  // Register the "Add a content block" scope. Each FaqContentList instance
  // — including ones nested inside a conditional's `then` / `else` — gets
  // a distinct id, label and depth so they all show up side by side in
  // the palette.
  const scopeId = scopeLabel
    ? `faq-content-${questionIdx ?? '?'}-${scopeLabel.replace(/\s+/g, '_')}-${depth}`
    : `faq-content-${questionIdx ?? '?'}-${depth}`;
  const scopeHeading = scopeLabel
    ? `${scopeLabel} · contenu`
    : questionIdx != null
      ? `Question ${questionIdx + 1} · contenu`
      : 'Contenu FAQ';
  useRegisterAddScope(
    {
      id: scopeId,
      label: scopeHeading,
      // 20 = inside the FAQ but at a question's content level. +5 per
      // conditional nesting level so deeper branches outrank shallow ones.
      depth: 20 + scopeDepthBoost + depth * 5,
      actions: KINDS.map((k) => ({
        id: `add-${k.kind}`,
        label: `Ajouter ${k.label.toLowerCase()}`,
        run: () => add(k.kind),
      })),
    },
    [add, scopeHeading],
  );

  return (
    <ScopeRoot scopeId={scopeId} className="space-y-2 rounded-md p-1 -m-1">
      {blocks.map((b, idx) => (
        <div key={idx} className="rounded-md border border-border bg-white p-2">
          <div className="mb-1.5 flex items-center gap-1">
            <span className="inline-flex h-5 items-center rounded bg-muted px-1.5 text-[10px] font-medium uppercase text-muted-foreground">
              {b.kind}
            </span>
            <div className="flex-1" />
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
          <FaqContentEditor
            content={b}
            onChange={(next) => update(idx, next)}
            variables={variables}
            depth={depth}
            questionIdx={questionIdx}
            scopeLabel={scopeLabel}
            blockIdx={idx}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <Button key={k.kind} variant="outline" size="sm" onClick={() => add(k.kind)}>
            <Plus className="h-3 w-3" />
            {k.label}
          </Button>
        ))}
      </div>
    </ScopeRoot>
  );
}

function FaqContentEditor({
  content,
  onChange,
  variables,
  depth,
  questionIdx,
  scopeLabel,
  blockIdx,
}: {
  content: FAQQuestionContent;
  onChange: (next: FAQQuestionContent) => void;
  variables: VariableMeta[];
  depth: number;
  questionIdx: number | undefined;
  scopeLabel: string | undefined;
  blockIdx: number;
}) {
  switch (content.kind) {
    case 'text':
      return (
        <Textarea
          rows={3}
          value={content.html}
          onChange={(e) => onChange({ ...content, html: e.target.value })}
          className="text-xs"
        />
      );

    case 'callout':
      return (
        <Textarea
          rows={2}
          value={content.html}
          onChange={(e) => onChange({ ...content, html: e.target.value })}
          className="text-xs"
        />
      );

    case 'audio':
      return (
        <Input
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="/mp3/exemple.mp3"
          className="h-8 text-xs"
        />
      );

    case 'list':
      return (
        <FaqListEditor
          content={content}
          onChange={onChange}
          questionIdx={questionIdx}
          scopeLabel={scopeLabel}
          blockIdx={blockIdx}
        />
      );

    case 'conditional': {
      const branchLabel = (which: 'Alors' | 'Sinon') =>
        scopeLabel
          ? `${scopeLabel} > Conditionnel #${blockIdx + 1} > ${which}`
          : questionIdx != null
            ? `Question ${questionIdx + 1} > Conditionnel #${blockIdx + 1} > ${which}`
            : `Conditionnel #${blockIdx + 1} > ${which}`;
      return (
        <div className="space-y-2">
          <ConditionBuilder
            condition={content.condition}
            onChange={(condition) => onChange({ ...content, condition })}
            variables={variables}
          />
          <div className="space-y-2 rounded-md border-l-2 border-primary/40 pl-3">
            <Field label="Alors (then)">
              <FaqContentList
                blocks={content.then}
                onChange={(then) => onChange({ ...content, then })}
                variables={variables}
                depth={depth + 1}
                questionIdx={questionIdx}
                scopeLabel={branchLabel('Alors')}
                scopeDepthBoost={5}
              />
            </Field>
          </div>
          <div className="space-y-2 rounded-md border-l-2 border-muted pl-3">
            <Field label="Sinon (else)">
              <FaqContentList
                blocks={content.else ?? []}
                onChange={(next) => onChange({ ...content, else: next })}
                variables={variables}
                depth={depth + 1}
                questionIdx={questionIdx}
                scopeLabel={branchLabel('Sinon')}
                scopeDepthBoost={5}
              />
            </Field>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

