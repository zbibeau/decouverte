'use client';

import type { FAQQuestion } from '@shared/content-schema';
import { useCallback } from 'react';

import { Input } from '@/components/ui/Input';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { FaqContentList } from './FaqContentList';
import { Field } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import { TabbedItemList } from './TabbedItemList';
import type { PayloadEditorProps } from './editor-types';

type FaqPayload = {
  navbar?: { variant: string };
  questions: FAQQuestion[];
};

export function FaqCardEditor({ payload, onChange, variables, navbarVariants }: PayloadEditorProps<FaqPayload>) {
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
    <ScopeRoot scopeId="faq-questions" className="-m-1 space-y-3 rounded-md p-1">
      <Field label="Navbar pilote" path="navbar">
        <NavbarVariantSelect
          value={payload.navbar?.variant}
          onChange={(key) =>
            onChange({
              ...payload,
              navbar: key ? { variant: key } : undefined,
            })
          }
          variants={navbarVariants}
        />
      </Field>

      {/* Direction C — questions en onglets horizontaux (au lieu du
          stack vertical de Sections). Cohérent avec PhotoCarousel /
          FormEditor qui utilisent déjà TabbedItemList. Réduit la
          hauteur de l'éditeur quand il y a 4-5 questions. */}
      <TabbedItemList
        items={payload.questions}
        title="Questions"
        addLabel="Ajouter une question"
        emptyText="Aucune question. Clique sur « Ajouter » pour en créer une."
        getLabel={(_q, idx) => `Question ${idx + 1}`}
        onAdd={addQuestion}
        onRemove={removeQuestion}
        onMove={moveQuestion}
        renderItem={(q, idx) => (
          <>
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
          </>
        )}
      />
    </ScopeRoot>
  );
}
