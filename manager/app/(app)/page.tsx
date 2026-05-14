import { CreateParcoursDialog } from '@/components/CreateParcoursDialog';
import { ParcoursGrid } from '@/components/ParcoursGrid';
import { createParcours } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

export default async function ParcoursListPage() {
  const supabase = await createClient();

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id, slug, name, published_version_id, updated_at')
    .order('updated_at', { ascending: false });

  // Bound server action passed to the client wizard.
  async function createAction(input: { slug: string; name: string }) {
    'use server';
    return await createParcours(input);
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parcours</h1>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un parcours pour éditer ses chapitres, ses vidéos et ses branches.
          </p>
        </div>
        <CreateParcoursDialog createAction={createAction} />
      </div>

      <ParcoursGrid
        parcours={(parcours ?? []).map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          published_version_id: p.published_version_id,
        }))}
      />
    </div>
  );
}
