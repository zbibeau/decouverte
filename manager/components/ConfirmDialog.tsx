'use client';

import { AlertTriangle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Imperative confirm dialog : replaces `window.confirm(...)` which had
 * three problems we hit in practice :
 *   1. Browser default is jarring (panics non-tech users)
 *   2. `\n` characters render as raw "\n" in some browsers — our chapter
 *      delete prompt used multi-line text and looked unprofessional
 *   3. No way to differentiate a destructive action from a benign one
 *
 * Usage :
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Supprimer ce chapitre ?',
 *     message: 'Cette action ouvre / modifie le brouillon en cours.',
 *     confirmLabel: 'Supprimer',
 *     destructive: true,
 *   });
 *   if (!ok) return;
 *
 * The provider must be mounted high in the tree (see `(app)/layout.tsx`).
 * The Promise resolves with `true` on confirm, `false` on cancel /
 * Escape / outside-click.
 */

export interface ConfirmOptions {
  /** Headline shown bold at the top of the dialog. */
  title: string;
  /**
   * Body content. Strings are split on `\n` into paragraphs ; React
   * nodes are rendered as-is so callers can mix bold / lists / counts.
   */
  message?: React.ReactNode;
  /** Primary action label. Default "Confirmer". */
  confirmLabel?: string;
  /** Cancel button label. Default "Annuler". */
  cancelLabel?: string;
  /**
   * Styles the primary button as destructive (red) and adds a warning
   * icon next to the title. Use for delete / discard actions.
   */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hook : returns a `confirm(options)` async function. Throws if the
 *  provider is missing from the tree. */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error('useConfirm() requires <ConfirmDialogProvider> in the tree.');
  }
  return fn;
}

interface PendingState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  // Focus the cancel button by default on open — safer for destructive
  // actions, matches the OS confirm dialog convention.
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  // Resolve + close helpers.
  const close = useCallback(
    (value: boolean) => {
      if (!pending) return;
      pending.resolve(value);
      setPending(null);
    },
    [pending],
  );

  // Escape closes (= cancel). Lock body scroll while open.
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Auto-focus cancel after mount so Tab order starts there.
    setTimeout(() => cancelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pending, close]);

  // Split string messages on \n so the dialog never shows raw "\n" like
  // window.confirm used to. React nodes pass through unchanged.
  const messageNode = useMemo(() => {
    if (!pending?.options.message) return null;
    const raw = pending.options.message;
    if (typeof raw !== 'string') return raw;
    const lines = raw.split('\n').filter((l) => l.length > 0);
    return lines.map((line, idx) => (
      <p key={idx} className="text-muted-foreground text-sm">
        {line}
      </p>
    ));
  }, [pending]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        // Backdrop. role="presentation" because it's a decorative click
        // surface (outside-click cancels), not an interactive element.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div className="border-border bg-background w-full max-w-md rounded-lg border p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              {pending.options.destructive && (
                <div
                  aria-hidden="true"
                  className="bg-destructive/10 text-destructive mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
                >
                  <AlertTriangle className="size-5" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <h2 id="confirm-title" className="text-base font-semibold">
                  {pending.options.title}
                </h2>
                {messageNode && <div className="space-y-2">{messageNode}</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} type="button" variant="outline" onClick={() => close(false)}>
                {pending.options.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                type="button"
                variant={pending.options.destructive ? 'destructive' : 'default'}
                onClick={() => close(true)}
              >
                {pending.options.confirmLabel ?? 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
