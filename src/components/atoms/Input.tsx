import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';

import { Icon, IconVariantClasses } from './Icon';

export type Unpacked<T> = T extends (infer U)[] ? U : T;

const variantClassNames = {
  white: 'hover:!border-dark-100 bg-white',
  primary: 'hover:!border-primary-100 bg-primary-50',
  secondary: 'hover:!border-secondary-100 bg-secondary-50',
  danger: 'hover:!border-danger-100 bg-danger-50',
};

export const InputVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const variantValueClassNames = {
  white: 'text-dark-950',
  primary: 'text-dark-950',
  secondary: 'text-dark-950',
  danger: 'text-danger-400',
} satisfies Record<keyof typeof variantClassNames, string>;

const variantIconClassNames = {
  white: 'dark950',
  primary: 'primary400',
  secondary: 'secondary400',
  danger: 'danger400',
} satisfies Record<keyof typeof variantClassNames, Unpacked<typeof IconVariantClasses>>;

type InputProps = {
  type?: string;
  icon?: string;
  placeholder?: string;
  variant?: keyof typeof variantClassNames;

  value?: string;
  onChange?: (data?: string) => void;
};

export const Input = (_props: InputProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
      },
      _props,
    ),
    ['variant', 'type', 'size', 'value', 'onChange', 'placeholder', 'icon'],
  );

  return (
    <div
      class={cx(
        'group flex items-center rounded-xl border border-transparent px-3 py-2',
        variantClassNames[props.variant as keyof typeof variantClassNames],
      )}
      {...otherProps}
    >
      {props.icon && (
        <div>
          <Icon
            size="default"
            icon={props.icon}
            variant={variantIconClassNames[props.variant as keyof typeof variantIconClassNames]}
          />
        </div>
      )}

      <div class="grow">
        <input
          type={props.type || 'text'}
          class={cx(
            'w-full resize-none bg-transparent outline-none',
            props.icon && 'py-1 pl-2',
            variantValueClassNames[props.variant as keyof typeof variantValueClassNames],
          )}
          //@ts-ignore
          value={props.value ? props.value : null}
          placeholder={props.placeholder}
          onInput={(e) => props.onChange && props.onChange(e.currentTarget.value)}
        />
      </div>
    </div>
  );
};

export const InputForm = (props: InputProps & { name: string; form: FormStore<any, any>; error?: string }) => {
  return (
    <Input
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
