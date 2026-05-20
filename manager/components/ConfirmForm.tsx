'use client';

import { useRef, type FormEvent, type ReactNode } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';

/**
 * Thin client wrapper around `<form action={serverAction}>` that asks for
 * confirmation via our themed dialog before submitting. Replaces the
 * previous `window.confirm()`-based prompt which displayed raw `\n`
 * characters and felt OS-tier on a polished CMS surface.
 *
 * Design note : we keep the native `<form>` (rather than an onClick button
 * calling the action as RPC) because the form-submit path is robust even
 * before client-side hydration completes — the browser POSTs the encrypted
 * action ID to the server. The wrapper only adds the confirm dialog on top.
 *
 * Implementation : the submit handler intercepts the first submit,
 * shows the dialog asynchronously, and re-submits the form
 * programmatically once the user confirms. The flag prevents an
 * infinite loop on the re-submit.
 */
export function ConfirmForm({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  const confirm = useConfirm();
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return; // user just confirmed — let the native submit through
    }
    e.preventDefault();
    void (async () => {
      // Split the first line as title, the rest as body — matches the
      // shape callers were already using (multi-line strings).
      const [firstLine, ...rest] = message.split('\n').filter(Boolean);
      const ok = await confirm({
        title: firstLine ?? 'Confirmer ?',
        message: rest.length > 0 ? rest.join('\n') : undefined,
        confirmLabel: 'Confirmer',
        destructive: /supprim|jet|discard/i.test(message),
      });
      if (!ok) return;
      confirmedRef.current = true;
      formRef.current?.requestSubmit();
    })();
  }
  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
