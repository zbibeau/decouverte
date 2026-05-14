'use client';

import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { slugifyForParcours } from '@/lib/parcoursSlug';

interface Props {
  /** Server action: creates the parcours row + first draft version. */
  createAction: (input: { slug: string; name: string }) => Promise<{ slug: string }>;
}

/**
 * Modal wizard launched from the parcours list page. V1 is a single-screen
 * dialog: the user types a display name, the slug is auto-suggested (and
 * editable), and Submit creates the parcours + redirects to its chapter
 * list so the author can start adding chapters straight away.
 *
 * Future iterations may add :
 *   - host / custom domain (column already exists in DB)
 *   - template choice (empty / clone / pre-seeded)
 *   - initial variables pack
 */
export function CreateParcoursDialog({ createAction }: Props) {
  const slugify = slugifyForParcours;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  // `slugTouched` keeps user-edited slugs intact while the auto-fill from
  // name only fires until they touch the field themselves.
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, slugify, slugTouched]);

  // Reset on close.
  useEffect(() => {
    if (open) return;
    setName('');
    setSlug('');
    setSlugTouched(false);
    setError(null);
  }, [open]);

  // Escape closes (window-level so it fires even when an input has focus).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanedSlug = slugify(slug);
    if (!cleanedSlug) {
      setError('Slug invalide — il faut au moins une lettre ou un chiffre.');
      return;
    }
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    startTransition(async () => {
      try {
        const { slug: created } = await createAction({ name: name.trim(), slug: cleanedSlug });
        setOpen(false);
        router.push(`/parcours/${created}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nouveau parcours
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau parcours"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
              <h2 className="text-sm font-semibold">Créer un nouveau parcours</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label htmlFor="parcours-name" className="text-xs font-medium text-foreground">
                  Nom du parcours
                </label>
                <Input
                  id="parcours-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Démo Acme Pharma"
                  autoFocus
                  disabled={isPending}
                />
                <p className="text-[10px] text-muted-foreground">
                  Affiché dans la liste des parcours et dans le header.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="parcours-slug" className="text-xs font-medium text-foreground">
                  Slug (URL publique)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">/parcours/</span>
                  <Input
                    id="parcours-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugTouched(true);
                    }}
                    placeholder="demo-acme-pharma"
                    disabled={isPending}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Suggéré automatiquement à partir du nom. Lettres, chiffres et tirets uniquement.
                </p>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <p className="rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                Le parcours est créé en <strong>brouillon</strong>. Tu pourras ajouter les chapitres
                ensuite, puis le publier.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending || !name.trim() || !slug}>
                {isPending ? 'Création…' : 'Créer le parcours'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
