import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';

export type KeyofReturn<T extends (...args: any) => any> = keyof ReturnType<T>;

const variantClassNames = {
  // Refonte « moderne » (handoff Lot 4) — `primary600` (violet vif
  // signature) en plus de la palette legacy. Utilisée pour les key
  // points checks de la peau moderne.
  primary600: 'bg-primary-600',
  primary400: 'bg-primary-400',
  primary200: 'bg-primary-200',
  dark950: 'bg-dark-950',
  dark200: 'bg-dark-200',
  secondary600: 'bg-secondary-600',
  secondary400: 'bg-secondary-400',
  secondary100Icon600: 'bg-secondary-100',
  secondary100Icon400: 'bg-secondary-100',
  info400: 'bg-info-400',
  info200: 'bg-info-200',
  success400: 'bg-success-400',
  success200: 'bg-success-200',
  warning400: 'bg-warning-400',
  warning200: 'bg-warning-200',
  danger400: 'bg-danger-400',
  danger200: 'bg-danger-200',
  whitePrimary400: 'bg-white',
  whiteDark950: 'bg-white',
  whiteSecondary900: 'bg-white',
  whiteSecondary600: 'bg-white',
  whiteSecondary400: 'bg-white',
  whiteInfo400: 'bg-white',
  whiteSuccess400: 'bg-white',
  whiteWarning400: 'bg-white',
  whiteDanger400: 'bg-white',
};

const iconVariantClassNames: Record<keyof typeof variantClassNames, string> = {
  primary600: 'bg-white',
  primary400: 'bg-white',
  primary200: 'bg-primary-500',
  dark950: 'bg-white',
  dark200: 'bg-dark-950',
  secondary600: 'bg-secondary-200',
  secondary400: 'bg-white',
  secondary100Icon600: 'bg-secondary-600',
  secondary100Icon400: 'bg-secondary-400',
  info400: 'bg-white',
  info200: 'bg-info-500',
  success400: 'bg-white',
  success200: 'bg-success-500',
  warning400: 'bg-white',
  warning200: 'bg-warning-500',
  danger400: 'bg-white',
  danger200: 'bg-danger-500',
  whitePrimary400: 'bg-primary-400',
  whiteDark950: 'bg-dark-950',
  whiteSecondary900: 'bg-secondary-900',
  whiteSecondary600: 'bg-secondary-600',
  whiteSecondary400: 'bg-secondary-400',
  whiteInfo400: 'bg-info-400',
  whiteSuccess400: 'bg-success-400',
  whiteWarning400: 'bg-warning-400',
  whiteDanger400: 'bg-danger-400',
};

const iconTransparentVariantClassNames: Record<keyof typeof variantClassNames, string> = {
  primary600: 'bg-primary-600',
  primary400: 'bg-primary-400',
  primary200: 'bg-primary-200',
  dark950: 'bg-dark-950',
  dark200: 'bg-dark-200',
  secondary600: 'bg-secondary-600',
  secondary400: 'bg-secondary-400',
  secondary100Icon600: 'bg-secondary-100',
  secondary100Icon400: 'bg-secondary-100',
  info400: 'bg-info-400',
  info200: 'bg-info-200',
  success400: 'bg-success-400',
  success200: 'bg-success-200',
  warning400: 'bg-warning-400',
  warning200: 'bg-warning-200',
  danger400: 'bg-danger-400',
  danger200: 'bg-danger-200',
  whitePrimary400: 'bg-primary-400',
  whiteDark950: 'bg-dark-950',
  whiteSecondary900: 'bg-secondary-900',
  whiteSecondary600: 'bg-secondary-600',
  whiteSecondary400: 'bg-secondary-400',
  whiteInfo400: 'bg-info-400',
  whiteSuccess400: 'bg-success-400',
  whiteWarning400: 'bg-warning-400',
  whiteDanger400: 'bg-danger-400',
};

export const IconVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const sizeClassNames = (isEM: boolean) => ({
  '3xs': `w-3 h-3 rounded ${isEM && 'em:!w-4 em:!h-4'}`,
  '2xs': `w-4.5 h-4.5 rounded-md ${isEM && 'em:!w-4 em:!h-4'}`,
  xs: `w-6 h-6 rounded-lg ${isEM && 'em:!w-4 em:!h-4'}`,
  default: `w-8 h-8 rounded-lg ${isEM && 'em:!w-4 em:!h-4'}`,
  lg: `w-12 h-12 rounded-xl ${isEM && 'em:!w-4 em:!h-4'}`,
  xl: `w-16 h-16 rounded-2xl ${isEM && 'em:!w-4 em:!h-4'}`,
  '2xl': `w-24 h-24 rounded-3xl ${isEM && 'em:!w-4 em:!h-4'}`,
});

type ReturnTypeSize = KeyofReturn<typeof sizeClassNames>;

const iconSizeClassNames = (isEM: boolean) =>
  ({
    '3xs': `w-2 h-2 ${isEM && '!w-75% !h-75%'}`,
    '2xs': `w-3 h-3 ${isEM && '!w-75% !h-75%'}`,
    xs: `w-4 h-4 ${isEM && '!w-75% !h-75%'}`,
    default: `w-5 h-5 ${isEM && '!w-75% !h-75%'}`,
    lg: `w-8 h-8 ${isEM && '!w-75% !h-75%'}`,
    xl: `w-12 h-12 ${isEM && '!w-75% !h-75%'}`,
    '2xl': `w-16 h-16 ${isEM && '!w-75% !h-75%'}`,
  }) satisfies Record<ReturnTypeSize, string>;

export const IconSizeClasses = Object.keys(sizeClassNames(false)) as ReturnTypeSize[];

export const Icon = (_props: {
  icon: string;
  variant?: keyof typeof variantClassNames;
  size?: ReturnTypeSize;
  isRounded?: boolean;
  isEM?: boolean;
  isTransparent?: boolean;
  class?: string;
  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      variant: 'primary' as const,
      size: 'default' as const,
      icon: '',
      class: '',
      isEM: false,
      isTransparent: false,
    },
    _props,
  );

  return (
    <div
      class={cx(
        'flex items-center justify-center',
        !props.isTransparent && variantClassNames[props.variant as keyof typeof variantClassNames],
        sizeClassNames(props.isEM)[props.size as ReturnTypeSize],
        props.isRounded && '!rounded-full',
        !props.isRounded && props.isEM && '!rounded-[25%]',
        props.onClick && 'cursor-pointer',
        props.class,
      )}
      onClick={(e) => props.onClick && props.onClick(e)}
    >
      <i
        class={cx(
          'block align-middle',
          props.icon,
          props.isTransparent
            ? iconTransparentVariantClassNames[props.variant as keyof typeof variantClassNames]
            : iconVariantClassNames[props.variant as keyof typeof variantClassNames],
          iconSizeClassNames(props.isEM)[props.size as keyof typeof sizeClassNames],
        )}
      />
    </div>
  );
};
