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
          <form onSubmit={handleSubmit} className="bg-surface w-full max-w-md overflow-hidden rounded-lg shadow-2xl">
            <div className="border-border bg-muted/30 flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Créer un nouveau parcours</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label htmlFor="parcours-name" className="text-foreground text-xs font-medium">
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
                <p className="text-muted-foreground text-[10px]">
                  Affiché dans la liste des parcours et dans le header.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="parcours-slug" className="text-foreground text-xs font-medium">
                  Slug (URL publique)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">/parcours/</span>
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
                <p className="text-muted-foreground text-[10px]">
                  Suggéré automatiquement à partir du nom. Lettres, chiffres et tirets uniquement.
                </p>
              </div>

              {error && (
                <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-xs">
                  {error}
                </p>
              )}

              <p className="bg-muted/40 text-muted-foreground rounded-md px-3 py-2 text-[11px]">
                Le parcours est créé en <strong>brouillon</strong>. Tu pourras ajouter les chapitres ensuite, puis le
                publier.
              </p>
            </div>

            <div className="border-border bg-muted/20 flex items-center justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
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
