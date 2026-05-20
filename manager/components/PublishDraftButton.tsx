'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toaster';

interface Props {
  /** Server action publishing the draft of the given parcours. */
  publishAction: () => Promise<void>;
  /** Confirmation message shown before submitting. */
  confirmMessage: string;
  /** Whether the button is allowed to fire (no changes → disabled). */
  disabled?: boolean;
  /** Visible label — defaults to "Publier". */
  label?: string;
}

/**
 * Client wrapper around the `publishDraft` server action. Why a client
 * component when the previous implementation used a native `<form action>` ?
 *
 *   - The server action ALREADY calls `revalidatePath(..., 'layout')`, but
 *     for nested routes (block detail, chapter detail) the auto-refresh
 *     doesn't always reach the deepest segment — the user sees stale
 *     "Modifié" / "Nouveau" badges until they manually F5.
 *   - Calling `router.refresh()` from the client right after the action
 *     resolves forces a fresh React Server Component tree fetch for
 *     EVERY level of the current route, which clears every diff badge in
 *     one shot.
 *
 * Keeps the same `window.confirm()` UX as the previous `ConfirmForm`.
 */
export function PublishDraftButton({ publishAction, confirmMessage, disabled = false, label = 'Publier' }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    if (disabled) return;
    // Split the legacy single-string `confirmMessage` so the first line
    // (typically "Publier la vX ?") becomes the dialog title and the
    // body lists the diff bullets ("• 3 nouveau(x)", etc.).
    const [firstLine, ...rest] = confirmMessage.split('\n').filter(Boolean);
    const ok = await confirm({
      title: firstLine ?? 'Publier le brouillon ?',
      message: rest.length > 0 ? rest.join('\n') : undefined,
      confirmLabel: 'Publier',
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await publishAction();
        router.refresh();
        toast.success('Brouillon publié.');
      } catch (e) {
        toast.error(`Publication échouée : ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className="bg-brand-primary-600 shadow-brand hover:bg-brand-primary-700 active:bg-brand-primary-800 inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-medium text-white transition-all disabled:pointer-events-none disabled:opacity-50"
    >
      {isPending ? 'Publication…' : label}
    </button>
  );
}
