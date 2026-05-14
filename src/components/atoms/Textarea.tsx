import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';
import TextareaAutosize from 'solid-textarea-autosize';

import { Text } from '../primitives/Text';

const variantClassNames = {
  primary: 'rounded-2xl p-3 hover:!border-primary-100 bg-primary-50',
  secondary: 'rounded-2xl p-3 hover:!border-secondary-100 bg-secondary-50',
  danger: 'rounded-2xl p-3 hover:!border-danger-100 bg-danger-50',
  transparent: '!bg-transparent',
  transparentWhite: '!bg-transparent',
};

export const TextareaVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const variantValueClassNames = {
  primary: 'text-dark-950',
  secondary: 'text-dark-950',
  danger: 'text-danger-400',
  transparent: 'text-dark-950',
  transparentWhite: 'text-dark-950',
} satisfies Record<keyof typeof variantClassNames, string>;

const variantLabelClassNames = {
  primary: 'text-dark-950',
  secondary: 'text-dark-950',
  danger: 'text-dark-950',
  transparent: 'text-dark-950',
  transparentWhite: 'text-white',
} satisfies Record<keyof typeof variantClassNames, string>;

type TextareaProps = {
  label?: string;
  placeholder?: string;
  variant?: keyof typeof variantClassNames;
  isScrollable?: boolean;
  disabled?: boolean;
  rows?: number;

  class?: string;
  classInput?: string;

  value?: string;
  onChange?: (data?: string) => void;
};

export const Textarea = (_props: TextareaProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
        isScrollable: true,
      },
      _props,
    ),
    ['variant', 'label', 'size', 'value', 'onChange', 'placeholder', 'isScrollable', 'rows', 'classInput', 'disabled'],
  );

  return (
    <div
      class={cx(
        'group space-y-3 border border-transparent',
        variantClassNames[props.variant as keyof typeof variantClassNames],
      )}
      {...otherProps}
    >
      {props.label && (
        <div>
          <Text class={variantLabelClassNames[props.variant as keyof typeof variantLabelClassNames]}>
            {props.label}
          </Text>
        </div>
      )}
      <TextareaAutosize
        minRows={props.rows || 1}
        maxRows={props.isScrollable && props.rows ? props.rows : undefined}
        class={cx(
          'w-full resize-none rounded-lg bg-white p-2 outline-none group-hover:shadow',
          variantValueClassNames[props.variant as keyof typeof variantValueClassNames],
          props?.classInput || '',
        )}
        //@ts-ignore
        value={props.value ? props.value : null}
        placeholder={props.placeholder}
        onInput={(e) => props.onChange && props.onChange(e.currentTarget.value)}
        disabled={props.disabled}
      />
    </div>
  );
};

export const TextareaForm = (props: TextareaProps & { name: string; form: FormStore<any, any>; error?: string }) => {
  return (
    <Textarea
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
