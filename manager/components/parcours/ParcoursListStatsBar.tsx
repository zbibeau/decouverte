import { Check, Layers, Pencil } from 'lucide-react';

import { Card } from '@/components/ui/Card';

/**
 * Bandeau de stats pour la vue racine « Tous les parcours »
 * (`app/(app)/page.tsx`). Variante du ParcoursStatsBar de la vue
 * `/parcours/[slug]` : 3 cellules au lieu de 4, focalisées sur
 * l'inventaire des parcours.
 *
 * Pourquoi un composant séparé : les compteurs sont différents
 * (Parcours total / Publiés / Brouillons vs Chapitres / Blocs /
 * Tags / Sections). Séparer les deux évite de mêler les
 * sémantiques dans un composant générique.
 */
export function ParcoursListStatsBar({ total, published, draft }: { total: number; published: number; draft: number }) {
  return (
    <Card className="flex items-stretch p-1">
      <StatPill icon={<Layers className="h-5 w-5" />} tone="violet" value={total} label="Parcours" />
      <Divider />
      <StatPill icon={<Check className="h-5 w-5" />} tone="emerald" value={published} label="Publié(s)" />
      <Divider />
      <StatPill
        icon={<Pencil className="h-5 w-5" />}
        tone="amber"
        value={draft}
        label={draft > 1 ? 'Brouillons' : 'Brouillon'}
      />
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
  tone: 'violet' | 'emerald' | 'amber';
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

const TONE_CLASSES: Record<'violet' | 'emerald' | 'amber', { icon: string; ring: string }> = {
  violet: {
    icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-800/60',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-800/60',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800/60',
  },
};
