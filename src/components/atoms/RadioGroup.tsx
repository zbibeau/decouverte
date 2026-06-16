import { RadioGroup as RadioGroupCMP } from '@ark-ui/solid';
import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { Accessor, createMemo, For, mergeProps, splitProps } from 'solid-js';

export type Unpacked<T> = T extends (infer U)[] ? U : T;

/**
 * RadioGroup — refonte UI Kit moderne (handoff Lot 7).
 *
 * Avant : puce 5×5 + label inline, fond pastille primary-400 quand
 * sélectionné, label sans cadrage spécifique.
 *
 * Après (handoff §UI Kit Formulaires) : chaque option est une LIGNE
 * cliquable :
 *   - h-[48px] rounded-[14px] border-[1.5px] px-[15px] cursor-pointer
 *   - sélectionnée → border-primary-600 + bg-primary-50 + label
 *     font-semibold text-primary-600
 *     puce = anneau primary-600 [20px] + point central primary-600
 *   - non-sél. → border-violet-border (#E0D8EC), label text-violet-text
 *     puce = anneau #CDBFE3 (= primary-200 plus saturé)
 *
 * Variants conservés pour rétrocompat — l'accent du sélectionné est
 * juste re-mappé.
 */
const variantSelectedClassNames = {
  default: 'border-primary-600 bg-primary-50',
  primary: 'border-primary-600 bg-primary-50',
  secondary: 'border-secondary-400 bg-secondary-50',
  danger: 'border-[#E9897F] bg-[#FFF6F5]',
};

const variantDotClassNames = {
  default: 'border-primary-600',
  primary: 'border-primary-600',
  secondary: 'border-secondary-400',
  danger: 'border-[#E9897F]',
};

const variantDotInnerClassNames = {
  default: 'bg-primary-600',
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-400',
  danger: 'bg-[#E9897F]',
};

export const RadioGroupVariantClasses = Object.keys(
  variantSelectedClassNames,
) as (keyof typeof variantSelectedClassNames)[];

const textSelectedClassNames = {
  default: 'text-primary-600 font-semibold',
  primary: 'text-primary-600 font-semibold',
  secondary: 'text-secondary-600 font-semibold',
  danger: 'text-[#B33B36] font-semibold',
} satisfies Record<Unpacked<typeof RadioGroupVariantClasses>, string>;

export type RadioGroupProps = {
  label?: string;
  options: string[] | { label: string; value: string }[];

  orientation?: 'vertical' | 'horizontal';

  variant?: keyof typeof variantSelectedClassNames;

  disabled?: boolean;

  value?: string;
  onChange?: (data?: string) => void;
};

export const RadioGroup = (_props: RadioGroupProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'default',
        orientation: 'vertical',
      },
      _props,
    ),
    ['variant', 'value', 'onChange', 'options', 'label', 'disabled', 'orientation'],
  );

  const options = createMemo(() => {
    if (props.options?.length > 0) {
      if (typeof props.options[0] === 'object') {
        return props.options;
      } else {
        return props.options.map((option) => ({
          label: option,
          value: option,
        }));
      }
    }

    return [];
  }) as Accessor<{ label: string; value: string }[]>;

  return (
    <RadioGroupCMP.Root
      value={props.value}
      onValueChange={(data) => {
        props.onChange && props.onChange(data.value);
      }}
      class="space-y-2"
      {...otherProps}
    >
      {props.label && (
        <RadioGroupCMP.Label class="text-[13px] font-semibold text-primary-950">{props.label}</RadioGroupCMP.Label>
      )}
      <RadioGroupCMP.Indicator />
      <div
        class={cx(
          'flex',
          props.orientation === 'horizontal' ? 'flex-row flex-wrap items-center gap-2' : 'flex-col gap-2',
        )}
      >
        <For each={options()}>
          {(option) => {
            const isSelected = () => props.value === option.value;
            return (
              <RadioGroupCMP.Item
                value={option.value}
                class={cx(
                  // Ligne cliquable h-[48px] rounded-[14px] border-[1.5px]
                  // — pattern handoff §UI Kit Formulaires.
                  'group flex h-[48px] items-center gap-3 rounded-[14px] border-[1.5px] px-[15px] transition-all',
                  isSelected()
                    ? variantSelectedClassNames[props.variant as keyof typeof variantSelectedClassNames]
                    : 'border-violet-border bg-transparent hover:border-primary-200',
                  props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
              >
                {/* Puce 20px — anneau borduré + point central quand sélectionné. */}
                <RadioGroupCMP.ItemControl
                  class={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] transition-colors',
                    isSelected()
                      ? variantDotClassNames[props.variant as keyof typeof variantDotClassNames]
                      : 'border-[#CDBFE3]',
                  )}
                >
                  {isSelected() && (
                    <div
                      class={cx(
                        'h-2 w-2 rounded-full',
                        variantDotInnerClassNames[props.variant as keyof typeof variantDotInnerClassNames],
                      )}
                    />
                  )}
                </RadioGroupCMP.ItemControl>
                <RadioGroupCMP.ItemText
                  class={cx(
                    'flex-1 text-sm',
                    isSelected()
                      ? textSelectedClassNames[props.variant as keyof typeof textSelectedClassNames]
                      : 'text-violet-text',
                  )}
                >
                  {option.label}
                </RadioGroupCMP.ItemText>
                <RadioGroupCMP.ItemHiddenInput />
              </RadioGroupCMP.Item>
            );
          }}
        </For>
      </div>
    </RadioGroupCMP.Root>
  );
};

export const RadioGroupForm = (
  _props: RadioGroupProps & { name: string; form: FormStore<any, any>; error?: string },
) => {
  const [formProps, props] = splitProps(_props, ['form']);

  return (
    <RadioGroup
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(formProps.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
