import { Trash2 } from 'lucide-react';

import { ConfirmForm } from '@/components/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { AddVariableForm } from '@/components/variables/AddVariableForm';
import { OptionsListInput } from '@/components/variables/OptionsListInput';
import { ValueMapInput } from '@/components/variables/ValueMapInput';
import { VariableHeader } from '@/components/variables/VariableHeader';
import {
  createVariable,
  deleteVariable,
  renameVariable,
  updateVariableHubspotMapping,
  updateVariableOptions,
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

type VariableOption = { value: string; label: string };

type VariableRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  options: unknown;
  hubspot_mapping: { property?: string; valueMap?: Record<string, unknown> } | null;
};

/** Keys we can pre-fill / lock in the Hubspot valueMap editor. */
function deriveLockedKeys(v: VariableRow): string[] | undefined {
  if (v.type === 'enum') {
    return ((v.options as VariableOption[]) ?? []).map((o) => o.value);
  }
  if (v.type === 'boolean') {
    return ['true', 'false'];
  }
  return undefined;
}

export default async function VariablesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const { data: variables } = await supabase
    .from('variable')
    .select('id, key, label, type, options, hubspot_mapping')
    .eq('parcours_id', parcours?.id)
    .order('key', { ascending: true });

  const createAction = createVariable.bind(null, slug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variables du parcours</CardTitle>
          <p className="text-xs text-muted-foreground">
            Variables utilisables dans les blocs conditionnels + mapping Hubspot dynamique.
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {((variables ?? []) as VariableRow[]).map((v) => (
            <div key={v.id} className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <VariableHeader
                  variableId={v.id}
                  initialKey={v.key}
                  initialLabel={v.label}
                  type={v.type}
                  enumPreview={
                    v.type === 'enum'
                      ? ((v.options as VariableOption[]) ?? [])
                          .map((o) => o.value)
                          .join(', ')
                      : ''
                  }
                  renameAction={async (variableId, nextKey, nextLabel) => {
                    'use server';
                    await renameVariable(slug, variableId, nextKey, nextLabel);
                  }}
                />
                <ConfirmForm
                  className="ml-auto"
                  message={`Supprimer la variable « ${v.key} » ?\n\nTous les blocs qui la référencent (formulaires, conditions, key points conditionnels) cesseront de fonctionner.`}
                  action={async () => {
                    'use server';
                    await deleteVariable(slug, v.id);
                  }}
                >
                  <Button variant="ghost" size="sm" type="submit" title="Supprimer">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </ConfirmForm>
              </div>

              {/* Options editor — enum only */}
              {v.type === 'enum' && (
                <form
                  action={async (fd) => {
                    'use server';
                    await updateVariableOptions(slug, v.id, fd);
                  }}
                  className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3"
                >
                  <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Options
                  </label>
                  <OptionsListInput
                    name="options"
                    initial={(v.options as VariableOption[]) ?? []}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="outline">
                      Enregistrer les options
                    </Button>
                  </div>
                </form>
              )}

              {/* Hubspot mapping editor */}
              <form
                action={async (fd) => {
                  'use server';
                  await updateVariableHubspotMapping(slug, v.id, fd);
                }}
                className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Hubspot property
                    </label>
                    <Input
                      name="hsProperty"
                      defaultValue={v.hubspot_mapping?.property ?? ''}
                      placeholder="ma_propriete_hs"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Mapping valeur → label Hubspot
                    </label>
                    <ValueMapInput
                      name="hsValueMap"
                      initial={v.hubspot_mapping?.valueMap ?? {}}
                      lockedKeys={deriveLockedKeys(v)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" variant="outline">
                    Enregistrer Hubspot
                  </Button>
                </div>
              </form>
            </div>
          ))}
          {(!variables || variables.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune variable.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une variable</CardTitle>
          <p className="text-xs text-muted-foreground">
            Une variable, c'est une information que tu collectes auprès du
            visiteur du parcours (par exemple « Statut du patient ») et que tu
            réutilises ensuite pour personnaliser le contenu (conditions,
            formulaires, mapping Hubspot…).
          </p>
        </CardHeader>
        <CardContent>
          <AddVariableForm createAction={createAction} />
        </CardContent>
      </Card>
    </div>
  );
}
