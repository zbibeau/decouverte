'use client';

import type { FormBlock, FormField } from '@shared/content-schema';
import { useCallback, useEffect } from 'react';

import { IconPicker } from '@/components/IconPicker';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import type { PayloadEditorProps } from './editor-types';
import { Field, Section } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import { TabbedItemList } from './TabbedItemList';

type FormPayload = FormBlock['payload'];

export function FormEditor({ payload, onChange, variables, navbarVariants }: PayloadEditorProps<FormPayload>) {
  const fields = payload.fields ?? [];

  function updateHeader(patch: Partial<FormPayload>) {
    onChange({ ...payload, ...patch });
  }

  function updateFields(next: FormField[]) {
    onChange({ ...payload, fields: next });
  }

  // Auto-resync des options enum. Quand l'auteur réordonne les options d'une
  // variable (`logicielMedecin` à 28 entrées par ex.), les blocs `form` qui
  // pointent dessus gardent leur SNAPSHOT figé dans `FormField.options` (=
  // ce qui a été copié au moment du `pickVariable`) — du coup le front
  // continue d'afficher l'ancien ordre. On detecte ici l'écart (ordre OU
  // contenu) et on patche silencieusement. L'autosave de `InlineBlockEditor`
  // pousse ensuite la nouvelle payload en DB. Si rien à patcher, no-op.
  //
  // Comparaison par identité de la séquence value→label : si les deux
  // tableaux sont strictement égaux dans leur ordre + labels, on ne touche
  // pas (évite des boucles `useEffect → setBlock → re-render`).
  useEffect(() => {
    let dirty = false;
    const next = fields.map((f) => {
      if (f.type !== 'enum') return f;
      const v = variables.find((x) => x.key === f.key);
      if (!v || v.type !== 'enum') return f;
      const fresh = v.options.map((o) => ({ value: o.value, label: o.label }));
      const current = f.options ?? [];
      const sameLength = current.length === fresh.length;
      const sameOrder = sameLength && current.every((o, i) => o.value === fresh[i].value && o.label === fresh[i].label);
      if (sameOrder) return f;
      dirty = true;
      return { ...f, options: fresh };
    });
    if (dirty) updateFields(next);
    // Deps = signatures sérialisées des variables (key|type|options:value=label)
    // ET des fields (key|type). Ces strings changent uniquement quand l'ordre
    // / contenu côté variable bouge ou qu'une question change de cible — donc
    // l'effet re-fire exactement quand un patch peut être nécessaire, sans
    // re-fire à chaque keystroke sur un label de question. Pas d'eslint-disable
    // exhaustive-deps : la règle n'est pas enregistrée côté manager (= error
    // « rule not found » si on l'ajoute).
  }, [
    variables
      .map((v) => `${v.key}|${v.type}|${(v.options ?? []).map((o) => `${o.value}=${o.label}`).join(',')}`)
      .join('||'),
    fields.map((f) => `${f.key}|${f.type}`).join('||'),
  ]);

  const addField = useCallback(() => {
    const firstVar = variables[0];
    updateFields([
      ...fields,
      firstVar
        ? {
            key: firstVar.key,
            label: firstVar.label,
            type: firstVar.type,
            required: true,
            options:
              firstVar.type === 'enum' ? firstVar.options.map((o) => ({ value: o.value, label: o.label })) : undefined,
          }
        : {
            key: '',
            label: 'Nouvelle question',
            type: 'boolean',
            required: true,
          },
    ]);
  }, [fields, variables]);

  useRegisterAddScope(
    {
      id: 'form-fields',
      label: 'Formulaire',
      depth: 10,
      actions: [
        {
          id: 'add-field',
          label: 'Ajouter un champ',
          description: `Champ #${fields.length + 1}`,
          run: addField,
        },
      ],
    },
    [addField, fields.length],
  );

  function updateField(idx: number, patch: Partial<FormField>) {
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    updateFields(next);
  }

  /** When the user picks a different variable, sync type + options automatically. */
  function pickVariable(idx: number, key: string) {
    const v = variables.find((x) => x.key === key);
    if (!v) {
      updateField(idx, { key });
      return;
    }
    updateField(idx, {
      key: v.key,
      label: fields[idx].label || v.label,
      type: v.type,
      options: v.type === 'enum' ? v.options.map((o) => ({ value: o.value, label: o.label })) : undefined,
    });
  }

  function removeField(idx: number) {
    updateFields(fields.filter((_, i) => i !== idx));
  }

  function moveField(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    updateFields(next);
  }

  return (
    <ScopeRoot scopeId="form-fields" className="-m-1 space-y-4 rounded-md p-1">
      <Section title="Navbar pilote">
        <Field label="Variante" path="navbar">
          <NavbarVariantSelect
            value={payload.navbar?.variant}
            onChange={(key) => updateHeader({ navbar: key ? { variant: key } : undefined })}
            variants={navbarVariants}
          />
        </Field>
      </Section>

      <Section title="En-tête">
        <Field label="Titre" path="title">
          <Input
            value={payload.title ?? ''}
            onChange={(e) => updateHeader({ title: e.target.value })}
            placeholder="Pour une démo personnalisée"
          />
        </Field>
        <Field label="Description" path="description">
          <Textarea
            rows={2}
            value={payload.description ?? ''}
            onChange={(e) => updateHeader({ description: e.target.value })}
            placeholder="Merci de répondre à ces quelques questions :"
          />
        </Field>
        <Field label="Icône" path="icon">
          <IconPicker value={payload.icon ?? ''} onChange={(icon) => updateHeader({ icon })} />
        </Field>
      </Section>

      <Section title={`Questions (${fields.length})`}>
        {/* TabbedItemList : un onglet par question, panel actif uniquement.
            Move ↑↓ + Suppression + bouton "+ Ajouter" sont centralisés dans
            le composant. Le contenu de chaque question (variable picker,
            label, required, placeholder) reste rendu par le `renderItem`. */}
        <TabbedItemList<FormField>
          items={fields}
          getLabel={(_f, idx) => `Question #${idx + 1}`}
          onAdd={addField}
          onRemove={removeField}
          onMove={moveField}
          addLabel="Ajouter"
          emptyText="Aucune question. Clique sur « Ajouter » pour brancher une variable existante."
          renderItem={(f, idx) => {
            const variable = variables.find((v) => v.key === f.key);
            const typeMismatch = variable && variable.type !== f.type;
            return (
              <>
                <Field
                  label="Variable"
                  path={`fields[${idx}].key`}
                  hint={
                    !variable
                      ? "⚠︎ Cette clé n'existe pas dans les variables du parcours."
                      : typeMismatch
                        ? `⚠︎ Type déclaré (${f.type}) différent de la variable (${variable.type}).`
                        : undefined
                  }
                >
                  <select
                    className="border-border bg-surface h-9 w-full rounded-md border px-3 text-sm"
                    value={f.key}
                    onChange={(e) => pickVariable(idx, e.target.value)}
                  >
                    {!variable && <option value={f.key}>{f.key || '— choisir —'}</option>}
                    {variables.map((v) => (
                      <option key={v.id} value={v.key}>
                        {v.key} — {v.label} ({v.type})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Label affiché" path={`fields[${idx}].label`}>
                  <Input
                    value={f.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    placeholder="Êtes-vous médecin ?"
                  />
                </Field>

                <div className="flex items-center gap-4">
                  <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={f.required ?? true}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                    />
                    Obligatoire
                  </label>
                  <span className="text-muted-foreground text-[10px] uppercase">Type : {f.type}</span>
                </div>

                {(f.type === 'string' || f.type === 'number') && (
                  <Field label="Placeholder (facultatif)" path={`fields[${idx}].placeholder`}>
                    <Input
                      value={f.placeholder ?? ''}
                      onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                    />
                  </Field>
                )}
              </>
            );
          }}
        />
      </Section>

      <Section title="Bouton">
        <Field label="Libellé du bouton" path="nextButtonText">
          <Input
            value={payload.nextButtonText ?? ''}
            onChange={(e) => updateHeader({ nextButtonText: e.target.value })}
            placeholder="Continuer"
          />
        </Field>
        {/* "Chapitre suivant" field removed — forms now always advance to
             the next chapter in the parcours' logical reading order. The
             legacy `payload.nextStep` is kept on the schema (marked
             @deprecated) so existing rows keep parsing, but no longer
             surfaces in the editor and is ignored by the renderer. */}
      </Section>
    </ScopeRoot>
  );
}
