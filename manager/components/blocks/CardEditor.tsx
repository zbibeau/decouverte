'use client';

import type { ContentBlock } from '@shared/content-schema';

import { ChildBlockList } from './ChildBlockList';
import { Field } from './Field';
import type { PayloadEditorProps } from './editor-types';

type CardPayload = {
  navbar?: { variant: 'appointment' | 'contact' };
  children: ContentBlock[];
};

export function CardEditor({ payload, onChange, variables, depth = 0 }: PayloadEditorProps<CardPayload>) {
  return (
    <div className="space-y-3">
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

      <Field label="Blocs enfants" path="children">
        <ChildBlockList
          blocks={payload.children}
          onChange={(children) => onChange({ ...payload, children })}
          variables={variables}
          depth={depth}
          scopeLabel="Card"
        />
      </Field>
    </div>
  );
}
