import {
  discardDraft,
  getDraftChapterDiffs,
  getDraftDeletedChapterCount,
  getDraftStatus,
  getDraftTagReviewSummary,
  publishDraft,
} from '@/lib/actions';
import { ConfirmForm } from '@/components/ConfirmForm';
import { PublishDraftButton } from '@/components/PublishDraftButton';

/**
 * Banner shown on every parcours page. Summarises whether a draft exists and
 * offers Publish / Discard actions. Server Component — the forms submit to
 * server actions directly, no client-side state needed.
 */
export async function DraftStatusBar({ parcoursSlug }: { parcoursSlug: string }) {
  const status = await getDraftStatus(parcoursSlug);

  async function publishAction() {
    'use server';
    await publishDraft(parcoursSlug);
  }
  async function discardAction() {
    'use server';
    await discardDraft(parcoursSlug);
  }

  if (status.hasDraft) {
    const [diffs, deletedCount, tagReview] = await Promise.all([
      getDraftChapterDiffs(parcoursSlug),
      getDraftDeletedChapterCount(parcoursSlug),
      getDraftTagReviewSummary(parcoursSlug),
    ]);
    let newCount = 0;
    let modifiedCount = 0;
    for (const d of diffs.values()) {
      if (d === 'new') newCount++;
      else if (d === 'modified') modifiedCount++;
    }
    const totalChanges = newCount + modifiedCount + deletedCount;
    // Compact short tokens "3 new · 1 mod · 0 del" — drop zero terms.
    const summary: string[] = [];
    if (newCount > 0) summary.push(`${newCount} new`);
    if (modifiedCount > 0) summary.push(`${modifiedCount} mod`);
    if (deletedCount > 0) summary.push(`${deletedCount} del`);
    const summaryText = summary.join(' · ');
    // Pre-publish tag review : rows still without a tag.
    const untaggedRows =
      tagReview.blocks.filter((b) => b.tags.length === 0).length +
      tagReview.chapters.filter((c) => c.tags.length === 0).length;

    // Empty draft (draft exists but is byte-identical to published) :
    // green banner + discreet "discard empty draft" link.
    if (totalChanges === 0) {
      return (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          title="Toute modification ouvrira automatiquement un brouillon, sans toucher au live."
        >
          <span>
            ✅ <strong>Publié v{status.publishedVersionNumber ?? '—'}</strong>
            <span className="text-emerald-700/70 dark:text-emerald-300/70">
              {' · '}brouillon v{status.draftVersionNumber} vide
            </span>
          </span>
          <ConfirmForm
            action={discardAction}
            message={`Jeter le brouillon v${status.draftVersionNumber} ?\n\nIl ne contient aucun changement par rapport à la version publiée.`}
          >
            <button
              type="submit"
              className="ml-auto text-[11px] italic text-emerald-700/70 underline-offset-2 transition-colors hover:text-emerald-900 hover:underline dark:text-emerald-300/70 dark:hover:text-emerald-200"
              title={`Le brouillon v${status.draftVersionNumber} existe mais n'a aucun changement par rapport à v${status.publishedVersionNumber}.`}
            >
              Jeter le vide
            </button>
          </ConfirmForm>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
        <span className="line-clamp-1 min-w-0">
          ✏️ <strong>Brouillon v{status.draftVersionNumber}</strong>
          {status.publishedVersionNumber != null && (
            <span className="text-amber-700/80 dark:text-amber-300/80"> (publié v{status.publishedVersionNumber})</span>
          )}
          {' · '}
          <span className="font-medium">{summaryText}</span>
          {tagReview.total > 0 && (
            <>
              {' · '}
              {untaggedRows > 0 ? (
                <span
                  className="font-medium text-amber-800 dark:text-amber-200"
                  title={`${untaggedRows} sur ${tagReview.total} blocs/chapitres à revoir n'ont pas encore de tag.`}
                >
                  🏷 {untaggedRows}/{tagReview.total}
                </span>
              ) : (
                <span
                  className="text-emerald-700 dark:text-emerald-300"
                  title={`${tagReview.total} blocs/chapitres à confirmer, tous déjà taggés.`}
                >
                  🏷 ok ({tagReview.total})
                </span>
              )}
            </>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <PublishDraftButton
            publishAction={publishAction}
            parcoursSlug={parcoursSlug}
            confirmMessage={`Publier le brouillon v${status.draftVersionNumber} ?\n\n${
              newCount > 0 ? `• ${newCount} nouveau(x)\n` : ''
            }${modifiedCount > 0 ? `• ${modifiedCount} modifié(s)\n` : ''}${
              deletedCount > 0 ? `• ${deletedCount} supprimé(s)\n` : ''
            }\nLes utilisateurs finaux verront ces changements immédiatement. L'ancienne version sera archivée.`}
          />
          <ConfirmForm
            action={discardAction}
            message={`Jeter le brouillon v${status.draftVersionNumber} ?\n\nToutes les modifications non publiées seront perdues. La version publiée n'est pas affectée.`}
          >
            <button
              type="submit"
              className="border-primary-weak-border text-primary-on hover:bg-primary/10 bg-surface inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-all"
              title="Jeter toutes les modifications non publiées"
            >
              Jeter
            </button>
          </ConfirmForm>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      title="Toute modification ouvrira automatiquement un brouillon, sans toucher au live."
    >
      ✅ <strong>Publié v{status.publishedVersionNumber ?? '—'}</strong>
    </div>
  );
}
