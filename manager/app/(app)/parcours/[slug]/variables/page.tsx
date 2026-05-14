import { Trash2 } from 'lucide-react';

import { ConfirmForm } from '@/components/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { OptionsListInput } from '@/components/variables/OptionsListInput';
import { ValueMapInput } from '@/components/variables/ValueMapInput';
import {
  createVariable,
  deleteVariable,
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
                <code className="text-sm font-medium">{v.key}</code>
                <span className="text-sm text-muted-foreground">— {v.label}</span>
                <span className="inline-flex h-5 items-center rounded bg-muted px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {v.type}
                </span>
                {v.type === 'enum' && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {((v.options as VariableOption[]) ?? [])
                      .map((o) => o.value)
                      .join(', ')}
                  </span>
                )}
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
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clé (camelCase)</label>
              <Input name="key" placeholder="practiceSize" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <Input name="label" placeholder="Taille du cabinet" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                name="type"
                className="flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm"
              >
                <option value="boolean">boolean</option>
                <option value="enum">enum</option>
                <option value="string">string</option>
                <option value="number">number</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Options (pour type <code>enum</code> uniquement)
              </label>
              <OptionsListInput name="options" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Hubspot property (optionnel)
              </label>
              <Input name="hsProperty" placeholder="ma_propriete_hs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mapping valeur → label Hubspot (optionnel)
              </label>
              <ValueMapInput name="hsValueMap" />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit">Créer la variable</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
