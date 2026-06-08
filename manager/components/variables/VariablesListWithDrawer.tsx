'use client';

import { Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ConfirmForm } from '@/components/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VariableHeader } from '@/components/variables/VariableHeader';
import { VariableOptionsForm } from '@/components/variables/VariableOptionsForm';
import { ValueMapInput } from '@/components/variables/ValueMapInput';
import { FamilyIcon } from '@/lib/familyIcons';

type VariableOption = { value: string; label: string };

export interface VariableRow {
  id: string;
  key: string;
  label: string;
  type: string;
  options: unknown;
  hubspot_mapping: { property?: string; valueMap?: Record<string, unknown> } | null;
}

export interface UsageEntry {
  count: number;
  sampleChapterSlug: string | null;
}

interface Props {
  parcoursSlug: string;
  variables: VariableRow[];
  /** Per-variable usage : count of referencing blocks + sample chapter slug. */
  usage: Record<string, UsageEntry>;
  /** Bound server actions taking the variable id as first argument. */
  deleteAction: (variableId: string) => Promise<void>;
  renameAction: (variableId: string, nextKey: string, nextLabel: string) => Promise<void>;
  updateOptionsAction: (variableId: string, fd: FormData) => Promise<void>;
  updateHubspotAction: (variableId: string, fd: FormData) => Promise<void>;
}

/**
 * Variables list with a side drawer for the detailed editor (rename
 * + enum options + Hubspot mapping). Replaces the previous in-place
 * accordion where each expanded row consumed ~300 px vertically —
 * editing 3-4 variables turned the page into a long stack of nested
 * sections.
 *
 * Pattern :
 *   - List : compact rows (icon + key + type badge + usage badge +
 *     delete). Clicking the row body opens the drawer.
 *   - Drawer : fixed on the right side (lg+ : 480 px width ; below
 *     lg : full-width sheet). Esc + close button + backdrop click
 *     dismiss it.
 *   - Detail editors keep their existing behaviour (auto-save on
 *     options, manual save on Hubspot mapping) — only the host
 *     changed.
 *
 * Server actions are passed in by the server page and re-bound to a
 * single `variableId` at call time. Keeps the API of
 * `VariableHeader` / `VariableOptionsForm` / `ValueMapInput` totally
 * unchanged.
 */
export function VariablesListWithDrawer({
  parcoursSlug,
  variables,
  usage,
  deleteAction,
  renameAction,
  updateOptionsAction,
  updateHubspotAction,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? (variables.find((v) => v.id === selectedId) ?? null) : null;

  // ESC closes the drawer. Capture-phase so a nested editor's own
  // Escape handler (e.g. enum option editor input) doesn't swallow
  // it on first press.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selected]);

  // Reset selection if the selected variable was deleted under our
  // feet (server re-render dropped it from the array).
  useEffect(() => {
    if (selectedId && !variables.some((v) => v.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, variables]);

  if (variables.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 text-center">
        <p className="text-sm font-medium">
          <span aria-hidden="true">🧩</span> Aucune variable
        </p>
        <p className="text-muted-foreground text-xs">Crée la première avec le bouton ci-dessus.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-border divide-y">
        {variables.map((v) => {
          const u = usage[v.key];
          const usageCount = u?.count ?? 0;
          const isSelected = selectedId === v.id;
          return (
            <li key={v.id}>
              <div
                className={
                  'group flex items-center gap-2 px-2 py-2 transition-colors ' +
                  (isSelected ? 'bg-primary/5' : 'hover:bg-muted/40')
                }
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  aria-pressed={isSelected}
                  className="-mx-1 flex flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors"
                  title="Ouvrir le détail de cette variable"
                >
                  <FamilyIcon family="variable" />
                  <code className="text-sm font-medium">{v.key}</code>
                  <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
                    {v.type}
                  </span>
                </button>
                {usageCount > 0 ? (
                  <Link
                    href={
                      u?.sampleChapterSlug
                        ? `/parcours/${parcoursSlug}/chapters/${u.sampleChapterSlug}`
                        : `/parcours/${parcoursSlug}`
                    }
                    title={
                      u?.sampleChapterSlug
                        ? `Voir un bloc qui référence cette variable (chapitre « ${u.sampleChapterSlug} »)`
                        : 'Voir les références'
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  >
                    {usageCount} bloc{usageCount > 1 ? 's' : ''} ↗
                  </Link>
                ) : (
                  <span
                    title="Cette variable n'est référencée nulle part — sa suppression n'aura aucun impact visible."
                    className="border-border bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  >
                    Non utilisée
                  </span>
                )}
                <ConfirmForm
                  message={
                    usageCount > 0
                      ? `Supprimer la variable « ${v.key} » ?\n${usageCount} bloc(s) la référencent — ils continueront de tenter de la lire et tomberont sur "undefined".\nÉdite ces blocs avant de supprimer si tu veux éviter des silent breaks.`
                      : `Supprimer la variable « ${v.key} » ?\nElle n'est référencée nulle part — suppression sans impact.`
                  }
                  action={async () => {
                    await deleteAction(v.id);
                  }}
                >
                  <Button variant="ghost" size="sm" type="submit" title="Supprimer">
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </ConfirmForm>
              </div>
            </li>
          );
        })}
      </ul>

      {selected && (
        <VariableDrawer
          variable={selected}
          onClose={() => setSelectedId(null)}
          renameAction={renameAction}
          updateOptionsAction={updateOptionsAction}
          updateHubspotAction={updateHubspotAction}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------- */
/* Drawer                                                                */
/* -------------------------------------------------------------------- */

function deriveLockedKeys(v: VariableRow): string[] | undefined {
  if (v.type === 'enum') {
    return ((v.options as VariableOption[]) ?? []).map((o) => o.value);
  }
  if (v.type === 'boolean') {
    return ['true', 'false'];
  }
  return undefined;
}

function VariableDrawer({
  variable,
  onClose,
  renameAction,
  updateOptionsAction,
  updateHubspotAction,
}: {
  variable: VariableRow;
  onClose: () => void;
  renameAction: Props['renameAction'];
  updateOptionsAction: Props['updateOptionsAction'];
  updateHubspotAction: Props['updateHubspotAction'];
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Détail de la variable ${variable.key}`}
      className="fixed inset-0 z-50 flex"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop — semi-opaque + flou, click-to-close. Constrained
          to the AREA NOT covered by the drawer so the row beneath
          stays clickable visually but is gated by the click-outside
          above. Direction C : opacité 0.55 + blur 6px pour matcher
          le prototype. */}
      <div className="flex-1 bg-black/55 backdrop-blur-md" aria-hidden="true" />
      {/* Drawer */}
      <aside
        className="bg-surface border-border flex h-full w-full max-w-[520px] flex-col border-l shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider">Variable</p>
            <h2 className="text-text mt-0.5 flex items-center gap-2 text-sm font-semibold">
              <FamilyIcon family="variable" />
              <code className="font-mono">{variable.key}</code>
              <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
                {variable.type}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text hover:bg-muted/50 rounded-md p-1.5"
            aria-label="Fermer"
            title="Fermer (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Rename */}
          <section>
            <h3 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">
              Identifiant & label
            </h3>
            <VariableHeader
              variableId={variable.id}
              initialKey={variable.key}
              initialLabel={variable.label}
              type={variable.type}
              enumPreview={
                variable.type === 'enum'
                  ? ((variable.options as VariableOption[]) ?? []).map((o) => o.value).join(', ')
                  : ''
              }
              renameAction={renameAction}
            />
          </section>

          {/* Options — enum only */}
          {variable.type === 'enum' && (
            <section>
              <h3 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">Options</h3>
              <div className="border-border/60 bg-muted/20 rounded-md border p-3">
                <VariableOptionsForm
                  initial={(variable.options as VariableOption[]) ?? []}
                  saveAction={async (fd) => {
                    await updateOptionsAction(variable.id, fd);
                  }}
                />
              </div>
            </section>
          )}

          {/* Hubspot mapping */}
          <section>
            <h3 className="text-text-muted mb-2 text-[10px] font-semibold uppercase tracking-wider">Hubspot</h3>
            <form
              action={async (fd) => {
                await updateHubspotAction(variable.id, fd);
              }}
              className="border-border/60 bg-muted/30 space-y-2 rounded-md border p-3"
            >
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                    Property
                  </label>
                  <Input
                    name="hsProperty"
                    defaultValue={variable.hubspot_mapping?.property ?? ''}
                    placeholder="ma_propriete_hs"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                    Mapping valeur → label
                  </label>
                  <ValueMapInput
                    name="hsValueMap"
                    initial={variable.hubspot_mapping?.valueMap ?? {}}
                    lockedKeys={deriveLockedKeys(variable)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" variant="outline">
                  Enregistrer Hubspot
                </Button>
              </div>
            </form>
          </section>
        </div>

        <footer className="border-border bg-muted/30 text-text-muted flex items-center justify-end border-t px-3 py-1.5 text-[10px]">
          <span>
            <kbd className="border-border bg-surface rounded border px-1 py-0.5">esc</kbd> fermer
          </span>
        </footer>
      </aside>
    </div>
  );
}
