'use client';

import type { FormBlock, FormField } from '@shared/content-schema';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import { IconPicker } from '@/components/IconPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { Field, Section } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import type { PayloadEditorProps } from './editor-types';

type FormPayload = FormBlock['payload'];

export function FormEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
}: PayloadEditorProps<FormPayload>) {
  const fields = payload.fields ?? [];

  function updateHeader(patch: Partial<FormPayload>) {
    onChange({ ...payload, ...patch });
  }

  function updateFields(next: FormField[]) {
    onChange({ ...payload, fields: next });
  }

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
              firstVar.type === 'enum'
                ? firstVar.options.map((o) => ({ value: o.value, label: o.label }))
                : undefined,
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
      options:
        v.type === 'enum'
          ? v.options.map((o) => ({ value: o.value, label: o.label }))
          : undefined,
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
    <ScopeRoot scopeId="form-fields" className="space-y-4 rounded-md p-1 -m-1">
      {/* --- Navbar (slot above the form card) --- */}
      <Section title="Navbar pilote">
        <Field label="Variante" path="navbar">
          <NavbarVariantSelect
            value={payload.navbar?.variant}
            onChange={(key) =>
              updateHeader({ navbar: key ? { variant: key } : undefined })
            }
            variants={navbarVariants}
          />
        </Field>
      </Section>

      {/* --- Header (card chrome) --- */}
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
          <IconPicker
            value={payload.icon ?? ''}
            onChange={(icon) => updateHeader({ icon })}
          />
        </Field>
      </Section>

      {/* --- Fields --- */}
      <Section
        title={`Questions (${fields.length})`}
        action={
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
          </Button>
        }
      >
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucune question. Clique sur « Ajouter » pour brancher une variable existante.
          </p>
        )}
        <div className="space-y-3">
          {fields.map((f, idx) => {
            const variable = variables.find((v) => v.key === f.key);
            const typeMismatch = variable && variable.type !== f.type;
            return (
              <div
                key={idx}
                className="space-y-2 rounded-md border border-border bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Question #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === fields.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

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
                    className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm"
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
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={f.required ?? true}
                      onChange={(e) =>
                        updateField(idx, { required: e.target.checked })
                      }
                    />
                    Obligatoire
                  </label>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    Type : {f.type}
                  </span>
                </div>

                {(f.type === 'string' || f.type === 'number') && (
                  <Field
                    label="Placeholder (facultatif)"
                    path={`fields[${idx}].placeholder`}
                  >
                    <Input
                      value={f.placeholder ?? ''}
                      onChange={(e) =>
                        updateField(idx, { placeholder: e.target.value })
                      }
                    />
                  </Field>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* --- Footer (CTA) --- */}
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
