'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';
import { IconPicker } from '@/components/IconPicker';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { NavbarVariant } from '@/lib/actions';

interface Props {
  parcoursSlug: string;
  initial: NavbarVariant[];
  /** Server action that writes the full list back to the parcours row. */
  saveAction: (variants: NavbarVariant[]) => Promise<void>;
}

/**
 * Admin UI for the per-parcours navbar variants registry. Each row exposes:
 *   - key (slug-like identifier referenced by block payloads)
 *   - title (displayed label)
 *   - icon (IconPicker)
 *   - color (hex picker)
 *   - percent (optional 0-100 progress ring)
 *
 * The component keeps the working copy in local state and persists the full
 * array on "Enregistrer". A toast surfaces success/failure.
 */
export function NavbarVariantsEditor({ initial, saveAction }: Props) {
  const toast = useToast();
  const router = useRouter();
  const confirm = useConfirm();
  const [variants, setVariants] = useState<NavbarVariant[]>(() => initial.map((v) => ({ ...v })));
  const [pending, startTransition] = useTransition();

  function update(idx: number, patch: Partial<NavbarVariant>) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function remove(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }
  function add() {
    setVariants((prev) => [...prev, { key: '', title: '', icon: '', color: '#a78bfa' }]);
  }
  function save() {
    startTransition(async () => {
      try {
        await saveAction(variants);
        toast.success('Variants enregistrés.');
        router.refresh();
      } catch (e) {
        console.error('[NavbarVariantsEditor] save failed', e);
        toast.error(`Échec de l'enregistrement : ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <p className="font-semibold">💡 À quoi sert une navbar « pilote Tool 1 » ?</p>
        <p>
          Les navbars te permettent de <strong>découper un chapitre en sous-parties visuelles</strong>. Chaque bloc
          (vidéo, card, FAQ, keyPoints) peut choisir une navbar : un bandeau coloré apparaît alors au-dessus du contenu
          et signale au visiteur dans quelle sous-partie il se trouve.
        </p>
        <p>
          Exemple : un chapitre « Filtrer les demandes » peut contenir deux sous-parties — « Les demandes de rendez-vous
          » et « Les demandes de contact » — chacune marquée par sa propre navbar.
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        Chaque variant a une <strong>clé</strong> (référencée par
        <code> payload.navbar.variant</code> dans les blocs), un
        <strong> titre</strong>, une <strong>icône</strong>, une
        <strong> couleur</strong>, et un <strong>pourcentage</strong> optionnel (l'anneau de progression à droite, façon
        « 40% / 60% »).
      </p>

      <div className="space-y-3">
        {variants.length === 0 && (
          <p className="border-border bg-muted/30 text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            Aucun variant. Ajoute-en un pour commencer.
          </p>
        )}
        {variants.map((v, idx) => (
          <div
            key={idx}
            className="border-border grid grid-cols-1 gap-3 rounded-md border bg-white p-3 md:grid-cols-[160px_1fr_180px_120px_100px_auto]"
          >
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Clé</label>
              <Input
                value={v.key}
                onChange={(e) => update(idx, { key: e.target.value })}
                placeholder="appointment"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Titre</label>
              <Input
                value={v.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                placeholder="Les demandes de rendez-vous"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Icône</label>
              <IconPicker value={v.icon ?? ''} onChange={(icon) => update(idx, { icon: icon || undefined })} />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Couleur</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={v.color ?? '#a78bfa'}
                  onChange={(e) => update(idx, { color: e.target.value })}
                  className="border-border h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={v.color ?? ''}
                  onChange={(e) => update(idx, { color: e.target.value })}
                  placeholder="#a78bfa"
                  className="h-9 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                % (opt.)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={v.percent ?? ''}
                onChange={(e) =>
                  update(idx, {
                    percent: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="60"
              />
            </div>
            <div className="flex items-end justify-end">
              <Button
                variant="ghost"
                size="sm"
                title="Supprimer ce variant"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Supprimer le variant « ${v.key || '(sans clé)'} » ?`,
                    confirmLabel: 'Supprimer',
                    destructive: true,
                  });
                  if (ok) remove(idx);
                }}
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Ajouter un variant
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
