import { Combobox, createListCollection } from '@ark-ui/solid';
import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { createMemo, createSignal, For, Show } from 'solid-js';

/**
 * Wrapper `Combobox` ark-ui + modular-forms pour les variables enum à beaucoup
 * d'options (typiquement `logicielMedecin` à 28 entrées). Drop-in remplacement
 * du `RadioGroupForm` quand `options.length > ENUM_DROPDOWN_THRESHOLD` côté
 * `RenderFormBlock`.
 *
 * UX :
 *   - L'utilisateur ouvre la liste (clic / focus), tape pour filtrer
 *     case-insensitive `contains` sur le label, navigue ↑/↓, Enter sélectionne,
 *     Esc ferme. ARIA + keyboard gérés par ark-ui.
 *   - À la sélection, ark-ui remplit l'input avec le label ; `setValue` pousse
 *     la value dans modular-forms — comme le RadioGroupForm.
 *   - Si l'utilisateur tape un texte qui ne matche aucune option, on affiche
 *     « Aucun résultat » plutôt qu'une liste vide cassée.
 *   - Pré-sélection au retour : `value` contrôlé (memoïsé) + collection ;
 *     le texte de l'input n'est pas re-contrôlé depuis Solid (cf. ark #2769).
 *
 * Style : reste sobre — input arrondi cohérent avec les autres widgets form,
 * dropdown avec border + ombre. Le wrapper coloré (`rounded-2xl bg-secondary-50
 * …`) reste géré par le caller dans `RenderFormBlock`, comme pour le radio.
 */
export type ComboboxOption = { value: string; label: string };

export type ComboboxFormProps = {
  name: string;
  label?: string;
  options: ComboboxOption[];
  value?: string;
  error?: string;
  placeholder?: string;
  form: FormStore<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const ComboboxForm = (props: ComboboxFormProps) => {
  /** Texte tapé pour filtrer la liste. On ne repasse PAS cette valeur dans
   *  `inputValue` sur le Root : contrôler input + value ensemble fait
   *  réinitialiser l'input à chaque frappe (ark-ui #2769), surtout quand le
   *  parent re-render (validateOn: 'input' sur modular-forms). */
  const [filterQuery, setFilterQuery] = createSignal('');

  /** Stable reference — évite un remount du combobox à chaque render parent. */
  const selectedValues = createMemo(() => (props.value ? [props.value] : []));

  /** Collection filtrée. Recompute à chaque changement de filterQuery. */
  const collection = createMemo(() => {
    const q = filterQuery().trim().toLowerCase();
    const items = q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options;
    return createListCollection<ComboboxOption>({
      items,
      itemToString: (o) => o.label,
      itemToValue: (o) => o.value,
    });
  });

  return (
    <Combobox.Root
      collection={collection()}
      value={selectedValues()}
      onInputValueChange={(d) => setFilterQuery(d.inputValue)}
      onValueChange={(d) => {
        const next = d.value[0] ?? '';
        setValue(props.form, props.name, next, { shouldTouched: true });
        setFilterQuery('');
      }}
      onOpenChange={(d) => {
        if (!d.open) setFilterQuery('');
      }}
      class="w-full"
    >
      <Show when={props.label}>
        <Combobox.Label class="mb-1 block text-sm font-medium text-dark-950">{props.label}</Combobox.Label>
      </Show>
      <Combobox.Control class="relative flex w-full items-center gap-1">
        {/* `Combobox.Context` expose l'API zag-js (setOpen, …). On l'utilise
            pour ouvrir la liste dès que l'input prend le focus — ark-ui ne
            fournit qu'un `openOnClick` par défaut, pas de `openOnFocus`. */}
        <Combobox.Context>
          {(api) => (
            <Combobox.Input
              placeholder={props.placeholder ?? 'Choisis dans la liste…'}
              onFocus={() => api().setOpen(true)}
              class={cx(
                'w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors',
                'focus:border-primary-400 focus:ring-2 focus:ring-primary-200',
                props.error ? 'border-danger-400' : 'border-dark-200',
              )}
            />
          )}
        </Combobox.Context>
        <Combobox.Trigger
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-dark-500 hover:bg-dark-100 hover:text-dark-700"
          aria-label="Ouvrir la liste"
        >
          <i class="icon icon-arrow-down-s-line size-4" />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Positioner class="z-[300]">
        {/* z-[300] : doit passer AU-DESSUS du bouton flottant « Continuer »
            (`GoToNextPartButton` en z-[200]) qui sinon recouvre le bas du
            dropdown quand la liste est ouverte. */}
        <Combobox.Content class="max-h-64 w-[var(--reference-width)] overflow-auto rounded-lg border border-dark-200 bg-white p-1 shadow-lg">
          <Show
            when={collection().items.length > 0}
            fallback={<div class="px-3 py-2 text-sm text-dark-500">Aucun résultat</div>}
          >
            <For each={collection().items}>
              {(item) => (
                <Combobox.Item
                  item={item}
                  class={cx(
                    'flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm text-dark-950',
                    'data-[highlighted]:bg-primary-50 data-[highlighted]:text-primary-700',
                    'data-[state=checked]:font-medium data-[state=checked]:text-primary-700',
                  )}
                >
                  <Combobox.ItemText>{item.label}</Combobox.ItemText>
                  <Combobox.ItemIndicator>
                    <i class="icon icon-check-line size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </For>
          </Show>
        </Combobox.Content>
      </Combobox.Positioner>
      <Show when={props.error}>
        <p class="mt-1 text-xs text-danger-400">{props.error}</p>
      </Show>
    </Combobox.Root>
  );
};
