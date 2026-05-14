import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';
export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Text, TextVariantClasses } from '../primitives/Text';

const variantClassNames = {
  primary: 'group-hover:border-primary-100',
  secondary: 'group-hover:border-secondary-100',
  danger: 'group-hover:border-danger-100',
};

export const SwitchVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const sizeClassNames = {
  lg: 'w-14 h-8',
  default: 'w-10 h-6',
  sm: 'w-7 h-4',
};

export const SwitchSizeClasses = Object.keys(sizeClassNames) as (keyof typeof sizeClassNames)[];

const sizeTextClassNames = {
  lg: 'lg',
  default: 'base',
  sm: 'sm',
} satisfies Record<keyof typeof sizeClassNames, Unpacked<typeof TextVariantClasses>>;

const variantTextNotSelectedClassNames = {
  primary: 'text-primary-800',
  secondary: 'text-secondary-800',
  danger: 'text-danger-400',
} satisfies Record<keyof typeof variantClassNames, string>;

const variantTextSelectedClassNames = {
  primary: 'text-primary-400 group-hover:text-primary-600',
  secondary: 'text-secondary-400 group-hover:text-secondary-600',
  danger: 'text-danger-400',
} satisfies Record<keyof typeof variantClassNames, string>;

const sizeNullClassNames = {
  lg: 'w-2.5 h-2.5',
  default: 'w-2 h-2',
  sm: 'w-1 h-1',
} satisfies Record<keyof typeof sizeClassNames, string>;

const variantNullClassNames = {
  primary: 'bg-primary-100 group-hover:bg-primary-300',
  secondary: 'bg-secondary-100 group-hover:bg-secondary-300',
  danger: 'bg-danger-400',
} satisfies Record<keyof typeof variantClassNames, string>;

const sizeCircleClassNames = {
  lg: 'w-6 h-6',
  default: 'w-4.5 h-4.5',
  sm: 'w-3 h-3',
} satisfies Record<keyof typeof sizeClassNames, string>;

const variantCircleClassNames = (isDisabled?: boolean) =>
  ({
    primary: isDisabled ? 'bg-primary-100 group-hover:bg-primary-400' : 'bg-primary-400 group-hover:bg-primary-600',
    secondary: isDisabled
      ? 'bg-secondary-100 group-hover:bg-secondary-400'
      : 'bg-secondary-400 group-hover:bg-secondary-600',
    danger: 'bg-danger-400',
  }) satisfies Record<keyof typeof variantClassNames, string>;

export type SwitchProps = {
  variant?: keyof typeof variantClassNames;
  size?: keyof typeof sizeClassNames;

  value?: boolean | null;
  onChange?: (data?: boolean | null) => void;

  disabled?: boolean;

  trueText?: string;
  falseText?: string;
};

export const Switch = (_props: SwitchProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
      },
      _props,
    ),
    ['variant', 'size', 'value', 'onChange', 'trueText', 'falseText', 'disabled'],
  );

  return (
    <div class="group flex justify-center gap-2" {...otherProps}>
      {props.falseText && (
        <div>
          <Text
            variant={sizeTextClassNames[props.size as keyof typeof sizeClassNames]}
            fontWeight={props.value === false ? 'medium' : undefined}
            class={cx(
              props.value === false
                ? variantTextSelectedClassNames[props.variant as keyof typeof variantClassNames]
                : variantTextNotSelectedClassNames[props.variant as keyof typeof variantClassNames],

              props.disabled && '!cursor-not-allowed',
            )}
            onClick={() => !props.disabled && props.onChange && props.onChange(false)}
          >
            {props.falseText}
          </Text>
        </div>
      )}

      <div>
        <div
          class={cx(
            sizeClassNames[props.size as keyof typeof sizeClassNames],
            variantClassNames[props.variant as keyof typeof variantClassNames],
            'rounded-full border border-transparent bg-white p-0.5 shadow group-hover:shadow-none',
          )}
        >
          <div class="flex size-full items-center justify-between">
            {props.value === null || props.value === undefined ? (
              <>
                <div
                  class={cx('h-full flex-grow cursor-pointer', props.disabled && '!cursor-not-allowed')}
                  onClick={() => !props.disabled && props.onChange && props.onChange(false)}
                />
                <div
                  class={cx(
                    'rounded-full',
                    sizeNullClassNames[props.size as keyof typeof sizeClassNames],
                    variantNullClassNames[props.variant as keyof typeof variantClassNames],
                  )}
                />
                <div
                  class={cx('h-full flex-grow cursor-pointer', props.disabled && '!cursor-not-allowed')}
                  onClick={() => !props.disabled && props.onChange && props.onChange(true)}
                />
              </>
            ) : (
              <>
                <div
                  class={cx(
                    'cursor-pointer rounded-full',
                    props.disabled && '!cursor-not-allowed',
                    props.value !== false && 'h-full flex-grow !bg-transparent',

                    props.value === false && sizeCircleClassNames[props.size as keyof typeof sizeClassNames],
                    variantCircleClassNames(props.disabled)[props.variant as keyof typeof variantClassNames],
                  )}
                  onClick={() => !props.disabled && props.onChange && props.onChange(false)}
                />

                <div
                  class={cx(
                    'cursor-pointer rounded-full',
                    props.disabled && '!cursor-not-allowed',
                    props.value !== true && 'h-full flex-grow !bg-transparent',

                    props.value === true && sizeCircleClassNames[props.size as keyof typeof sizeClassNames],
                    variantCircleClassNames(props.disabled)[props.variant as keyof typeof variantClassNames],
                  )}
                  onClick={() => !props.disabled && props.onChange && props.onChange(true)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {props.trueText && (
        <div>
          <Text
            variant={sizeTextClassNames[props.size as keyof typeof sizeClassNames]}
            fontWeight={props.value === true ? 'medium' : undefined}
            class={cx(
              props.value === true
                ? variantTextSelectedClassNames[props.variant as keyof typeof variantClassNames]
                : variantTextNotSelectedClassNames[props.variant as keyof typeof variantClassNames],

              props.disabled && '!cursor-not-allowed',
            )}
            onClick={() => !props.disabled && props.onChange && props.onChange(true)}
          >
            {props.trueText}
          </Text>
        </div>
      )}
    </div>
  );
};

export const SwitchForm = (props: SwitchProps & { name: string; form: FormStore<any, any>; error?: string }) => {
  return (
    <Switch
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
