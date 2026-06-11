import { Check, FileText, Layers, Pencil as PencilIcon } from 'lucide-react';

import {
  ParcoursGroup,
  type ChapterStatus,
  type OverviewChapter,
  type OverviewParcours,
} from '@/components/overview/ParcoursGroup';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

/**
 * Vue d'ensemble — pattern handoff §8 « Vue chapitres ».
 *
 * Liste tous les parcours sous forme de `ParcoursGroup` repliable
 * contenant ses chapitres avec position (section.chapitre), titre,
 * slug technique, status, count blocs et date d'édition.
 *
 * Au-dessus, un bandeau Stats : Parcours total · Chapitres total ·
 * Publiés · En cours.
 *
 * Une seule requête Supabase pour les parcours, une pour les
 * chapitres (filtrés sur les version ids actifs), une pour les
 * counts blocs par chapter_id. Aucune query par parcours → page
 * scalable jusqu'à ~100 parcours sans douleur.
 */
export default async function OverviewPage() {
  const supabase = await createClient();

  // 1. Fetch tous les parcours.
  const { data: parcoursRows } = await supabase
    .from('parcours')
    .select('id, slug, name, published_version_id')
    .order('name', { ascending: true });

  const parcoursList = parcoursRows ?? [];

  // 2. Pour chaque parcours, on lit son `editing_version_id` (draft
  //    si existant, sinon published). Cette colonne n'est pas dans
  //    parcours — il faut soit l'inférer en relisant, soit re-fetcher
  //    via getEditingVersionId. Pour le scaffolding initial,
  //    fallback simple : utiliser published_version_id partout. Les
  //    chapitres en cours d'édition dans un draft non publié ne
  //    seront pas listés ici, c'est une limitation acceptée pour
  //    cette première version (Lot 6 polish si besoin).
  const versionIds = parcoursList
    .map((p) => p.published_version_id)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  // 3. Fetch tous les chapitres en une seule requête.
  const { data: chapterRows } = await supabase
    .from('chapter')
    .select('id, slug, title, "order", section_order, section_label, version_id, updated_at')
    .in('version_id', versionIds.length > 0 ? versionIds : ['__none__'])
    .order('section_order', { ascending: true, nullsFirst: false })
    .order('order', { ascending: true });

  const chapters = chapterRows ?? [];
  const chapterIds = chapters.map((c) => c.id);

  // 4. Count blocs par chapter_id (top-level seulement).
  const blockCountByChapter = new Map<string, number>();
  if (chapterIds.length > 0) {
    const { data: blockRows } = await supabase
      .from('block')
      .select('id, chapter_id', { count: 'exact' })
      .in('chapter_id', chapterIds)
      .is('parent_block_id', null);
    for (const b of blockRows ?? []) {
      const cid = (b as { chapter_id: string }).chapter_id;
      blockCountByChapter.set(cid, (blockCountByChapter.get(cid) ?? 0) + 1);
    }
  }

  // 5. Mapping parcours → version_id → chapitres.
  //    On regroupe par version_id (ce qui correspond 1:1 à un
  //    parcours pour les parcours publiés).
  const chaptersByVersion = new Map<string, OverviewChapter[]>();
  // Position label "section.chapitre" — on assigne incrémentalement
  // section_order: 1, 2, 3… puis order: 1, 2, 3… dans chaque section.
  // On itère version par version pour conserver le scope.
  const chaptersByVersionRaw = new Map<string, typeof chapters>();
  for (const c of chapters) {
    const arr = chaptersByVersionRaw.get(c.version_id) ?? [];
    arr.push(c);
    chaptersByVersionRaw.set(c.version_id, arr);
  }
  for (const [vid, chs] of chaptersByVersionRaw) {
    // Compute section_order index (1-based) per distinct section_label
    // — handle null (no section) as a single bucket.
    const sectionLabels: (string | null)[] = [];
    for (const c of chs) {
      const label = c.section_label ?? null;
      if (!sectionLabels.includes(label)) sectionLabels.push(label);
    }
    const orderInSection = new Map<string | null, number>();
    const out: OverviewChapter[] = [];
    for (const c of chs) {
      const sectionIdx = sectionLabels.indexOf(c.section_label ?? null) + 1;
      const within = (orderInSection.get(c.section_label ?? null) ?? 0) + 1;
      orderInSection.set(c.section_label ?? null, within);
      out.push({
        id: c.id,
        slug: c.slug,
        title: c.title,
        positionLabel: `${sectionIdx}.${within}`,
        status: deriveChapterStatus(c.updated_at, c.version_id, versionIds),
        blockCount: blockCountByChapter.get(c.id) ?? 0,
        editedRelative: c.updated_at ? formatRelativeFrench(new Date(c.updated_at)) : null,
      });
    }
    chaptersByVersion.set(vid, out);
  }

  // 6. Assemble per-parcours data.
  const overviewParcours: OverviewParcours[] = parcoursList.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    chapters: p.published_version_id ? (chaptersByVersion.get(p.published_version_id) ?? []) : [],
  }));

  // 7. Stats globales pour le bandeau.
  const totalParcours = overviewParcours.length;
  const totalChapters = overviewParcours.reduce((sum, p) => sum + p.chapters.length, 0);
  const totalPublished = parcoursList.filter((p) => Boolean(p.published_version_id)).length;
  const totalReview = overviewParcours.reduce(
    (sum, p) => sum + p.chapters.filter((c) => c.status === 'review' || c.status === 'progress').length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-8">
      <header>
        <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
          Parcours de découverte
        </div>
        <h1 className="text-text text-[26px] font-bold leading-tight tracking-tight">Vue d'ensemble</h1>
        <p className="text-text-muted mt-1.5 max-w-2xl text-sm">
          L'arborescence éditoriale complète : parcours, sections, chapitres. Click sur un parcours pour déplier ses
          chapitres, click sur un chapitre pour ouvrir son éditeur.
        </p>
      </header>

      <Card className="flex items-stretch p-1">
        <StatPill icon={<Layers className="h-5 w-5" />} tone="violet" value={totalParcours} label="Parcours" />
        <Divider />
        <StatPill icon={<FileText className="h-5 w-5" />} tone="sky" value={totalChapters} label="Chapitres" />
        <Divider />
        <StatPill icon={<Check className="h-5 w-5" />} tone="emerald" value={totalPublished} label="Publiés" />
        <Divider />
        <StatPill
          icon={<PencilIcon className="h-5 w-5" />}
          tone="amber"
          value={totalReview}
          label="En cours / à relire"
        />
      </Card>

      <Card className="overflow-hidden">
        {overviewParcours.length === 0 ? (
          <div className="text-text-muted py-10 text-center text-sm">
            Aucun parcours. Crée-en un depuis la page racine.
          </div>
        ) : (
          overviewParcours.map((p, i) => (
            <div key={p.id} className={i > 0 ? 'border-border border-t' : ''}>
              <ParcoursGroup p={p} defaultOpen={i === 0} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Heuristique simple pour dériver un status par chapitre, sans
 * fetcher les diffs (qui demanderaient des queries par chapter).
 * Pour cette première version on cap à 3 buckets :
 *   - published : chapitre rattaché à la version publiée
 *   - draft : ... à un brouillon
 *   - review : updated_at < 24 h
 * À raffiner quand on aura un endpoint par-chapitre.
 */
function deriveChapterStatus(
  _updatedAt: string | null,
  versionId: string,
  publishedVersionIds: string[],
): ChapterStatus {
  const isPublished = publishedVersionIds.includes(versionId);
  return isPublished ? 'published' : 'draft';
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function formatRelativeFrench(d: Date, now: Date = new Date()): string {
  const delta = Math.max(0, now.getTime() - d.getTime());
  const mins = Math.floor(delta / 60_000);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

function Divider() {
  return <div className="bg-border mx-0 my-2.5 w-px shrink-0" aria-hidden="true" />;
}

function StatPill({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: 'violet' | 'sky' | 'emerald' | 'amber';
  value: number;
  label: string;
}) {
  const TONE_CLASSES = {
    violet:
      'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 ring-violet-200 dark:ring-violet-800/60',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 ring-sky-200 dark:ring-sky-800/60',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/60',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/60',
  };
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-3">
      <div
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ring-1 ring-inset ${TONE_CLASSES[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-text text-xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="text-text-muted text-xs font-medium">{label}</div>
      </div>
    </div>
  );
}
