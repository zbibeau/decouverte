'use client';

import { Check, ChevronDown, ChevronUp, Hash, List, ToggleLeft, Type } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionsListInput } from '@/components/variables/OptionsListInput';
import { ValueMapInput } from '@/components/variables/ValueMapInput';
import { cn } from '@/lib/utils';

type VariableType = 'boolean' | 'enum' | 'string' | 'number';

interface Props {
  createAction: (formData: FormData) => Promise<void>;
}

/**
 * Convert a free-text label (e.g. "Statut du patient") into a camelCase
 * key (e.g. "statutDuPatient") suitable as a variable identifier. Keeps
 * consistency with the legacy variable keys already in DB ("practiceSize").
 *
 * - Removes accents (« é » → « e »)
 * - Drops non-alphanumeric chars
 * - Lowercases the first word, capitalises subsequent words
 */
function camelCaseKey(input: string): string {
  const cleaned = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return '';
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return '';
  const [first, ...rest] = words;
  return first + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

const TYPE_OPTIONS: Array<{
  value: VariableType;
  icon: typeof ToggleLeft;
  title: string;
  description: string;
  example: string;
}> = [
  {
    value: 'boolean',
    icon: ToggleLeft,
    title: 'Oui / Non',
    description: 'Une réponse à choix binaire.',
    example: 'Ex. : « Le patient a-t-il une mutuelle ? »',
  },
  {
    value: 'enum',
    icon: List,
    title: 'Choix unique',
    description: 'Une réponse parmi plusieurs options pré-définies.',
    example: 'Ex. : « Statut » → actif / inactif / archivé.',
  },
  {
    value: 'string',
    icon: Type,
    title: 'Texte libre',
    description: 'Un texte saisi librement.',
    example: 'Ex. : « Nom du patient », « Adresse e-mail ».',
  },
  {
    value: 'number',
    icon: Hash,
    title: 'Nombre',
    description: 'Une valeur numérique (entier ou décimal).',
    example: 'Ex. : âge, prix, quantité.',
  },
];

export function AddVariableForm({ createAction }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [type, setType] = useState<VariableType>('boolean');
  const [label, setLabel] = useState('');
  // The technical key (camelCase code name). Auto-synced from the label
  // until the user types into it manually ; from that point on we honour
  // their input verbatim. `keyTouched` tracks the "did the user override"
  // bit so we know whether to keep syncing from the label.
  const [keyInput, setKeyInput] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hsProperty, setHsProperty] = useState('');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const autoKey = useMemo(() => camelCaseKey(label), [label]);
  const effectiveKey = keyTouched ? keyInput : autoKey;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Donne d'abord un nom à ta variable (champ « Question »).");
      return;
    }
    if (!effectiveKey) {
      toast.error('Clé technique vide. Choisis un nom plus simple.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('key', effectiveKey);
    fd.set('label', label.trim());
    fd.set('type', type);
    fd.set('hsProperty', hsProperty.trim());
    startTransition(async () => {
      try {
        await createAction(fd);
        toast.success(`Variable « ${label.trim()} » créée.`);
        // Reset
        setLabel('');
        setKeyInput('');
        setKeyTouched(false);
        setAdvancedOpen(false);
        setHsProperty('');
        setType('boolean');
        formRef.current?.reset();
      } catch (err) {
        toast.error(`Création échouée : ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    // `router.refresh()` hors du `startTransition` (= update urgent) sinon
    // React le défère derrière les setState ci-dessus et la liste des
    // variables ne se met à jour qu'au prochain F5 manuel — même pattern
    // de fix que `handleInsertSample` côté ChapterEditor.
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Step 1 — pick the type. Beginner-friendly cards with icons,
           use-case labels and a concrete example. */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          1. Quelle sorte de réponse veux-tu stocker&nbsp;?
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'group flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected
                    ? 'border-brand-primary-500 bg-brand-primary-50 ring-brand-primary-200 ring-1'
                    : 'border-border bg-surface hover:border-brand-primary-300 hover:bg-brand-primary-50/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    selected
                      ? 'bg-brand-primary-500 text-white'
                      : 'bg-muted text-muted-foreground group-hover:bg-brand-primary-100 group-hover:text-brand-primary-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{opt.title}</span>
                    {selected && <Check className="text-brand-primary-600 h-3.5 w-3.5" />}
                  </div>
                  <p className="text-muted-foreground text-xs">{opt.description}</p>
                  <p className="text-muted-foreground/80 text-[11px] italic">{opt.example}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — name the question. The "key" (technical identifier used
           in conditional blocks + code) is auto-generated from the label
           but ALWAYS shown editable side-by-side so power users can fix
           the camelCasing or pick a different name without hunting for a
           hidden toggle. */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          2. Quelle est ta question, en français&nbsp;?
        </label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. : Statut du patient"
          autoFocus
        />
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <label className="text-muted-foreground flex items-center text-[11px] font-medium uppercase tracking-wide">
            Clé technique
          </label>
          <div className="space-y-1">
            <Input
              value={effectiveKey}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setKeyTouched(true);
              }}
              onFocus={() => {
                // First focus pre-seeds keyInput with the auto value so the
                // user can edit from there without it resetting on blur.
                if (!keyTouched) setKeyInput(autoKey);
              }}
              placeholder="statutDuPatient"
              className="h-8 font-mono text-xs"
            />
            <p className="text-muted-foreground text-[11px]">
              Utilisée dans les blocs conditionnels et dans le code ({'{'}variable{'}'} dans les templates).
              Auto-générée depuis ton label, mais tu peux la changer manuellement.
              {keyTouched && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="text-brand-primary-700 underline-offset-2 hover:underline"
                    onClick={() => {
                      setKeyInput('');
                      setKeyTouched(false);
                    }}
                  >
                    Re-synchroniser avec le label
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Step 3 — options (only for enum) */}
      {type === 'enum' && (
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            3. Quelles sont les options possibles&nbsp;?
          </label>
          <OptionsListInput name="options" />
          <p className="text-muted-foreground text-[11px]">
            Une ligne par option. « Valeur » = identifiant interne (sans accent), « Label » = ce que les utilisateurs
            voient.
          </p>
        </div>
      )}

      {/* Advanced — Hubspot mapping. Collapsed by default. */}
      <div className="border-border/60 rounded-md border">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="text-muted-foreground hover:bg-muted/50 flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors"
        >
          <span>Options avancées (Hubspot)</span>
          {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {advancedOpen && (
          <div className="border-border/60 bg-muted/20 space-y-3 border-t p-3">
            <p className="text-muted-foreground text-[11px]">
              Optionnel. Sert à synchroniser la valeur saisie avec une propriété Hubspot existante. Laisse vide si tu
              n'utilises pas Hubspot.
            </p>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Hubspot property
              </label>
              <Input
                value={hsProperty}
                onChange={(e) => setHsProperty(e.target.value)}
                placeholder="ex. ma_propriete_hs"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Mapping valeur → label Hubspot
              </label>
              <ValueMapInput name="hsValueMap" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !label.trim()}>
          {isPending ? 'Création…' : 'Créer la variable'}
        </Button>
        <span className="text-muted-foreground text-[11px]">Tu pourras toujours la modifier ensuite.</span>
      </div>
    </form>
  );
}
