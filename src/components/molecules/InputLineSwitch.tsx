import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';
export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Switch, SwitchProps, SwitchVariantClasses } from '../atoms/Switch';

const variantClassNames = {
  primary: 'hover:border-primary-100 bg-primary-50',
  secondary: 'hover:border-secondary-100 bg-secondary-50',
  danger: 'hover:border-danger-100 bg-danger-50',
} satisfies Record<Unpacked<typeof SwitchVariantClasses>, string>;

export const InputLineSwitchVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const variantTextClassNames = {
  primary: 'text-dark-950',
  secondary: 'text-dark-950',
  danger: 'text-dark-950',
} satisfies Record<Unpacked<typeof SwitchVariantClasses>, string>;

type InputLineSwitchProps = {
  variant?: keyof typeof variantClassNames;

  text?: string;
};

export const InputLineSwitch = (_props: InputLineSwitchProps & SwitchProps) => {
  const [inputLineProps, switchProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
      },
      _props,
    ),
    ['variant', 'text'],
  );

  return (
    <div
      class={cx(
        'group flex items-center justify-between gap-2 rounded-2xl border border-transparent px-4 py-3',
        variantClassNames[inputLineProps.variant as keyof typeof variantClassNames],
      )}
    >
      <div class={cx(variantTextClassNames[inputLineProps.variant as keyof typeof variantTextClassNames])}>
        {inputLineProps.text}
      </div>
      <div>
        {/* @ts-ignore */}
        <Switch {...switchProps} variant={inputLineProps.variant} />
      </div>
    </div>
  );
};

export const InputLineSwitchForm = (
  props: InputLineSwitchProps & SwitchProps & { name: string; form: FormStore<any, any>; error?: string },
) => {
  return (
    <InputLineSwitch
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
