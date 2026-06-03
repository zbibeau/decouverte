'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { OptionsListInput } from '@/components/variables/OptionsListInput';

type Option = { value: string; label: string };

interface Props {
  /** Initial options venant de la DB. */
  initial: Option[];
  /**
   * Server action déjà bound côté page avec le slug parcours + l'id variable.
   * Reçoit un `FormData` avec un champ `options` = JSON.stringify(rows).
   */
  saveAction: (formData: FormData) => Promise<void>;
}

/**
 * Wrapper client autour de `OptionsListInput` qui auto-save à chaque modif
 * (drag-and-drop, ajout, suppression, édition d'un value/label) avec un toast
 * de confirmation. Pas de bouton « Enregistrer » : l'auto-save + le toast
 * remplacent le feedback explicite, et l'utilisateur ne peut plus oublier de
 * cliquer puis perdre ses changements en quittant la page.
 *
 * Debounce 500 ms : laisse le temps de finir une saisie texte avant de save,
 * mais reste perçu comme instantané sur un drag-and-drop (qui produit une
 * seule mutation en fin de geste).
 *
 * On garde le contrat FormData / Server Action existant (pas de refacto
 * côté `lib/actions.ts`) — le wrapper construit la FormData lui-même et
 * passe au saveAction.
 */
const SAVE_DEBOUNCE_MS = 500;

export function VariableOptionsForm({ initial, saveAction }: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernière payload sérialisée envoyée au serveur — évite les saves doublons
   *  quand un keystroke fait re-fire le useEffect sans vraie modif (cas rare,
   *  mais le filet coûte peu). */
  const lastSavedRef = useRef<string>(JSON.stringify(initial));

  const persist = useCallback(
    (rows: Option[]) => {
      const serialised = JSON.stringify(rows);
      if (serialised === lastSavedRef.current) return;
      lastSavedRef.current = serialised;
      setStatus('pending');
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set('options', serialised);
          await saveAction(fd);
          setStatus('saved');
          toast.success('Options enregistrées');
          // Reset à idle après quelques secondes pour libérer l'indicateur.
          window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
        } catch (e) {
          setStatus('error');
          toast.error(`Échec de l'enregistrement : ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
    [saveAction, toast],
  );

  const handleChange = useCallback(
    (next: Option[]) => {
      // Debounce : on attend que l'utilisateur arrête de bidouiller avant de
      // taper sur le serveur. Un drag-drop = une seule mutation → le toast
      // arrive ~500 ms après le drop, perçu comme instantané.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        persist(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  // Nettoyage du timer si le composant unmount avec un save en attente.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Options</label>
        <span
          className={
            status === 'pending'
              ? 'text-muted-foreground inline-flex items-center gap-1 text-[10px]'
              : status === 'saved'
                ? 'inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400'
                : status === 'error'
                  ? 'text-destructive inline-flex items-center gap-1 text-[10px]'
                  : 'invisible inline-flex items-center gap-1 text-[10px]'
          }
          aria-live="polite"
        >
          {status === 'pending' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Enregistrement…
            </>
          )}
          {status === 'saved' && <>✓ Enregistré</>}
          {status === 'error' && <>⚠ Erreur</>}
          {status === 'idle' && <>—</>}
        </span>
      </div>
      <OptionsListInput name="options" initial={initial} onChange={handleChange} />
      {/* Indicateur visuel "pending" léger sur le wrapper quand isPending,
          au cas où le `aria-live` ci-dessus passe inaperçu. */}
      {isPending && <span className="sr-only">Enregistrement en cours</span>}
    </div>
  );
}
