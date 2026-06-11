import type { ContentBlock } from '@shared/content-schema';

import { LibrarySectionHeader } from '@/components/library/LibrarySectionHeader';
import { LibrarySectionTabs } from '@/components/library/LibrarySectionTabs';
import { CardWithCreateAction } from '@/components/ui/CardWithCreateAction';
import { AddVariableForm } from '@/components/variables/AddVariableForm';
import {
  VariablesListWithDrawer,
  type UsageEntry,
  type VariableRow,
} from '@/components/variables/VariablesListWithDrawer';
import {
  createVariable,
  deleteVariable,
  renameVariable,
  resolveParcoursIds,
  updateVariableHubspotMapping,
  updateVariableOptions,
} from '@/lib/actions';
import { FamilyIcon } from '@/lib/familyIcons';
import { createClient } from '@/lib/supabase/server';
import { extractUsedVariableKeys } from '@/lib/usedVariables';

export default async function VariablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Resolve parcoursId + active versionId in ONE call (cached via
  // React.cache in `getParcoursVersionInfo`).
  const { parcoursId, versionId } = await resolveParcoursIds(slug);

  // Variables + per-version blocks fetched in parallel.
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
  const variables = (variablesRes.data ?? []) as VariableRow[];

  // Aggregate variable-usage counts across the active version. Walks
  // payloads with `extractUsedVariableKeys` (conditionals, cards, FAQ)
  // and also counts FormBlock fields whose `key` matches a variable.
  const usage: Record<string, UsageEntry> = {};
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
        const cur = usage[key] ?? { count: 0, sampleChapterSlug: null };
        cur.count += 1;
        if (!cur.sampleChapterSlug) cur.sampleChapterSlug = chapterRef;
        usage[key] = cur;
      }
    }
    for (const row of blocks ?? []) {
      if (row.type !== 'form') continue;
      const fields = ((row.payload as { fields?: Array<{ key?: string }> }).fields ?? []) as Array<{ key?: string }>;
      for (const f of fields) {
        if (!f.key) continue;
        const cur = usage[f.key] ?? { count: 0, sampleChapterSlug: null };
        cur.count += 1;
        usage[f.key] = cur;
      }
    }
  }

  const createAction = createVariable.bind(null, slug);

  // ---- Server actions bound by parcoursSlug, taking variableId as
  // first arg. Passed to the client list and re-bound per-variable
  // when the drawer opens.
  async function deleteAction(variableId: string) {
    'use server';
    await deleteVariable(slug, variableId);
  }
  async function renameAction(variableId: string, nextKey: string, nextLabel: string) {
    'use server';
    await renameVariable(slug, variableId, nextKey, nextLabel);
  }
  async function updateOptionsAction(variableId: string, fd: FormData) {
    'use server';
    await updateVariableOptions(slug, variableId, fd);
  }
  async function updateHubspotAction(variableId: string, fd: FormData) {
    'use server';
    await updateVariableHubspotMapping(slug, variableId, fd);
  }

  return (
    <div className="space-y-4">
      <LibrarySectionHeader
        eyebrow="Bibliothèque · Variables"
        title="Variables du parcours"
        description="Données collectées auprès du visiteur (statut, logiciel utilisé, etc.) qui pilotent les conditions, formulaires et personnalisations."
      />
      <CardWithCreateAction
        title={
          <span className="flex items-center gap-2">
            <FamilyIcon family="variable" className="h-4 w-4" />
            Variables <span className="text-muted-foreground font-normal">{variables.length}</span>
          </span>
        }
        headerExtra={<LibrarySectionTabs slug={slug} />}
        buttonLabel="Créer une variable"
        createForm={
          <>
            <p className="text-muted-foreground mb-3 text-xs">
              Donnée collectée auprès du visiteur (ex. « statut du patient ») pour piloter conditions / formulaires /
              Hubspot.
            </p>
            <AddVariableForm createAction={createAction} />
          </>
        }
      >
        <div className="-mx-5 px-5">
          <VariablesListWithDrawer
            parcoursSlug={slug}
            variables={variables}
            usage={usage}
            deleteAction={deleteAction}
            renameAction={renameAction}
            updateOptionsAction={updateOptionsAction}
            updateHubspotAction={updateHubspotAction}
          />
        </div>
      </CardWithCreateAction>
    </div>
  );
}
