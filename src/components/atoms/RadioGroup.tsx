import { RadioGroup as RadioGroupCMP } from '@ark-ui/solid';
import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { Accessor, createMemo, For, mergeProps, splitProps } from 'solid-js';

export type Unpacked<T> = T extends (infer U)[] ? U : T;

const variantClassNames = {
  default: 'shadow data-[state=checked]:bg-success-400',
  primary: 'shadow data-[state=checked]:bg-primary-400',
  secondary: 'shadow data-[state=checked]:bg-secondary-400',
  danger: 'shadow data-[state=checked]:bg-danger-400',
};

export const RadioGroupVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const textVariantClassNames = {
  default: 'text-dark-950',
  primary: 'text-dark-950',
  secondary: 'text-dark-950',
  danger: 'text-danger-400',
} satisfies Record<Unpacked<typeof RadioGroupVariantClasses>, string>;

export type RadioGroupProps = {
  label?: string;
  options: string[] | { label: string; value: string }[];

  orientation?: 'vertical' | 'horizontal';

  variant?: keyof typeof variantClassNames;

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
        console.log('data', data);
        props.onChange && props.onChange(data.value);
      }}
      class="space-y-1"
      {...otherProps}
    >
      <RadioGroupCMP.Label>{props.label}</RadioGroupCMP.Label>
      <RadioGroupCMP.Indicator />
      <div
        class={cx(
          'flex flex-wrap',
          props.orientation === 'horizontal' ? 'flex-row items-center gap-2' : 'flex-col gap-1',
        )}
      >
        <For each={options()}>
          {(option) => (
            <RadioGroupCMP.Item
              value={option.value}
              class={cx('flex items-center gap-1', props.disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
            >
              <div>
                <RadioGroupCMP.ItemControl
                  class={cx(
                    'flex size-5 items-center justify-center rounded-full shadow',
                    variantClassNames[props.variant as keyof typeof variantClassNames],
                  )}
                >
                  <i class="icon icon-check-line relative size-4 rounded-full border bg-white" />
                </RadioGroupCMP.ItemControl>
              </div>
              <div>
                <RadioGroupCMP.ItemText
                  class={cx(
                    'data-[state=checked]:font-medium',
                    textVariantClassNames[props.variant as keyof typeof textVariantClassNames],
                  )}
                >
                  {option.label}
                </RadioGroupCMP.ItemText>
                <RadioGroupCMP.ItemHiddenInput />
              </div>
            </RadioGroupCMP.Item>
          )}
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
