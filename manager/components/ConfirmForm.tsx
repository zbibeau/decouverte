'use client';

import type { FormEvent, ReactNode } from 'react';

/**
 * Thin client wrapper around `<form action={serverAction}>` that asks for
 * confirmation via `window.confirm` before submitting. Falls through to a
 * normal form submission once confirmed, so the server action runs through
 * Next.js' standard form-action pipeline.
 *
 * Design note : we keep the native `<form>` (rather than an onClick button
 * calling the action as RPC) because the form-submit path is robust even
 * before client-side hydration completes — the browser POSTs the encrypted
 * action ID to the server. The wrapper only adds the confirm dialog on top.
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
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) {
      e.preventDefault();
    }
  }
  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
