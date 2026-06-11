import { Check, FileText, Layers, Pencil } from 'lucide-react';

import { Card } from '@/components/ui/Card';

/**
 * Bandeau de stats — Direction B (handoff §8 « Vue chapitres »).
 *
 * Posé au-dessus de la liste des chapitres dans la vue d'un parcours,
 * pour donner à l'éditeur un sense quantitatif immédiat de son
 * contenu. 4 StatPills séparés par des filets verticaux.
 *
 * Compteurs :
 *   1. Chapitres   — violet  (Layers icon)
 *   2. Blocs       — sky     (FileText icon)
 *   3. Sans tag    — amber   (Pencil icon)  / emerald si == 0
 *   4. Sections    — slate   (Check icon)
 *
 * Les valeurs sont passées en props par la page parcours qui les
 * calcule depuis les data Supabase déjà fetchées (chapters,
 * blocksPreviewByChapter, untaggedBlockCountByChapter). Aucun
 * roundtrip serveur supplémentaire.
 */
export function ParcoursStatsBar({
  chapterCount,
  blockCount,
  untaggedCount,
  sectionCount,
}: {
  chapterCount: number;
  blockCount: number;
  untaggedCount: number;
  sectionCount: number;
}) {
  return (
    <Card className="flex items-stretch p-1">
      <StatPill icon={<Layers className="h-5 w-5" />} tone="violet" value={chapterCount} label="Chapitre(s)" />
      <Divider />
      <StatPill icon={<FileText className="h-5 w-5" />} tone="sky" value={blockCount} label="Bloc(s)" />
      <Divider />
      <StatPill
        icon={<Pencil className="h-5 w-5" />}
        tone={untaggedCount > 0 ? 'amber' : 'emerald'}
        value={untaggedCount}
        label={untaggedCount > 0 ? 'Sans tag' : 'Tous taggés'}
      />
      <Divider />
      <StatPill icon={<Check className="h-5 w-5" />} tone="slate" value={sectionCount} label="Section(s)" />
    </Card>
  );
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
  tone: 'violet' | 'sky' | 'amber' | 'emerald' | 'slate';
  value: number;
  label: string;
}) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-3">
      <div
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ring-1 ring-inset ${toneClasses.icon} ${toneClasses.ring}`}
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

const TONE_CLASSES: Record<'violet' | 'sky' | 'amber' | 'emerald' | 'slate', { icon: string; ring: string }> = {
  violet: {
    icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-800/60',
  },
  sky: {
    icon: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-800/60',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800/60',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-800/60',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    ring: 'ring-slate-200 dark:ring-slate-700/60',
  },
};
