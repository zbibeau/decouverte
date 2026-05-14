import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';

const variantClassNames = {
  dark950: 'bg-dark-950',
  primary400: 'bg-primary-400',
  secondary900: 'bg-secondary-900',
  secondary300: 'bg-secondary-300',
  secondary50: 'bg-secondary-50',
  white: 'bg-white',
};

const sizeClassNames = {
  '3x': 'w-96 h-12',
  '2x': 'w-60 h-8',
  '1.5x': 'w-44 h-6',
  '1x': 'w-28 h-4',
  '0.5x': 'w-7 h-2',
};

type ReturnTypeSize = keyof typeof sizeClassNames;

export const BrandLogoVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];
export const BrandLogoSizeClasses = Object.keys(sizeClassNames) as (keyof typeof sizeClassNames)[];

export const BrandLogo = (_props: {
  variant?: keyof typeof variantClassNames;
  size?: ReturnTypeSize;
  onClick?: JSX.EventHandler<unknown, MouseEvent>;
  class?: string;
}) => {
  const props = mergeProps(
    {
      variant: 'dark950' as const,
      size: '1x' as const,
    },
    _props,
  );

  return (
    <i
      class={cx(
        variantClassNames[props.variant as keyof typeof variantClassNames],
        sizeClassNames[props.size as ReturnTypeSize],
        props.onClick && 'cursor-pointer',
        'brand icon-brand-logo block',
        props.class,
      )}
      onClick={(e) => props.onClick && props.onClick(e)}
    />
  );
};
