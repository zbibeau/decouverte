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
    const summary: string[] = [];
    if (newCount > 0) summary.push(`${newCount} nouveau${newCount > 1 ? 'x' : ''}`);
    if (modifiedCount > 0) summary.push(`${modifiedCount} modifié${modifiedCount > 1 ? 's' : ''}`);
    if (deletedCount > 0) summary.push(`${deletedCount} supprimé${deletedCount > 1 ? 's' : ''}`);
    const summaryText = summary.join(' · ');
    // Pre-publish tag review : how many rows have NO tag attached
    // yet ? Renders as a permanent counter in the banner so the
    // editor sees the upcoming review work without having to
    // initiate publication.
    const untaggedRows =
      tagReview.blocks.filter((b) => b.tags.length === 0).length +
      tagReview.chapters.filter((c) => c.tags.length === 0).length;

    // Empty draft (draft exists but is byte-identical to published) :
    // showing the amber "Vous éditez le brouillon" banner with both
    // CTAs is misleading — Publier is disabled (nothing to publish)
    // and only Jeter is actionable, drowned in a banner that pretends
    // there's a meaningful pending change. Fall through to the green
    // "Version publiée" banner instead, with a discreet inline option
    // to clean up the empty draft.
    if (totalChanges === 0) {
      return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900">
          <span>
            ✅ <strong>Version publiée v{status.publishedVersionNumber ?? '—'}</strong>. Toute modification ouvrira
            automatiquement un brouillon (sans toucher au live).
          </span>
          <ConfirmForm
            action={discardAction}
            message={`Jeter le brouillon v${status.draftVersionNumber} ?\n\nIl ne contient aucun changement par rapport à la version publiée.`}
          >
            <button
              type="submit"
              className="ml-auto text-[11px] italic text-emerald-700/70 underline-offset-2 transition-colors hover:text-emerald-900 hover:underline"
              title={`Le brouillon v${status.draftVersionNumber} existe mais n'a aucun changement par rapport à v${status.publishedVersionNumber}.`}
            >
              Jeter le brouillon vide v{status.draftVersionNumber}
            </button>
          </ConfirmForm>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <span>
          ✏️ Vous éditez le <strong>brouillon v{status.draftVersionNumber}</strong>
          {status.publishedVersionNumber != null && <> (publié : v{status.publishedVersionNumber})</>} —{' '}
          <span className="font-medium">{summaryText}</span>
          {/* Permanent tag-review counter : shows how many new/modified
              rows still lack a tag. Always visible (orange when > 0,
              neutral-green hint when 0) so the editor anticipates the
              modale work without surprise at publish time. */}
          {tagReview.total > 0 && (
            <>
              {' · '}
              {untaggedRows > 0 ? (
                <span className="font-medium text-amber-800">
                  🏷 {untaggedRows} sans tag (sur {tagReview.total} à revoir)
                </span>
              ) : (
                <span className="text-emerald-700">🏷 tous taggés ({tagReview.total} à confirmer)</span>
              )}
            </>
          )}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Publish — client component so we can call `router.refresh()`
              after the action resolves. Routes through TagReviewModal
              when the draft has new/modified rows (see
              PublishDraftButton). */}
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
              className="border-brand-primary-200 text-brand-primary-700 hover:bg-brand-primary-50 inline-flex h-8 items-center justify-center rounded-lg border bg-white px-3 text-xs font-medium transition-all"
            >
              Jeter le brouillon
            </button>
          </ConfirmForm>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900">
      ✅ <strong>Version publiée v{status.publishedVersionNumber ?? '—'}</strong>. Toute modification ouvrira
      automatiquement un brouillon (sans toucher au live).
    </div>
  );
}
