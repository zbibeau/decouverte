import cx from 'classix';
import { JSX, mergeProps, splitProps } from 'solid-js';

const variantClassNames = (isOutline: boolean) => ({
  primary: !isOutline
    ? 'disabled:!opacity-30 bg-primary-400 hover:bg-primary-600 hover:transition-all focus:shadow-3px focus:shadow-primary-300 rounded-full text-white'
    : 'group hover:bg-primary-600 hover:text-white hover:shadow-none hover:transition-all shadow-inner-2px shadow-primary-400 focus:shadow-3px focus:shadow-primary-300 rounded-full text-primary-400 disabled:hover:bg-primary-50 disabled:focus:bg-primary-50 disabled:text-primary-900 disabled:shadow-primary-100',
  secondary: !isOutline
    ? 'disabled:!opacity-30 group bg-secondary-100 hover:bg-secondary-200 hover:text-secondary-900 hover:transition-all focus:shadow-3px focus:shadow-secondary-300 rounded-full text-secondary-600'
    : 'disabled:!opacity-30 group hover:bg-secondary-100 hover:text-secondary-900 hover:shadow-none hover:transition-all shadow-inner-2px shadow-secondary-600 focus:shadow-3px focus:shadow-secondary-300 rounded-full text-secondary-600',
  dark: !isOutline
    ? 'disabled:!opacity-30 bg-dark-950 hover:bg-dark-800 hover:transition-all focus:shadow-3px focus:shadow-dark-300 rounded-full text-white'
    : 'group hover:bg-dark-800 hover:text-white hover:shadow-none hover:transition-all shadow-inner-2px shadow-dark-950 focus:shadow-3px focus:shadow-dark-300 rounded-full text-dark-950 disabled:bg-dark-800 disabled:text-dark-400 disabled:shadow-dark-400 disabled:hover:text-white disabled:focus:text-white',
  whitePrimary: !isOutline
    ? 'disabled:!opacity-30 group bg-white hover:transition-all focus:shadow-3px focus:shadow-primary-300 rounded-full text-primary-400 hover:text-primary-600'
    : 'disabled:!opacity-30 group hover:bg-white hover:text-primary-600 hover:shadow-none hover:transition-all shadow-inner-2px shadow-white focus:shadow-3px focus:shadow-primary-300 rounded-full text-white',
  success: !isOutline
    ? 'disabled:!opacity-30 bg-success-400 hover:bg-success-600 hover:transition-all focus:shadow-3px focus:shadow-success-300 rounded-full text-white'
    : 'disabled:!opacity-30 group hover:bg-success-600 hover:text-white hover:shadow-none hover:transition-all shadow-inner-2px shadow-success-400 focus:shadow-3px focus:shadow-success-300 rounded-full text-success-400',
  danger: !isOutline
    ? 'disabled:!opacity-30 bg-danger-400 hover:bg-danger-500 hover:transition-all focus:shadow-3px focus:shadow-danger-300 rounded-full text-white'
    : 'disabled:!opacity-30 group hover:bg-danger-600 hover:text-white hover:shadow-none hover:transition-all shadow-inner-2px shadow-danger-400 focus:shadow-3px focus:shadow-danger-300 rounded-full text-danger-400',
});

type variantType = keyof ReturnType<typeof variantClassNames>;

const iconVariantClassNames = (isOutline: boolean) =>
  ({
    primary: !isOutline
      ? 'bg-white '
      : 'bg-primary-400 group-disabled:bg-primary-900 group-hover:bg-white hover:transition-all',
    secondary: !isOutline
      ? 'bg-secondary-600 group-hover:bg-secondary-900 hover:transition-all'
      : 'bg-secondary-600 group-hover:bg-secondary-900 hover:transition-all',
    dark: !isOutline
      ? 'bg-white'
      : 'bg-dark-950 group-disabled:bg-dark-400 group-disabled:group-hover:bg-white group-disabled:group-focus:bg-white group-hover:bg-white hover:transition-all',
    whitePrimary: !isOutline ? 'bg-purple-400 group-hover:bg-primary-600' : 'bg-white group-hover:bg-primary-600',
    success: !isOutline ? 'bg-white' : 'bg-success-400 group-hover:bg-white hover:transition-all',
    danger: !isOutline ? 'bg-white' : 'bg-danger-400 group-hover:bg-white hover:transition-all',
  }) as Record<variantType, string>;

export const ButtonVariantClasses = Object.keys(variantClassNames(false)) as variantType[];

const sizeClassNames = {
  xs: 'px-2 py-1 gap-1 text-xs font-medium leading-[16px]',
  sm: 'px-3 py-1.5 gap-1.5 text-sm font-medium leading-[20px]',
  default: 'px-4 py-2 gap-2 text-md font-medium leading-[24px]',
  lg: 'px-5 py-2.5 gap-2.5 text-lg font-medium leading-[28px]',
  xl: 'px-6 py-3 gap-3 text-xl font-medium leading-[32px]',
};

const iconOnlyClassNames = {
  xs: 'p-1.5',
  sm: 'p-2',
  default: 'p-2.5',
  lg: 'p-2.5',
  xl: 'p-3.5',
} as Record<keyof typeof sizeClassNames, string>;

const iconSizeClassNames = {
  xs: `w-3 h-3`,
  sm: `w-4 h-4`,
  default: `w-5 h-5`,
  lg: `w-6 h-6`,
  xl: `w-7 h-7`,
} as Record<keyof typeof sizeClassNames, string>;

export const ButtonSizeClasses = Object.keys(sizeClassNames);

export const Button = (_props: {
  type?: 'button' | 'submit' | 'reset' | undefined;
  class?: string;
  variant?: variantType;
  size?: keyof typeof sizeClassNames;
  disabled?: boolean;
  isOutline?: boolean;
  isLoading?: boolean;

  children?: JSX.Element;
  onClick?: JSX.EventHandler<unknown, MouseEvent>;

  prefixIcon?: string;
  prefixIconClassName?: string;
  onClickPrefix?: JSX.EventHandler<unknown, MouseEvent>;

  suffixIcon?: string;
  suffixIconClassName?: string;
  onClickSuffix?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        class: '',
        prefixIconClassName: '',
        suffixIconClassName: '',
        type: 'button' as const,
        isOutline: false,
        disabled: false,
        isLoading: false,
        variant: 'primary',
        size: 'default',
      },
      _props,
    ),
    [
      'class',
      'variant',
      'size',
      'prefixIconClassName',
      'suffixIconClassName',
      'type',
      'disabled',
      'isOutline',
      'isLoading',
      'children',
      'prefixIcon',
      'onClickPrefix',
      'suffixIcon',
      'onClickSuffix',
    ],
  );
  return (
    <button
      class={cx(
        'flex items-center justify-center',
        props.disabled ? '!cursor-not-allowed' : '',
        variantClassNames(props.isOutline)[props.variant as variantType],
        props.children
          ? sizeClassNames[props.size as keyof typeof sizeClassNames]
          : iconOnlyClassNames[props.size as keyof typeof sizeClassNames],
        props.isOutline && 'shadow-2px',
        props.class,
      )}
      disabled={props.disabled || props.isLoading}
      type={props.type}
      {...otherProps}
    >
      {props.isLoading && (
        <div>
          <i class={cx('icon icon-refresh-line animate block')} />
        </div>
      )}
      {props.prefixIcon && (
        <div onClick={props.onClickPrefix}>
          <i
            class={cx(
              'block',
              `${props.prefixIcon}`,
              iconVariantClassNames(props.isOutline)[props.variant as variantType],
              iconSizeClassNames[props.size as keyof typeof sizeClassNames],
              props.prefixIconClassName,
            )}
          />
        </div>
      )}

      {!!props.children && props.children}

      {props.suffixIcon && (
        <div onClick={props.onClickSuffix}>
          <i
            class={cx(
              'block',
              `${props.suffixIcon}`,
              iconVariantClassNames(props.isOutline)[props.variant as variantType],
              iconSizeClassNames[props.size as keyof typeof sizeClassNames],
              props.suffixIconClassName,
            )}
          />
        </div>
      )}
    </button>
  );
};
