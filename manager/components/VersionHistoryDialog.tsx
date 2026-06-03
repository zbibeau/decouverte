'use client';

import { ExternalLink, History, RotateCcw, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { VersionSummary } from '@/lib/actions';

interface Props {
  parcoursSlug: string;
  /** Live snapshot of all versions. The dialog refetches if `nonce` changes. */
  versions: VersionSummary[];
  /** Whether a draft is already in progress (controls Restore button affordance). */
  hasDraft: boolean;
  /** True if the user is allowed to restore (refused for the current published row, etc.). */
  loadVersions: () => Promise<VersionSummary[]>;
  /** Server action: clones the given version into a new draft. */
  restoreAction: (versionId: string) => Promise<void>;
  /** Optional URL of the standalone Solid client; used to open a read-only preview. */
  clientUrl?: string;
}

/**
 * Modale "Historique de versions" — listée depuis le header du parcours.
 *
 * Affiche toutes les `parcours_version` du parcours, avec un badge de
 * statut, le nombre de chapitres/blocs, et deux actions par ligne :
 *   - Aperçu (👁) : ouvre le client Solid en lecture seule pour cette
 *     version dans un nouvel onglet (URL = `<clientUrl>/parcours/<slug>?version=<id>`).
 *   - Restaurer en brouillon (↩) : clone la version en nouveau draft.
 *     Refusé si un brouillon existe déjà — l'utilisateur doit le jeter
 *     ou le publier d'abord.
 */
export function VersionHistoryDialog({
  parcoursSlug,
  versions: initialVersions,
  hasDraft,
  loadVersions,
  restoreAction,
  clientUrl = 'http://localhost:3100',
}: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState(initialVersions);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  // Refresh the list whenever the dialog opens — covers the case where the
  // user published / discarded a draft from elsewhere in the meantime.
  useEffect(() => {
    if (!open) return;
    setError(null);
    void loadVersions()
      .then(setVersions)
      .catch((e: Error) => setError(e.message));
  }, [open, loadVersions]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleRestore(version: VersionSummary) {
    if (hasDraft) {
      setError(
        `Un brouillon existe déjà (v${
          versions.find((v) => v.status === 'draft')?.versionNumber ?? '?'
        }). Jette-le ou publie-le avant de restaurer la v${version.versionNumber}.`,
      );
      return;
    }
    const ok = await confirm({
      title: `Restaurer la v${version.versionNumber} (${formatRelative(version.createdAt)}) ?`,
      message:
        'Un nouveau brouillon sera créé à partir de cette version. La version publiée actuelle reste en place tant que tu ne publies pas le brouillon.',
      confirmLabel: 'Restaurer',
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await restoreAction(version.id);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <History className="h-3.5 w-3.5" />
        Historique
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          {versions.length}
        </span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Historique de versions"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-surface flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg shadow-2xl">
            {/* Header */}
            <div className="border-border bg-muted/30 flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <History className="text-muted-foreground h-4 w-4" />
                <h2 className="text-sm font-semibold">Historique de versions</h2>
                <span className="text-muted-foreground text-xs">— {parcoursSlug}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="border-destructive/20 bg-destructive/10 text-destructive border-b px-5 py-2 text-xs">
                {error}
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {versions.length === 0 ? (
                <p className="text-muted-foreground px-5 py-10 text-center text-sm">Aucune version pour ce parcours.</p>
              ) : (
                <ul className="divide-border divide-y">
                  {versions.map((v) => (
                    <VersionRow
                      key={v.id}
                      version={v}
                      parcoursSlug={parcoursSlug}
                      clientUrl={clientUrl}
                      canRestore={!hasDraft && v.status !== 'draft'}
                      restoreDisabled={isPending}
                      onRestore={() => handleRestore(v)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-border bg-muted/30 text-muted-foreground border-t px-5 py-2 text-[11px]">
              {hasDraft ? (
                <span>
                  Un brouillon est en cours. Pour restaurer une autre version, jette-le ou publie-le d&apos;abord.
                </span>
              ) : (
                <span>
                  La restauration crée un nouveau brouillon — la version publiée reste intacte tant que tu ne le publies
                  pas.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VersionRow({
  version,
  parcoursSlug,
  clientUrl,
  canRestore,
  restoreDisabled,
  onRestore,
}: {
  version: VersionSummary;
  parcoursSlug: string;
  clientUrl: string;
  canRestore: boolean;
  restoreDisabled: boolean;
  onRestore: () => void;
}) {
  const previewUrl = `${clientUrl}/parcours/${parcoursSlug}?version=${version.id}`;

  return (
    <li className="hover:bg-muted/30 flex items-center justify-between gap-3 px-5 py-3 transition">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">v{version.versionNumber}</span>
          <StatusBadge status={version.status} isCurrentPublished={version.isCurrentPublished} />
          <span className="text-muted-foreground text-[11px]">· {formatRelative(version.createdAt)}</span>
        </div>
        <p className="text-muted-foreground text-[11px]">
          {version.chapterCount} chapitre{version.chapterCount > 1 ? 's' : ''} · {version.blockCount} bloc
          {version.blockCount > 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border text-foreground hover:border-primary hover:text-primary bg-surface inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition"
          title="Ouvrir cette version dans un nouvel onglet (lecture seule)"
        >
          <ExternalLink className="h-3 w-3" />
          Aperçu
        </a>
        <button
          type="button"
          disabled={!canRestore || restoreDisabled}
          onClick={onRestore}
          className={
            'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition ' +
            (canRestore
              ? 'border-border text-foreground hover:border-primary hover:text-primary bg-surface'
              : 'border-border/40 bg-muted/30 text-muted-foreground cursor-not-allowed')
          }
          title={
            !canRestore
              ? version.status === 'draft'
                ? "C'est le brouillon courant — pas besoin de le restaurer."
                : 'Jette ou publie le brouillon courant pour restaurer cette version.'
              : 'Restaurer cette version en nouveau brouillon'
          }
        >
          <RotateCcw className="h-3 w-3" />
          Restaurer
        </button>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  isCurrentPublished,
}: {
  status: VersionSummary['status'];
  isCurrentPublished: boolean;
}) {
  if (status === 'published' || isCurrentPublished) {
    return <Badge tone="success">publiée</Badge>;
  }
  if (status === 'draft') {
    return <Badge tone="warning">brouillon</Badge>;
  }
  return <Badge tone="neutral">archivée</Badge>;
}

/** "il y a 3 j" / "il y a 12 min" — French relative time, no extra dep. */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diff = (Date.now() - then) / 1000; // seconds
  if (diff < 60) return `il y a ${Math.floor(diff)}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  if (diff < 2592000) return `il y a ${Math.floor(diff / 604800)} sem.`;
  if (diff < 31536000) return `il y a ${Math.floor(diff / 2592000)} mois`;
  return `il y a ${Math.floor(diff / 31536000)} an(s)`;
}
