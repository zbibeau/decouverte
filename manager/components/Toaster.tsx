'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lightweight toast system. Mount `<ToastProvider>` once at the app shell;
 * call `useToast()` from any client component to show a transient message.
 *
 * Toasts auto-dismiss after 3.5s; users can close them manually with the X.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone =
    toast.kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200'
      : toast.kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-200'
        : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-200';
  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info;

  return (
    <div
      className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-sm ${tone}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 whitespace-pre-line">{toast.message}</span>
      <button type="button" className="opacity-60 hover:opacity-100" onClick={onDismiss} aria-label="Fermer">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft fallback so callers in trees without a provider still work
    // (e.g. unit tests). Toasts are best-effort UI sugar.
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
