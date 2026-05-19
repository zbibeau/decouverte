'use client';

import type { ContentBlock } from '@shared/content-schema';

import { ChildBlockList } from './ChildBlockList';
import { Field } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import type { PayloadEditorProps } from './editor-types';

type CardPayload = {
  navbar?: { variant: string };
  children: ContentBlock[];
};

export function CardEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
  depth = 0,
}: PayloadEditorProps<CardPayload>) {
  return (
    <div className="space-y-3">
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

      <Field label="Blocs enfants" path="children">
        <ChildBlockList
          blocks={payload.children}
          onChange={(children) => onChange({ ...payload, children })}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
          scopeLabel="Card"
        />
      </Field>
    </div>
  );
}
