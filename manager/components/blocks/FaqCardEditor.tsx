'use client';

import type { FAQQuestion } from '@shared/content-schema';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { FaqContentList } from './FaqContentList';
import { Field, Section } from './Field';
import type { PayloadEditorProps } from './editor-types';

type FaqPayload = {
  navbar?: { variant: 'appointment' | 'contact' };
  questions: FAQQuestion[];
};

export function FaqCardEditor({ payload, onChange, variables }: PayloadEditorProps<FaqPayload>) {
  function updateQuestion(idx: number, patch: Partial<FAQQuestion>) {
    const copy = payload.questions.slice();
    copy[idx] = { ...copy[idx], ...patch };
    onChange({ ...payload, questions: copy });
  }
  function removeQuestion(idx: number) {
    onChange({ ...payload, questions: payload.questions.filter((_, i) => i !== idx) });
  }
  function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= payload.questions.length) return;
    const copy = payload.questions.slice();
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange({ ...payload, questions: copy });
  }
  const addQuestion = useCallback(() => {
    onChange({
      ...payload,
      questions: [...payload.questions, { title: 'Nouvelle question', blocks: [] }],
    });
  }, [payload, onChange]);

  // Publish "Ajouter une question" to the ⌘K palette. Depth 10 = top-level
  // structural action inside this block; deeper editors (per-question
  // contents, list points…) register at depth 20+ so they show up first.
  useRegisterAddScope(
    {
      id: 'faq-questions',
      label: 'FAQ',
      depth: 10,
      actions: [
        {
          id: 'add-question',
          label: 'Ajouter une question',
          description: `Question #${payload.questions.length + 1}`,
          run: addQuestion,
        },
      ],
    },
    [addQuestion, payload.questions.length],
  );

  return (
    <ScopeRoot scopeId="faq-questions" className="space-y-3 rounded-md p-1 -m-1">
      <Field label="Navbar pilote Tool 1" path="navbar">
        <select
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
          value={payload.navbar?.variant ?? ''}
          onChange={(e) =>
            onChange({
              ...payload,
              navbar: e.target.value
                ? { variant: e.target.value as 'appointment' | 'contact' }
                : undefined,
            })
          }
        >
          <option value="">(aucune)</option>
          <option value="appointment">appointment</option>
          <option value="contact">contact</option>
        </select>
      </Field>

      {payload.questions.map((q, idx) => (
        <Section
          key={idx}
          accentColor="sky"
          title={`Question ${idx + 1}`}
          action={
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveQuestion(idx, 1)}
                disabled={idx === payload.questions.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          }
        >
          <Field label="Titre" path={`questions[${idx}].title`}>
            <Input value={q.title} onChange={(e) => updateQuestion(idx, { title: e.target.value })} />
          </Field>
          <Field label="Contenu" path={`questions[${idx}].blocks`}>
            <FaqContentList
              blocks={q.blocks}
              onChange={(blocks) => updateQuestion(idx, { blocks })}
              variables={variables}
              questionIdx={idx}
            />
          </Field>
        </Section>
      ))}

      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="h-3.5 w-3.5" />
        Ajouter une question
      </Button>
    </ScopeRoot>
  );
}
