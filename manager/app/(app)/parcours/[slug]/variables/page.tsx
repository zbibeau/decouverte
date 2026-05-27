import type { ContentBlock } from '@shared/content-schema';
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
  resolveParcoursIds,
  updateVariableHubspotMapping,
  updateVariableOptions,
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';
import { extractUsedVariableKeys } from '@/lib/usedVariables';

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

export default async function VariablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Resolve parcoursId + active versionId in ONE call (cached via
  // React.cache in `getParcoursVersionInfo`). Drops the previous
  // `select parcours.id` query AND the sequential `await
  // getEditingVersionId(slug)` further down — both are now folded
  // into a single shared lookup.
  const { parcoursId, versionId } = await resolveParcoursIds(slug);

  // Variables + per-version blocks fetched in parallel (independent
  // queries that previously ran sequentially). Halves the wall time
  // of this page on large parcours.
  const [variablesRes, blocksRes] = await Promise.all([
    parcoursId
      ? supabase
          .from('variable')
          .select('id, key, label, type, options, hubspot_mapping')
          .eq('parcours_id', parcoursId)
          .order('key', { ascending: true })
      : Promise.resolve({ data: null }),
    versionId
      ? supabase
          .from('block')
          .select('id, type, payload, chapter:chapter_id (slug)')
          .eq('chapter.version_id', versionId)
      : Promise.resolve({ data: null }),
  ]);
  const variables = variablesRes.data;

  // Aggregate variable-usage counts across the parcours's active version
  // (draft if any, else published). For each block we walk into nested
  // conditional / card / faqCard payloads with `extractUsedVariableKeys`
  // and accumulate per-key counts + a sample chapter slug to deep-link
  // the author when they hover the badge. Rendered as a small pill next
  // to each variable header in the list below.
  const usage = new Map<string, { count: number; sampleChapterSlug: string | null }>();
  {
    if (versionId) {
      const blocks = blocksRes.data;
      for (const row of blocks ?? []) {
        const block: ContentBlock = {
          type: row.type,
          payload: (row.payload ?? {}) as never,
        } as ContentBlock;
        const refs = extractUsedVariableKeys([block]);
        const chapterRaw = (row as unknown as { chapter: unknown }).chapter;
        const chapterRef = Array.isArray(chapterRaw)
          ? ((chapterRaw as { slug: string }[])[0]?.slug ?? null)
          : ((chapterRaw as { slug: string } | null)?.slug ?? null);
        for (const key of refs) {
          const cur = usage.get(key) ?? { count: 0, sampleChapterSlug: null };
          cur.count += 1;
          if (!cur.sampleChapterSlug) cur.sampleChapterSlug = chapterRef;
          usage.set(key, cur);
        }
      }
      // FormBlock fields also COLLECT variables — count them too so a
      // form that asks for `firstName` shows usage even if no condition
      // references it. The FormField type carries `key` matching the
      // variable's key.
      for (const row of blocks ?? []) {
        if (row.type !== 'form') continue;
        const fields = ((row.payload as { fields?: Array<{ key?: string }> }).fields ?? []) as Array<{ key?: string }>;
        for (const f of fields) {
          if (!f.key) continue;
          const cur = usage.get(f.key) ?? {
            count: 0,
            sampleChapterSlug: null,
          };
          cur.count += 1;
          usage.set(f.key, cur);
        }
      }
    }
  }

  const createAction = createVariable.bind(null, slug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variables du parcours</CardTitle>
          <p className="text-muted-foreground text-xs">
            Variables utilisables dans les blocs conditionnels + mapping Hubspot dynamique.
          </p>
        </CardHeader>
        <CardContent className="divide-border divide-y">
          {((variables ?? []) as VariableRow[]).map((v) => {
            const u = usage.get(v.key);
            const usageCount = u?.count ?? 0;
            return (
              <div key={v.id} className="space-y-3 py-4">
                <div className="flex items-center gap-3">
                  <VariableHeader
                    variableId={v.id}
                    initialKey={v.key}
                    initialLabel={v.label}
                    type={v.type}
                    enumPreview={
                      v.type === 'enum' ? ((v.options as VariableOption[]) ?? []).map((o) => o.value).join(', ') : ''
                    }
                    renameAction={async (variableId, nextKey, nextLabel) => {
                      'use server';
                      await renameVariable(slug, variableId, nextKey, nextLabel);
                    }}
                  />
                  {/* Usage badge — shows how many blocks reference this
                     variable across the active version. Orange when > 0
                     to warn the author that a rename/delete will impact
                     real content. Click target = the chapter where the
                     first occurrence lives, to start navigating fixes. */}
                  {usageCount > 0 ? (
                    <a
                      href={
                        u?.sampleChapterSlug ? `/parcours/${slug}/chapters/${u.sampleChapterSlug}` : `/parcours/${slug}`
                      }
                      title={
                        u?.sampleChapterSlug
                          ? `Voir un bloc qui référence cette variable (chapitre « ${u.sampleChapterSlug} »)`
                          : 'Voir les références'
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
                    >
                      {usageCount} bloc{usageCount > 1 ? 's' : ''} ↗
                    </a>
                  ) : (
                    <span
                      title="Cette variable n'est référencée nulle part — sa suppression n'aura aucun impact visible."
                      className="border-border bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    >
                      Non utilisée
                    </span>
                  )}
                  <ConfirmForm
                    className="ml-auto"
                    message={
                      usageCount > 0
                        ? `Supprimer la variable « ${v.key} » ?\n${usageCount} bloc(s) la référencent — ils continueront de tenter de la lire et tomberont sur "undefined".\nÉdite ces blocs avant de supprimer si tu veux éviter des silent breaks.`
                        : `Supprimer la variable « ${v.key} » ?\nElle n'est référencée nulle part — suppression sans impact.`
                    }
                    action={async () => {
                      'use server';
                      await deleteVariable(slug, v.id);
                    }}
                  >
                    <Button variant="ghost" size="sm" type="submit" title="Supprimer">
                      <Trash2 className="text-destructive h-4 w-4" />
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
                    className="border-border/60 bg-muted/20 space-y-2 rounded-md border p-3"
                  >
                    <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                      Options
                    </label>
                    <OptionsListInput name="options" initial={(v.options as VariableOption[]) ?? []} />
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
                  className="border-border/60 bg-muted/30 space-y-2 rounded-md border p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
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
                      <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
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
            );
          })}
          {(!variables || variables.length === 0) && (
            <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center">
              <div className="text-3xl" aria-hidden="true">
                🧩
              </div>
              <p className="text-sm font-medium">Aucune variable pour ce parcours</p>
              <p className="text-muted-foreground max-w-md text-xs">
                Une variable est une donnée collectée auprès du visiteur (ex. « importNecessaire = oui/non ») qui pilote
                les blocs conditionnels. Crée la première dans la carte ci-dessous.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une variable</CardTitle>
          <p className="text-muted-foreground text-xs">
            Une variable, c'est une information que tu collectes auprès du visiteur du parcours (par exemple « Statut du
            patient ») et que tu réutilises ensuite pour personnaliser le contenu (conditions, formulaires, mapping
            Hubspot…).
          </p>
        </CardHeader>
        <CardContent>
          <AddVariableForm createAction={createAction} />
        </CardContent>
      </Card>
    </div>
  );
}
