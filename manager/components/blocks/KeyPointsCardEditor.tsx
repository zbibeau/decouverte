'use client';

import type { BranchingCondition, LeafCondition } from '@shared/content-schema';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useCallback } from 'react';

import { IconPicker } from '@/components/IconPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { ScopeRoot, useRegisterAddScope } from './AddActionsContext';
import { useFieldDiff, useBlockIsNew } from './DiffContext';
import { Field, Section } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import { ItemsList } from './ItemsList';
import type { PayloadEditorProps } from './editor-types';

/** Compact diff badge for layouts where wrapping with <Field> doesn't fit. */
function InlineDiffBadge({ path }: { path: string }) {
  const status = useFieldDiff(path);
  const blockIsNew = useBlockIsNew();
  if (blockIsNew) return null;
  if (status === 'modified') {
    return (
      <span className="inline-flex items-center rounded bg-amber-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-800/60 dark:text-amber-100">
        Modifié
      </span>
    );
  }
  if (status === 'added') {
    return (
      <span className="inline-flex items-center rounded bg-sky-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky-900 dark:bg-sky-800/60 dark:text-sky-200">
        Nouveau
      </span>
    );
  }
  return null;
}

type GroupItem =
  | { text: string }
  | { conditional: BranchingCondition; then: { text: string }; else?: { text: string } };

type Group = {
  title: string;
  variant?: 'success50' | 'secondary50' | 'primary50' | 'primary400';
  icon?: string;
  items: GroupItem[];
};

type KPPayload = {
  navbar?: { variant: string };
  contentClass?: string;
  inline?: boolean;
  hideHeader?: boolean;
  main: {
    icon?: string;
    title: string;
    description?: string;
    items?: Array<{ text: string; variant?: string }>;
    extraDescriptions?: string[];
  };
  groups?: Group[];
  exception?: {
    icon?: string;
    title: string;
    description?: string;
    items?: Array<{ text: string; variant?: string }>;
    style?: 'primary' | 'dark' | 'secondary';
  };
};

export function KeyPointsCardEditor({ payload, onChange, variables, navbarVariants }: PayloadEditorProps<KPPayload>) {
  function updateMain(patch: Partial<KPPayload['main']>) {
    onChange({ ...payload, main: { ...payload.main, ...patch } });
  }
  function updateException(patch: Partial<NonNullable<KPPayload['exception']>>) {
    onChange({
      ...payload,
      exception: {
        ...(payload.exception ?? { title: '' }),
        ...patch,
      },
    });
  }
  function updateGroups(groups: Group[]) {
    onChange({ ...payload, groups: groups.length ? groups : undefined });
  }
  const addGroup = useCallback(() => {
    updateGroups([...(payload.groups ?? []), { title: 'Nouveau groupe', variant: 'secondary50', items: [] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.groups]);

  const addMainItem = useCallback(() => {
    onChange({
      ...payload,
      main: { ...payload.main, items: [...(payload.main.items ?? []), { text: '' }] },
    });
  }, [payload, onChange]);
  const addExceptionItem = useCallback(() => {
    onChange({
      ...payload,
      exception: {
        ...(payload.exception ?? { title: '' }),
        items: [...(payload.exception?.items ?? []), { text: '' }],
      },
    });
  }, [payload, onChange]);

  useRegisterAddScope(
    {
      id: 'keypoints-main',
      label: 'Key points',
      depth: 10,
      actions: [
        {
          id: 'add-main-item',
          label: 'Ajouter un point (principal)',
          description: `Point #${(payload.main.items?.length ?? 0) + 1}`,
          run: addMainItem,
        },
        ...(payload.exception
          ? [
              {
                id: 'add-exception-item',
                label: 'Ajouter un point (exception)',
                description: `Point #${(payload.exception.items?.length ?? 0) + 1}`,
                run: addExceptionItem,
              },
            ]
          : []),
        {
          id: 'add-group',
          label: 'Ajouter un groupe',
          description: `Groupe #${(payload.groups?.length ?? 0) + 1}`,
          run: addGroup,
        },
      ],
    },
    [
      addMainItem,
      addExceptionItem,
      addGroup,
      payload.exception,
      payload.main.items?.length,
      payload.exception?.items?.length,
      payload.groups?.length,
    ],
  );
  function updateGroup(idx: number, patch: Partial<Group>) {
    const next = [...(payload.groups ?? [])];
    next[idx] = { ...next[idx], ...patch };
    updateGroups(next);
  }
  function removeGroup(idx: number) {
    updateGroups((payload.groups ?? []).filter((_, i) => i !== idx));
  }
  function moveGroup(idx: number, dir: -1 | 1) {
    const next = [...(payload.groups ?? [])];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    updateGroups(next);
  }
  function updateGroupItem(gIdx: number, iIdx: number, item: GroupItem) {
    const g = payload.groups?.[gIdx];
    if (!g) return;
    const items = [...g.items];
    items[iIdx] = item;
    updateGroup(gIdx, { items });
  }
  function addGroupItem(gIdx: number) {
    const g = payload.groups?.[gIdx];
    if (!g) return;
    updateGroup(gIdx, { items: [...g.items, { text: '' }] });
  }
  function removeGroupItem(gIdx: number, iIdx: number) {
    const g = payload.groups?.[gIdx];
    if (!g) return;
    updateGroup(gIdx, { items: g.items.filter((_, i) => i !== iIdx) });
  }
  function toggleGroupItemConditional(gIdx: number, iIdx: number) {
    const g = payload.groups?.[gIdx];
    const it = g?.items[iIdx];
    if (!g || !it) return;
    if ('conditional' in it) {
      updateGroupItem(gIdx, iIdx, { text: it.then.text });
    } else {
      updateGroupItem(gIdx, iIdx, {
        conditional: { variable: '', op: '=', value: true },
        then: { text: it.text },
        else: { text: '' },
      });
    }
  }

  function toggleException() {
    if (payload.exception) {
      const { exception: _, ...rest } = payload;
      onChange(rest as KPPayload);
    } else {
      onChange({ ...payload, exception: { title: 'Exceptions', items: [] } });
    }
  }

  return (
    <ScopeRoot scopeId="keypoints-main" className="-m-1 space-y-3 rounded-md p-1">
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

      <Section title="Sous-titre optionnel (au-dessus des paragraphes)" accentColor="rose">
        <Field label="Icône du sous-titre" path="main.icon">
          <IconPicker value={payload.main.icon ?? ''} onChange={(icon) => updateMain({ icon: icon || undefined })} />
        </Field>
        <Field
          label="Texte du sous-titre"
          path="main.title"
          hint="Laisse vide pour ne pas afficher de sous-titre. Le bandeau “💡 Les points clés” reste affiché quoi qu'il arrive."
        >
          <Input value={payload.main.title} onChange={(e) => updateMain({ title: e.target.value })} />
        </Field>
        <Field label="Description (HTML)" path="main.description">
          <Textarea
            rows={3}
            value={payload.main.description ?? ''}
            onChange={(e) => updateMain({ description: e.target.value })}
          />
        </Field>
        <Field label="Points" path="main.items">
          <ItemsList items={payload.main.items ?? []} onChange={(items) => updateMain({ items })} />
        </Field>
        <Field
          label="Paragraphes additionnels"
          path="main.extraDescriptions"
          hint="Une ligne = un paragraphe, HTML autorisé"
        >
          <Textarea
            rows={3}
            value={(payload.main.extraDescriptions ?? []).join('\n')}
            onChange={(e) =>
              updateMain({
                extraDescriptions: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </Section>

      <Section
        title="Groupes de points (multi-sections)"
        accentColor="amber"
        action={
          <Button variant="ghost" size="sm" onClick={addGroup}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un groupe
          </Button>
        }
      >
        {(payload.groups ?? []).length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Aucun groupe. Utilise les groupes pour afficher plusieurs checklists avec titre et branchements par item (ex
            : variante selon une variable).
          </p>
        ) : (
          (payload.groups ?? []).map((group, gIdx) => (
            <div key={gIdx} className="border-border bg-surface space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1">
                <Input
                  value={group.title}
                  onChange={(e) => updateGroup(gIdx, { title: e.target.value })}
                  placeholder="Titre du groupe"
                  className="h-8 flex-1 text-xs"
                />
                <InlineDiffBadge path={`groups[${gIdx}]`} />
                <select
                  className="border-border bg-surface h-8 rounded-md border px-1 text-xs"
                  value={group.variant ?? 'secondary50'}
                  onChange={(e) => updateGroup(gIdx, { variant: e.target.value as 'secondary50' | 'primary50' })}
                >
                  <option value="secondary50">secondary50</option>
                  <option value="primary50">primary50</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => moveGroup(gIdx, -1)} disabled={gIdx === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveGroup(gIdx, 1)}
                  disabled={gIdx === (payload.groups ?? []).length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeGroup(gIdx)}>
                  <Trash2 className="text-destructive h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                {group.items.map((item, iIdx) => {
                  const isCond = 'conditional' in item;
                  return (
                    <div key={iIdx} className="border-border bg-muted/30 space-y-1 rounded border border-dashed p-1.5">
                      {!isCond ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={item.text}
                            onChange={(e) => updateGroupItem(gIdx, iIdx, { text: e.target.value })}
                            placeholder="Point…"
                            className="h-8 flex-1 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGroupItemConditional(gIdx, iIdx)}
                            title="Rendre conditionnel"
                          >
                            ⚡
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeGroupItem(gIdx, iIdx)}>
                            <Trash2 className="text-destructive h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <p className="text-muted-foreground flex-1 text-[10px] font-semibold uppercase">
                              Item branché
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleGroupItemConditional(gIdx, iIdx)}
                              title="Convertir en item simple"
                            >
                              ⚡
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeGroupItem(gIdx, iIdx)}>
                              <Trash2 className="text-destructive h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {(() => {
                            // The UI only supports LeafCondition for now.
                            // AllCondition / AnyCondition trees would need a
                            // recursive editor — out of scope here.
                            const cond = item.conditional as LeafCondition;
                            const selectedVar = variables.find((v) => v.key === cond.variable);
                            return (
                              <div className="flex items-center gap-1">
                                <select
                                  className="border-border bg-surface h-8 flex-1 rounded-md border px-1 text-xs"
                                  value={cond.variable}
                                  onChange={(e) =>
                                    updateGroupItem(gIdx, iIdx, {
                                      ...item,
                                      conditional: { ...cond, variable: e.target.value },
                                    })
                                  }
                                >
                                  <option value="">— variable —</option>
                                  {variables.map((v) => (
                                    <option key={v.key} value={v.key}>
                                      {v.label || v.key}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="border-border bg-surface h-8 rounded-md border px-1 text-xs"
                                  value={cond.op}
                                  onChange={(e) =>
                                    updateGroupItem(gIdx, iIdx, {
                                      ...item,
                                      conditional: {
                                        ...cond,
                                        op: e.target.value as '=' | '!=' | 'in',
                                      },
                                    })
                                  }
                                >
                                  <option value="=">=</option>
                                  <option value="!=">!=</option>
                                  <option value="in">in</option>
                                </select>
                                {selectedVar?.type === 'boolean' ? (
                                  <select
                                    className="border-border bg-surface h-8 w-24 rounded-md border px-1 text-xs"
                                    value={String(cond.value)}
                                    onChange={(e) =>
                                      updateGroupItem(gIdx, iIdx, {
                                        ...item,
                                        conditional: { ...cond, value: e.target.value === 'true' },
                                      })
                                    }
                                  >
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                  </select>
                                ) : selectedVar?.type === 'enum' && selectedVar.options.length > 0 ? (
                                  <select
                                    className="border-border bg-surface h-8 w-24 rounded-md border px-1 text-xs"
                                    value={String(cond.value)}
                                    onChange={(e) =>
                                      updateGroupItem(gIdx, iIdx, {
                                        ...item,
                                        conditional: { ...cond, value: e.target.value },
                                      })
                                    }
                                  >
                                    {selectedVar.options.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label || o.value}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    value={String(cond.value)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val: string | boolean | number =
                                        raw === 'true'
                                          ? true
                                          : raw === 'false'
                                            ? false
                                            : isNaN(Number(raw)) || raw === ''
                                              ? raw
                                              : Number(raw);
                                      updateGroupItem(gIdx, iIdx, {
                                        ...item,
                                        conditional: { ...cond, value: val },
                                      });
                                    }}
                                    placeholder="valeur"
                                    className="h-8 w-24 text-xs"
                                  />
                                )}
                              </div>
                            );
                          })()}
                          <Input
                            value={item.then.text}
                            onChange={(e) =>
                              updateGroupItem(gIdx, iIdx, {
                                ...item,
                                then: { text: e.target.value },
                              })
                            }
                            placeholder="Texte si condition vraie"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={item.else?.text ?? ''}
                            onChange={(e) =>
                              updateGroupItem(gIdx, iIdx, {
                                ...item,
                                else: e.target.value ? { text: e.target.value } : undefined,
                              })
                            }
                            placeholder="Texte si condition fausse (vide = masqué)"
                            className="h-8 text-xs"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => addGroupItem(gIdx)}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter un point
                </Button>
              </div>
            </div>
          ))
        )}
      </Section>

      <Section
        title="Bloc exception"
        accentColor="purple"
        action={
          <Button variant="ghost" size="sm" onClick={toggleException}>
            {payload.exception ? (
              <>
                <X className="h-3.5 w-3.5" /> Retirer
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Activer
              </>
            )}
          </Button>
        }
      >
        {payload.exception ? (
          <>
            <Field label="Icône" path="exception.icon">
              <IconPicker
                value={payload.exception.icon ?? ''}
                onChange={(icon) => updateException({ icon: icon || undefined })}
              />
            </Field>
            <Field label="Titre" path="exception.title">
              <Input value={payload.exception.title} onChange={(e) => updateException({ title: e.target.value })} />
            </Field>
            <Field label="Description" path="exception.description">
              <Textarea
                rows={3}
                value={payload.exception.description ?? ''}
                onChange={(e) => updateException({ description: e.target.value })}
              />
            </Field>
            <Field label="Points" path="exception.items">
              <ItemsList items={payload.exception.items ?? []} onChange={(items) => updateException({ items })} />
            </Field>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">Aucun bloc exception.</p>
        )}
      </Section>
    </ScopeRoot>
  );
}
