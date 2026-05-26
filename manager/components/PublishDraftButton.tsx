'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';
import { TagReviewModal } from '@/components/TagReviewModal';
import { useToast } from '@/components/Toaster';
import { getDraftTagReviewSummary, type DraftTagReviewSummary } from '@/lib/actions';

interface Props {
  /** Server action publishing the draft of the given parcours. */
  publishAction: () => Promise<void>;
  /** Slug of the parcours being published. Used to fetch the tag
   *  review summary on click — see {@link TagReviewModal}. */
  parcoursSlug: string;
  /** Confirmation message shown before submitting (when there are no
   *  rows to tag-review, i.e. the modal is skipped). */
  confirmMessage: string;
  /** Whether the button is allowed to fire (no changes → disabled). */
  disabled?: boolean;
  /** Visible label — defaults to "Publier". */
  label?: string;
}

/**
 * Client wrapper around the `publishDraft` server action.
 *
 * Two-step flow on click :
 *   1. Fetch {@link getDraftTagReviewSummary} for the current draft.
 *      If non-empty, open the {@link TagReviewModal} — the editor walks
 *      every new/modified block + chapter, confirms or skips each, and
 *      only the modal's footer "Publier" button actually fires the
 *      server action.
 *   2. If the summary is empty (draft with no new/modified rows
 *      somehow — defensive), fall back to the legacy confirm() dialog
 *      so the publish still works.
 *
 * Why a client component at all : the server action ALREADY calls
 * `revalidatePath(..., 'layout')`, but for nested routes (block /
 * chapter detail) the auto-refresh doesn't always reach the deepest
 * segment — the editor sees stale "Modifié" / "Nouveau" badges until
 * a manual F5. Calling `router.refresh()` from the client right after
 * the action resolves forces a fresh RSC tree fetch for every level
 * of the current route.
 */
export function PublishDraftButton({
  publishAction,
  parcoursSlug,
  confirmMessage,
  disabled = false,
  label = 'Publier',
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [reviewSummary, setReviewSummary] = useState<DraftTagReviewSummary | null>(null);
  const [openingReview, setOpeningReview] = useState(false);

  async function runPublish() {
    // Wrapped so both paths (review modal "Publier" + fallback
    // confirm()) hit the same persisted flow.
    startTransition(async () => {
      try {
        await publishAction();
        setReviewSummary(null);
        router.refresh();
        toast.success('Brouillon publié.');
      } catch (e) {
        toast.error(`Publication échouée : ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  async function handleClick() {
    if (disabled || isPending || openingReview) return;
    setOpeningReview(true);
    try {
      const summary = await getDraftTagReviewSummary(parcoursSlug);
      if (summary.total > 0) {
        // Tag-review path : delegate the publish trigger to the modal.
        setReviewSummary(summary);
        return;
      }
      // Empty draft / no new-or-modified rows : keep the legacy
      // confirm() dialog so the editor still gets a final "are you
      // sure ?" prompt. Splits the message the same way as before.
      const [firstLine, ...rest] = confirmMessage.split('\n').filter(Boolean);
      const ok = await confirm({
        title: firstLine ?? 'Publier le brouillon ?',
        message: rest.length > 0 ? rest.join('\n') : undefined,
        confirmLabel: 'Publier',
      });
      if (ok) await runPublish();
    } finally {
      setOpeningReview(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending || openingReview}
        className="bg-brand-primary-600 shadow-brand hover:bg-brand-primary-700 active:bg-brand-primary-800 inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-medium text-white transition-all disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? 'Publication…' : openingReview ? 'Préparation…' : label}
      </button>
      {reviewSummary && (
        <TagReviewModal
          summary={reviewSummary}
          parcoursSlug={parcoursSlug}
          onPublish={() => void runPublish()}
          onClose={() => setReviewSummary(null)}
        />
      )}
    </>
  );
}
