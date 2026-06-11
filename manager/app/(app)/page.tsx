import { LayoutList } from 'lucide-react';
import Link from 'next/link';

import { CreateParcoursDialog } from '@/components/CreateParcoursDialog';
import { ParcoursGrid } from '@/components/ParcoursGrid';
import { ParcoursListStatsBar } from '@/components/parcours/ParcoursListStatsBar';
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

  // Direction B stats : total / publiés / brouillon. Pas de roundtrip
  // supplémentaire — calculé depuis le fetch parcours déjà fait.
  const total = (parcours ?? []).length;
  const published = (parcours ?? []).filter((p) => Boolean(p.published_version_id)).length;
  const draft = total - published;

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Direction B (handoff §8) — eyebrow + grand H1 + texte intro,
          au lieu de l'ancien h2 simple. */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
            Parcours de découverte
          </div>
          <h1 className="text-text text-[26px] font-bold leading-tight tracking-tight">Tous les parcours</h1>
          <p className="text-text-muted mt-1.5 max-w-xl text-sm">
            Le contenu que les médecins parcourent pas à pas, organisé en sections puis chapitres. Sélectionne un
            parcours pour éditer ses chapitres, ses vidéos et ses branches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/overview"
            className="border-border-strong bg-surface text-text hover:bg-surface-2 shadow-app-sm inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-semibold transition-colors"
            title="Voir l'arborescence complète (tous parcours + chapitres)"
          >
            <LayoutList className="h-3.5 w-3.5" />
            Vue d'ensemble
          </Link>
          <CreateParcoursDialog createAction={createAction} />
        </div>
      </header>

      <div className="mb-6">
        <ParcoursListStatsBar total={total} published={published} draft={draft} />
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
