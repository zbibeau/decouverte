import { Clock, History as HistoryIcon, Layers } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

/**
 * Historique global — timeline cross-parcours de toutes les versions
 * (`parcours_version`), du plus récent au plus ancien.
 *
 * Pendant l'historique global de la section « Studio » de la sidebar
 * Direction B §4. Le bouton « Historique » dans le header de chaque
 * parcours (par-parcours) reste — cette vue agrège juste pour avoir
 * une timeline éditoriale globale (qui a publié quoi quand, sur
 * quel parcours).
 *
 * Limites volontaires :
 *   - Top 50 versions (ordre antichrono via created_at). Pas de
 *     pagination — pour des historiques très longs on ajoutera ça
 *     plus tard.
 *   - Pas d'action « restore » côté liste globale — l'action
 *     reste dans le HistoryDialog par-parcours (où on a tout le
 *     contexte). Cette page sert au scan, pas à l'édition.
 */

interface VersionRow {
  id: string;
  version_number: number;
  status: string;
  created_at: string | null;
  parcours_id: string;
}

interface ParcoursRow {
  id: string;
  slug: string;
  name: string;
  published_version_id: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();

  // Fetch top 50 versions ordonnées antichrono.
  const { data: versions } = await supabase
    .from('parcours_version')
    .select('id, version_number, status, created_at, parcours_id')
    .order('created_at', { ascending: false })
    .limit(50);

  const versionList = (versions ?? []) as VersionRow[];

  // Resolve parcours par id (1 query avec IN).
  const parcoursIds = Array.from(new Set(versionList.map((v) => v.parcours_id)));
  const parcoursByid = new Map<string, ParcoursRow>();
  if (parcoursIds.length > 0) {
    const { data: parcoursRows } = await supabase
      .from('parcours')
      .select('id, slug, name, published_version_id')
      .in('id', parcoursIds);
    for (const p of (parcoursRows ?? []) as ParcoursRow[]) {
      parcoursByid.set(p.id, p);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-8">
      <header>
        <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">Studio</div>
        <h1 className="text-text text-[26px] font-bold leading-tight tracking-tight">Historique</h1>
        <p className="text-text-muted mt-1.5 max-w-2xl text-sm">
          Timeline éditoriale cross-parcours — toutes les versions, du plus récent au plus ancien. Click sur un parcours
          pour rouvrir son historique détaillé (avec action « restaurer »).
        </p>
      </header>

      {versionList.length === 0 ? (
        <Card>
          <CardContent className="text-text-muted py-12 text-center text-sm">
            <HistoryIcon className="text-text-faint mx-auto mb-3 h-8 w-8" />
            <p>Aucune version dans la base.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-border divide-y">
            {versionList.map((v) => {
              const p = parcoursByid.get(v.parcours_id);
              const isLive = p?.published_version_id === v.id;
              return (
                <li key={v.id}>
                  <Link
                    href={p ? `/parcours/${p.slug}` : '#'}
                    className="hover:bg-primary/5 flex items-center gap-3 px-5 py-3.5 transition-colors"
                  >
                    <div className="bg-surface-3 border-border text-text-muted inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-text truncate text-sm font-semibold">
                          {p?.name ?? '(parcours inconnu)'}
                        </span>
                        <span className="text-text-faint font-mono text-[11px]">v{v.version_number}</span>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            En live
                          </span>
                        )}
                      </div>
                      {p && <div className="text-text-faint truncate font-mono text-[11px]">/{p.slug}</div>}
                    </div>
                    <VersionStatusBadge status={v.status} />
                    <span className="text-text-faint inline-flex w-28 shrink-0 items-center justify-end gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {v.created_at ? formatRelativeFrench(new Date(v.created_at)) : '—'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {versionList.length === 50 && (
        <p className="text-text-faint text-center text-xs">
          Affichage limité aux 50 dernières versions. La pagination arrive si l'historique grossit.
        </p>
      )}
    </div>
  );
}

function VersionStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span
      className={`inline-flex w-20 shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.classes}`}
      title={cfg.label}
    >
      <span className={`h-1 w-1 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

const STATUS_BADGE: Record<string, { label: string; classes: string; dot: string }> = {
  published: {
    label: 'Publié',
    classes: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  draft: {
    label: 'Brouillon',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    dot: 'bg-slate-400',
  },
  archived: {
    label: 'Archivé',
    classes: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
};

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
